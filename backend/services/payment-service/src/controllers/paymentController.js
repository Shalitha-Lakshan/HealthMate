const PaymentTransaction = require("../models/PaymentTransaction");
const Stripe = require("stripe");

const APPOINTMENT_SERVICE_URL =
	process.env.APPOINTMENT_SERVICE_URL || "http://localhost:5004/api/appointments";
const APPOINTMENT_INTERNAL_TOKEN = process.env.APPOINTMENT_INTERNAL_TOKEN || "healthmate-internal-token";
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const PAYMENT_SUCCESS_URL = process.env.PAYMENT_SUCCESS_URL || "http://localhost:5173/dashboard/patient?payment=success";
const PAYMENT_CANCEL_URL = process.env.PAYMENT_CANCEL_URL || "http://localhost:5173/dashboard/patient?payment=cancel";

const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;

const toSmallestCurrencyUnit = (amount) => Math.round(Number(amount) * 100);

const confirmAppointmentInternally = async ({ appointmentId, patientId, paymentMethod, paymentReference }) => {
	const response = await fetch(`${APPOINTMENT_SERVICE_URL}/internal/payment-confirmation`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-internal-token": APPOINTMENT_INTERNAL_TOKEN,
		},
		body: JSON.stringify({
			appointmentId,
			patientId,
			paymentMethod,
			paymentReference,
		}),
	});

	const appointmentResponse = await response.json();

	return { response, appointmentResponse };
};

const initiatePayment = async (req, res) => {
	try {
		const {
			appointmentId,
			amount,
			currency = "LKR",
			provider = "stripe",
			successUrl = PAYMENT_SUCCESS_URL,
			cancelUrl = PAYMENT_CANCEL_URL,
		} = req.body;

		if (!appointmentId || amount === undefined) {
			return res.status(400).json({ message: "appointmentId and amount are required" });
		}

		if (provider !== "stripe") {
			return res.status(400).json({ message: "unsupported provider. currently supported provider: stripe" });
		}

		if (!stripe) {
			return res.status(500).json({ message: "STRIPE_SECRET_KEY is missing in environment variables" });
		}

		const parsedAmount = Number(amount);
		if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
			return res.status(400).json({ message: "amount must be a valid number greater than 0" });
		}

		const paymentTransaction = await PaymentTransaction.create({
			appointmentId,
			patientId: req.user.sub,
			amount: parsedAmount,
			currency,
			provider,
			status: "pending",
		});

		const checkoutSession = await stripe.checkout.sessions.create({
			mode: "payment",
			payment_method_types: ["card"],
			line_items: [
				{
					price_data: {
						currency: currency.toLowerCase(),
						product_data: {
							name: `Consultation Fee - ${paymentTransaction.transactionId}`,
						},
						unit_amount: toSmallestCurrencyUnit(parsedAmount),
					},
					quantity: 1,
				},
			],
			success_url: `${successUrl}&tx=${paymentTransaction.transactionId}&session_id={CHECKOUT_SESSION_ID}`,
			cancel_url: `${cancelUrl}&tx=${paymentTransaction.transactionId}`,
			metadata: {
				transactionId: paymentTransaction.transactionId,
				appointmentId: String(appointmentId),
				patientId: String(req.user.sub),
			},
		});

		paymentTransaction.gatewayPayload = {
			stripeSessionId: checkoutSession.id,
			stripeSessionStatus: checkoutSession.status,
		};
		await paymentTransaction.save();

		return res.status(201).json({
			message: "payment initiated",
			transaction: paymentTransaction,
			checkoutUrl: checkoutSession.url,
		});
	} catch (error) {
		return res.status(500).json({ message: "failed to initiate payment", error: error.message });
	}
};

const completePayment = async (req, res) => {
	try {
		const { transactionId } = req.params;
		const { paymentMethod = "stripe-card", gatewaySessionId } = req.body;

		const transaction = await PaymentTransaction.findOne({ transactionId });
		if (!transaction) {
			return res.status(404).json({ message: "payment transaction not found" });
		}

		if (String(transaction.patientId) !== String(req.user.sub)) {
			return res.status(403).json({ message: "you can only pay your own appointment transactions" });
		}

		if (transaction.status === "succeeded") {
			return res.status(200).json({
				message: "payment already completed",
				transaction,
			});
		}

		if (transaction.status !== "pending") {
			return res.status(400).json({ message: "transaction is not in pending state" });
		}

		if (transaction.provider !== "stripe") {
			return res.status(400).json({ message: "unsupported provider for completion" });
		}

		if (!stripe) {
			return res.status(500).json({ message: "STRIPE_SECRET_KEY is missing in environment variables" });
		}

		const stripeSessionId = gatewaySessionId || transaction.gatewayPayload?.stripeSessionId;
		if (!stripeSessionId) {
			return res.status(400).json({ message: "gatewaySessionId is required" });
		}

		const checkoutSession = await stripe.checkout.sessions.retrieve(stripeSessionId);
		if (checkoutSession.payment_status !== "paid") {
			return res.status(400).json({ message: "payment not completed on stripe checkout" });
		}

		const paymentReference = checkoutSession.payment_intent || checkoutSession.id;

		const { response, appointmentResponse } = await confirmAppointmentInternally({
			appointmentId: transaction.appointmentId,
			patientId: req.user.sub,
			paymentMethod,
			paymentReference,
		});

		if (!response.ok) {
			transaction.status = "failed";
			transaction.errorMessage = appointmentResponse.message || "appointment confirmation failed";
			transaction.paymentMethod = paymentMethod;
			transaction.paymentReference = paymentReference;
			transaction.gatewayPayload = {
				...(transaction.gatewayPayload || {}),
				stripeSessionId,
				stripeSessionStatus: checkoutSession.status,
				appointmentResponse,
			};
			await transaction.save();

			return res
				.status(response.status)
				.json({ message: appointmentResponse.message || "payment failed", transaction });
		}

		transaction.status = "succeeded";
		transaction.paymentMethod = paymentMethod;
		transaction.paymentReference = paymentReference;
		transaction.gatewayPayload = {
			...(transaction.gatewayPayload || {}),
			stripeSessionId,
			stripeSessionStatus: checkoutSession.status,
			appointmentResponse,
		};
		transaction.paidAt = new Date();
		await transaction.save();

		return res.status(200).json({
			message: "payment successful",
			transaction,
			appointment: appointmentResponse.appointment,
		});
	} catch (error) {
		return res.status(500).json({ message: "failed to complete payment", error: error.message });
	}
};

const getPaymentByTransactionId = async (req, res) => {
	try {
		const { transactionId } = req.params;
		const transaction = await PaymentTransaction.findOne({ transactionId });

		if (!transaction) {
			return res.status(404).json({ message: "payment transaction not found" });
		}

		if (String(transaction.patientId) !== String(req.user.sub)) {
			return res.status(403).json({ message: "you can only view your own payment transactions" });
		}

		return res.status(200).json({ transaction });
	} catch (error) {
		return res.status(500).json({ message: "failed to fetch payment transaction", error: error.message });
	}
};

module.exports = {
	initiatePayment,
	completePayment,
	getPaymentByTransactionId,
};
