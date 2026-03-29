const express = require("express");
const { createAppointment, getMyAppointments } = require("../controllers/appointmentController");
const { requireAuth, authorizeRoles } = require("../middlewares/authMiddleware");

const router = express.Router();

router.use(requireAuth);

router.get("/my", authorizeRoles("patient"), getMyAppointments);
router.post("/", authorizeRoles("patient"), createAppointment);

module.exports = router;
