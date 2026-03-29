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
			type: mongoose.Schema.Types.ObjectId,
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
		patientAge: {
			type: Number,
			required: true,
			min: 0,
			max: 120,
		},
		doctorName: {
			type: String,
			required: true,
			trim: true,
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
		mode: {
			type: String,
			enum: ["online", "in-person"],
			default: "in-person",
		},
		reason: {
			type: String,
			required: true,
			trim: true,
			maxlength: 500,
		},
		status: {
			type: String,
			enum: ["pending", "confirmed", "cancelled", "completed"],
			default: "pending",
		},
	},
	{ timestamps: true }
);

module.exports = mongoose.model("Appointment", appointmentSchema);
