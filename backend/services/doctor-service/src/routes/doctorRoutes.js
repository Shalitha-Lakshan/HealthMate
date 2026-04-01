const express = require("express");
const { getAvailability, getAvailabilityInternal, updateAvailability } = require("../controllers/availabilityController");
const { verifyToken, verifyRole } = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/:doctorId/availability/internal", getAvailabilityInternal);
router.get("/:doctorId/availability", verifyToken, verifyRole("doctor", "patient"), getAvailability);
router.put("/:doctorId/availability", verifyToken, verifyRole("doctor"), updateAvailability);

module.exports = router;
