const twilio = require("twilio");

let client;

const normalizeToE164 = (value) => {
	if (!value) {
		return null;
	}

	const cleaned = String(value).replace(/[\s()-]/g, "");

	if (cleaned.startsWith("+")) {
		return /^\+[1-9]\d{7,14}$/.test(cleaned) ? cleaned : null;
	}

	if (/^0\d{9}$/.test(cleaned)) {
		return `+94${cleaned.slice(1)}`;
	}

	if (/^94\d{9}$/.test(cleaned)) {
		return `+${cleaned}`;
	}

	if (/^7\d{8}$/.test(cleaned)) {
		return `+94${cleaned}`;
	}

	return null;
};

const getTwilioClient = () => {
	if (client) {
		return client;
	}

	const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env;
	if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
		return null;
	}

	client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
	return client;
};

const sendSms = async ({ to, body }) => {
	const twilioClient = getTwilioClient();
	const from = process.env.TWILIO_FROM;
	const normalizedTo = normalizeToE164(to);

	if (!twilioClient || !from) {
		return {
			sent: false,
			skipped: true,
			message: "Twilio configuration missing",
		};
	}

	if (!normalizedTo) {
		throw new Error("invalid recipient phone number format. use E.164 (e.g. +9477XXXXXXX)");
	}

	const response = await twilioClient.messages.create({
		from,
		to: normalizedTo,
		body,
	});

	return {
		sent: true,
		sid: response.sid,
		status: response.status,
		to: normalizedTo,
	};
};

module.exports = {
	sendSms,
};
