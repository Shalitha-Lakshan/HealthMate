const mongoose = require("mongoose");
const { getAuthConnection } = require("../config/authDb");

const authUserSchema = new mongoose.Schema(
	{
		name: { type: String, trim: true },
		email: { type: String, trim: true, lowercase: true },
		phoneNumber: { type: String, trim: true },
		password: { type: String, select: false },
		role: { type: String, enum: ["patient", "doctor", "admin"] },
		accountStatus: { type: String, enum: ["active", "pending", "suspended", "deactivated"], default: "active" },
		doctorProfile: {
			specialization: { type: String, trim: true },
			slmcRegistrationNumber: { type: String, trim: true },
			yearsOfExperience: { type: Number },
			verificationStatus: { type: String, enum: ["pending", "approved", "rejected"] },
			verificationNotes: { type: String, trim: true },
			verificationReviewedAt: { type: Date },
			verificationReviewedBy: { type: mongoose.Schema.Types.ObjectId },
		},
	},
	{ timestamps: true, strict: false }
);

const getAuthUserModel = async () => {
	const connection = await getAuthConnection();
	return connection.models.User || connection.model("User", authUserSchema, "users");
};

module.exports = {
	getAuthUserModel,
};
