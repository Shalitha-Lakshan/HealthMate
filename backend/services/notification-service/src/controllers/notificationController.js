const NotificationLog = require("../models/NotificationLog");
const { sendEmail } = require("../services/emailService");
const { sendSms } = require("../services/smsService");
const { sendWhatsApp, getWhatsAppStatus, getWhatsAppQrDataUrl } = require("../services/whatsappService");

const MAX_RETRY_ATTEMPTS = Math.max(0, Number(process.env.NOTIFICATION_RETRY_ATTEMPTS || 2));
const reminderTimers = new Map();

const parseOptIn = (value, defaultValue = true) => {
	if (value === undefined || value === null) {
		return defaultValue;
	}

	if (typeof value === "boolean") {
		return value;
	}

	const normalized = String(value).trim().toLowerCase();
	if (["true", "1", "yes", "y"].includes(normalized)) {
		return true;
	}
	if (["false", "0", "no", "n"].includes(normalized)) {
		return false;
	}

	return defaultValue;
};

const getDateTimeValue = (appointmentDate, slotTime) => {
	if (!appointmentDate || !slotTime) {
		return null;
	}

	const parsed = new Date(`${appointmentDate}T${slotTime}:00`);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
};

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

	const buildWhatsAppBody = ({ title, note }) =>
		[
			"🏥 *HealthMate Notification*",
			"",
			`*${title}*`,
			`• Appointment ID: ${appointmentId}`,
			`• Date & Time: ${dateTime}`,
			`• Patient: ${patientName}`,
			`• Doctor: ${doctorName}`,
			note ? `• Note: ${note}` : null,
			"",
			"If you need changes, please contact support.",
		]
			.filter(Boolean)
			.join("\n");
	const templates = {
		APPOINTMENT_CONFIRMED: {
			subject: `Appointment Confirmed | ${appointmentId}`,
			emailHeading: "Your appointment is confirmed",
			emailIntro: "Your booking has been successfully confirmed. Please find the details below.",
			smsBody: `HealthMate: Appointment ${appointmentId} confirmed for ${dateTime}. Dr. ${doctorName}.`,
			whatsappBody: buildWhatsAppBody({
				title: "Appointment Confirmed",
				note: "Your booking has been successfully confirmed.",
			}),
		},
		APPOINTMENT_RESCHEDULED: {
			subject: `Appointment Rescheduled | ${appointmentId}`,
			emailHeading: "Your appointment is rescheduled",
			emailIntro: "Your appointment schedule has been updated. Please review the new details below.",
			smsBody: `HealthMate: Appointment ${appointmentId} rescheduled to ${dateTime}. Dr. ${doctorName}.`,
			whatsappBody: buildWhatsAppBody({
				title: "Appointment Rescheduled",
				note: "Your appointment schedule has been updated.",
			}),
		},
		APPOINTMENT_CANCELLED: {
			subject: `Appointment Cancelled | ${appointmentId}`,
			emailHeading: "Your appointment is cancelled",
			emailIntro: "Your appointment has been cancelled. Contact support if this was unexpected.",
			smsBody: `HealthMate: Appointment ${appointmentId} has been cancelled.`,
			whatsappBody: buildWhatsAppBody({
				title: "Appointment Cancelled",
				note: "Your appointment has been cancelled.",
			}),
		},
		CONSULTATION_COMPLETED: {
			subject: `Consultation Completed | ${appointmentId}`,
			emailHeading: "Consultation completed",
			emailIntro: "The consultation has been marked as completed. Please find the visit details below.",
			smsBody: `HealthMate: Consultation completed for appointment ${appointmentId}.`,
			whatsappBody: buildWhatsAppBody({
				title: "Consultation Completed",
				note: "The consultation has been marked as completed.",
			}),
		},
		APPOINTMENT_DELETED: {
			subject: `Appointment Deleted | ${appointmentId}`,
			emailHeading: "Appointment record deleted",
			emailIntro: "This appointment record was deleted by an administrator.",
			smsBody: `HealthMate: Appointment ${appointmentId} record deleted by admin.`,
			whatsappBody: buildWhatsAppBody({
				title: "Appointment Record Deleted",
				note: "This record was deleted by an administrator.",
			}),
		},
		APPOINTMENT_REMINDER_24H: {
			subject: `Appointment Reminder (24h) | ${appointmentId}`,
			emailHeading: "Upcoming appointment reminder",
			emailIntro: "This is a reminder that your appointment is scheduled within the next 24 hours.",
			smsBody: `HealthMate reminder: Appointment ${appointmentId} is within 24 hours at ${dateTime}.`,
			whatsappBody: buildWhatsAppBody({
				title: "Appointment Reminder (24 Hours)",
				note: "Please be prepared and join on time.",
			}),
		},
		APPOINTMENT_REMINDER_1H: {
			subject: `Appointment Reminder (1h) | ${appointmentId}`,
			emailHeading: "Appointment starts soon",
			emailIntro: "This is a reminder that your appointment is scheduled within the next hour.",
			smsBody: `HealthMate reminder: Appointment ${appointmentId} starts in about 1 hour (${dateTime}).`,
			whatsappBody: buildWhatsAppBody({
				title: "Appointment Reminder (1 Hour)",
				note: "Please be ready for your consultation.",
			}),
		},
	};

	const selected = templates[eventType] || templates.CONSULTATION_COMPLETED;

	return {
		...selected,
		emailText: `HealthMate Notification\n\n${selected.emailHeading}.\nAppointment ID: ${appointmentId}\nDate & Time: ${dateTime}\nPatient: ${patientName}\nDoctor: ${doctorName}\n\nThis is an automated message from HealthMate.`,
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
		return { status: "skipped", reason: "recipient missing", attempts: 0 };
	}

	for (let attempt = 0; attempt <= MAX_RETRY_ATTEMPTS; attempt += 1) {
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
				return { status: "skipped", reason: providerResponse.message, attempts: attempt + 1 };
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

			return { status: "sent", attempts: attempt + 1 };
		} catch (error) {
			if (attempt < MAX_RETRY_ATTEMPTS) {
				continue;
			}

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

			return { status: "failed", reason: error.message, attempts: attempt + 1 };
		}
	}

	return { status: "failed", reason: "unknown error", attempts: MAX_RETRY_ATTEMPTS + 1 };
};

const clearReminderTimers = (appointmentId) => {
	if (!appointmentId) {
		return;
	}

	for (const [key, timerId] of reminderTimers.entries()) {
		if (!key.startsWith(`${appointmentId}:`)) {
			continue;
		}

		clearTimeout(timerId);
		reminderTimers.delete(key);
	}
};

const scheduleReminderNotification = ({ triggerAt, payload, reminderEventType }) => {
	if (!(triggerAt instanceof Date) || Number.isNaN(triggerAt.getTime())) {
		return;
	}

	const delay = triggerAt.getTime() - Date.now();
	if (delay <= 0) {
		return;
	}

	const key = `${payload.appointmentId}:${reminderEventType}`;
	if (reminderTimers.has(key)) {
		clearTimeout(reminderTimers.get(key));
	}

	const timerId = setTimeout(async () => {
		reminderTimers.delete(key);
		await dispatchAppointmentNotification(
			{
				...payload,
				eventType: reminderEventType,
			},
			{ scheduleReminders: false }
		);
	}, delay);

	reminderTimers.set(key, timerId);
};

const scheduleReminderTimers = (payload) => {
	const appointmentDateTime = getDateTimeValue(payload.appointmentDate, payload.slotTime);
	if (!appointmentDateTime) {
		return;
	}

	clearReminderTimers(payload.appointmentId);

	scheduleReminderNotification({
		triggerAt: new Date(appointmentDateTime.getTime() - 24 * 60 * 60 * 1000),
		payload,
		reminderEventType: "APPOINTMENT_REMINDER_24H",
	});

	scheduleReminderNotification({
		triggerAt: new Date(appointmentDateTime.getTime() - 60 * 60 * 1000),
		payload,
		reminderEventType: "APPOINTMENT_REMINDER_1H",
	});
};

const dispatchAppointmentNotification = async (payload, options = { scheduleReminders: true }) => {
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
		patientWhatsAppOptIn,
		doctorWhatsAppOptIn,
	} = payload;

	if (!eventType || !appointmentId || !patientName || !doctorName) {
		return {
			success: false,
			statusCode: 400,
			message: "eventType, appointmentId, patientName and doctorName are required",
		};
	}

	if (
		![
			"APPOINTMENT_CONFIRMED",
			"APPOINTMENT_RESCHEDULED",
			"APPOINTMENT_CANCELLED",
			"CONSULTATION_COMPLETED",
			"APPOINTMENT_DELETED",
			"APPOINTMENT_REMINDER_24H",
			"APPOINTMENT_REMINDER_1H",
		].includes(eventType)
	) {
		return {
			success: false,
			statusCode: 400,
			message: "invalid eventType",
		};
	}

	if (["APPOINTMENT_CANCELLED", "APPOINTMENT_DELETED"].includes(eventType)) {
		clearReminderTimers(appointmentId);
	}

	if (eventType === "APPOINTMENT_CONFIRMED" && options.scheduleReminders !== false) {
		scheduleReminderTimers({
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
			patientWhatsAppOptIn,
			doctorWhatsAppOptIn,
		});
	}

	const message = buildNotificationMessage({
		eventType,
		appointmentId,
		patientName,
		doctorName,
		appointmentDate,
		slotTime,
	});

	const patientOptIn = parseOptIn(patientWhatsAppOptIn, true);
	const doctorOptIn = parseOptIn(doctorWhatsAppOptIn, true);

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

	const patientWhatsAppResult = await processChannel({
		eventType,
		channel: "whatsapp",
		recipientRole: "patient",
		recipient: patientOptIn ? patientPhone : null,
		appointmentId,
		message: message.whatsappBody,
		sender: () => sendWhatsApp({ to: patientPhone, body: message.whatsappBody }),
	});

	if (patientWhatsAppResult.status !== "sent" && patientEmail) {
		await processChannel({
			eventType,
			channel: "email",
			recipientRole: "patient",
			recipient: patientEmail,
			appointmentId,
			message: `[WhatsApp fallback] ${message.subject}`,
			sender: () =>
				sendEmail({
					to: patientEmail,
					subject: `[WhatsApp fallback] ${message.subject}`,
					text: `${message.emailText}\n\nReason: ${patientWhatsAppResult.reason || "whatsapp not delivered"}`,
				}),
		});
	}

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

	const doctorWhatsAppResult = await processChannel({
		eventType,
		channel: "whatsapp",
		recipientRole: "doctor",
		recipient: doctorOptIn ? doctorPhone : null,
		appointmentId,
		message: message.whatsappBody,
		sender: () => sendWhatsApp({ to: doctorPhone, body: message.whatsappBody }),
	});

	if (doctorWhatsAppResult.status !== "sent" && doctorEmail) {
		await processChannel({
			eventType,
			channel: "email",
			recipientRole: "doctor",
			recipient: doctorEmail,
			appointmentId,
			message: `[WhatsApp fallback] ${message.subject}`,
			sender: () =>
				sendEmail({
					to: doctorEmail,
					subject: `[WhatsApp fallback] ${message.subject}`,
					text: `${message.emailText}\n\nReason: ${doctorWhatsAppResult.reason || "whatsapp not delivered"}`,
				}),
		});
	}

	return { success: true, statusCode: 200, message: "notifications processed" };
};

const notifyAppointmentEvent = async (req, res) => {
	try {
		const result = await dispatchAppointmentNotification(req.body);
		return res.status(result.statusCode).json({ message: result.message });
	} catch (error) {
		return res.status(500).json({ message: "failed to process notifications", error: error.message });
	}
};

const getWhatsAppConnectionStatus = (_req, res) => {
	return res.status(200).json(getWhatsAppStatus());
};

const getWhatsAppQr = async (_req, res) => {
	const status = getWhatsAppStatus();
	if (!status.enabled) {
		return res.status(400).json({ message: "WhatsApp is disabled" });
	}

	if (status.ready) {
		return res.status(200).json({ ready: true, message: "WhatsApp client is already connected" });
	}

	const qrDataUrl = await getWhatsAppQrDataUrl();
	if (!qrDataUrl) {
		return res.status(404).json({ message: "QR not available yet. check logs and retry in a few seconds" });
	}

	return res.status(200).json({ ready: false, qrDataUrl });
};

module.exports = {
	notifyAppointmentEvent,
	getWhatsAppConnectionStatus,
	getWhatsAppQr,
	dispatchAppointmentNotification,
};
