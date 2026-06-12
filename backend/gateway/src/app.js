const express = require("express");
const cors = require("cors");

const app = express();
const normalizeUrl = (urlStr, defaultVal) => {
	let value = urlStr || defaultVal;
	if (!value) return "";
	value = value.trim();
	if (!value.startsWith("http://") && !value.startsWith("https://")) {
		value = `http://${value}`;
	}
	return value;
};

const AUTH_SERVICE_URL = normalizeUrl(process.env.AUTH_SERVICE_URL, "http://localhost:5001");
const PATIENT_SERVICE_URL = normalizeUrl(process.env.PATIENT_SERVICE_URL, "http://localhost:5002");
const DOCTOR_SERVICE_URL = normalizeUrl(process.env.DOCTOR_SERVICE_URL, "http://localhost:5003");
const APPOINTMENT_SERVICE_URL = normalizeUrl(process.env.APPOINTMENT_SERVICE_URL, "http://localhost:5004");
const PAYMENT_SERVICE_URL = normalizeUrl(process.env.PAYMENT_SERVICE_URL, "http://localhost:5005");
const NOTIFICATION_SERVICE_URL = normalizeUrl(process.env.NOTIFICATION_SERVICE_URL, "http://localhost:5006");
const TELEMEDICINE_SERVICE_URL = normalizeUrl(process.env.TELEMEDICINE_SERVICE_URL, "http://localhost:5007");
const PRESCRIPTION_SERVICE_URL = normalizeUrl(process.env.PRESCRIPTION_SERVICE_URL, "http://localhost:5008");
const ADMIN_SERVICE_URL = normalizeUrl(process.env.ADMIN_SERVICE_URL, "http://localhost:5009");
const AI_SERVICE_URL = normalizeUrl(process.env.AI_SERVICE_URL, "http://localhost:5010");

const buildTargetUrl = ({ baseUrl, requestPath = "", query = {} }) => {
	const normalizedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
	const normalizedPath = requestPath.startsWith("/") ? requestPath : `/${requestPath}`;
	const target = new URL(`${normalizedBase}${normalizedPath}`);

	Object.entries(query || {}).forEach(([key, value]) => {
		if (value === undefined) {
			return;
		}

		if (Array.isArray(value)) {
			value.forEach((item) => target.searchParams.append(key, String(item)));
			return;
		}

		target.searchParams.set(key, String(value));
	});

	return target;
};

const proxyJsonRequest = async ({ req, res, upstreamBaseUrl, upstreamPath }) => {
	try {
		const targetUrl = buildTargetUrl({
			baseUrl: upstreamBaseUrl,
			requestPath: upstreamPath,
			query: req.query,
		});

		const headers = {
			accept: req.headers.accept || "application/json",
		};

		if (req.headers.authorization) {
			headers.authorization = req.headers.authorization;
		}

		if (req.headers["x-internal-token"]) {
			headers["x-internal-token"] = req.headers["x-internal-token"];
		}

		if (!["GET", "HEAD"].includes(req.method)) {
			headers["content-type"] = "application/json";
		}

		const upstreamResponse = await fetch(targetUrl, {
			method: req.method,
			headers,
			body: ["GET", "HEAD"].includes(req.method) ? undefined : JSON.stringify(req.body || {}),
		});

		const contentType = upstreamResponse.headers.get("content-type") || "";
		res.status(upstreamResponse.status);

		if (contentType.includes("application/json")) {
			const json = await upstreamResponse.json();
			return res.json(json);
		}

		const text = await upstreamResponse.text();
		return res.send(text);
	} catch (error) {
		console.error("gateway proxy request failed:", error);
		return res.status(502).json({
			message: "gateway proxy request failed",
			error: error.message,
			cause: error.cause ? { message: error.cause.message, code: error.cause.code } : undefined,
		});
	}
};

app.use(cors());
app.use(express.json());

app.use("/api/auth", async (req, res) => {
	return proxyJsonRequest({
		req,
		res,
		upstreamBaseUrl: AUTH_SERVICE_URL,
		upstreamPath: req.originalUrl.replace(/^\/api\/auth/, "/api/auth"),
	});
});

app.use("/api/patients", async (req, res) => {
	return proxyJsonRequest({
		req,
		res,
		upstreamBaseUrl: PATIENT_SERVICE_URL,
		upstreamPath: req.originalUrl.replace(/^\/api\/patients/, "/api/patients"),
	});
});

app.use("/api/doctors", async (req, res) => {
	return proxyJsonRequest({
		req,
		res,
		upstreamBaseUrl: DOCTOR_SERVICE_URL,
		upstreamPath: req.originalUrl.replace(/^\/api\/doctors/, "/api/doctors"),
	});
});

app.use("/api/appointments", async (req, res) => {
	return proxyJsonRequest({
		req,
		res,
		upstreamBaseUrl: APPOINTMENT_SERVICE_URL,
		upstreamPath: req.originalUrl.replace(/^\/api\/appointments/, "/api/appointments"),
	});
});

app.use("/api/payments", async (req, res) => {
	return proxyJsonRequest({
		req,
		res,
		upstreamBaseUrl: PAYMENT_SERVICE_URL,
		upstreamPath: req.originalUrl.replace(/^\/api\/payments/, "/api/payments"),
	});
});

app.use("/api/notifications", async (req, res) => {
	return proxyJsonRequest({
		req,
		res,
		upstreamBaseUrl: NOTIFICATION_SERVICE_URL,
		upstreamPath: req.originalUrl.replace(/^\/api\/notifications/, "/api/notifications"),
	});
});

app.use("/api/telemedicine", async (req, res) => {
	return proxyJsonRequest({
		req,
		res,
		upstreamBaseUrl: TELEMEDICINE_SERVICE_URL,
		upstreamPath: req.originalUrl.replace(/^\/api\/telemedicine/, "/api/telemedicine"),
	});
});

app.use("/api/prescriptions", async (req, res) => {
	return proxyJsonRequest({
		req,
		res,
		upstreamBaseUrl: PRESCRIPTION_SERVICE_URL,
		upstreamPath: req.originalUrl.replace(/^\/api\/prescriptions/, "/api/prescriptions"),
	});
});

app.use("/api/admin", async (req, res) => {
	return proxyJsonRequest({
		req,
		res,
		upstreamBaseUrl: ADMIN_SERVICE_URL,
		upstreamPath: req.originalUrl.replace(/^\/api\/admin/, "/api/admin"),
	});
});

app.use("/api/ai", async (req, res) => {
	return proxyJsonRequest({
		req,
		res,
		upstreamBaseUrl: AI_SERVICE_URL,
		upstreamPath: req.originalUrl.replace(/^\/api\/ai/, "/api/ai"),
	});
});

app.get("/health", (req, res) => {
	res.status(200).json({ service: "gateway", status: "ok" });
});

module.exports = app;
