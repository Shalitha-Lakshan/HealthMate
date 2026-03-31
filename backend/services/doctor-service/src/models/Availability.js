const mongoose = require("mongoose");

const availabilitySchema = new mongoose.Schema({
	doctorId: {
		type: String,
		required: true,
		unique: true,
	},
	slots: [
		{
			day: { type: String, required: true },
			startTime: { type: String, required: true },
			endTime: { type: String, required: true },
		}
	],
}, { timestamps: true });

module.exports = mongoose.model("Availability", availabilitySchema);
