const Appointment = require("../models/Appointment");

const SLOT_INTERVAL_MINUTES = 30;
const SLOT_START_HOUR = 9;
const SLOT_END_HOUR = 17;
const PAYMENT_HOLD_MINUTES = Number(process.env.APPOINTMENT_PAYMENT_HOLD_MINUTES || 10);
const DEFAULT_CONSULTATION_FEE = Number(process.env.DEFAULT_CONSULTATION_FEE || 3500);
const APPOINTMENT_INTERNAL_TOKEN = process.env.APPOINTMENT_INTERNAL_TOKEN || "healthmate-internal-token";

const normalizeDateOnly = (dateValue) => {
	const date = new Date(dateValue);
	if (Number.isNaN(date.getTime())) {
		return null;
	}
	return date.toISOString().slice(0, 10);
};

const isValidTimeSlot = (timeValue) => {
	return /^([01]\d|2[0-3]):([0-5]\d)$/.test(timeValue);
};

const buildDateTime = (dateOnly, slotTime) => {
	return new Date(`${dateOnly}T${slotTime}:00`);
};

const generateSlots = () => {
	const slots = [];
	for (let hour = SLOT_START_HOUR; hour < SLOT_END_HOUR; hour += 1) {
		for (let minute = 0; minute < 60; minute += SLOT_INTERVAL_MINUTES) {
			slots.push(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
		}
	}
	return slots;
};

const releaseExpiredPendingPayments = async () => {
	await Appointment.updateMany(
		{
			status: "pending_payment",
			paymentStatus: "pending",
			paymentExpiresAt: { $lt: new Date() },
		},
		{
			$set: {
				status: "expired",
				paymentStatus: "failed",
			},
		}
	);
};

const finalizeAppointmentPayment = async ({ appointment, paymentMethod, paymentReference }) => {
	if (appointment.paymentExpiresAt && appointment.paymentExpiresAt < new Date()) {
		appointment.status = "expired";
		appointment.paymentStatus = "failed";
		await appointment.save();
		return {
			success: false,
			statusCode: 400,
			message: "payment window expired. book again.",
		};
	}

	appointment.paymentMethod = paymentMethod;
	appointment.paymentReference = paymentReference?.trim();
	appointment.paymentStatus = "paid";
	appointment.status = "confirmed";
	await appointment.save();

	return {
		success: true,
		statusCode: 200,
		message: "payment successful. appointment confirmed",
	};
};

const getAvailableSlots = async (req, res) => {
	try {
		await releaseExpiredPendingPayments();

		const { doctorId, date } = req.query;

		if (!doctorId || !date) {
			return res.status(400).json({ message: "doctorId and date are required" });
		}

		const normalizedDate = normalizeDateOnly(date);
		if (!normalizedDate) {
			return res.status(400).json({ message: "invalid date format" });
		}

		const allSlots = generateSlots();

		const existingAppointments = await Appointment.find({
			doctorId,
			appointmentDate: normalizedDate,
			status: { $in: ["pending_payment", "confirmed", "completed"] },
		});

		const bookedSlots = new Set(existingAppointments.map((item) => item.slotTime));

		const slots = allSlots.map((time) => ({
			time,
			available: !bookedSlots.has(time),
		}));

		return res.status(200).json({
			doctorId,
			date: normalizedDate,
			slots,
		});
	} catch (error) {
		return res.status(500).json({ message: "failed to fetch slots", error: error.message });
	}
};

const createAppointmentHold = async (req, res) => {
	try {
		await releaseExpiredPendingPayments();

		const { patientName, patientAge, doctorId, doctorName, specialty, appointmentDate, slotTime, mode, reason } = req.body;

		if (
			!patientName ||
			patientAge === undefined ||
			!doctorId ||
			!doctorName ||
			!specialty ||
			!appointmentDate ||
			!slotTime ||
			!reason
		) {
			return res.status(400).json({
				message:
					"patientName, patientAge, doctorId, doctorName, specialty, appointmentDate, slotTime, and reason are required",
			});
		}

		const parsedAge = Number(patientAge);
		if (Number.isNaN(parsedAge) || parsedAge < 0 || parsedAge > 120) {
			return res.status(400).json({ message: "patientAge must be a valid number between 0 and 120" });
		}

		const normalizedDate = normalizeDateOnly(appointmentDate);
		if (!normalizedDate) {
			return res.status(400).json({ message: "appointmentDate must be valid date" });
		}

		if (!isValidTimeSlot(slotTime)) {
			return res.status(400).json({ message: "slotTime must be in HH:mm format" });
		}

		const parsedDate = buildDateTime(normalizedDate, slotTime);
		if (Number.isNaN(parsedDate.getTime())) {
			return res.status(400).json({ message: "appointment date-time must be valid" });
		}

		if (parsedDate <= new Date()) {
			return res.status(400).json({ message: "appointment date and time must be in the future" });
		}

		const conflictingAppointment = await Appointment.findOne({
			doctorId,
			appointmentDate: normalizedDate,
			slotTime,
			status: { $in: ["pending_payment", "confirmed", "completed"] },
		});

		if (conflictingAppointment) {
			return res.status(409).json({ message: "selected slot is no longer available" });
		}

		const paymentExpiresAt = new Date(Date.now() + PAYMENT_HOLD_MINUTES * 60 * 1000);

		const appointment = await Appointment.create({
			patientId: req.user.sub,
			patientName: patientName.trim(),
			patientEmail: req.user.email,
			patientAge: parsedAge,
			doctorId,
			doctorName: doctorName.trim(),
			specialty: specialty.trim(),
			appointmentDateTime: parsedDate,
			appointmentDate: normalizedDate,
			slotTime,
			mode: mode || "in-person",
			reason: reason.trim(),
			status: "pending_payment",
			paymentStatus: "pending",
			consultationFee: DEFAULT_CONSULTATION_FEE,
			currency: "LKR",
			paymentExpiresAt,
		});

		return res.status(201).json({
			message: "slot reserved. complete payment to confirm appointment",
			appointment,
		});
	} catch (error) {
		return res.status(500).json({ message: "failed to reserve appointment slot", error: error.message });
	}
};

const getMyAppointments = async (req, res) => {
	try {
		await releaseExpiredPendingPayments();
		const appointments = await Appointment.find({ patientId: req.user.sub }).sort({ appointmentDateTime: 1 });
		return res.status(200).json({ appointments });
	} catch (error) {
		return res.status(500).json({ message: "failed to fetch appointments", error: error.message });
	}
};

const getDoctorAppointments = async (req, res) => {
	try {
		await releaseExpiredPendingPayments();
		const appointments = await Appointment.find({ doctorId: req.user.sub }).sort({ appointmentDateTime: 1 });
		return res.status(200).json({ appointments });
	} catch (error) {
		return res.status(500).json({ message: "failed to fetch doctor appointments", error: error.message });
	}
};

const confirmAppointmentPayment = async (req, res) => {
	try {
		await releaseExpiredPendingPayments();
		const { id } = req.params;
		const { paymentMethod, paymentReference } = req.body;

		if (!paymentMethod) {
			return res.status(400).json({ message: "paymentMethod is required" });
		}

		const appointment = await Appointment.findById(id);
		if (!appointment) {
			return res.status(404).json({ message: "appointment not found" });
		}

		if (String(appointment.patientId) !== String(req.user.sub)) {
			return res.status(403).json({ message: "you can only pay for your own appointments" });
		}

		if (appointment.status !== "pending_payment" || appointment.paymentStatus !== "pending") {
			return res.status(400).json({ message: "appointment is not in pending payment state" });
		}

		const result = await finalizeAppointmentPayment({
			appointment,
			paymentMethod,
			paymentReference,
		});

		if (!result.success) {
			return res.status(result.statusCode).json({ message: result.message });
		}

		return res.status(200).json({
			message: result.message,
			appointment,
		});
	} catch (error) {
		return res.status(500).json({ message: "failed to confirm payment", error: error.message });
	}
};

const confirmAppointmentPaymentInternal = async (req, res) => {
	try {
		await releaseExpiredPendingPayments();

		const internalToken = req.headers["x-internal-token"];
		if (!internalToken || internalToken !== APPOINTMENT_INTERNAL_TOKEN) {
			return res.status(401).json({ message: "invalid internal service token" });
		}

		const { appointmentId, patientId, paymentMethod, paymentReference } = req.body;

		if (!appointmentId || !patientId || !paymentMethod || !paymentReference) {
			return res
				.status(400)
				.json({ message: "appointmentId, patientId, paymentMethod and paymentReference are required" });
		}

		const appointment = await Appointment.findById(appointmentId);
		if (!appointment) {
			return res.status(404).json({ message: "appointment not found" });
		}

		if (String(appointment.patientId) !== String(patientId)) {
			return res.status(403).json({ message: "appointment does not belong to patient" });
		}

		if (appointment.status !== "pending_payment" || appointment.paymentStatus !== "pending") {
			return res.status(400).json({ message: "appointment is not in pending payment state" });
		}

		const result = await finalizeAppointmentPayment({
			appointment,
			paymentMethod,
			paymentReference,
		});

		if (!result.success) {
			return res.status(result.statusCode).json({ message: result.message });
		}

		return res.status(200).json({
			message: result.message,
			appointment,
		});
	} catch (error) {
		return res.status(500).json({ message: "failed to confirm payment", error: error.message });
	}
};

module.exports = {
	createAppointmentHold,
	getAvailableSlots,
	getMyAppointments,
	getDoctorAppointments,
	confirmAppointmentPayment,
	confirmAppointmentPaymentInternal,
};
