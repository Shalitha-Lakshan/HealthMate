const express = require("express");
const {
	createAppointmentHold,
	getAvailableSlots,
	getMyAppointments,
	getDoctorAppointments,
	approveAppointmentByDoctor,
	rejectAppointmentByDoctor,
	cancelAppointmentByDoctor,
	confirmAppointmentPayment,
	confirmAppointmentPaymentInternal,
	getPaymentEligibilityInternal,
	completeConsultation,
	getAdminAppointments,
	rescheduleAppointment,
	cancelAppointment,
	completeConsultationAdmin,
	deleteAppointmentAdmin,
	deleteMyExpiredAppointment,
} = require("../controllers/appointmentController");
const { requireAuth, authorizeRoles } = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/internal/payment-confirmation", confirmAppointmentPaymentInternal);
router.get("/internal/:appointmentId/payment-eligibility", getPaymentEligibilityInternal);

router.use(requireAuth);

router.get("/admin", authorizeRoles("admin"), getAdminAppointments);
router.patch("/admin/:id/reschedule", authorizeRoles("admin"), rescheduleAppointment);
router.patch("/admin/:id/cancel", authorizeRoles("admin"), cancelAppointment);
router.patch("/admin/:id/complete", authorizeRoles("admin"), completeConsultationAdmin);
router.delete("/admin/:id", authorizeRoles("admin"), deleteAppointmentAdmin);

router.get("/my", authorizeRoles("patient"), getMyAppointments);
router.get("/doctor/:doctorId", authorizeRoles("doctor"), getDoctorAppointments);
router.patch("/:id/doctor-approve", authorizeRoles("doctor"), approveAppointmentByDoctor);
router.patch("/:id/doctor-reject", authorizeRoles("doctor"), rejectAppointmentByDoctor);
router.patch("/:id/doctor-cancel", authorizeRoles("doctor"), cancelAppointmentByDoctor);
router.get("/slots", authorizeRoles("patient"), getAvailableSlots);
router.post("/hold", authorizeRoles("patient"), createAppointmentHold);
router.post("/", authorizeRoles("patient"), createAppointmentHold);
router.patch("/:id/pay", authorizeRoles("patient"), confirmAppointmentPayment);
router.delete("/:id", authorizeRoles("patient"), deleteMyExpiredAppointment);
router.patch("/:id/complete", authorizeRoles("doctor"), completeConsultation);

module.exports = router;
