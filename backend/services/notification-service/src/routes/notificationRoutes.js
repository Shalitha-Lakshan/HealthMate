const express = require("express");
const {
	notifyAppointmentEvent,
	getWhatsAppConnectionStatus,
	getWhatsAppQr,
} = require("../controllers/notificationController");
const { requireInternalToken } = require("../middlewares/internalAuthMiddleware");

const router = express.Router();

router.post("/events/appointment", requireInternalToken, notifyAppointmentEvent);
router.get("/whatsapp/status", getWhatsAppConnectionStatus);
router.get("/whatsapp/qr", getWhatsAppQr);

module.exports = router;
