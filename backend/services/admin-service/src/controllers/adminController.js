const { Types } = require("mongoose");
const bcrypt = require("bcryptjs");
const { getAuthUserModel } = require("../models/AuthUser");
const { getPaymentTransactionModel } = require("../models/PaymentTransaction");
const AuditLog = require("../models/AuditLog");

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidPhoneNumber = (phoneNumber) => /^(?:\+94|0)7\d{8}$/.test((phoneNumber || "").replace(/\s+/g, ""));
const isValidSLMCRegistration = (registrationNumber) => /^[A-Za-z0-9\-/]{4,20}$/.test((registrationNumber || "").trim());

const normalizeDoctorVerificationStatus = (doctorProfile = {}) => {
	if (doctorProfile.verificationStatus) {
		return doctorProfile.verificationStatus;
	}

	return "pending";
};

const sanitizeUser = (userDoc) => ({
	id: userDoc._id,
	name: userDoc.name,
	email: userDoc.email,
	phoneNumber: userDoc.phoneNumber,
	role: userDoc.role,
	accountStatus: userDoc.accountStatus || "active",
	doctorProfile:
		userDoc.role === "doctor"
			? {
				specialization: userDoc.doctorProfile?.specialization || "",
				slmcRegistrationNumber: userDoc.doctorProfile?.slmcRegistrationNumber || "",
				yearsOfExperience: userDoc.doctorProfile?.yearsOfExperience ?? null,
				verificationStatus: normalizeDoctorVerificationStatus(userDoc.doctorProfile),
				verificationNotes: userDoc.doctorProfile?.verificationNotes || "",
				verificationReviewedAt: userDoc.doctorProfile?.verificationReviewedAt || null,
			}
			: undefined,
	createdAt: userDoc.createdAt,
	updatedAt: userDoc.updatedAt,
});

const sanitizePaymentTransaction = (transactionDoc) => ({
	id: transactionDoc._id,
	transactionId: transactionDoc.transactionId,
	appointmentId: transactionDoc.appointmentId,
	patientId: transactionDoc.patientId,
	amount: transactionDoc.amount,
	currency: transactionDoc.currency,
	provider: transactionDoc.provider,
	status: transactionDoc.status,
	paymentMethod: transactionDoc.paymentMethod,
	paymentReference: transactionDoc.paymentReference,
	errorMessage: transactionDoc.errorMessage,
	paidAt: transactionDoc.paidAt,
	createdAt: transactionDoc.createdAt,
	updatedAt: transactionDoc.updatedAt,
});

const pendingDoctorQuery = {
	role: "doctor",
	$or: [
		{ "doctorProfile.verificationStatus": { $exists: false } },
		{ "doctorProfile.verificationStatus": "pending" },
	],
};

const getOverview = async (_req, res) => {
	try {
		const User = await getAuthUserModel();
		const [totalUsers, totalPatients, totalDoctors, totalAdmins, pendingVerifications, activeUsers, suspendedUsers, recentUsers] = await Promise.all([
			User.countDocuments({}),
			User.countDocuments({ role: "patient" }),
			User.countDocuments({ role: "doctor" }),
			User.countDocuments({ role: "admin" }),
			User.countDocuments(pendingDoctorQuery),
			User.countDocuments({ accountStatus: { $in: ["active", null] } }),
			User.countDocuments({ accountStatus: "suspended" }),
			User.find({})
				.select("name role createdAt")
				.sort({ createdAt: -1 })
				.limit(5),
		]);

		return res.status(200).json({
			stats: {
				totalUsers,
				totalPatients,
				totalDoctors,
				totalAdmins,
				pendingVerifications,
				activeUsers,
				suspendedUsers,
			},
			recentUsers: recentUsers.map((user) => ({
				id: user._id,
				name: user.name,
				role: user.role,
				createdAt: user.createdAt,
			})),
		});
	} catch (error) {
		return res.status(500).json({ message: "failed to fetch admin overview", error: error.message });
	}
};

const getUsers = async (req, res) => {
	try {
		const User = await getAuthUserModel();
		const roleFilter = (req.query.role || "").trim();
		const search = (req.query.search || "").trim();
		const verificationStatus = (req.query.verificationStatus || "").trim();
		const accountStatus = (req.query.accountStatus || "").trim();
		const page = Math.max(Number(req.query.page) || 1, 1);
		const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
		const skip = (page - 1) * limit;

		const query = {};
		if (roleFilter) {
			query.role = roleFilter;
		}

		if (search) {
			query.$or = [
				{ name: { $regex: search, $options: "i" } },
				{ email: { $regex: search, $options: "i" } },
				{ phoneNumber: { $regex: search, $options: "i" } },
			];
		}

		if (verificationStatus) {
			query.role = "doctor";
			if (verificationStatus === "pending") {
				query.$and = [pendingDoctorQuery];
			} else {
				query["doctorProfile.verificationStatus"] = verificationStatus;
			}
		}

		if (accountStatus) {
			if (accountStatus === "active") {
				query.$and = [
					...(query.$and || []),
					{
						$or: [
							{ accountStatus: "active" },
							{ accountStatus: { $exists: false } },
							{ accountStatus: null },
						],
					},
				];
			} else {
				query.accountStatus = accountStatus;
			}
		}

		const [users, total] = await Promise.all([
			User.find(query)
				.select("name email phoneNumber role accountStatus doctorProfile createdAt updatedAt")
				.sort({ createdAt: -1 })
				.skip(skip)
				.limit(limit),
			User.countDocuments(query),
		]);

		return res.status(200).json({
			users: users.map((user) => sanitizeUser(user)),
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.max(Math.ceil(total / limit), 1),
			},
		});
	} catch (error) {
		return res.status(500).json({ message: "failed to fetch users", error: error.message });
	}
};

const getDoctorVerificationQueue = async (_req, res) => {
	try {
		const User = await getAuthUserModel();
		const queue = await User.find(pendingDoctorQuery)
			.select("name email phoneNumber role doctorProfile createdAt updatedAt")
			.sort({ createdAt: -1 })
			.limit(100);

		return res.status(200).json({ doctors: queue.map((doctor) => sanitizeUser(doctor)) });
	} catch (error) {
		return res.status(500).json({ message: "failed to fetch verification queue", error: error.message });
	}
};

const updateDoctorVerificationStatus = async (req, res) => {
	try {
		const User = await getAuthUserModel();
		const { doctorId } = req.params;
		const { status, notes } = req.body;

		if (!Types.ObjectId.isValid(doctorId)) {
			return res.status(400).json({ message: "invalid doctor id" });
		}

		if (!["approved", "rejected"].includes(status)) {
			return res.status(400).json({ message: "invalid status. allowed: approved, rejected" });
		}

		const doctor = await User.findOne({ _id: doctorId, role: "doctor" });
		if (!doctor) {
			return res.status(404).json({ message: "doctor not found" });
		}

		doctor.doctorProfile = {
			...(doctor.doctorProfile || {}),
			verificationStatus: status,
			verificationNotes: typeof notes === "string" ? notes.trim() : "",
			verificationReviewedAt: new Date(),
			verificationReviewedBy: req.user?.sub && Types.ObjectId.isValid(req.user.sub) ? req.user.sub : undefined,
		};

		await doctor.save();

		return res.status(200).json({
			message: `doctor verification ${status}`,
			doctor: sanitizeUser(doctor),
		});
	} catch (error) {
		return res.status(500).json({ message: "failed to update doctor verification", error: error.message });
	}
};

const updateUserStatus = async (req, res) => {
	try {
		const User = await getAuthUserModel();
		const { userId } = req.params;
		const { status } = req.body;

		if (!Types.ObjectId.isValid(userId)) {
			return res.status(400).json({ message: "invalid user id" });
		}

		if (!["active", "suspended", "deactivated"].includes(status)) {
			return res.status(400).json({ message: "invalid status. allowed: active, suspended, deactivated" });
		}

		const target = await User.findById(userId);
		if (!target) {
			return res.status(404).json({ message: "user not found" });
		}

		if (target.role === "admin" && status !== "active") {
			return res.status(400).json({ message: "admin users cannot be suspended/deactivated" });
		}

		const before = {
			accountStatus: target.accountStatus || "active",
		};

		target.accountStatus = status;
		await target.save();

		await AuditLog.create({
			actorId: req.user?.sub || "unknown",
			actorName: req.user?.name || "Admin",
			action: "USER_STATUS_UPDATED",
			targetUserId: target._id.toString(),
			targetRole: target.role,
			targetEmail: target.email,
			before,
			after: { accountStatus: status },
		});

		return res.status(200).json({
			message: "user status updated successfully",
			user: sanitizeUser(target),
		});
	} catch (error) {
		return res.status(500).json({ message: "failed to update user status", error: error.message });
	}
};

const createUser = async (req, res) => {
	try {
		const User = await getAuthUserModel();
		const { name, email, phoneNumber, password, role, doctorProfile } = req.body;
		const allowedRoles = ["patient", "doctor", "admin"];

		if (!name || !email || !phoneNumber || !password) {
			return res.status(400).json({ message: "name, email, phoneNumber, and password are required" });
		}

		if (!isValidEmail(email)) {
			return res.status(400).json({ message: "invalid email format" });
		}

		if (!isValidPhoneNumber(phoneNumber)) {
			return res.status(400).json({ message: "invalid phone number format" });
		}

		if (password.length < 6) {
			return res.status(400).json({ message: "password must be at least 6 characters" });
		}

		if (role && !allowedRoles.includes(role)) {
			return res.status(400).json({ message: "invalid role" });
		}

		const targetRole = role || "patient";
		if (targetRole === "doctor") {
			if (!doctorProfile?.specialization || !doctorProfile?.slmcRegistrationNumber) {
				return res.status(400).json({ message: "doctor specialization and SLMC registration number are required" });
			}

			if (!isValidSLMCRegistration(doctorProfile.slmcRegistrationNumber)) {
				return res.status(400).json({ message: "invalid SLMC registration number format" });
			}

			if (
				doctorProfile.yearsOfExperience === undefined ||
				doctorProfile.yearsOfExperience === null ||
				Number.isNaN(Number(doctorProfile.yearsOfExperience))
			) {
				return res.status(400).json({ message: "doctor yearsOfExperience is required" });
			}
		}

		const normalizedEmail = email.toLowerCase().trim();
		const normalizedPhone = phoneNumber.trim();

		const [existingEmail, existingPhone] = await Promise.all([
			User.findOne({ email: normalizedEmail }),
			User.findOne({ phoneNumber: normalizedPhone }),
		]);

		if (existingEmail) {
			return res.status(409).json({ message: "email already in use" });
		}

		if (existingPhone) {
			return res.status(409).json({ message: "phone number already in use" });
		}

		const hashedPassword = await bcrypt.hash(password, 10);
		const createdUser = await User.create({
			name: name.trim(),
			email: normalizedEmail,
			phoneNumber: normalizedPhone,
			password: hashedPassword,
			role: targetRole,
			accountStatus: "active",
			doctorProfile:
				targetRole === "doctor"
					? {
						specialization: doctorProfile.specialization.trim(),
						slmcRegistrationNumber: doctorProfile.slmcRegistrationNumber.trim(),
						yearsOfExperience: Number(doctorProfile.yearsOfExperience),
						verificationStatus: "pending",
					}
					: undefined,
		});

		await AuditLog.create({
			actorId: req.user?.sub || "unknown",
			actorName: req.user?.name || "Admin",
			action: "USER_CREATED",
			targetUserId: createdUser._id.toString(),
			targetRole: createdUser.role,
			targetEmail: createdUser.email,
			after: sanitizeUser(createdUser),
		});

		return res.status(201).json({
			message: "user created successfully",
			user: sanitizeUser(createdUser),
		});
	} catch (error) {
		return res.status(500).json({ message: "failed to create user", error: error.message });
	}
};

const updateUser = async (req, res) => {
	try {
		const User = await getAuthUserModel();
		const { userId } = req.params;
		const { name, email, phoneNumber, role, doctorProfile } = req.body;
		const allowedRoles = ["patient", "doctor", "admin"];

		if (!Types.ObjectId.isValid(userId)) {
			return res.status(400).json({ message: "invalid user id" });
		}

		const target = await User.findById(userId);
		if (!target) {
			return res.status(404).json({ message: "user not found" });
		}

		if (!name || !email || !phoneNumber) {
			return res.status(400).json({ message: "name, email, and phoneNumber are required" });
		}

		if (!isValidEmail(email)) {
			return res.status(400).json({ message: "invalid email format" });
		}

		if (!isValidPhoneNumber(phoneNumber)) {
			return res.status(400).json({ message: "invalid phone number format" });
		}

		if (role && !allowedRoles.includes(role)) {
			return res.status(400).json({ message: "invalid role" });
		}

		const targetRole = role || target.role;

		if (target.role === "admin" && targetRole !== "admin") {
			return res.status(400).json({ message: "admin role cannot be changed" });
		}

		if (targetRole === "doctor") {
			if (!doctorProfile?.specialization || !doctorProfile?.slmcRegistrationNumber) {
				return res.status(400).json({ message: "doctor specialization and SLMC registration number are required" });
			}

			if (!isValidSLMCRegistration(doctorProfile.slmcRegistrationNumber)) {
				return res.status(400).json({ message: "invalid SLMC registration number format" });
			}

			if (
				doctorProfile.yearsOfExperience === undefined ||
				doctorProfile.yearsOfExperience === null ||
				Number.isNaN(Number(doctorProfile.yearsOfExperience))
			) {
				return res.status(400).json({ message: "doctor yearsOfExperience is required" });
			}
		}

		const normalizedEmail = email.toLowerCase().trim();
		const normalizedPhone = phoneNumber.trim();

		const [existingEmail, existingPhone] = await Promise.all([
			User.findOne({ email: normalizedEmail, _id: { $ne: target._id } }),
			User.findOne({ phoneNumber: normalizedPhone, _id: { $ne: target._id } }),
		]);

		if (existingEmail) {
			return res.status(409).json({ message: "email already in use" });
		}

		if (existingPhone) {
			return res.status(409).json({ message: "phone number already in use" });
		}

		const before = sanitizeUser(target);

		target.name = name.trim();
		target.email = normalizedEmail;
		target.phoneNumber = normalizedPhone;
		target.role = targetRole;

		if (targetRole === "doctor") {
			target.doctorProfile = {
				...(target.doctorProfile || {}),
				specialization: doctorProfile.specialization.trim(),
				slmcRegistrationNumber: doctorProfile.slmcRegistrationNumber.trim(),
				yearsOfExperience: Number(doctorProfile.yearsOfExperience),
				verificationStatus: target.doctorProfile?.verificationStatus || "pending",
			};
		} else {
			target.doctorProfile = undefined;
		}

		await target.save();

		await AuditLog.create({
			actorId: req.user?.sub || "unknown",
			actorName: req.user?.name || "Admin",
			action: "USER_UPDATED",
			targetUserId: target._id.toString(),
			targetRole: target.role,
			targetEmail: target.email,
			before,
			after: sanitizeUser(target),
		});

		return res.status(200).json({
			message: "user updated successfully",
			user: sanitizeUser(target),
		});
	} catch (error) {
		return res.status(500).json({ message: "failed to update user", error: error.message });
	}
};

const deleteUser = async (req, res) => {
	try {
		const User = await getAuthUserModel();
		const { userId } = req.params;

		if (!Types.ObjectId.isValid(userId)) {
			return res.status(400).json({ message: "invalid user id" });
		}

		const target = await User.findById(userId);
		if (!target) {
			return res.status(404).json({ message: "user not found" });
		}

		if (target.role === "admin") {
			return res.status(400).json({ message: "admin users cannot be deleted" });
		}

		const before = sanitizeUser(target);
		await User.deleteOne({ _id: userId });

		await AuditLog.create({
			actorId: req.user?.sub || "unknown",
			actorName: req.user?.name || "Admin",
			action: "USER_DELETED",
			targetUserId: target._id.toString(),
			targetRole: target.role,
			targetEmail: target.email,
			before,
		});

		return res.status(200).json({ message: "user deleted successfully" });
	} catch (error) {
		return res.status(500).json({ message: "failed to delete user", error: error.message });
	}
};

const getAuditLogs = async (req, res) => {
	try {
		const page = Math.max(Number(req.query.page) || 1, 1);
		const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
		const skip = (page - 1) * limit;

		const [logs, total] = await Promise.all([
			AuditLog.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit),
			AuditLog.countDocuments({}),
		]);

		return res.status(200).json({
			logs,
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.max(Math.ceil(total / limit), 1),
			},
		});
	} catch (error) {
		return res.status(500).json({ message: "failed to fetch audit logs", error: error.message });
	}
};

const getPaymentOverview = async (_req, res) => {
	try {
		const PaymentTransaction = await getPaymentTransactionModel();

		const [
			totalTransactions,
			succeededTransactions,
			pendingTransactions,
			failedTransactions,
			revenueAgg,
			recentTransactions,
		] = await Promise.all([
			PaymentTransaction.countDocuments({}),
			PaymentTransaction.countDocuments({ status: "succeeded" }),
			PaymentTransaction.countDocuments({ status: "pending" }),
			PaymentTransaction.countDocuments({ status: "failed" }),
			PaymentTransaction.aggregate([
				{ $match: { status: "succeeded" } },
				{ $group: { _id: null, totalRevenue: { $sum: "$amount" } } },
			]),
			PaymentTransaction.find({})
				.select("transactionId amount currency provider status paidAt createdAt")
				.sort({ createdAt: -1 })
				.limit(5),
		]);

		return res.status(200).json({
			stats: {
				totalTransactions,
				succeededTransactions,
				pendingTransactions,
				failedTransactions,
				totalRevenue: revenueAgg?.[0]?.totalRevenue || 0,
			},
			recentTransactions: recentTransactions.map((transaction) =>
				sanitizePaymentTransaction(transaction)
			),
		});
	} catch (error) {
		return res.status(500).json({ message: "failed to fetch payment overview", error: error.message });
	}
};

const getPaymentTransactions = async (req, res) => {
	try {
		const PaymentTransaction = await getPaymentTransactionModel();

		const status = (req.query.status || "").trim();
		const provider = (req.query.provider || "").trim();
		const search = (req.query.search || "").trim();
		const currency = (req.query.currency || "").trim().toUpperCase();
		const minAmount = req.query.minAmount;
		const maxAmount = req.query.maxAmount;
		const page = Math.max(Number(req.query.page) || 1, 1);
		const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
		const skip = (page - 1) * limit;

		const query = {};

		if (status) {
			query.status = status;
		}

		if (provider) {
			query.provider = provider;
		}

		if (currency) {
			query.currency = currency;
		}

		if (search) {
			query.$or = [
				{ transactionId: { $regex: search, $options: "i" } },
				{ paymentReference: { $regex: search, $options: "i" } },
				{ paymentMethod: { $regex: search, $options: "i" } },
			];
		}

		if (minAmount !== undefined || maxAmount !== undefined) {
			query.amount = {};

			if (minAmount !== undefined && minAmount !== "") {
				const parsedMinAmount = Number(minAmount);
				if (Number.isNaN(parsedMinAmount)) {
					return res.status(400).json({ message: "invalid minAmount" });
				}
				query.amount.$gte = parsedMinAmount;
			}

			if (maxAmount !== undefined && maxAmount !== "") {
				const parsedMaxAmount = Number(maxAmount);
				if (Number.isNaN(parsedMaxAmount)) {
					return res.status(400).json({ message: "invalid maxAmount" });
				}
				query.amount.$lte = parsedMaxAmount;
			}

			if (Object.keys(query.amount).length === 0) {
				delete query.amount;
			}
		}

		const [transactions, total] = await Promise.all([
			PaymentTransaction.find(query)
				.select(
					"transactionId appointmentId patientId amount currency provider status paymentMethod paymentReference errorMessage paidAt createdAt updatedAt"
				)
				.sort({ createdAt: -1 })
				.skip(skip)
				.limit(limit),
			PaymentTransaction.countDocuments(query),
		]);

		return res.status(200).json({
			transactions: transactions.map((transaction) => sanitizePaymentTransaction(transaction)),
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.max(Math.ceil(total / limit), 1),
			},
		});
	} catch (error) {
		return res.status(500).json({ message: "failed to fetch payment transactions", error: error.message });
	}
};

module.exports = {
	getOverview,
	getUsers,
	getDoctorVerificationQueue,
	updateDoctorVerificationStatus,
	updateUserStatus,
	createUser,
	updateUser,
	deleteUser,
	getAuditLogs,
	getPaymentOverview,
	getPaymentTransactions,
};
