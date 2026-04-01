const express = require("express");
const {
	createPrescription,
	updatePrescription,
	finalizePrescription,
	getDoctorPrescriptions,
	getMyPrescriptions,
	getPrescriptionById,
} = require("../controllers/prescriptionController");
const { verifyToken, verifyRole } = require("../middlewares/authMiddleware");

const router = express.Router();

router.use(verifyToken);

router.get("/my", verifyRole("patient"), getMyPrescriptions);
router.get("/doctor/:doctorId", verifyRole("doctor", "admin"), getDoctorPrescriptions);
router.get("/:id", verifyRole("doctor", "patient", "admin"), getPrescriptionById);
router.post("/", verifyRole("doctor"), createPrescription);
router.put("/:id", verifyRole("doctor"), updatePrescription);
router.patch("/:id/finalize", verifyRole("doctor"), finalizePrescription);

module.exports = router;
