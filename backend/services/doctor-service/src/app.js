const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
	res.status(200).json({ service: "doctor-service", status: "ok" });
});

// Routes
const doctorRoutes = require("./routes/doctorRoutes");
app.use("/api/doctors", doctorRoutes);

module.exports = app;
