const express = require("express");
const {
	createPrescription,
	getMyPrescriptions,
	getDoctorPrescriptions,
	updatePrescription,
	deletePrescription,
} = require("../controllers/prescriptionController");
const { requireAuth, authorizeRoles } = require("../middlewares/authMiddleware");

const router = express.Router();

router.use(requireAuth);

router.get("/my", authorizeRoles("patient"), getMyPrescriptions);
router.get("/doctor", authorizeRoles("doctor"), getDoctorPrescriptions);
router.post("/", authorizeRoles("doctor"), createPrescription);
router.patch("/:id", authorizeRoles("doctor"), updatePrescription);
router.delete("/:id", authorizeRoles("doctor"), deletePrescription);

module.exports = router;
