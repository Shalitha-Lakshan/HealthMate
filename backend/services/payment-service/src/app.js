const express = require("express");
const cors = require("cors");
const paymentRoutes = require("./routes/paymentRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/payments", paymentRoutes);

app.get("/health", (req, res) => {
	res.status(200).json({ service: "payment-service", status: "ok" });
});

module.exports = app;
