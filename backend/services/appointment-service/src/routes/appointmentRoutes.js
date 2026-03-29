const express = require("express");
const { 
	bookAppointment, 
	getPatientAppointments, 
	getDoctorAppointments, 
	updateAppointmentStatus 
} = require("../controllers/appointmentController");

const router = express.Router();

router.route("/")
	.post(bookAppointment);

router.route("/patient/:patientId")
	.get(getPatientAppointments);

router.route("/doctor/:doctorId")
	.get(getDoctorAppointments);

router.route("/:id/status")
	.put(updateAppointmentStatus);

module.exports = router;
