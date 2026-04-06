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
		patientId: {
			type: String,
			unique: true,
			sparse: true,
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
		accountStatus: {
			type: String,
			enum: ["active", "pending", "suspended", "deactivated"],
			default: "active",
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
			verificationStatus: {
				type: String,
				enum: ["pending", "approved", "rejected"],
			},
			verificationNotes: {
				type: String,
				trim: true,
			},
			verificationReviewedAt: {
				type: Date,
			},
			verificationReviewedBy: {
				type: mongoose.Schema.Types.ObjectId,
			},
		},
		patientProfile: {
			photoData: {
				type: String,
			},
			dateOfBirth: {
				type: Date,
			},
			gender: {
				type: String,
				enum: ["male", "female", "other", "prefer_not_to_say"],
			},
			bloodGroup: {
				type: String,
				enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
			},
			address: {
				type: String,
				trim: true,
			},
			emergencyContactName: {
				type: String,
				trim: true,
			},
			emergencyContactPhone: {
				type: String,
				trim: true,
			},
		},
	},
	{ timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
