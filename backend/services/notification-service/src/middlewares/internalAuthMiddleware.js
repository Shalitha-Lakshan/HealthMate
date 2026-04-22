// Middleware for service-to-service authentication
// Validates x-internal-token header
const NOTIFICATION_INTERNAL_TOKEN = process.env.NOTIFICATION_INTERNAL_TOKEN || "healthmate-internal-token";

// Allow request only when internal token is valid
const requireInternalToken = (req, res, next) => {
	const token = req.headers["x-internal-token"];

	if (!token || token !== NOTIFICATION_INTERNAL_TOKEN) {
		return res.status(401).json({ message: "invalid internal service token" });
	}

	return next();
};

// Export middleware
module.exports = {
	requireInternalToken,
};
