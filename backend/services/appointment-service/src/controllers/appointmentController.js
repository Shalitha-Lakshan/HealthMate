
const { Types } = require("mongoose");
const Appointment = require("../models/Appointment");

const SLOT_INTERVAL_MINUTES = 30;
const SLOT_START_HOUR = 9;
const SLOT_END_HOUR = 17;
const APPOINTMENT_WINDOW_MONTHS = 3;
const APPOINTMENT_TIMEZONE_OFFSET = process.env.APPOINTMENT_TIMEZONE_OFFSET || "+05:30";
const PAYMENT_HOLD_MINUTES = Number(process.env.APPOINTMENT_PAYMENT_HOLD_MINUTES || 10);
const DEFAULT_CONSULTATION_FEE = Number(process.env.DEFAULT_CONSULTATION_FEE || 3500);
const APPOINTMENT_INTERNAL_TOKEN = process.env.APPOINTMENT_INTERNAL_TOKEN || "healthmate-internal-token";
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || "http://localhost:5001/api/auth";
const AUTH_INTERNAL_TOKEN = process.env.AUTH_INTERNAL_TOKEN || "healthmate-internal-token";
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || "http://localhost:5006/api/notifications";
const NOTIFICATION_INTERNAL_TOKEN = process.env.NOTIFICATION_INTERNAL_TOKEN || "healthmate-internal-token";

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

const parseOptIn = (value, defaultValue = true) => {
	if (value === undefined || value === null) {
		return defaultValue;
	}

	if (typeof value === "boolean") {
		return value;
	}

	const normalized = String(value).trim().toLowerCase();
	if (["true", "1", "yes", "y"].includes(normalized)) {
		return true;
	}
	if (["false", "0", "no", "n"].includes(normalized)) {
		return false;
	}

	return defaultValue;
};

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
	return new Date(`${dateOnly}T${slotTime}:00${APPOINTMENT_TIMEZONE_OFFSET}`);
};

const getDateOnlyForOffset = (dateValue, timezoneOffset) => {
	const offsetMatch = timezoneOffset.match(/^([+-])(\d{2}):(\d{2})$/);
	if (!offsetMatch) {
		return new Date(dateValue).toISOString().slice(0, 10);
	}

	const sign = offsetMatch[1] === "+" ? 1 : -1;
	const hours = Number(offsetMatch[2]);
	const minutes = Number(offsetMatch[3]);
	const totalOffsetMinutes = sign * (hours * 60 + minutes);

	const utcTime = new Date(dateValue).getTime();
	const shifted = new Date(utcTime + totalOffsetMinutes * 60 * 1000);
	const year = shifted.getUTCFullYear();
	const month = String(shifted.getUTCMonth() + 1).padStart(2, "0");
	const day = String(shifted.getUTCDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
};

const getMaxBookableDate = () => {
	const date = new Date();
	date.setMonth(date.getMonth() + APPOINTMENT_WINDOW_MONTHS);
	date.setHours(23, 59, 59, 999);
	return date;
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

const ensureDoctorIsBookable = async (doctorId) => {
	try {
		const response = await fetch(`${AUTH_SERVICE_URL}/internal/doctors/${doctorId}/eligibility`, {
			method: "GET",
			headers: {
				"x-internal-token": AUTH_INTERNAL_TOKEN,
			},
		});

		if (response.status === 404) {
			return {
				ok: false,
				statusCode: 404,
				message: "selected doctor not found",
			};
		}

		if (!response.ok) {
			return {
				ok: false,
				statusCode: 502,
				message: "unable to validate doctor eligibility right now",
			};
		}

		const payload = await response.json();
		if (!payload?.isEligible) {
			return {
				ok: false,
				statusCode: 400,
				message: "appointments can only be booked with approved doctors",
			};
		}

		return { ok: true };
	} catch (_error) {
		return {
			ok: false,
			statusCode: 502,
			message: "unable to validate doctor eligibility right now",
		};
	}
};

const sendAppointmentNotification = async ({ eventType, appointment }) => {
	try {
		await fetch(`${NOTIFICATION_SERVICE_URL}/events/appointment`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-internal-token": NOTIFICATION_INTERNAL_TOKEN,
			},
			body: JSON.stringify({
				eventType,
				appointmentId: appointment.appointmentId,
				appointmentDate: appointment.appointmentDate,
				slotTime: appointment.slotTime,
				patientName: appointment.patientName,
				doctorName: appointment.doctorName,
				patientEmail: appointment.patientEmail,
				patientPhone: appointment.patientPhone,
				patientWhatsAppOptIn: appointment.patientWhatsAppOptIn,
				doctorEmail: appointment.doctorEmail,
				doctorPhone: appointment.doctorPhone,
				doctorWhatsAppOptIn: appointment.doctorWhatsAppOptIn,
			}),
		});
	} catch (error) {
		console.error("failed to dispatch notification event", error.message);
	}
};

const sanitizeAppointment = (appointment) => ({
	id: appointment._id,
	appointmentId: appointment.appointmentId,
	patientId: appointment.patientId,
	patientName: appointment.patientName,
	patientEmail: appointment.patientEmail,
	patientPhone: appointment.patientPhone,
	patientWhatsAppOptIn: appointment.patientWhatsAppOptIn,
	patientAge: appointment.patientAge,
	doctorId: appointment.doctorId,
	doctorName: appointment.doctorName,
	doctorEmail: appointment.doctorEmail,
	doctorPhone: appointment.doctorPhone,
	doctorWhatsAppOptIn: appointment.doctorWhatsAppOptIn,
	specialty: appointment.specialty,
	appointmentDateTime: appointment.appointmentDateTime,
	appointmentDate: appointment.appointmentDate,
	slotTime: appointment.slotTime,
	mode: appointment.mode,
	reason: appointment.reason,
	status: appointment.status,
	paymentStatus: appointment.paymentStatus,
	consultationFee: appointment.consultationFee,
	currency: appointment.currency,
	paymentMethod: appointment.paymentMethod,
	paymentReference: appointment.paymentReference,
	paymentExpiresAt: appointment.paymentExpiresAt,
	createdAt: appointment.createdAt,
	updatedAt: appointment.updatedAt,
});

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
	await sendAppointmentNotification({ eventType: "APPOINTMENT_CONFIRMED", appointment });

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

		const queryDate = new Date(`${normalizedDate}T00:00:00`);
		if (Number.isNaN(queryDate.getTime())) {
			return res.status(400).json({ message: "invalid date format" });
		}

		const now = new Date();
		const today = new Date(now);
		today.setHours(0, 0, 0, 0);
		if (queryDate < today || queryDate > getMaxBookableDate()) {
			return res
				.status(400)
				.json({ message: `date must be between today and ${APPOINTMENT_WINDOW_MONTHS} months from today` });
		}

		const allSlots = generateSlots();
		const isTodayRequest = normalizedDate === getDateOnlyForOffset(now, APPOINTMENT_TIMEZONE_OFFSET);
		const filteredSlots = isTodayRequest
			? allSlots.filter((time) => buildDateTime(normalizedDate, time) > now)
			: allSlots;

		const existingAppointments = await Appointment.find({
			doctorId,
			appointmentDate: normalizedDate,
			status: { $in: ["pending", "pending_payment", "confirmed", "completed"] },
		});

		const bookedSlots = new Set(existingAppointments.map((item) => item.slotTime));

		const slots = filteredSlots.map((time) => ({
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
		const requesterId = getRequesterId(req.user);
		if (!requesterId) {
			return res.status(401).json({ message: "invalid token payload" });
		}

		const {
			patientName,
			patientAge,
			patientPhone,
			doctorId,
			doctorName,
			doctorEmail,
			doctorPhone,
			specialty,
			appointmentDate,
			slotTime,
			mode,
			reason,
			patientWhatsAppOptIn,
		} = req.body;

		if (
			!patientName ||
			patientAge === undefined ||
			!patientPhone ||
			!doctorId ||
			!doctorName ||
			!doctorEmail ||
			!doctorPhone ||
			!specialty ||
			!appointmentDate ||
			!slotTime
		) {
			return res.status(400).json({
				message:
					"patientName, patientAge, patientPhone, doctorId, doctorName, doctorEmail, doctorPhone, specialty, appointmentDate, and slotTime are required",
			});
		}

		const parsedAge = Number(patientAge);
		if (Number.isNaN(parsedAge) || parsedAge < 1 || parsedAge > 150) {
			return res.status(400).json({ message: "patientAge must be a valid number between 1 and 150" });
		}

		const doctorEligibility = await ensureDoctorIsBookable(doctorId);
		if (!doctorEligibility.ok) {
			return res.status(doctorEligibility.statusCode).json({ message: doctorEligibility.message });
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

		if (parsedDate > getMaxBookableDate()) {
			return res
				.status(400)
				.json({ message: `appointment date must be within ${APPOINTMENT_WINDOW_MONTHS} months from today` });
		}

		const conflictingAppointment = await Appointment.findOne({
			doctorId,
			appointmentDate: normalizedDate,
			slotTime,
			status: { $in: ["pending", "pending_payment", "confirmed", "completed"] },
		});

		if (conflictingAppointment) {
			return res.status(409).json({ message: "selected slot is no longer available" });
		}

		const appointment = await Appointment.create({
			patientId: requesterId,
			patientName: patientName.trim(),
			patientEmail: req.user.email,
			patientPhone: patientPhone.trim(),
			patientWhatsAppOptIn: parseOptIn(patientWhatsAppOptIn, true),
			patientAge: parsedAge,
			doctorId,
			doctorName: doctorName.trim(),
			doctorEmail: doctorEmail.trim().toLowerCase(),
			doctorPhone: doctorPhone.trim(),
			doctorWhatsAppOptIn: true,
			specialty: specialty.trim(),
			appointmentDateTime: parsedDate,
			appointmentDate: normalizedDate,
			slotTime,
			mode: mode || "in-person",
			reason: reason.trim(),
			status: "pending",
			paymentStatus: "pending",
			consultationFee: DEFAULT_CONSULTATION_FEE,
			currency: "LKR",
		});

		return res.status(201).json({
			message: "appointment request submitted. waiting for doctor confirmation",
			appointment,
		});
	} catch (error) {
		return res.status(500).json({ message: "failed to reserve appointment slot", error: error.message });
	}
};

const getMyAppointments = async (req, res) => {
	try {
		await releaseExpiredPendingPayments();
		const patientId = getRequesterId(req.user);
		if (!patientId) {
			return res.status(401).json({ message: "invalid token payload" });
		}
		const query = {
			$or: [
				{ patientId },
				{ $expr: { $eq: [{ $toString: "$patientId" }, patientId] } }
			]
		};
		const appointments = await Appointment.find(query).sort({ appointmentDateTime: 1 });
		return res.status(200).json({ appointments });
	} catch (error) {
		return res.status(500).json({ message: "failed to fetch appointments", error: error.message });
	}
};

const getDoctorAppointments = async (req, res) => {
	try {
		await releaseExpiredPendingPayments();
		const { doctorId } = req.params;
		const requesterId = getRequesterId(req.user);
		if (!requesterId) {
			return res.status(401).json({ message: "invalid token payload" });
		}

		if (doctorId && String(doctorId) !== String(requesterId)) {
			return res.status(403).json({ message: "you can only view your own appointments" });
		}

		const query = {
			$or: [
				{ doctorId: requesterId },
				{ $expr: { $eq: [{ $toString: "$doctorId" }, requesterId] } }
			]
		};
		const appointments = await Appointment.find(query).sort({ appointmentDateTime: 1 });
		return res.status(200).json({ appointments });
	} catch (error) {
		return res.status(500).json({ message: "failed to fetch doctor appointments", error: error.message });
	}
};

const approveAppointmentByDoctor = async (req, res) => {
	try {
		await releaseExpiredPendingPayments();
		const { id } = req.params;
		const requesterId = getRequesterId(req.user);
		if (!requesterId) {
			return res.status(401).json({ message: "invalid token payload" });
		}

		const appointment = await Appointment.findById(id);
		if (!appointment) {
			return res.status(404).json({ message: "appointment not found" });
		}

		if (String(appointment.doctorId) !== requesterId) {
			return res.status(403).json({ message: "you can only approve your own appointments" });
		}

		if (appointment.status !== "pending") {
			return res.status(400).json({ message: "only pending appointments can be approved" });
		}

		appointment.status = "pending_payment";
		appointment.paymentStatus = "pending";
		appointment.paymentExpiresAt = new Date(Date.now() + PAYMENT_HOLD_MINUTES * 60 * 1000);
		await appointment.save();

		return res.status(200).json({
			message: "appointment approved. patient can proceed with payment",
			appointment,
		});
	} catch (error) {
		return res.status(500).json({ message: "failed to approve appointment", error: error.message });
	}
};

const rejectAppointmentByDoctor = async (req, res) => {
	try {
		const { id } = req.params;
		const requesterId = getRequesterId(req.user);
		if (!requesterId) {
			return res.status(401).json({ message: "invalid token payload" });
		}

		const appointment = await Appointment.findById(id);
		if (!appointment) {
			return res.status(404).json({ message: "appointment not found" });
		}

		if (String(appointment.doctorId) !== requesterId) {
			return res.status(403).json({ message: "you can only reject your own appointments" });
		}

		if (appointment.status !== "pending") {
			return res.status(400).json({ message: "only pending appointments can be rejected" });
		}

		appointment.status = "rejected";
		appointment.paymentStatus = "failed";
		appointment.paymentExpiresAt = new Date();
		await appointment.save();

		return res.status(200).json({
			message: "appointment rejected",
			appointment,
		});
	} catch (error) {
		return res.status(500).json({ message: "failed to reject appointment", error: error.message });
	}
};

const cancelAppointmentByDoctor = async (req, res) => {
	try {
		const { id } = req.params;
		const requesterId = getRequesterId(req.user);
		if (!requesterId) {
			return res.status(401).json({ message: "invalid token payload" });
		}

		const appointment = await Appointment.findById(id);
		if (!appointment) {
			return res.status(404).json({ message: "appointment not found" });
		}

		if (String(appointment.doctorId) !== requesterId) {
			return res.status(403).json({ message: "you can only cancel your own appointments" });
		}

		if (["cancelled", "completed", "rejected", "expired"].includes(appointment.status)) {
			return res.status(400).json({ message: "appointment cannot be cancelled in its current state" });
		}

		appointment.status = "cancelled";
		if (appointment.paymentStatus === "pending") {
			appointment.paymentStatus = "failed";
		}
		appointment.paymentExpiresAt = new Date();

		await appointment.save();
		await sendAppointmentNotification({ eventType: "APPOINTMENT_CANCELLED", appointment });

		return res.status(200).json({
			message: "appointment cancelled successfully",
			appointment,
		});
	} catch (error) {
		return res.status(500).json({ message: "failed to cancel appointment", error: error.message });
	}
};

const confirmAppointmentPayment = async (req, res) => {
	try {
		await releaseExpiredPendingPayments();
		const { id } = req.params;
		const { paymentMethod, paymentReference } = req.body;
		const requesterId = getRequesterId(req.user);
		if (!requesterId) {
			return res.status(401).json({ message: "invalid token payload" });
		}

		if (!paymentMethod) {
			return res.status(400).json({ message: "paymentMethod is required" });
		}

		const appointment = await Appointment.findById(id);
		if (!appointment) {
			return res.status(404).json({ message: "appointment not found" });
		}

		if (String(appointment.patientId) !== requesterId) {
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

const getPaymentEligibilityInternal = async (req, res) => {
	try {
		await releaseExpiredPendingPayments();

		const internalToken = req.headers["x-internal-token"];
		if (!internalToken || internalToken !== APPOINTMENT_INTERNAL_TOKEN) {
			return res.status(401).json({ message: "invalid internal service token" });
		}

		const { appointmentId } = req.params;
		const { patientId } = req.query;

		if (!appointmentId || !patientId) {
			return res.status(400).json({ message: "appointmentId and patientId are required" });
		}

		const appointment = await Appointment.findById(appointmentId);
		if (!appointment) {
			return res.status(404).json({ message: "appointment not found" });
		}

		if (String(appointment.patientId) !== String(patientId)) {
			return res.status(403).json({ message: "appointment does not belong to patient" });
		}

		if (appointment.status !== "pending_payment" || appointment.paymentStatus !== "pending") {
			return res.status(400).json({ message: "appointment is not approved for payment" });
		}

		if (appointment.paymentExpiresAt && appointment.paymentExpiresAt < new Date()) {
			appointment.status = "expired";
			appointment.paymentStatus = "failed";
			await appointment.save();
			return res.status(400).json({ message: "payment window expired. book again." });
		}

		return res.status(200).json({
			eligible: true,
			appointment: sanitizeAppointment(appointment),
		});
	} catch (error) {
		return res.status(500).json({ message: "failed to validate payment eligibility", error: error.message });
	}
};

const getAppointmentInternal = async (req, res) => {
	try {
		const internalToken = req.headers["x-internal-token"];
		if (!internalToken || internalToken !== APPOINTMENT_INTERNAL_TOKEN) {
			return res.status(401).json({ message: "invalid internal service token" });
		}

		const { appointmentId } = req.params;
		if (!appointmentId) {
			return res.status(400).json({ message: "appointment id is required" });
		}

		const appointment = Types.ObjectId.isValid(appointmentId)
			? await Appointment.findById(appointmentId)
			: await Appointment.findOne({ appointmentId: String(appointmentId).trim() });
		if (!appointment) {
			return res.status(404).json({ message: "appointment not found" });
		}

		return res.status(200).json({
			appointment: sanitizeAppointment(appointment),
		});
	} catch (error) {
		return res.status(500).json({ message: "failed to fetch appointment", error: error.message });
	}
};

const getAdminAppointments = async (req, res) => {
	try {
		await releaseExpiredPendingPayments();

		const status = (req.query.status || "").trim();
		const search = (req.query.search || "").trim();
		const doctor = (req.query.doctor || "").trim();
		const startDate = (req.query.startDate || "").trim();
		const endDate = (req.query.endDate || "").trim();
		const page = Math.max(Number(req.query.page) || 1, 1);
		const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
		const skip = (page - 1) * limit;

		const query = {};

		if (status) {
			query.status = status;
		}

		if (doctor) {
			if (Types.ObjectId.isValid(doctor)) {
				query.doctorId = doctor;
			} else {
				query.doctorName = { $regex: doctor, $options: "i" };
			}
		}

		if (search) {
			query.$or = [
				{ appointmentId: { $regex: search, $options: "i" } },
				{ patientName: { $regex: search, $options: "i" } },
				{ patientEmail: { $regex: search, $options: "i" } },
				{ doctorName: { $regex: search, $options: "i" } },
				{ doctorEmail: { $regex: search, $options: "i" } },
			];
		}

		const normalizedStart = startDate ? normalizeDateOnly(startDate) : null;
		const normalizedEnd = endDate ? normalizeDateOnly(endDate) : null;
		if (normalizedStart || normalizedEnd) {
			query.appointmentDate = {
				...(normalizedStart ? { $gte: normalizedStart } : {}),
				...(normalizedEnd ? { $lte: normalizedEnd } : {}),
			};
		}

		const [appointments, total] = await Promise.all([
			Appointment.find(query)
				.sort({ appointmentDateTime: 1 })
				.skip(skip)
				.limit(limit),
			Appointment.countDocuments(query),
		]);

		return res.status(200).json({
			appointments: appointments.map((appointment) => sanitizeAppointment(appointment)),
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.max(Math.ceil(total / limit), 1),
			},
		});
	} catch (error) {
		return res.status(500).json({ message: "failed to fetch admin appointments", error: error.message });
	}
};

const rescheduleAppointment = async (req, res) => {
	try {
		const { id } = req.params;
		const { appointmentDate, slotTime } = req.body;

		if (!Types.ObjectId.isValid(id)) {
			return res.status(400).json({ message: "invalid appointment id" });
		}

		if (!appointmentDate || !slotTime) {
			return res.status(400).json({ message: "appointmentDate and slotTime are required" });
		}

		const appointment = await Appointment.findById(id);
		if (!appointment) {
			return res.status(404).json({ message: "appointment not found" });
		}

		if (["cancelled", "completed", "rejected", "expired"].includes(appointment.status)) {
			return res.status(400).json({ message: "appointment cannot be rescheduled in its current state" });
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

		const conflict = await Appointment.findOne({
			_id: { $ne: id },
			doctorId: appointment.doctorId,
			appointmentDate: normalizedDate,
			slotTime,
			status: { $in: ["pending", "pending_payment", "confirmed", "completed"] },
		});

		if (conflict) {
			return res.status(409).json({ message: "selected slot is no longer available" });
		}

		appointment.appointmentDate = normalizedDate;
		appointment.slotTime = slotTime;
		appointment.appointmentDateTime = parsedDate;

		if (appointment.status === "pending_payment") {
			appointment.paymentExpiresAt = new Date(Date.now() + PAYMENT_HOLD_MINUTES * 60 * 1000);
		}

		await appointment.save();
		await sendAppointmentNotification({ eventType: "APPOINTMENT_RESCHEDULED", appointment });

		return res.status(200).json({
			message: "appointment rescheduled successfully",
			appointment: sanitizeAppointment(appointment),
		});
	} catch (error) {
		return res.status(500).json({ message: "failed to reschedule appointment", error: error.message });
	}
};

const cancelAppointment = async (req, res) => {
	try {
		const { id } = req.params;

		if (!Types.ObjectId.isValid(id)) {
			return res.status(400).json({ message: "invalid appointment id" });
		}

		const appointment = await Appointment.findById(id);
		if (!appointment) {
			return res.status(404).json({ message: "appointment not found" });
		}

		if (appointment.status === "completed") {
			return res.status(400).json({ message: "completed appointments cannot be cancelled" });
		}

		appointment.status = "cancelled";
		if (appointment.paymentStatus === "pending") {
			appointment.paymentStatus = "failed";
		}
		appointment.paymentExpiresAt = new Date();

		await appointment.save();
		await sendAppointmentNotification({ eventType: "APPOINTMENT_CANCELLED", appointment });

		return res.status(200).json({
			message: "appointment cancelled successfully",
			appointment: sanitizeAppointment(appointment),
		});
	} catch (error) {
		return res.status(500).json({ message: "failed to cancel appointment", error: error.message });
	}
};

const completeConsultationAdmin = async (req, res) => {
	try {
		const { id } = req.params;

		const appointment = await Appointment.findById(id);
		if (!appointment) {
			return res.status(404).json({ message: "appointment not found" });
		}

		if (appointment.status !== "confirmed") {
			return res.status(400).json({ message: "only confirmed appointments can be completed" });
		}

		appointment.status = "completed";
		await appointment.save();
		await sendAppointmentNotification({ eventType: "CONSULTATION_COMPLETED", appointment });

		return res.status(200).json({
			message: "consultation marked as completed",
			appointment: sanitizeAppointment(appointment),
		});
	} catch (error) {
		return res.status(500).json({ message: "failed to complete consultation", error: error.message });
	}
};

const deleteMyExpiredAppointment = async (req, res) => {
	try {
		await releaseExpiredPendingPayments();
		const { id } = req.params;
		const requesterId = getRequesterId(req.user);
		if (!requesterId) {
			return res.status(401).json({ message: "invalid token payload" });
		}

		if (!Types.ObjectId.isValid(id)) {
			return res.status(400).json({ message: "invalid appointment id" });
		}

		const appointment = await Appointment.findById(id);
		if (!appointment) {
			return res.status(404).json({ message: "appointment not found" });
		}

		if (String(appointment.patientId) !== requesterId) {
			return res.status(403).json({ message: "you can only delete your own appointments" });
		}

		if (appointment.status !== "expired") {
			return res.status(400).json({ message: "only expired appointments can be deleted" });
		}

		await Appointment.deleteOne({ _id: id });

		return res.status(200).json({
			message: "expired appointment deleted successfully",
			appointment: sanitizeAppointment(appointment),
		});
	} catch (error) {
		return res.status(500).json({ message: "failed to delete expired appointment", error: error.message });
	}
};

const deleteAppointmentAdmin = async (req, res) => {
	try {
		const { id } = req.params;

		if (!Types.ObjectId.isValid(id)) {
			return res.status(400).json({ message: "invalid appointment id" });
		}

		const appointment = await Appointment.findById(id);
		if (!appointment) {
			return res.status(404).json({ message: "appointment not found" });
		}

		const deletableStatuses = ["cancelled", "pending_payment", "pending", "expired", "rejected", "payment_failed"];
		if (!deletableStatuses.includes(appointment.status)) {
			return res.status(400).json({ message: "only pending/cancelled/expired appointments can be deleted" });
		}

		await Appointment.deleteOne({ _id: id });
		await sendAppointmentNotification({ eventType: "APPOINTMENT_DELETED", appointment });

		return res.status(200).json({
			message: "appointment deleted successfully",
			appointment: sanitizeAppointment(appointment),
		});
	} catch (error) {
		return res.status(500).json({ message: "failed to delete appointment", error: error.message });
	}
};

const completeConsultation = async (req, res) => {
	try {
		const { id } = req.params;
		const requesterId = getRequesterId(req.user);
		if (!requesterId) {
			return res.status(401).json({ message: "invalid token payload" });
		}

		const appointment = await Appointment.findById(id);
		if (!appointment) {
			return res.status(404).json({ message: "appointment not found" });
		}

		if (String(appointment.doctorId) !== requesterId) {
			return res.status(403).json({ message: "you can only complete your own consultations" });
		}

		if (appointment.status !== "confirmed") {
			return res.status(400).json({ message: "only confirmed appointments can be completed" });
		}

		appointment.status = "completed";
		await appointment.save();
		await sendAppointmentNotification({ eventType: "CONSULTATION_COMPLETED", appointment });

		return res.status(200).json({
			message: "consultation marked as completed",
			appointment,
		});
	} catch (error) {
		return res.status(500).json({ message: "failed to complete consultation", error: error.message });
	}
};

module.exports = {
	createAppointmentHold,
	getAvailableSlots,
	getMyAppointments,
	getDoctorAppointments,
	approveAppointmentByDoctor,
	rejectAppointmentByDoctor,
	cancelAppointmentByDoctor,
	confirmAppointmentPayment,
	confirmAppointmentPaymentInternal,
	getPaymentEligibilityInternal,
	getAppointmentInternal,
	completeConsultation,
	getAdminAppointments,
	rescheduleAppointment,
	cancelAppointment,
	completeConsultationAdmin,
	deleteAppointmentAdmin,
	deleteMyExpiredAppointment,
};
