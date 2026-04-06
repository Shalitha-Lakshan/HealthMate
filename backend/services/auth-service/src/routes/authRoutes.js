const express = require("express");
const {
	register,
	login,
	getDoctors,
	getDoctorBookingEligibility,
	getMyProfile,
	upsertMyPatientProfile,
} = require("../controllers/authController");
const { requireAuth } = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/doctors", getDoctors);
router.get("/me", requireAuth, getMyProfile);
router.put("/me/profile", requireAuth, upsertMyPatientProfile);
router.get("/internal/doctors/:doctorId/eligibility", getDoctorBookingEligibility);

module.exports = router;
