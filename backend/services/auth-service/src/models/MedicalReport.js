const mongoose = require("mongoose");

const medicalReportSchema = new mongoose.Schema(
	{
		reportId: {
			type: String,
			required: true,
			unique: true,
			trim: true,
		},
		patientId: {
			type: mongoose.Schema.Types.ObjectId,
			required: true,
			ref: "User",
		},
		patientName: {
			type: String,
			required: true,
			trim: true,
		},
		reportTitle: {
			type: String,
			required: true,
			trim: true,
		},
		reportType: {
			type: String,
			required: true,
			trim: true,
		},
		doctorId: {
			type: mongoose.Schema.Types.ObjectId,
			required: true,
			ref: "User",
		},
		doctorName: {
			type: String,
			required: true,
			trim: true,
		},
		hospitalLabName: {
			type: String,
			required: true,
			trim: true,
		},
		reportDate: {
			type: Date,
			required: true,
		},
		notes: {
			type: String,
			default: "",
			trim: true,
		},
		fileName: {
			type: String,
			required: true,
			trim: true,
		},
		fileSize: {
			type: Number,
			required: true,
			min: 0,
		},
		fileData: {
			type: String,
			required: true,
		},
	},
	{ timestamps: true }
);

medicalReportSchema.index({ patientId: 1, createdAt: -1 });
medicalReportSchema.index({ doctorId: 1, createdAt: -1 });

module.exports = mongoose.model("MedicalReport", medicalReportSchema);
