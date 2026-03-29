const Appointment = require("../models/Appointment");

// @desc    Book a new appointment
// @route   POST /api/appointments
exports.bookAppointment = async (req, res) => {
	try {
		const { patientId, doctorId, date, timeSlot, symptoms, meetingLink } = req.body;

		// Here you would typically integrate with the Doctor Service to verify availability
		// For now, we assume the slot is available based on frontend checks

		const appointment = new Appointment({
			patientId,
			doctorId,
			date,
			timeSlot,
			symptoms,
			meetingLink
		});

		await appointment.save();
		res.status(201).json(appointment);
	} catch (error) {
		res.status(500).json({ message: "Error booking appointment", error: error.message });
	}
};

// @desc    Get appointments for a specific patient
// @route   GET /api/appointments/patient/:patientId
exports.getPatientAppointments = async (req, res) => {
	try {
		const appointments = await Appointment.find({ patientId: req.params.patientId });
		res.status(200).json(appointments);
	} catch (error) {
		res.status(500).json({ message: "Error fetching patient appointments", error: error.message });
	}
};

// @desc    Get appointments for a specific doctor
// @route   GET /api/appointments/doctor/:doctorId
exports.getDoctorAppointments = async (req, res) => {
	try {
		const appointments = await Appointment.find({ doctorId: req.params.doctorId });
		res.status(200).json(appointments);
	} catch (error) {
		res.status(500).json({ message: "Error fetching doctor appointments", error: error.message });
	}
};

// @desc    Update an appointment's status
// @route   PUT /api/appointments/:id/status
exports.updateAppointmentStatus = async (req, res) => {
	try {
		const { status } = req.body;
		
		if (!["Pending", "Confirmed", "Completed", "Cancelled"].includes(status)) {
			return res.status(400).json({ message: "Invalid status value" });
		}

		const appointment = await Appointment.findByIdAndUpdate(
			req.params.id,
			{ status },
			{ new: true, runValidators: true }
		);

		if (!appointment) {
			return res.status(404).json({ message: "Appointment not found" });
		}

		res.status(200).json(appointment);
	} catch (error) {
		res.status(500).json({ message: "Error updating appointment status", error: error.message });
	}
};
