const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");

const app = express();

app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

app.use("/api/auth", authRoutes);

app.get("/health", (req, res) => {
	res.status(200).json({ service: "auth-service", status: "ok" });
});

module.exports = app;
