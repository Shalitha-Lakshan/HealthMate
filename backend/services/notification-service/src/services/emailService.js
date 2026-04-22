// Email service helper using Nodemailer
const nodemailer = require("nodemailer");

let transporter;

// Create and cache SMTP transporter
const getTransporter = () => {
	if (transporter) {
		return transporter;
	}

	const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

	if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
		return null;
	}

	transporter = nodemailer.createTransport({
		host: SMTP_HOST,
		port: Number(SMTP_PORT),
		secure: Number(SMTP_PORT) === 465,
		auth: {
			user: SMTP_USER,
			pass: SMTP_PASS,
		},
	});

	return transporter;
};

// Send email notification (or return skipped when SMTP is not configured)
const sendEmail = async ({ to, subject, text, html }) => {
	const mailTransporter = getTransporter();

	if (!mailTransporter) {
		return {
			sent: false,
			skipped: true,
			message: "SMTP configuration missing",
		};
	}

	const info = await mailTransporter.sendMail({
		from: process.env.EMAIL_FROM || process.env.SMTP_USER,
		to,
		subject,
		text,
		html,
	});

	return {
		sent: true,
		messageId: info.messageId,
		response: info.response,
	};
};

module.exports = {
	sendEmail,
};
