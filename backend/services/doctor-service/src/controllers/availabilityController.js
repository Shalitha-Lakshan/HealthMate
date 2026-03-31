const Availability = require("../models/Availability");

exports.getAvailability = async (req, res) => {
	try {
		const { doctorId } = req.params;
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
