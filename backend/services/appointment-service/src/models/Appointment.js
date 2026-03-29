const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
	{
		patientId: {
			type: String,
			required: true,
		},
		doctorId: {
			type: String,
			required: true,
		},
		date: {
			type: Date,
			required: true,
		},
		timeSlot: {
			type: String,
			required: true,
		},
		status: {
			type: String,
			enum: ["Pending", "Confirmed", "Completed", "Cancelled"],
			default: "Pending",
		},
		symptoms: {
			type: String,
		},
		notes: {
			type: String,
		},
		meetingLink: {
			type: String,
		}
	},
	{
		timestamps: true,
	}
);

module.exports = mongoose.model("Appointment", appointmentSchema);
