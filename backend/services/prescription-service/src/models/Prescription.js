const mongoose = require("mongoose");

const generatePrescriptionId = () => {
	const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
	const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
	return `RX-${datePart}-${randomPart}`;
};

const medicationSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: true,
			trim: true,
		},
		dosage: {
			type: String,
			required: true,
			trim: true,
		},
		frequency: {
			type: String,
			required: true,
			trim: true,
		},
		duration: {
			type: String,
			default: "",
			trim: true,
		},
		instructions: {
			type: String,
			default: "",
			trim: true,
		},
	},
	{ _id: false }
);

const prescriptionSchema = new mongoose.Schema(
	{
		prescriptionId: {
			type: String,
			required: true,
			unique: true,
			default: generatePrescriptionId,
			immutable: true,
		},
		appointmentId: {
			type: String,
			required: true,
			index: true,
		},
		appointmentReference: {
			type: String,
			default: "",
			trim: true,
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
		diagnosis: {
			type: String,
			required: true,
			trim: true,
			maxlength: 500,
		},
		medications: {
			type: [medicationSchema],
			default: [],
		},
		notes: {
			type: String,
			default: "",
			trim: true,
			maxlength: 2000,
		},
		status: {
			type: String,
			enum: ["Issued"],
			default: "Issued",
		},
		issuedAt: {
			type: Date,
			default: Date.now,
		},
	},
	{ timestamps: true }
);

prescriptionSchema.index({ patientId: 1, issuedAt: -1 });
prescriptionSchema.index({ doctorId: 1, issuedAt: -1 });
prescriptionSchema.index({ appointmentId: 1 }, { unique: true });

module.exports = mongoose.model("Prescription", prescriptionSchema);
