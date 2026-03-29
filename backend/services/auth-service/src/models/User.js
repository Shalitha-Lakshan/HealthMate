const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: true,
			trim: true,
		},
		email: {
			type: String,
			required: true,
			unique: true,
			lowercase: true,
			trim: true,
		},
		phoneNumber: {
			type: String,
			required: true,
			unique: true,
			trim: true,
		},
		password: {
			type: String,
			required: true,
			select: false,
		},
		role: {
			type: String,
			enum: ["patient", "doctor", "admin"],
			default: "patient",
		},
		doctorProfile: {
			specialization: {
				type: String,
				trim: true,
			},
			slmcRegistrationNumber: {
				type: String,
				trim: true,
			},
			yearsOfExperience: {
				type: Number,
				min: 0,
				max: 60,
			},
		},
	},
	{ timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
