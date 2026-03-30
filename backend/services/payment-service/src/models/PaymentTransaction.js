const mongoose = require("mongoose");

const generateTransactionId = () => {
	const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
	const randomPart = Math.random().toString(36).slice(2, 10).toUpperCase();
	return `PAY-${datePart}-${randomPart}`;
};

const paymentTransactionSchema = new mongoose.Schema(
	{
		transactionId: {
			type: String,
			required: true,
			unique: true,
			default: generateTransactionId,
			immutable: true,
		},
		appointmentId: {
			type: mongoose.Schema.Types.ObjectId,
			required: true,
			index: true,
		},
		patientId: {
			type: mongoose.Schema.Types.ObjectId,
			required: true,
			index: true,
		},
		amount: {
			type: Number,
			required: true,
			min: 0,
		},
		currency: {
			type: String,
			required: true,
			default: "LKR",
			uppercase: true,
			trim: true,
		},
		provider: {
			type: String,
			required: true,
			default: "mock",
			trim: true,
		},
		status: {
			type: String,
			enum: ["pending", "succeeded", "failed"],
			default: "pending",
		},
		paymentMethod: {
			type: String,
			trim: true,
		},
		paymentReference: {
			type: String,
			trim: true,
		},
		gatewayPayload: {
			type: mongoose.Schema.Types.Mixed,
		},
		errorMessage: {
			type: String,
			trim: true,
		},
		paidAt: {
			type: Date,
		},
	},
	{ timestamps: true }
);

module.exports = mongoose.model("PaymentTransaction", paymentTransactionSchema);
