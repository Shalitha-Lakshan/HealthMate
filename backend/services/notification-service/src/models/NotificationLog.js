// Notification log model
// Stores delivery results for each channel and recipient
const mongoose = require("mongoose");

const notificationLogSchema = new mongoose.Schema(
	{
		eventType: {
			type: String,
			required: true,
			trim: true,
		},
		channel: {
			type: String,
			enum: ["email", "sms", "whatsapp"],
			required: true,
		},
		recipientRole: {
			type: String,
			enum: ["patient", "doctor"],
			required: true,
		},
		recipient: {
			type: String,
			required: true,
			trim: true,
		},
		status: {
			type: String,
			enum: ["sent", "failed", "skipped"],
			required: true,
		},
		appointmentId: {
			type: String,
			trim: true,
		},
		message: {
			type: String,
			trim: true,
		},
		errorMessage: {
			type: String,
			trim: true,
		},
		providerResponse: {
			type: mongoose.Schema.Types.Mixed,
		},
	},
	{ timestamps: true }
);

// Export NotificationLog model
module.exports = mongoose.model("NotificationLog", notificationLogSchema);
