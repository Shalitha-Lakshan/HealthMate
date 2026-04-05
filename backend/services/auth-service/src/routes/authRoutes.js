const express = require("express");
const {
	register,
	login,
	getDoctors,
	getDoctorBookingEligibility,
	updateCurrentUserProfile,
} = require("../controllers/authController");
const { verifyAccessToken } = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/doctors", getDoctors);
router.get("/internal/doctors/:doctorId/eligibility", getDoctorBookingEligibility);
router.patch("/me", verifyAccessToken, updateCurrentUserProfile);

module.exports = router;
