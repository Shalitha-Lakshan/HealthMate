const generateAccessToken = (payload) => {
	const jwt = require("jsonwebtoken");
	const secret = process.env.JWT_SECRET;
	const expiresIn = process.env.JWT_EXPIRES_IN || "1d";

	if (!secret) {
		throw new Error("JWT_SECRET is missing in environment variables");
	}

	return jwt.sign(payload, secret, { expiresIn });
};

module.exports = { generateAccessToken };
