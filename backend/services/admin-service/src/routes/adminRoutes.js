const express = require("express");
const {
	getOverview,
	getUsers,
	getDoctorVerificationQueue,
	updateDoctorVerificationStatus,
	updateUserStatus,
	createUser,
	updateUser,
	deleteUser,
	getAuditLogs,
} = require("../controllers/adminController");
const { requireAuth, authorizeRoles } = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/overview", requireAuth, authorizeRoles("admin"), getOverview);
router.get("/users", requireAuth, authorizeRoles("admin"), getUsers);
router.post("/users", requireAuth, authorizeRoles("admin"), createUser);
router.patch("/users/:userId", requireAuth, authorizeRoles("admin"), updateUser);
router.delete("/users/:userId", requireAuth, authorizeRoles("admin"), deleteUser);
router.get("/audit-logs", requireAuth, authorizeRoles("admin"), getAuditLogs);
router.get("/verifications", requireAuth, authorizeRoles("admin"), getDoctorVerificationQueue);
router.patch("/verifications/:doctorId", requireAuth, authorizeRoles("admin"), updateDoctorVerificationStatus);
router.patch("/users/:userId/status", requireAuth, authorizeRoles("admin"), updateUserStatus);

module.exports = router;
