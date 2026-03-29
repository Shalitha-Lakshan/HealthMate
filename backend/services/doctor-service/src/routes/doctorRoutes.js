const express = require("express");
const { createDoctor, getAllDoctors, getDoctorById } = require("../controllers/doctorController");

const router = express.Router();

router.route("/")
	.post(createDoctor)
	.get(getAllDoctors);

router.route("/:id")
	.get(getDoctorById);

module.exports = router;
