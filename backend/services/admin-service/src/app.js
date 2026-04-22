// Express app setup for admin-service
// Registers middleware, admin routes, and health endpoint
const express = require("express");
const cors = require("cors");
const adminRoutes = require("./routes/adminRoutes");

const app = express();

// Enable cross-origin requests and JSON body parsing
app.use(cors());
app.use(express.json());

// Mount admin API routes
app.use("/api/admin", adminRoutes);

// Health check route
app.get("/health", (req, res) => {
	res.status(200).json({ service: "admin-service", status: "ok" });
});

// Export configured app
module.exports = app;
