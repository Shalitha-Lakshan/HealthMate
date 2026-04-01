const Prescription = require("../models/Prescription");

const APPOINTMENT_SERVICE_URL = process.env.APPOINTMENT_SERVICE_URL || "http://localhost:5004/api/appointments";
const APPOINTMENT_INTERNAL_TOKEN = process.env.APPOINTMENT_INTERNAL_TOKEN;

const parseMedications = (medications) => {
	if (Array.isArray(medications)) {
		return medications
			.map((item) => ({
				name: String(item?.name || "").trim(),
				dosage: String(item?.dosage || "").trim(),
				frequency: String(item?.frequency || "").trim(),
				duration: String(item?.duration || "").trim(),
				instructions: String(item?.instructions || "").trim(),
			}))
			.filter((item) => item.name);
	}

	if (typeof medications === "string") {
		return medications
			.split("\n")
			.map((line) => line.trim())
			.filter(Boolean)
			.map((name) => ({ name }));
	}

	return [];
};

const canAccessPrescription = (user, prescription) => {
	if (user.role === "admin") {
		return true;
	}

	if (user.role === "doctor") {
		return String(user.sub) === String(prescription.doctorId);
	}

	if (user.role === "patient") {
		return String(user.sub) === String(prescription.patientId);
	}

	return false;
};

const fetchAppointment = async (appointmentId) => {
	try {
		const response = await fetch(`${APPOINTMENT_SERVICE_URL}/internal/${appointmentId}`, {
			method: "GET",
			headers: {
				"x-internal-token": APPOINTMENT_INTERNAL_TOKEN,
			},
		});

		if (response.status === 404) {
			return { ok: false, statusCode: 404, message: "appointment not found" };
		}

		if (response.status === 400) {
			const payload = await response.json().catch(() => ({}));
			return {
				ok: false,
				statusCode: 400,
				message: payload?.message || "invalid appointment id",
			};
		}

		if (!response.ok) {
			return { ok: false, statusCode: 502, message: "unable to validate appointment" };
		}

		const payload = await response.json();
		if (!payload?.appointment) {
			return { ok: false, statusCode: 502, message: "invalid appointment response" };
		}

		return { ok: true, appointment: payload.appointment };
	} catch (_error) {
		return { ok: false, statusCode: 502, message: "unable to validate appointment" };
	}
};

const isAppointmentEligibleForPrescription = (appointment) => {
	const status = String(appointment?.status || "").toLowerCase();
	return status === "confirmed" || status === "completed";
};

exports.createPrescription = async (req, res) => {
	try {
		const { appointmentId, diagnosis, medications, notes } = req.body;
		const parsedMedications = parseMedications(medications);

		if (!appointmentId || parsedMedications.length === 0) {
			return res.status(400).json({
				message: "appointmentId and at least one medication are required",
			});
		}

		const appointmentResult = await fetchAppointment(String(appointmentId).trim());
		if (!appointmentResult.ok) {
			return res.status(appointmentResult.statusCode).json({ message: appointmentResult.message });
		}

		const appointment = appointmentResult.appointment;
		if (String(appointment.doctorId) !== String(req.user.sub)) {
			return res.status(403).json({ message: "you can only create prescriptions for your own appointments" });
		}

		if (!isAppointmentEligibleForPrescription(appointment)) {
			return res.status(400).json({ message: "prescriptions can only be created for confirmed or completed appointments" });
		}

		const existing = await Prescription.findOne({ appointmentId: String(appointmentId).trim() });
		if (existing) {
			return res.status(409).json({ message: "a prescription already exists for this appointment" });
		}

		const prescription = await Prescription.create({
			appointmentId: String(appointmentId).trim(),
			doctorId: String(req.user.sub),
			doctorName: req.user.name || "Doctor",
			patientId: String(appointment.patientId).trim(),
			patientName: String(appointment.patientName).trim(),
			diagnosis: diagnosis ? String(diagnosis).trim() : "",
			medications: parsedMedications,
			notes: notes ? String(notes).trim() : "",
			status: "draft",
		});

		return res.status(201).json({ message: "prescription draft created", prescription });
	} catch (error) {
		return res.status(500).json({ message: "failed to create prescription", error: error.message });
	}
};

exports.updatePrescription = async (req, res) => {
	try {
		const { id } = req.params;
		const { diagnosis, medications, notes } = req.body;

		const prescription = await Prescription.findById(id);
		if (!prescription) {
			return res.status(404).json({ message: "prescription not found" });
		}

		if (String(prescription.doctorId) !== String(req.user.sub)) {
			return res.status(403).json({ message: "you can only update your own prescriptions" });
		}

		if (!prescription.appointmentId) {
			return res.status(400).json({ message: "prescription is not linked to an appointment" });
		}

		const appointmentResult = await fetchAppointment(String(prescription.appointmentId));
		if (!appointmentResult.ok) {
			return res.status(appointmentResult.statusCode).json({ message: appointmentResult.message });
		}

		if (!isAppointmentEligibleForPrescription(appointmentResult.appointment)) {
			return res.status(400).json({ message: "prescription cannot be updated for this appointment status" });
		}

		if (prescription.status === "finalized") {
			return res.status(400).json({ message: "finalized prescriptions cannot be modified" });
		}

		const parsedMedications = parseMedications(medications);
		if (parsedMedications.length > 0) {
			prescription.medications = parsedMedications;
		}

		if (diagnosis !== undefined) {
			prescription.diagnosis = String(diagnosis || "").trim();
		}

		if (notes !== undefined) {
			prescription.notes = String(notes || "").trim();
		}

		await prescription.save();
		return res.status(200).json({ message: "prescription updated", prescription });
	} catch (error) {
		return res.status(500).json({ message: "failed to update prescription", error: error.message });
	}
};

exports.finalizePrescription = async (req, res) => {
	try {
		const { id } = req.params;
		const prescription = await Prescription.findById(id);

		if (!prescription) {
			return res.status(404).json({ message: "prescription not found" });
		}

		if (String(prescription.doctorId) !== String(req.user.sub)) {
			return res.status(403).json({ message: "you can only finalize your own prescriptions" });
		}

		if (!prescription.appointmentId) {
			return res.status(400).json({ message: "prescription is not linked to an appointment" });
		}

		const appointmentResult = await fetchAppointment(String(prescription.appointmentId));
		if (!appointmentResult.ok) {
			return res.status(appointmentResult.statusCode).json({ message: appointmentResult.message });
		}

		if (!isAppointmentEligibleForPrescription(appointmentResult.appointment)) {
			return res.status(400).json({ message: "prescription cannot be finalized for this appointment status" });
		}

		prescription.status = "finalized";
		prescription.finalizedAt = new Date();
		await prescription.save();

		return res.status(200).json({ message: "prescription finalized", prescription });
	} catch (error) {
		return res.status(500).json({ message: "failed to finalize prescription", error: error.message });
	}
};

exports.getDoctorPrescriptions = async (req, res) => {
	try {
		const { doctorId } = req.params;

		if (req.user.role === "doctor" && String(req.user.sub) !== String(doctorId)) {
			return res.status(403).json({ message: "you can only view your own prescriptions" });
		}

		const prescriptions = await Prescription.find({ doctorId: String(doctorId) }).sort({ updatedAt: -1 });
		return res.status(200).json({ prescriptions });
	} catch (error) {
		return res.status(500).json({ message: "failed to fetch doctor prescriptions", error: error.message });
	}
};

exports.getMyPrescriptions = async (req, res) => {
	try {
		const prescriptions = await Prescription.find({ patientId: String(req.user.sub) }).sort({ updatedAt: -1 });
		return res.status(200).json({ prescriptions });
	} catch (error) {
		return res.status(500).json({ message: "failed to fetch patient prescriptions", error: error.message });
	}
};

exports.getPrescriptionById = async (req, res) => {
	try {
		const { id } = req.params;
		const prescription = await Prescription.findById(id);

		if (!prescription) {
			return res.status(404).json({ message: "prescription not found" });
		}

		if (!canAccessPrescription(req.user, prescription)) {
			return res.status(403).json({ message: "you do not have access to this prescription" });
		}

		return res.status(200).json({ prescription });
	} catch (error) {
		return res.status(500).json({ message: "failed to fetch prescription", error: error.message });
	}
};
