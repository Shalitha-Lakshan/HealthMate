const Appointment = require("../models/Appointment");

const createAppointment = async (req, res) => {
	try {
		const { patientName, patientAge, doctorName, specialty, appointmentDateTime, mode, reason } = req.body;

		if (!patientName || patientAge === undefined || !doctorName || !specialty || !appointmentDateTime || !reason) {
			return res.status(400).json({
				message:
					"patientName, patientAge, doctorName, specialty, appointmentDateTime, and reason are required",
			});
		}

		const parsedAge = Number(patientAge);
		if (Number.isNaN(parsedAge) || parsedAge < 0 || parsedAge > 120) {
			return res.status(400).json({ message: "patientAge must be a valid number between 0 and 120" });
		}

		const parsedDate = new Date(appointmentDateTime);
		if (Number.isNaN(parsedDate.getTime())) {
			return res.status(400).json({ message: "appointmentDateTime must be a valid date-time" });
		}

		if (parsedDate <= new Date()) {
			return res.status(400).json({ message: "appointment date and time must be in the future" });
		}

		const appointment = await Appointment.create({
			patientId: req.user.sub,
			patientName: patientName.trim(),
			patientEmail: req.user.email,
			patientAge: parsedAge,
			doctorName: doctorName.trim(),
			specialty: specialty.trim(),
			appointmentDateTime: parsedDate,
			mode: mode || "in-person",
			reason: reason.trim(),
			status: "pending",
		});

		return res.status(201).json({
			message: "appointment created successfully",
			appointment,
		});
	} catch (error) {
		return res.status(500).json({ message: "failed to create appointment", error: error.message });
	}
};

const getMyAppointments = async (req, res) => {
	try {
		const appointments = await Appointment.find({ patientId: req.user.sub }).sort({ appointmentDateTime: 1 });
		return res.status(200).json({ appointments });
	} catch (error) {
		return res.status(500).json({ message: "failed to fetch appointments", error: error.message });
	}
};

module.exports = {
	createAppointment,
	getMyAppointments,
};
