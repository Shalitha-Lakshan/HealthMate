const express = require("express");
const {
	createPrescription,
	getMyPrescriptions,
	getDoctorPrescriptions,
} = require("../controllers/prescriptionController");
const { requireAuth, authorizeRoles } = require("../middlewares/authMiddleware");

const router = express.Router();

router.use(requireAuth);

router.get("/my", authorizeRoles("patient"), getMyPrescriptions);
router.get("/doctor", authorizeRoles("doctor"), getDoctorPrescriptions);
router.post("/", authorizeRoles("doctor"), createPrescription);

module.exports = router;
