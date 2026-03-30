const mongoose = require("mongoose");

let authConnection;

const resolveAuthMongoUri = () => {
	if (process.env.AUTH_MONGO_URI) {
		return process.env.AUTH_MONGO_URI;
	}

	if (process.env.MONGO_URI_AUTH) {
		return process.env.MONGO_URI_AUTH;
	}

	if ((process.env.MONGO_URI || "").includes("healthmate_admin")) {
		return process.env.MONGO_URI.replace("healthmate_admin", "healthmate_auth");
	}

	return process.env.MONGO_URI;
};

const getAuthConnection = async () => {
	if (authConnection?.readyState === 1) {
		return authConnection;
	}

	const authMongoUri = resolveAuthMongoUri();
	if (!authMongoUri) {
		throw new Error("AUTH_MONGO_URI (or MONGO_URI_AUTH) is missing in environment variables");
	}

	authConnection = mongoose.createConnection(authMongoUri, {
		serverSelectionTimeoutMS: 15000,
	});

	await authConnection.asPromise();
	return authConnection;
};

module.exports = {
	getAuthConnection,
};
