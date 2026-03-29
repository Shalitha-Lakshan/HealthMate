const NOTIFICATION_INTERNAL_TOKEN = process.env.NOTIFICATION_INTERNAL_TOKEN || "healthmate-internal-token";

const requireInternalToken = (req, res, next) => {
	const token = req.headers["x-internal-token"];

	if (!token || token !== NOTIFICATION_INTERNAL_TOKEN) {
		return res.status(401).json({ message: "invalid internal service token" });
	}

	return next();
};

module.exports = {
	requireInternalToken,
};
