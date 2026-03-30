const express = require("express");
const { register, login, getDoctors, getDoctorBookingEligibility } = require("../controllers/authController");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/doctors", getDoctors);
router.get("/internal/doctors/:doctorId/eligibility", getDoctorBookingEligibility);

module.exports = router;
