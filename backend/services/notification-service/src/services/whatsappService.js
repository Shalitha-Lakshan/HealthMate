// WhatsApp Web client service
// Handles client initialization, QR flow, status checks, and message send
const fs = require("fs");
const path = require("path");
const qrcodeTerminal = require("qrcode-terminal");
const qrcode = require("qrcode");
const { Client, LocalAuth } = require("whatsapp-web.js");

let client;
let initialized = false;
let ready = false;
let lastError = null;
let latestQrText = null;

// Feature flag for WhatsApp notifications
const isWhatsAppEnabled = () => String(process.env.WHATSAPP_ENABLED || "false").toLowerCase() === "true";

// Normalize phone number into E.164 format (Sri Lanka friendly)
const normalizeToE164 = (value) => {
	if (!value) {
		return null;
	}

	const cleaned = String(value).replace(/[\s()-]/g, "");

	if (cleaned.startsWith("+")) {
		return /^\+[1-9]\d{7,14}$/.test(cleaned) ? cleaned : null;
	}

	if (/^0\d{9}$/.test(cleaned)) {
		return `+94${cleaned.slice(1)}`;
	}

	if (/^94\d{9}$/.test(cleaned)) {
		return `+${cleaned}`;
	}

	if (/^7\d{8}$/.test(cleaned)) {
		return `+94${cleaned}`;
	}

	return null;
};

// Find Chromium/Chrome executable for whatsapp-web.js
const resolveChromiumPath = () => {
	if (process.env.CHROMIUM_PATH) {
		return process.env.CHROMIUM_PATH;
	}

	const candidates = ["/usr/bin/chromium-browser", "/usr/bin/chromium", "C:/Program Files/Google/Chrome/Application/chrome.exe"];
	return candidates.find((candidate) => fs.existsSync(candidate));
};

// Remove leftover Chromium lock files from previous crashes
const clearStaleChromiumLocks = (authPath) => {
	try {
		if (!fs.existsSync(authPath)) {
			return;
		}

		const lockFiles = [];
		const walk = (dir) => {
			for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
				const fullPath = path.join(dir, item.name);
				if (item.isDirectory()) {
					walk(fullPath);
					continue;
				}

				if (["SingletonLock", "SingletonCookie", "SingletonSocket"].includes(item.name)) {
					lockFiles.push(fullPath);
				}
			}
		};

		walk(authPath);
		lockFiles.forEach((filePath) => {
			try {
				fs.rmSync(filePath, { force: true });
			} catch (_error) {
			}
		});
	} catch (_error) {
	}
};

// Initialize WhatsApp client once and register event handlers
const initWhatsAppClient = () => {
	if (!isWhatsAppEnabled() || initialized) {
		return;
	}

	initialized = true;

	const sessionName = process.env.WHATSAPP_SESSION_NAME || "healthmate-notifier";
	const authPath = process.env.WHATSAPP_AUTH_PATH || path.join(process.cwd(), ".wwebjs_auth");
	clearStaleChromiumLocks(authPath);

	client = new Client({
		authStrategy: new LocalAuth({
			clientId: sessionName,
			dataPath: authPath,
		}),
		webVersionCache: {
			type: "none",
		},
		authTimeoutMs: 90000,
		qrMaxRetries: 20,
		puppeteer: {
			headless: true,
			executablePath: resolveChromiumPath(),
			args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
		},
	});

	client.on("qr", (qr) => {
		ready = false;
		latestQrText = qr;
		console.log("[WhatsApp] Scan this QR to connect the client:");
		qrcodeTerminal.generate(qr, { small: true });
	});

	client.on("ready", () => {
		ready = true;
		lastError = null;
		latestQrText = null;
		console.log("[WhatsApp] Client is ready");
	});

	client.on("auth_failure", (message) => {
		ready = false;
		lastError = `Authentication failed: ${message}`;
		console.error("[WhatsApp] Authentication failed", message);
	});

	client.on("disconnected", (reason) => {
		ready = false;
		lastError = `Disconnected: ${reason}`;
		console.warn("[WhatsApp] Client disconnected", reason);
	});

	client.initialize().catch((error) => {
		ready = false;
		lastError = error.message;
		console.error("[WhatsApp] Initialization failed", error.message);
	});
};

// Send WhatsApp message through active WhatsApp Web session
const sendWhatsApp = async ({ to, body }) => {
	if (!isWhatsAppEnabled()) {
		return {
			sent: false,
			skipped: true,
			message: "WhatsApp is disabled",
		};
	}

	if (!client || !ready) {
		return {
			sent: false,
			skipped: true,
			message: lastError || "WhatsApp client is not ready. Scan QR and wait for ready state",
		};
	}

	const normalizedTo = normalizeToE164(to);
	if (!normalizedTo) {
		throw new Error("invalid recipient phone number format. use E.164 (e.g. +9477XXXXXXX)");
	}

	const chatId = `${normalizedTo.replace(/\D/g, "")}@c.us`;
	const result = await client.sendMessage(chatId, body);

	return {
		sent: true,
		id: result.id?._serialized,
		to: normalizedTo,
	};
};

// Return current WhatsApp client status for diagnostics
const getWhatsAppStatus = () => {
	if (!isWhatsAppEnabled()) {
		return {
			enabled: false,
			ready: false,
			hasQr: false,
			message: "WhatsApp is disabled",
		};
	}

	if (ready) {
		return {
			enabled: true,
			ready: true,
			hasQr: false,
			message: "WhatsApp client is ready",
		};
	}

	return {
		enabled: true,
		ready: false,
		hasQr: Boolean(latestQrText),
		message: lastError || "WhatsApp client not ready. Scan QR to connect",
	};
};

// Convert latest QR text to image data URL for frontend display
const getWhatsAppQrDataUrl = async () => {
	if (!latestQrText) {
		return null;
	}

	return qrcode.toDataURL(latestQrText, {
		margin: 1,
		width: 360,
	});
};

module.exports = {
	initWhatsAppClient,
	sendWhatsApp,
	getWhatsAppStatus,
	getWhatsAppQrDataUrl,
};
