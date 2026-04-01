const mongoose = require("mongoose");

const generatePrescriptionId = () => {
	const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
	const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
	return `RX-${datePart}-${randomPart}`;
};

const medicationSchema = new mongoose.Schema(
	{
		name: { type: String, required: true, trim: true },
		dosage: { type: String, trim: true },
		frequency: { type: String, trim: true },
		duration: { type: String, trim: true },
		instructions: { type: String, trim: true },
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
		appointmentId: { type: String, index: true, trim: true },
		doctorId: { type: String, required: true, index: true, trim: true },
		doctorName: { type: String, required: true, trim: true },
		patientId: { type: String, required: true, index: true, trim: true },
		patientName: { type: String, required: true, trim: true },
		diagnosis: { type: String, trim: true, maxlength: 500 },
		medications: {
			type: [medicationSchema],
			required: true,
			validate: {
				validator: (value) => Array.isArray(value) && value.length > 0,
				message: "At least one medication is required",
			},
		},
		notes: { type: String, trim: true, maxlength: 2000 },
		status: {
			type: String,
			enum: ["draft", "finalized"],
			default: "draft",
		},
		finalizedAt: { type: Date },
	},
	{ timestamps: true }
);

module.exports = mongoose.model("Prescription", prescriptionSchema);
