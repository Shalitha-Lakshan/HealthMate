const express = require("express");
const {
	register,
	login,
	getDoctors,
	getDoctorBookingEligibility,
	getMyProfile,
	upsertMyPatientProfile,
	updateCurrentUserProfile,
} = require("../controllers/authController");
const {
	createMedicalReport,
	getMyMedicalReports,
	getAssignedMedicalReports,
	deleteMyMedicalReport,
} = require("../controllers/medicalReportController");
const { requireAuth, verifyAccessToken } = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/doctors", getDoctors);
router.get("/me", requireAuth, getMyProfile);
router.put("/me/profile", requireAuth, upsertMyPatientProfile);
router.get("/internal/doctors/:doctorId/eligibility", getDoctorBookingEligibility);
router.patch("/me", verifyAccessToken, updateCurrentUserProfile);
router.post("/reports", requireAuth, createMedicalReport);
router.get("/reports/me", requireAuth, getMyMedicalReports);
router.get("/reports/doctor", requireAuth, getAssignedMedicalReports);
router.delete("/reports/:reportId", requireAuth, deleteMyMedicalReport);

module.exports = router;
