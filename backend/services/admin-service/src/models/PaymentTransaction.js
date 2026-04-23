// Payment transaction read model for admin-service
// Uses payment DB connection to read transaction analytics data
const mongoose = require("mongoose");
const { getPaymentConnection } = require("../config/paymentDb");

const paymentTransactionSchema = new mongoose.Schema(
	{
		transactionId: { type: String, trim: true },
		appointmentId: { type: mongoose.Schema.Types.ObjectId },
		patientId: { type: mongoose.Schema.Types.ObjectId },
		amount: { type: Number },
		currency: { type: String, trim: true, uppercase: true },
		provider: { type: String, trim: true },
		status: { type: String, enum: ["pending", "succeeded", "failed"] },
		paymentMethod: { type: String, trim: true },
		paymentReference: { type: String, trim: true },
		gatewayPayload: { type: mongoose.Schema.Types.Mixed },
		errorMessage: { type: String, trim: true },
		paidAt: { type: Date },
	},
	{ timestamps: true, strict: false }
);

// Return PaymentTransaction model from payment DB connection
const getPaymentTransactionModel = async () => {
	const connection = await getPaymentConnection();
	return (
		connection.models.PaymentTransaction ||
		connection.model("PaymentTransaction", paymentTransactionSchema, "paymenttransactions")
	);
};

module.exports = {
	getPaymentTransactionModel,
};
