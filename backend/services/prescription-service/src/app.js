const express = require("express");
const cors = require("cors");
const prescriptionRoutes = require("./routes/prescriptionRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/prescriptions", prescriptionRoutes);

app.get("/health", (_req, res) => {
	res.status(200).json({ service: "prescription-service", status: "ok" });
});

module.exports = app;
