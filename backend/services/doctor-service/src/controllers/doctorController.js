const Doctor = require("../models/Doctor");

// @desc    Register a new doctor
// @route   POST /api/doctors
exports.createDoctor = async (req, res) => {
	try {
		const { name, email, specialty, qualifications, experienceYears, consultationFee, bio, availableSlots } = req.body;

		// Check if doctor exists
		const existingDoctor = await Doctor.findOne({ email });
		if (existingDoctor) {
			return res.status(400).json({ message: "Doctor with this email already exists" });
		}

		const doctor = new Doctor({
			name,
			email,
			specialty,
			qualifications,
			experienceYears,
			consultationFee,
			bio,
			availableSlots
		});

		await doctor.save();
		res.status(201).json(doctor);
	} catch (error) {
		res.status(500).json({ message: "Error creating doctor", error: error.message });
	}
};

// @desc    Get all doctors
// @route   GET /api/doctors
exports.getAllDoctors = async (req, res) => {
	try {
		// Optional query param filter e.g., /api/doctors?specialty=Cardiology
		const filter = {};
		if (req.query.specialty) {
			filter.specialty = req.query.specialty;
		}

		const doctors = await Doctor.find(filter);
		res.status(200).json(doctors);
	} catch (error) {
		res.status(500).json({ message: "Error fetching doctors", error: error.message });
	}
};

// @desc    Get single doctor by ID
// @route   GET /api/doctors/:id
exports.getDoctorById = async (req, res) => {
	try {
		const doctor = await Doctor.findById(req.params.id);
		if (!doctor) {
			return res.status(404).json({ message: "Doctor not found" });
		}
		res.status(200).json(doctor);
	} catch (error) {
		res.status(500).json({ message: "Error fetching doctor", error: error.message });
	}
};
