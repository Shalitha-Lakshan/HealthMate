const express = require("express");
const {
	createAppointmentHold,
	getAvailableSlots,
	getMyAppointments,
	getDoctorAppointments,
	confirmAppointmentPayment,
	confirmAppointmentPaymentInternal,
	completeConsultation,
} = require("../controllers/appointmentController");
const { requireAuth, authorizeRoles } = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/internal/payment-confirmation", confirmAppointmentPaymentInternal);

router.use(requireAuth);

router.get("/my", authorizeRoles("patient"), getMyAppointments);
router.get("/doctor", authorizeRoles("doctor"), getDoctorAppointments);
router.get("/slots", authorizeRoles("patient"), getAvailableSlots);
router.post("/hold", authorizeRoles("patient"), createAppointmentHold);
router.post("/", authorizeRoles("patient"), createAppointmentHold);
router.patch("/:id/pay", authorizeRoles("patient"), confirmAppointmentPayment);
router.patch("/:id/complete", authorizeRoles("doctor"), completeConsultation);

module.exports = router;
