const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");

const { RtcTokenBuilder, RtcRole } = require("agora-token");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
	res.status(200).json({ service: "telemedicine-service", status: "ok" });
});

const getRequesterId = (user = {}) => {
	if (typeof user.sub === "string" && user.sub.trim()) {
		return user.sub.trim();
	}
	if (typeof user.id === "string" && user.id.trim()) {
		return user.id.trim();
	}
	if (typeof user._id === "string" && user._id.trim()) {
		return user._id.trim();
	}
	return "";
};

const verifyAccessToken = (req, res, next) => {
	const authHeader = req.headers.authorization || "";
	if (!authHeader.startsWith("Bearer ")) {
		return res.status(401).json({ message: "missing or invalid authorization header" });
	}

	const token = authHeader.slice(7).trim();
	const secret = process.env.JWT_SECRET;
	if (!secret) {
		return res.status(500).json({ message: "JWT_SECRET is missing" });
	}

	try {
		const payload = jwt.verify(token, secret);
		req.user = payload;
		return next();
	} catch (error) {
		return res.status(401).json({ message: "invalid or expired token" });
	}
};

const APPOINTMENT_SERVICE_URL =
	process.env.APPOINTMENT_SERVICE_URL ||
	"http://appointment-service:5004/api/appointments";
const APPOINTMENT_SERVICE_FALLBACK_URL =
	process.env.APPOINTMENT_SERVICE_FALLBACK_URL ||
	"http://localhost:5004/api/appointments";
const APPOINTMENT_INTERNAL_TOKEN =
	process.env.APPOINTMENT_INTERNAL_TOKEN ||
	"healthmate-internal-token";
const TELEMEDICINE_JOIN_BEFORE_MINUTES = Number(process.env.TELEMEDICINE_JOIN_BEFORE_MINUTES || 15);
const TELEMEDICINE_JOIN_AFTER_MINUTES = Number(process.env.TELEMEDICINE_JOIN_AFTER_MINUTES || 120);

const fetchAppointment = async (appointmentRef) => {
	const baseUrls = APPOINTMENT_SERVICE_URL === APPOINTMENT_SERVICE_FALLBACK_URL
		? [APPOINTMENT_SERVICE_URL]
		: [APPOINTMENT_SERVICE_URL, APPOINTMENT_SERVICE_FALLBACK_URL];

	let lastError = null;
	for (const baseUrl of baseUrls) {
		const url = `${baseUrl}/internal/${encodeURIComponent(appointmentRef)}`;
		try {
			const response = await fetch(url, {
				method: "GET",
				headers: {
					"x-internal-token": APPOINTMENT_INTERNAL_TOKEN,
				},
			});

			const payload = await response.json().catch(() => ({}));
			if (!response.ok) {
				const errorMessage = payload?.message || `failed to fetch appointment (HTTP ${response.status})`;
				const error = new Error(errorMessage);
				error.statusCode = response.status;
				throw error;
			}

			return payload?.appointment;
		} catch (error) {
			lastError = error;
			const canRetry = error?.statusCode === undefined;
			if (!canRetry) {
				throw error;
			}
		}
	}

	throw lastError || new Error("failed to fetch appointment");
};

const isWithinAllowedJoinWindow = (appointmentDateTime) => {
	const scheduledAt = new Date(appointmentDateTime);
	if (Number.isNaN(scheduledAt.getTime())) {
		return false;
	}

	const joinOpensAt = scheduledAt.getTime() - TELEMEDICINE_JOIN_BEFORE_MINUTES * 60 * 1000;
	const joinClosesAt = scheduledAt.getTime() + TELEMEDICINE_JOIN_AFTER_MINUTES * 60 * 1000;
	const now = Date.now();
	return now >= joinOpensAt && now <= joinClosesAt;
};

app.post("/api/telemedicine/sessions", verifyAccessToken, async (req, res) => {
	const { roomId } = req.body || {};

	if (!roomId) {
		return res.status(400).json({ message: "roomId is required" });
	}

	if (!["doctor", "patient"].includes(req.user?.role)) {
		return res.status(403).json({ message: "only doctor or patient can create telemedicine sessions" });
	}

	const requesterId = getRequesterId(req.user);
	if (!requesterId) {
		return res.status(401).json({ message: "invalid token payload" });
	}

	let appointment;
	try {
		appointment = await fetchAppointment(String(roomId).trim());
	} catch (error) {
		const status = Number(error?.statusCode) || 500;
		if (status === 404) {
			return res.status(404).json({ message: "appointment not found for provided roomId" });
		}
		if (status === 401) {
			return res.status(500).json({ message: "telemedicine internal auth misconfigured" });
		}
		return res.status(500).json({ message: "failed to validate appointment", detail: error.message });
	}

	if (appointment?.mode !== "online") {
		return res.status(400).json({ message: "telemedicine is available only for online appointments" });
	}

	if (appointment?.status !== "confirmed") {
		return res.status(400).json({ message: "only confirmed appointments can start telemedicine sessions" });
	}

	if (!isWithinAllowedJoinWindow(appointment?.appointmentDateTime)) {
		return res.status(403).json({
			message: `session join is allowed from ${TELEMEDICINE_JOIN_BEFORE_MINUTES} minutes before until ${TELEMEDICINE_JOIN_AFTER_MINUTES} minutes after appointment start`,
		});
	}

	if (req.user.role === "doctor" && String(appointment?.doctorId) !== String(requesterId)) {
		return res.status(403).json({ message: "you can only start sessions for your own appointments" });
	}

	if (req.user.role === "patient" && String(appointment?.patientId) !== String(requesterId)) {
		return res.status(403).json({ message: "you can only join sessions for your own appointments" });
	}

	const appId = process.env.AGORA_APP_ID;
	const appCertificate = process.env.AGORA_APP_CERTIFICATE;
	const clientRole = req.user.role === "doctor" ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;

	if (!appId || !appCertificate) {
		return res.status(500).json({
			message: "Agora is not configured. Set AGORA_APP_ID and AGORA_APP_CERTIFICATE in telemedicine-service .env",
		});
	}

	// Agora channel names should be short and safe. Keep alphanumerics/underscore/hyphen.
	const channelName = String(roomId).replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 64);

	// Use integer uid. 0 means Agora will assign one (works with some SDK flows), but token builder needs a uid.
	const uid = Math.floor(Math.random() * 1000000000);

	const expireSeconds = Number(process.env.AGORA_TOKEN_EXPIRE_SECONDS || 3600);
	const currentTimestamp = Math.floor(Date.now() / 1000);
	const privilegeExpire = currentTimestamp + expireSeconds;

	let token;
	try {
		token = RtcTokenBuilder.buildTokenWithUid(appId, appCertificate, channelName, uid, clientRole, privilegeExpire);
	} catch (err) {
		return res.status(500).json({ message: "Failed to generate Agora token", detail: err.message });
	}

	return res.status(201).json({
		provider: "agora",
		channelName,
		uid,
		appId,
		token,
	});
});

module.exports = app;
