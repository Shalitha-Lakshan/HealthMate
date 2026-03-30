const mongoose = require("mongoose");

let paymentConnection;

const resolvePaymentMongoUri = () => {
	if (process.env.PAYMENT_MONGO_URI) {
		return process.env.PAYMENT_MONGO_URI;
	}

	if (process.env.MONGO_URI_PAYMENT) {
		return process.env.MONGO_URI_PAYMENT;
	}

	if ((process.env.MONGO_URI || "").includes("healthmate_admin")) {
		return process.env.MONGO_URI.replace("healthmate_admin", "healthmate_payment");
	}

	return process.env.MONGO_URI;
};

const getPaymentConnection = async () => {
	if (paymentConnection?.readyState === 1) {
		return paymentConnection;
	}

	const paymentMongoUri = resolvePaymentMongoUri();
	if (!paymentMongoUri) {
		throw new Error("PAYMENT_MONGO_URI (or MONGO_URI_PAYMENT) is missing in environment variables");
	}

	paymentConnection = mongoose.createConnection(paymentMongoUri, {
		serverSelectionTimeoutMS: 15000,
	});

	await paymentConnection.asPromise();
	return paymentConnection;
};

module.exports = {
	getPaymentConnection,
};
