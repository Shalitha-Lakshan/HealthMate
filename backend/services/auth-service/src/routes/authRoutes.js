const express = require("express");
const { register, login, getDoctors } = require("../controllers/authController");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/doctors", getDoctors);

module.exports = router;
