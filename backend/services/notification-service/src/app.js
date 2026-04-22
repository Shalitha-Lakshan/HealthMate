// Express app setup for notification-service
// Registers middleware, notification routes, and health endpoint
const express = require("express");
const cors = require("cors");
const notificationRoutes = require("./routes/notificationRoutes");

const app = express();

// Enable cross-origin requests and JSON body parsing
app.use(cors());
app.use(express.json());

// Mount notification API routes
app.use("/api/notifications", notificationRoutes);

// Health check route
app.get("/health", (req, res) => {
	res.status(200).json({ service: "notification-service", status: "ok" });
});

// Export configured app
module.exports = app;
