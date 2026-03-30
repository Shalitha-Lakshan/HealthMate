const NotificationLog = require("../models/NotificationLog");
const { sendEmail } = require("../services/emailService");
const { sendSms } = require("../services/smsService");

const formatDateTime = (appointmentDate, slotTime) => {
	if (!appointmentDate) {
		return "To be scheduled";
	}

	const parsed = new Date(`${appointmentDate}T${slotTime || "00:00"}:00`);
	if (Number.isNaN(parsed.getTime())) {
		return slotTime ? `${appointmentDate} at ${slotTime}` : appointmentDate;
	}

	return new Intl.DateTimeFormat("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	}).format(parsed);
};

const buildEmailHtml = ({ recipientName, heading, intro, appointmentId, dateTime, patientName, doctorName }) => `
<div style="font-family: Arial, Helvetica, sans-serif; background:#f8fafc; padding:24px; color:#0f172a;">
	<div style="max-width:640px; margin:0 auto; background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden;">
		<div style="background:#1d4ed8; color:#ffffff; padding:16px 20px; font-size:18px; font-weight:700;">HealthMate Notification</div>
		<div style="padding:20px;">
			<p style="margin:0 0 12px 0; font-size:14px;">Dear ${recipientName},</p>
			<h2 style="margin:0 0 12px 0; font-size:18px; color:#0f172a;">${heading}</h2>
			<p style="margin:0 0 16px 0; font-size:14px; color:#334155;">${intro}</p>
			<table style="width:100%; border-collapse:collapse; margin-bottom:16px;">
				<tr>
					<td style="padding:8px 0; font-size:13px; color:#64748b; width:160px;">Appointment ID</td>
					<td style="padding:8px 0; font-size:13px; color:#0f172a; font-weight:600;">${appointmentId}</td>
				</tr>
				<tr>
					<td style="padding:8px 0; font-size:13px; color:#64748b;">Date & Time</td>
					<td style="padding:8px 0; font-size:13px; color:#0f172a;">${dateTime}</td>
				</tr>
				<tr>
					<td style="padding:8px 0; font-size:13px; color:#64748b;">Patient</td>
					<td style="padding:8px 0; font-size:13px; color:#0f172a;">${patientName}</td>
				</tr>
				<tr>
					<td style="padding:8px 0; font-size:13px; color:#64748b;">Doctor</td>
					<td style="padding:8px 0; font-size:13px; color:#0f172a;">${doctorName}</td>
				</tr>
			</table>
			<p style="margin:0; font-size:12px; color:#64748b;">This is an automated message from HealthMate. Please do not reply to this email.</p>
		</div>
	</div>
</div>`;

const buildNotificationMessage = ({ eventType, appointmentId, patientName, doctorName, appointmentDate, slotTime }) => {
	const dateTime = formatDateTime(appointmentDate, slotTime);

	if (eventType === "APPOINTMENT_CONFIRMED") {
		return {
			subject: `Appointment Confirmed | ${appointmentId}`,
			emailHeading: "Your appointment is confirmed",
			emailIntro: "Your booking has been successfully confirmed. Please find the details below.",
			smsBody: `HealthMate: Appointment ${appointmentId} confirmed for ${dateTime}. Dr. ${doctorName}.`,
			emailText: `HealthMate Notification\n\nYour appointment is confirmed.\nAppointment ID: ${appointmentId}\nDate & Time: ${dateTime}\nPatient: ${patientName}\nDoctor: ${doctorName}\n\nThis is an automated message from HealthMate.`,
		};
	}

	return {
		subject: `Consultation Completed | ${appointmentId}`,
		emailHeading: "Consultation completed",
		emailIntro: "The consultation has been marked as completed. Please find the visit details below.",
		smsBody: `HealthMate: Consultation completed for appointment ${appointmentId}.`,
		emailText: `HealthMate Notification\n\nConsultation completed.\nAppointment ID: ${appointmentId}\nDate & Time: ${dateTime}\nPatient: ${patientName}\nDoctor: ${doctorName}\n\nThis is an automated message from HealthMate.`,
	};
};

const persistLog = async ({
	eventType,
	channel,
	recipientRole,
	recipient,
	status,
	appointmentId,
	message,
	errorMessage,
	providerResponse,
}) => {
	await NotificationLog.create({
		eventType,
		channel,
		recipientRole,
		recipient,
		status,
		appointmentId,
		message,
		errorMessage,
		providerResponse,
	});
};

const processChannel = async ({ eventType, channel, recipientRole, recipient, appointmentId, message, sender }) => {
	if (!recipient) {
		await persistLog({
			eventType,
			channel,
			recipientRole,
			recipient: "missing",
			status: "skipped",
			appointmentId,
			message,
			errorMessage: `${channel} recipient missing`,
		});
		return;
	}

	try {
		const providerResponse = await sender();

		if (providerResponse.skipped) {
			await persistLog({
				eventType,
				channel,
				recipientRole,
				recipient,
				status: "skipped",
				appointmentId,
				message,
				errorMessage: providerResponse.message,
				providerResponse,
			});
			return;
		}

		await persistLog({
			eventType,
			channel,
			recipientRole,
			recipient,
			status: "sent",
			appointmentId,
			message,
			providerResponse,
		});
	} catch (error) {
		await persistLog({
			eventType,
			channel,
			recipientRole,
			recipient,
			status: "failed",
			appointmentId,
			message,
			errorMessage: error.message,
		});
	}
};

const notifyAppointmentEvent = async (req, res) => {
	try {
		const {
			eventType,
			appointmentId,
			appointmentDate,
			slotTime,
			patientName,
			doctorName,
			patientEmail,
			patientPhone,
			doctorEmail,
			doctorPhone,
		} = req.body;

		if (!eventType || !appointmentId || !patientName || !doctorName) {
			return res.status(400).json({
				message: "eventType, appointmentId, patientName and doctorName are required",
			});
		}

		if (!["APPOINTMENT_CONFIRMED", "CONSULTATION_COMPLETED"].includes(eventType)) {
			return res.status(400).json({ message: "invalid eventType" });
		}

		const message = buildNotificationMessage({
			eventType,
			appointmentId,
			patientName,
			doctorName,
			appointmentDate,
			slotTime,
		});

		await processChannel({
			eventType,
			channel: "email",
			recipientRole: "patient",
			recipient: patientEmail,
			appointmentId,
			message: message.subject,
			sender: () =>
				sendEmail({
					to: patientEmail,
					subject: message.subject,
					text: message.emailText,
					html: buildEmailHtml({
						recipientName: patientName,
						heading: message.emailHeading,
						intro: message.emailIntro,
						appointmentId,
						dateTime: formatDateTime(appointmentDate, slotTime),
						patientName,
						doctorName,
					}),
				}),
		});

		await processChannel({
			eventType,
			channel: "sms",
			recipientRole: "patient",
			recipient: patientPhone,
			appointmentId,
			message: message.smsBody,
			sender: () => sendSms({ to: patientPhone, body: message.smsBody }),
		});

		await processChannel({
			eventType,
			channel: "email",
			recipientRole: "doctor",
			recipient: doctorEmail,
			appointmentId,
			message: message.subject,
			sender: () =>
				sendEmail({
					to: doctorEmail,
					subject: message.subject,
					text: message.emailText,
					html: buildEmailHtml({
						recipientName: doctorName,
						heading: message.emailHeading,
						intro: message.emailIntro,
						appointmentId,
						dateTime: formatDateTime(appointmentDate, slotTime),
						patientName,
						doctorName,
					}),
				}),
		});

		await processChannel({
			eventType,
			channel: "sms",
			recipientRole: "doctor",
			recipient: doctorPhone,
			appointmentId,
			message: message.smsBody,
			sender: () => sendSms({ to: doctorPhone, body: message.smsBody }),
		});

		return res.status(200).json({ message: "notifications processed" });
	} catch (error) {
		return res.status(500).json({ message: "failed to process notifications", error: error.message });
	}
};

module.exports = {
	notifyAppointmentEvent,
};
