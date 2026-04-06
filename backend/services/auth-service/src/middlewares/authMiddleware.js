const jwt = require("jsonwebtoken");

const requireAuth = (req, res, next) => {
	const authHeader = req.headers.authorization;

	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return res.status(401).json({ message: "missing or invalid authorization header" });
	}

	const token = authHeader.split(" ")[1];
	const secret = process.env.JWT_SECRET;

	if (!secret) {
		return res.status(500).json({ message: "JWT_SECRET is missing in environment variables" });
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
	requireAuth,
};
