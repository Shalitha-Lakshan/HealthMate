const express = require("express");
const { notifyAppointmentEvent } = require("../controllers/notificationController");
const { requireInternalToken } = require("../middlewares/internalAuthMiddleware");

const router = express.Router();

router.post("/events/appointment", requireInternalToken, notifyAppointmentEvent);

module.exports = router;
