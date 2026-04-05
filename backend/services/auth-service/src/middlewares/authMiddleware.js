const jwt = require("jsonwebtoken");

const verifyAccessToken = (req, res, next) => {
	const authHeader = req.headers.authorization || "";
	const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

	if (!token) {
		return res.status(401).json({ message: "authorization token is required" });
	}

	const secret = process.env.JWT_SECRET;
	if (!secret) {
		return res.status(500).json({ message: "JWT_SECRET is not configured" });
	}

	try {
		const payload = jwt.verify(token, secret);
		req.user = payload;
		return next();
	} catch {
		return res.status(401).json({ message: "invalid or expired token" });
	}
};

module.exports = {
	verifyAccessToken,
};
