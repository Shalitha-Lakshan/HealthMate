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

const authorizeRoles = (...roles) => (req, res, next) => {
	if (!req.user?.role) {
		return res.status(403).json({ message: "role not found in token" });
	}

	if (!roles.includes(req.user.role)) {
		return res.status(403).json({ message: "you do not have permission for this action" });
	}

	return next();
};

module.exports = {
	requireAuth,
	authorizeRoles,
};
