const express = require("express");
const cors = require("cors");

const app = express();
const PRESCRIPTION_SERVICE_URL = process.env.PRESCRIPTION_SERVICE_URL || "http://localhost:5008";

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
		return res.status(502).json({
			message: "gateway proxy request failed",
			error: error.message,
		});
	}
};

app.use(cors());
app.use(express.json());

app.use("/api/prescriptions", async (req, res) => {
	return proxyJsonRequest({
		req,
		res,
		upstreamBaseUrl: PRESCRIPTION_SERVICE_URL,
		upstreamPath: req.originalUrl.replace(/^\/api\/prescriptions/, "/api/prescriptions"),
	});
});

app.get("/health", (req, res) => {
	res.status(200).json({ service: "gateway", status: "ok" });
});

module.exports = app;
