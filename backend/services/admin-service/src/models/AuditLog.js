const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
	{
		actorId: {
			type: String,
			required: true,
		},
		actorName: {
			type: String,
			default: "Admin",
		},
		action: {
			type: String,
			required: true,
		},
		targetUserId: {
			type: String,
			required: true,
		},
		targetRole: {
			type: String,
		},
		targetEmail: {
			type: String,
		},
		before: {
			type: mongoose.Schema.Types.Mixed,
		},
		after: {
			type: mongoose.Schema.Types.Mixed,
		},
	},
	{ timestamps: true }
);

module.exports = mongoose.model("AuditLog", auditLogSchema);
