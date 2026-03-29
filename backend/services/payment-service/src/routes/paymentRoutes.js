const express = require("express");
const {
	initiatePayment,
	completePayment,
	getPaymentByTransactionId,
} = require("../controllers/paymentController");
const { requireAuth, authorizeRoles } = require("../middlewares/authMiddleware");

const router = express.Router();

router.use(requireAuth);
router.use(authorizeRoles("patient"));

router.post("/initiate", initiatePayment);
router.post("/:transactionId/complete", completePayment);
router.get("/:transactionId", getPaymentByTransactionId);

module.exports = router;
