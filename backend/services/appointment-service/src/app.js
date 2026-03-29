const express = require("express");
const cors = require("cors");
const appointmentRoutes = require("./routes/appointmentRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/appointments", appointmentRoutes);

app.get("/health", (req, res) => {
	res.status(200).json({ service: "appointment-service", status: "ok" });
});

module.exports = app;
