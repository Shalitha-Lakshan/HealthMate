// Express app for payment-service
// Sets up routes and middleware
// Only comments added, no code changes
// Import dependencies
const express = require("express");
const cors = require("cors");
const paymentRoutes = require("./routes/paymentRoutes");

// Create express app
const app = express();

// Middleware for CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Payment routes
app.use("/api/payments", paymentRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
	res.status(200).json({ service: "payment-service", status: "ok" });
});

// Export app
module.exports = app;
