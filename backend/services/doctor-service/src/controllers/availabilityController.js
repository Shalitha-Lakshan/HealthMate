const Availability = require("../models/Availability");

const getRequesterId = (user = {}) => {
	if (!user) {
		return "";
	}

	if (typeof user.sub === "string" && user.sub.trim()) {
		return user.sub.trim();
	}

	if (typeof user.id === "string" && user.id.trim()) {
		return user.id.trim();
	}

	if (typeof user._id === "string" && user._id.trim()) {
		return user._id.trim();
	}

	return "";
};

exports.getAvailability = async (req, res) => {
	try {
		const { doctorId } = req.params;
		const requesterId = getRequesterId(req.user);

		if (!requesterId) {
			return res.status(401).json({ message: "invalid token payload" });
		}

		if (req.user?.role === "doctor" && String(doctorId) !== String(requesterId)) {
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

exports.updateAvailability = async (req, res) => {
	try {
		const { doctorId } = req.params;
		const { slots } = req.body;
		const requesterId = getRequesterId(req.user);

		if (!requesterId) {
			return res.status(401).json({ message: "invalid token payload" });
		}

		if (String(doctorId) !== String(requesterId)) {
			return res.status(403).json({ message: "you can only update your own availability" });
		}
		
		let availability = await Availability.findOne({ doctorId });
		if (availability) {
			availability.slots = slots;
			await availability.save();
		} else {
			availability = await Availability.create({ doctorId, slots });
		}
		
		res.status(200).json({ message: "Availability updated successfully", availability });
	} catch (error) {
		res.status(500).json({ message: "Error updating availability", error: error.message });
	}
};
