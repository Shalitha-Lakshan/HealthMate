const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { generateAccessToken } = require("../services/tokenService");

const INTERNAL_SERVICE_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || "healthmate-internal-token";

const isValidEmail = (email) => {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
};

const isValidPhoneNumber = (phoneNumber) => {
	const normalized = phoneNumber.replace(/\s+/g, "");
	const phoneRegex = /^(?:\+94|0)7\d{8}$/;
	return phoneRegex.test(normalized);
};

const isValidSLMCRegistration = (registrationNumber) => {
	const normalized = registrationNumber.trim();
	const slmcRegex = /^[A-Za-z0-9\-/]{4,20}$/;
	return slmcRegex.test(normalized);
};

const isValidProfilePhotoDataUrl = (photo = "") => {
	const regex = /^data:image\/(png|jpe?g|webp);base64,[a-zA-Z0-9+/=\r\n]+$/;
	return regex.test(photo);
};

const getDataUrlByteSize = (photo = "") => {
	const base64Part = photo.split(",")[1] || "";
	return Buffer.from(base64Part, "base64").length;
};

const PATIENT_ID_PREFIX = "PAT-";

const extractPatientSequence = (patientId = "") => {
	if (typeof patientId !== "string" || !patientId.startsWith(PATIENT_ID_PREFIX)) {
		return 0;
	}

	const numericPart = Number.parseInt(patientId.slice(PATIENT_ID_PREFIX.length), 10);
	return Number.isNaN(numericPart) ? 0 : numericPart;
};

const formatPatientId = (sequenceNumber) => `${PATIENT_ID_PREFIX}${String(sequenceNumber).padStart(4, "0")}`;

const generateNextPatientId = async () => {
	const latestPatient = await User.findOne({ patientId: { $regex: `^${PATIENT_ID_PREFIX}` } })
		.select("patientId")
		.sort({ patientId: -1 })
		.lean();

	const nextSequence = extractPatientSequence(latestPatient?.patientId) + 1;
	return formatPatientId(nextSequence);
};

const assignPatientIdIfMissing = async (userDoc) => {
	if (!userDoc || userDoc.role !== "patient" || userDoc.patientId) {
		return userDoc;
	}

	let attempt = 0;
	while (attempt < 5) {
		attempt += 1;
		const candidatePatientId = await generateNextPatientId();

		try {
			userDoc.patientId = candidatePatientId;
			await userDoc.save();
			return userDoc;
		} catch (saveError) {
			if (saveError?.code !== 11000 || !saveError?.message?.includes("patientId")) {
				throw saveError;
			}
		}
	}

	throw new Error("failed to assign unique patient id");
};

const sanitizeUser = (userDoc) => ({
	id: userDoc._id,
	patientId: userDoc.patientId,
	name: userDoc.name,
	email: userDoc.email,
	phoneNumber: userDoc.phoneNumber,
	role: userDoc.role,
	profilePhoto: userDoc.profilePhoto || "",
	accountStatus: userDoc.accountStatus || "active",
	doctorProfile:
		userDoc.role === "doctor"
			? {
				specialization: userDoc.doctorProfile?.specialization || "",
				slmcRegistrationNumber: userDoc.doctorProfile?.slmcRegistrationNumber || "",
				yearsOfExperience: userDoc.doctorProfile?.yearsOfExperience ?? null,
				verificationStatus: userDoc.doctorProfile?.verificationStatus || "pending",
			}
			: undefined,
	createdAt: userDoc.createdAt,
	updatedAt: userDoc.updatedAt,
});

const register = async (req, res) => {
	try {
		const { name, email, phoneNumber, password, role, doctorProfile } = req.body;
		const allowedRegisterRoles = ["patient", "doctor"];

		if (!name || !email || !phoneNumber || !password) {
			return res.status(400).json({ message: "name, email, phoneNumber, and password are required" });
		}

		if (!isValidEmail(email)) {
			return res.status(400).json({ message: "invalid email format" });
		}

		if (password.length < 6) {
			return res.status(400).json({ message: "password must be at least 6 characters" });
		}

		if (!isValidPhoneNumber(phoneNumber)) {
			return res.status(400).json({ message: "invalid phone number format" });
		}

		if (role && !allowedRegisterRoles.includes(role)) {
			return res.status(400).json({ message: "invalid role. allowed: patient, doctor" });
		}

		if ((role || "patient") === "doctor") {
			if (!doctorProfile?.specialization || !doctorProfile?.slmcRegistrationNumber) {
				return res.status(400).json({
					message: "doctor specialization and SLMC registration number are required",
				});
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

			if (Number(doctorProfile.yearsOfExperience) < 0 || Number(doctorProfile.yearsOfExperience) > 60) {
				return res.status(400).json({ message: "yearsOfExperience must be between 0 and 60" });
			}
		}

		const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
		if (existingUser) {
			return res.status(409).json({ message: "email already in use" });
		}

		const existingPhone = await User.findOne({ phoneNumber: phoneNumber.trim() });
		if (existingPhone) {
			return res.status(409).json({ message: "phone number already in use" });
		}

		const hashedPassword = await bcrypt.hash(password, 10);
		const targetRole = role || "patient";

		let user;
		if (targetRole === "patient") {
			let attempt = 0;
			while (attempt < 5) {
				attempt += 1;
				const candidatePatientId = await generateNextPatientId();

				try {
					user = await User.create({
						name: name.trim(),
						email: email.toLowerCase().trim(),
						phoneNumber: phoneNumber.trim(),
						password: hashedPassword,
						role: targetRole,
						patientId: candidatePatientId,
						accountStatus: "active",
					});
					break;
				} catch (creationError) {
					if (creationError?.code !== 11000 || !creationError?.message?.includes("patientId")) {
						throw creationError;
					}
				}
			}

			if (!user) {
				throw new Error("failed to generate unique patient id");
			}
		} else {
			user = await User.create({
				name: name.trim(),
				email: email.toLowerCase().trim(),
				phoneNumber: phoneNumber.trim(),
				password: hashedPassword,
				role: targetRole,
				accountStatus: "pending",
				doctorProfile: {
					specialization: doctorProfile.specialization.trim(),
					slmcRegistrationNumber: doctorProfile.slmcRegistrationNumber.trim(),
					yearsOfExperience: Number(doctorProfile.yearsOfExperience),
					verificationStatus: "pending",
				},
			});
		}

		const token = generateAccessToken({
			sub: user._id.toString(),
			name: user.name,
			role: user.role,
			email: user.email,
		});

		return res.status(201).json({
			message: "user registered successfully",
			user: sanitizeUser(user),
			token,
		});
	} catch (error) {
		return res.status(500).json({ message: "failed to register user", error: error.message });
	}
};

const login = async (req, res) => {
	try {
		const { email, password } = req.body;

		if (!email || !password) {
			return res.status(400).json({ message: "email and password are required" });
		}

		const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+password");
		if (!user) {
			return res.status(401).json({ message: "invalid credentials" });
		}

		const effectiveAccountStatus = user.accountStatus || "active";

		if (effectiveAccountStatus !== "active") {
			if (effectiveAccountStatus === "pending") {
				return res.status(403).json({ message: "account pending approval" });
			}

			return res.status(403).json({ message: "account is currently unavailable" });
		}

		if (user.role === "doctor" && user.doctorProfile?.verificationStatus !== "approved") {
			return res.status(403).json({ message: "doctor account is pending verification" });
		}

		const isPasswordValid = await bcrypt.compare(password, user.password);
		if (!isPasswordValid) {
			return res.status(401).json({ message: "invalid credentials" });
		}

		if (user.role === "patient" && !user.patientId) {
			await assignPatientIdIfMissing(user);
		}

		const token = generateAccessToken({
			sub: user._id.toString(),
			name: user.name,
			role: user.role,
			email: user.email,
		});

		return res.status(200).json({
			message: "login successful",
			user: sanitizeUser(user),
			token,
		});
	} catch (error) {
		return res.status(500).json({ message: "failed to login", error: error.message });
	}
};

const getDoctors = async (req, res) => {
	try {
		const specialtyFilter = (req.query.specialty || "").trim();
		const query = {
			role: "doctor",
			accountStatus: "active",
			"doctorProfile.verificationStatus": "approved",
			"doctorProfile.specialization": { $exists: true, $ne: "" },
		};

		if (specialtyFilter) {
			query["doctorProfile.specialization"] = specialtyFilter;
		}

		const doctors = await User.find(query)
			.select("name email phoneNumber doctorProfile.specialization doctorProfile.yearsOfExperience")
			.sort({ name: 1 });

		const payload = doctors.map((doctor) => ({
			id: doctor._id,
			name: doctor.name,
			email: doctor.email,
			phoneNumber: doctor.phoneNumber,
			specialty: doctor.doctorProfile?.specialization || "General",
			yearsOfExperience: doctor.doctorProfile?.yearsOfExperience ?? null,
		}));

		return res.status(200).json({ doctors: payload });
	} catch (error) {
		return res.status(500).json({ message: "failed to fetch doctors", error: error.message });
	}
};

const getDoctorBookingEligibility = async (req, res) => {
	try {
		const internalToken = req.headers["x-internal-token"];
		if (!internalToken || internalToken !== INTERNAL_SERVICE_TOKEN) {
			return res.status(401).json({ message: "invalid internal service token" });
		}

		const { doctorId } = req.params;
		const doctor = await User.findById(doctorId).select("role accountStatus doctorProfile.verificationStatus");

		if (!doctor || doctor.role !== "doctor") {
			return res.status(404).json({ message: "doctor not found" });
		}

		const effectiveAccountStatus = doctor.accountStatus || "active";
		const isEligible = effectiveAccountStatus === "active" && doctor.doctorProfile?.verificationStatus === "approved";

		return res.status(200).json({
			doctorId,
			isEligible,
			accountStatus: effectiveAccountStatus,
			verificationStatus: doctor.doctorProfile?.verificationStatus || "pending",
		});
	} catch (error) {
		return res.status(500).json({ message: "failed to validate doctor eligibility", error: error.message });
	}
};

const updateCurrentUserProfile = async (req, res) => {
	try {
		const userId = req.user?.sub;
		if (!userId) {
			return res.status(401).json({ message: "invalid authentication token" });
		}

		const user = await User.findById(userId);
		if (!user) {
			return res.status(404).json({ message: "user not found" });
		}

		const { name, email, phoneNumber, doctorProfile, profilePhoto } = req.body || {};

		if (typeof name === "string") {
			const trimmedName = name.trim();
			if (!trimmedName) {
				return res.status(400).json({ message: "name cannot be empty" });
			}
			user.name = trimmedName;
		}

		if (typeof email === "string") {
			const normalizedEmail = email.toLowerCase().trim();
			if (!isValidEmail(normalizedEmail)) {
				return res.status(400).json({ message: "invalid email format" });
			}

			const existingEmailUser = await User.findOne({
				email: normalizedEmail,
				_id: { $ne: user._id },
			}).select("_id");
			if (existingEmailUser) {
				return res.status(409).json({ message: "email already in use" });
			}

			user.email = normalizedEmail;
		}

		if (typeof phoneNumber === "string") {
			const normalizedPhone = phoneNumber.trim();
			if (!isValidPhoneNumber(normalizedPhone)) {
				return res.status(400).json({ message: "invalid phone number format" });
			}

			const existingPhoneUser = await User.findOne({
				phoneNumber: normalizedPhone,
				_id: { $ne: user._id },
			}).select("_id");
			if (existingPhoneUser) {
				return res.status(409).json({ message: "phone number already in use" });
			}

			user.phoneNumber = normalizedPhone;
		}

		if (typeof profilePhoto === "string") {
			const normalizedPhoto = profilePhoto.trim();
			if (normalizedPhoto) {
				if (!isValidProfilePhotoDataUrl(normalizedPhoto)) {
					return res.status(400).json({ message: "profile photo must be a PNG, JPG, or WEBP image" });
				}

				const photoSizeBytes = getDataUrlByteSize(normalizedPhoto);
				if (photoSizeBytes > 2 * 1024 * 1024) {
					return res.status(400).json({ message: "profile photo must be 2MB or smaller" });
				}

				user.profilePhoto = normalizedPhoto;
			} else {
				user.profilePhoto = "";
			}
		}

		if (doctorProfile && user.role === "doctor") {
			if (typeof doctorProfile.specialization === "string") {
				const specialization = doctorProfile.specialization.trim();
				if (!specialization) {
					return res.status(400).json({ message: "specialization cannot be empty" });
				}
				user.doctorProfile.specialization = specialization;
			}

			if (typeof doctorProfile.slmcRegistrationNumber === "string") {
				const slmcNumber = doctorProfile.slmcRegistrationNumber.trim();
				if (!slmcNumber) {
					return res.status(400).json({ message: "SLMC registration number cannot be empty" });
				}
				if (!isValidSLMCRegistration(slmcNumber)) {
					return res.status(400).json({ message: "invalid SLMC registration number format" });
				}
				user.doctorProfile.slmcRegistrationNumber = slmcNumber;
			}

			if (doctorProfile.yearsOfExperience !== undefined) {
				const years = Number(doctorProfile.yearsOfExperience);
				if (Number.isNaN(years) || years < 0 || years > 60) {
					return res.status(400).json({ message: "yearsOfExperience must be between 0 and 60" });
				}
				user.doctorProfile.yearsOfExperience = years;
			}
		}

		await user.save();

		return res.status(200).json({
			message: "profile updated successfully",
			user: sanitizeUser(user),
		});
	} catch (error) {
		return res.status(500).json({ message: "failed to update profile", error: error.message });
	}
};

module.exports = {
	register,
	login,
	getDoctors,
	getDoctorBookingEligibility,
	updateCurrentUserProfile,
};
