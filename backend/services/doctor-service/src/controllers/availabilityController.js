const Availability = require("../models/Availability");
const DOCTOR_INTERNAL_TOKEN = process.env.DOCTOR_INTERNAL_TOKEN;
const VALID_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const parse12HourTimeToMinutes = (timeValue) => {
	if (typeof timeValue !== "string") {
		return null;
	}

	const match = timeValue.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
	if (!match) {
		return null;
	}

	let hour = Number(match[1]);
	const minute = Number(match[2]);
	const period = match[3].toUpperCase();

	if (Number.isNaN(hour) || Number.isNaN(minute) || hour < 1 || hour > 12 || minute < 0 || minute > 59) {
		return null;
	}

	if (period === "AM") {
		hour = hour % 12;
	} else {
		hour = (hour % 12) + 12;
	}

	return hour * 60 + minute;
};

exports.getAvailability = async (req, res) => {
	try {
		const { doctorId } = req.params;
		if (req.user?.role === "doctor" && String(req.user.sub) !== String(doctorId)) {
			return res.status(403).json({ message: "you can only view your own availability" });
		}
		const availability = await Availability.findOne({ doctorId });
		if (!availability) {
			return res.status(404).json({ message: "Availability not found" });
		}
		res.status(200).json(availability);
	} catch (error) {
		res.status(500).json({ message: "Error fetching availability", error: error.message });
	}
};

exports.getAvailabilityInternal = async (req, res) => {
	try {
		const internalToken = req.headers["x-internal-token"];
		if (!internalToken || internalToken !== DOCTOR_INTERNAL_TOKEN) {
			return res.status(401).json({ message: "invalid internal service token" });
		}

		const { doctorId } = req.params;
		const availability = await Availability.findOne({ doctorId });
		if (!availability) {
			return res.status(404).json({ message: "Availability not found" });
		}

		return res.status(200).json(availability);
	} catch (error) {
		return res.status(500).json({ message: "Error fetching internal availability", error: error.message });
	}
};

exports.updateAvailability = async (req, res) => {
	try {
		const { doctorId } = req.params;
		const { slots } = req.body;

		if (String(req.user?.sub) !== String(doctorId)) {
			return res.status(403).json({ message: "you can only update your own availability" });
		}

		if (!Array.isArray(slots)) {
			return res.status(400).json({ message: "slots must be an array" });
		}

		const sanitizedSlots = slots.map((slot) => ({
			day: String(slot?.day || "").trim(),
			isWorking: slot?.isWorking !== false,
			startTime: slot?.startTime ? String(slot.startTime).trim() : "",
			endTime: slot?.endTime ? String(slot.endTime).trim() : "",
		}));

		const normalizedDays = sanitizedSlots.map((slot) => String(slot.day || "").toLowerCase());
		const hasDuplicateDays = new Set(normalizedDays).size !== normalizedDays.length;
		if (hasDuplicateDays) {
			return res.status(400).json({ message: "each weekday can only appear once in slots" });
		}

		const hasInvalidSlot = sanitizedSlots.some((slot) => {
			if (!slot.day || !VALID_DAYS.includes(slot.day)) {
				return true;
			}

			if (slot.isWorking && (!slot.startTime || !slot.endTime)) {
				return true;
			}

			if (slot.isWorking) {
				const startMinutes = parse12HourTimeToMinutes(slot.startTime);
				const endMinutes = parse12HourTimeToMinutes(slot.endTime);
				if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
					return true;
				}
			}

			return false;
		});

		if (hasInvalidSlot) {
			return res.status(400).json({
				message:
					"each slot requires a valid weekday, and working days require valid 12-hour start/end times where end is after start",
			});
		}
		
		let availability = await Availability.findOne({ doctorId });
		if (availability) {
			availability.slots = sanitizedSlots;
			await availability.save();
		} else {
			availability = await Availability.create({ doctorId, slots: sanitizedSlots });
		}
		
		res.status(200).json({ message: "Availability updated successfully", availability });
	} catch (error) {
		res.status(500).json({ message: "Error updating availability", error: error.message });
	}
};
