const Prescription = require("../models/Prescription");

const APPOINTMENT_SERVICE_URL = process.env.APPOINTMENT_SERVICE_URL || "http://localhost:5004/api/appointments";
const APPOINTMENT_INTERNAL_TOKEN = process.env.APPOINTMENT_INTERNAL_TOKEN || "healthmate-internal-token";

const getRequesterId = (user = {}) => {
	if (user.sub) {
		return String(user.sub);
	}

	if (user.id) {
		return String(user.id);
	}

	if (user.userId) {
		return String(user.userId);
	}

	return "";
};

const fetchAppointmentForPrescription = async (appointmentId) => {
	const response = await fetch(`${APPOINTMENT_SERVICE_URL}/internal/${appointmentId}`, {
		method: "GET",
		headers: {
			"x-internal-token": APPOINTMENT_INTERNAL_TOKEN,
		},
	});

	if (!response.ok) {
		const payload = await response.json().catch(() => ({}));
		return {
			ok: false,
			statusCode: response.status,
			message: payload?.message || "failed to load appointment",
		};
	}

	const payload = await response.json();
	return {
		ok: true,
		appointment: payload?.appointment,
	};
};

const sanitizePrescription = (prescription) => ({
	id: prescription._id,
	prescriptionId: prescription.prescriptionId,
	appointmentId: prescription.appointmentId,
	appointmentReference: prescription.appointmentReference,
	patientId: prescription.patientId,
	patientName: prescription.patientName,
	doctorId: prescription.doctorId,
	doctorName: prescription.doctorName,
	diagnosis: prescription.diagnosis,
	medications: prescription.medications,
	notes: prescription.notes,
	status: prescription.status,
	issuedAt: prescription.issuedAt,
	createdAt: prescription.createdAt,
	updatedAt: prescription.updatedAt,
});

const normalizeMedications = (medications) => {
	if (!Array.isArray(medications)) {
		return [];
	}

	return medications
		.map((medication) => ({
			name: String(medication?.name || "").trim(),
			dosage: String(medication?.dosage || "").trim(),
			frequency: String(medication?.frequency || "").trim(),
			duration: String(medication?.duration || "").trim(),
			instructions: String(medication?.instructions || "").trim(),
		}))
		.filter((medication) => medication.name || medication.dosage || medication.frequency || medication.duration || medication.instructions);
};

const createPrescription = async (req, res) => {
	try {
		const requesterId = getRequesterId(req.user);
		if (!requesterId) {
			return res.status(401).json({ message: "invalid token payload" });
		}

		const { appointmentId, diagnosis, medications = [], notes = "" } = req.body;

		if (!appointmentId || !diagnosis) {
			return res.status(400).json({ message: "appointmentId and diagnosis are required" });
		}

		const trimmedDiagnosis = String(diagnosis).trim();
		if (!trimmedDiagnosis) {
			return res.status(400).json({ message: "diagnosis cannot be empty" });
		}

		if (!Array.isArray(medications)) {
			return res.status(400).json({ message: "medications must be an array" });
		}

		const normalizedMeds = normalizeMedications(medications);

		if (normalizedMeds.length === 0) {
			return res.status(400).json({ message: "at least one medication entry is required" });
		}

		const hasInvalidMedication = normalizedMeds.some(
			(medication) => !medication.name || !medication.dosage || !medication.frequency
		);

		if (hasInvalidMedication) {
			return res.status(400).json({ message: "each medication requires name, dosage, and frequency" });
		}

		const appointmentResult = await fetchAppointmentForPrescription(appointmentId);
		if (!appointmentResult.ok) {
			return res.status(appointmentResult.statusCode).json({ message: appointmentResult.message });
		}

		const appointment = appointmentResult.appointment;
		if (!appointment) {
			return res.status(404).json({ message: "appointment not found" });
		}

		if (String(appointment.doctorId) !== requesterId) {
			return res.status(403).json({ message: "you can only issue prescriptions for your own consultations" });
		}

		if (appointment.status !== "completed") {
			return res.status(400).json({ message: "prescription can only be issued for completed consultations" });
		}

		const existingForAppointment = await Prescription.findOne({ appointmentId: String(appointment.id || appointment._id || appointmentId) });
		if (existingForAppointment) {
			return res.status(409).json({ message: "prescription already issued for this consultation" });
		}

		const prescription = await Prescription.create({
			appointmentId: String(appointment.id || appointment._id || appointmentId),
			appointmentReference: String(appointment.appointmentId || ""),
			patientId: String(appointment.patientId),
			patientName: String(appointment.patientName || "").trim(),
			doctorId: String(appointment.doctorId),
			doctorName: String(appointment.doctorName || "").trim(),
			diagnosis: trimmedDiagnosis,
			medications: normalizedMeds,
			notes: String(notes || "").trim(),
			status: "Issued",
			issuedAt: new Date(),
		});

		return res.status(201).json({
			message: "prescription issued successfully",
			prescription: sanitizePrescription(prescription),
		});
	} catch (error) {
		if (error?.code === 11000) {
			return res.status(409).json({ message: "prescription already exists for this consultation" });
		}
		return res.status(500).json({ message: "failed to create prescription", error: error.message });
	}
};

const updatePrescription = async (req, res) => {
	try {
		const requesterId = getRequesterId(req.user);
		if (!requesterId) {
			return res.status(401).json({ message: "invalid token payload" });
		}

		const { id } = req.params;
		const { diagnosis, medications, notes } = req.body;

		const prescription = await Prescription.findById(id);
		if (!prescription) {
			return res.status(404).json({ message: "prescription not found" });
		}

		if (String(prescription.doctorId) !== requesterId) {
			return res.status(403).json({ message: "you can only edit your own prescriptions" });
		}

		if (diagnosis !== undefined) {
			const trimmedDiagnosis = String(diagnosis).trim();
			if (!trimmedDiagnosis) {
				return res.status(400).json({ message: "diagnosis cannot be empty" });
			}
			prescription.diagnosis = trimmedDiagnosis;
		}

		if (medications !== undefined) {
			const normalizedMeds = normalizeMedications(medications);

			if (normalizedMeds.length === 0) {
				return res.status(400).json({ message: "at least one medication entry is required" });
			}

			const hasInvalidMedication = normalizedMeds.some(
				(medication) => !medication.name || !medication.dosage || !medication.frequency
			);

			if (hasInvalidMedication) {
				return res.status(400).json({ message: "each medication requires name, dosage, and frequency" });
			}

			prescription.medications = normalizedMeds;
		}

		if (notes !== undefined) {
			prescription.notes = String(notes || "").trim();
		}

		await prescription.save();

		return res.status(200).json({
			message: "prescription updated successfully",
			prescription: sanitizePrescription(prescription),
		});
	} catch (error) {
		return res.status(500).json({ message: "failed to update prescription", error: error.message });
	}
};

const deletePrescription = async (req, res) => {
	try {
		const requesterId = getRequesterId(req.user);
		if (!requesterId) {
			return res.status(401).json({ message: "invalid token payload" });
		}

		const { id } = req.params;
		const prescription = await Prescription.findById(id);
		if (!prescription) {
			return res.status(404).json({ message: "prescription not found" });
		}

		if (String(prescription.doctorId) !== requesterId) {
			return res.status(403).json({ message: "you can only delete your own prescriptions" });
		}

		await Prescription.deleteOne({ _id: id });

		return res.status(200).json({ message: "prescription deleted successfully" });
	} catch (error) {
		return res.status(500).json({ message: "failed to delete prescription", error: error.message });
	}
};

const getMyPrescriptions = async (req, res) => {
	try {
		const patientId = getRequesterId(req.user);
		if (!patientId) {
			return res.status(401).json({ message: "invalid token payload" });
		}

		const prescriptions = await Prescription.find({ patientId }).sort({ issuedAt: -1, createdAt: -1 });
		return res.status(200).json({
			prescriptions: prescriptions.map((item) => sanitizePrescription(item)),
		});
	} catch (error) {
		return res.status(500).json({ message: "failed to fetch prescriptions", error: error.message });
	}
};

const getDoctorPrescriptions = async (req, res) => {
	try {
		const doctorId = getRequesterId(req.user);
		if (!doctorId) {
			return res.status(401).json({ message: "invalid token payload" });
		}

		const prescriptions = await Prescription.find({ doctorId }).sort({ issuedAt: -1, createdAt: -1 });
		return res.status(200).json({
			prescriptions: prescriptions.map((item) => sanitizePrescription(item)),
		});
	} catch (error) {
		return res.status(500).json({ message: "failed to fetch doctor prescriptions", error: error.message });
	}
};

module.exports = {
	createPrescription,
	getMyPrescriptions,
	getDoctorPrescriptions,
	updatePrescription,
	deletePrescription,
};
