const express = require("express");
const cors = require("cors");

const { RtcTokenBuilder, RtcRole } = require("agora-token");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
	res.status(200).json({ service: "telemedicine-service", status: "ok" });
});

app.post("/api/telemedicine/sessions", (req, res) => {
	const { roomId, role } = req.body || {};

	if (!roomId) {
		return res.status(400).json({ message: "roomId is required" });
	}

	const appId = process.env.AGORA_APP_ID;
	const appCertificate = process.env.AGORA_APP_CERTIFICATE;
	const clientRole = (role || "patient") === "doctor" ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;

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
