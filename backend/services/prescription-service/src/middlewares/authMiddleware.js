const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
	const authHeader = req.headers.authorization;

	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return res.status(401).json({ message: "Missing or invalid authorization header" });
	}

	const token = authHeader.split(" ")[1];
	const secret = process.env.JWT_SECRET;

	if (!secret) {
		return res.status(500).json({ message: "JWT_SECRET is missing" });
	}

	try {
		const payload = jwt.verify(token, secret);
		req.user = payload;
		next();
	} catch (_error) {
		return res.status(401).json({ message: "Invalid or expired token" });
	}
};

const verifyRole = (...roles) => (req, res, next) => {
	if (!req.user?.role) {
		return res.status(403).json({ message: "Role not found in token" });
	}

	if (!roles.includes(req.user.role)) {
		return res.status(403).json({ message: "Insufficient permissions" });
	}

	next();
};

module.exports = { verifyToken, verifyRole };
