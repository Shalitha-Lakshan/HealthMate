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
			isWorking: { type: Boolean, default: true },
			startTime: { type: String },
			endTime: { type: String },
		}
	],
}, { timestamps: true });

module.exports = mongoose.model("Availability", availabilitySchema);
