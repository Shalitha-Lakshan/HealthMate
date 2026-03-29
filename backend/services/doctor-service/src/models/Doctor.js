const mongoose = require("mongoose");

const doctorSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: true,
		},
		email: {
			type: String,
			required: true,
			unique: true,
		},
		specialty: {
			type: String,
			required: true,
		},
		qualifications: {
			type: [String],
		},
		experienceYears: {
			type: Number,
			default: 0,
		},
		consultationFee: {
			type: Number,
			required: true,
		},
		bio: {
			type: String,
		},
		availableSlots: [
			{
				dayOfWeek: { type: String }, // e.g. "Monday"
				startTime: { type: String }, // e.g. "09:00"
				endTime: { type: String },   // e.g. "12:00"
			}
		],
	},
	{
		timestamps: true,
	}
);

module.exports = mongoose.model("Doctor", doctorSchema);
