const express = require("express");
const cors = require("cors");
const doctorRoutes = require("./routes/doctorRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/doctors", doctorRoutes);

app.get("/health", (req, res) => {
	res.status(200).json({ service: "doctor-service", status: "ok" });
});

module.exports = app;
