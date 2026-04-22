// Route definitions for notification-service
// Internal appointment events + WhatsApp status endpoints
const express = require("express");
const {
	notifyAppointmentEvent,
	getWhatsAppConnectionStatus,
	getWhatsAppQr,
} = require("../controllers/notificationController");
const { requireInternalToken } = require("../middlewares/internalAuthMiddleware");

const router = express.Router();

// Internal endpoint used by other services to trigger notifications
router.post("/events/appointment", requireInternalToken, notifyAppointmentEvent);

// WhatsApp client diagnostics endpoints
router.get("/whatsapp/status", getWhatsAppConnectionStatus);
router.get("/whatsapp/qr", getWhatsAppQr);

// Export router
module.exports = router;
