const mongoose = require("mongoose");

const generateAppointmentId = () => {
	const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
	const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
	return `APT-${datePart}-${randomPart}`;
};

const appointmentSchema = new mongoose.Schema(
	{
		appointmentId: {
			type: String,
			required: true,
			unique: true,
			default: generateAppointmentId,
			immutable: true,
		},
		patientId: {
			type: String,
			required: true,
			index: true,
		},
		patientName: {
			type: String,
			required: true,
			trim: true,
		},
		patientEmail: {
			type: String,
			required: true,
			trim: true,
			lowercase: true,
		},
		patientPhone: {
			type: String,
			required: true,
			trim: true,
		},
		patientWhatsAppOptIn: {
			type: Boolean,
			default: true,
		},
		patientAge: {
			type: Number,
			required: true,
			min: 1,
			max: 150,
		},
		doctorId: {
			type: String,
			required: true,
			index: true,
		},
		doctorName: {
			type: String,
			required: true,
			trim: true,
		},
		doctorEmail: {
			type: String,
			required: true,
			trim: true,
			lowercase: true,
		},
		doctorPhone: {
			type: String,
			required: true,
			trim: true,
		},
		doctorWhatsAppOptIn: {
			type: Boolean,
			default: true,
		},
		specialty: {
			type: String,
			required: true,
			trim: true,
		},
		appointmentDateTime: {
			type: Date,
			required: true,
		},
		appointmentDate: {
			type: String,
			required: true,
			trim: true,
		},
		slotTime: {
			type: String,
			required: true,
			trim: true,
		},
		mode: {
			type: String,
			enum: ["online", "in-person"],
			default: "in-person",
		},
		reason: {
			type: String,
			default: "",
			trim: true,
			maxlength: 500,
		},
		status: {
			type: String,
			enum: [
				"pending_payment",
				"pending",
				"confirmed",
				"cancelled",
				"completed",
				"rejected",
				"payment_failed",
				"expired",
			],
			default: "pending_payment",
		},
		paymentStatus: {
			type: String,
			enum: ["pending", "paid", "failed"],
			default: "pending",
		},
		consultationFee: {
			type: Number,
			required: true,
			min: 0,
			default: 3500,
		},
		currency: {
			type: String,
			default: "LKR",
			uppercase: true,
			trim: true,
		},
		paymentMethod: {
			type: String,
			trim: true,
		},
		paymentReference: {
			type: String,
			trim: true,
		},
		paymentExpiresAt: {
			type: Date,
		},
	},
	{ timestamps: true }
);

appointmentSchema.index({ doctorId: 1, appointmentDate: 1, slotTime: 1 });

module.exports = mongoose.model("Appointment", appointmentSchema);
