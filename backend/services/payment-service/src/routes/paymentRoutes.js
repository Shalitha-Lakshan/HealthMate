// Express routes for payment operations
// Only comments added, no code changes
// Import express and controllers
const express = require("express");
const {
	initiatePayment,
	completePayment,
	getPaymentByTransactionId,
} = require("../controllers/paymentController");
const { requireAuth, authorizeRoles } = require("../middlewares/authMiddleware");

// Create router and apply auth middleware
const router = express.Router();

// Only patients can access payment endpoints
router.use(requireAuth);
router.use(authorizeRoles("patient"));

// Payment endpoints
router.post("/initiate", initiatePayment);
router.post("/:transactionId/complete", completePayment);
router.get("/:transactionId", getPaymentByTransactionId);

// Export router
module.exports = router;
