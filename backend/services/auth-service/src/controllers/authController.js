const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { generateAccessToken } = require("../services/tokenService");

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

const sanitizeUser = (userDoc) => ({
	id: userDoc._id,
	name: userDoc.name,
	email: userDoc.email,
	phoneNumber: userDoc.phoneNumber,
	role: userDoc.role,
	doctorProfile:
		userDoc.role === "doctor"
			? {
				specialization: userDoc.doctorProfile?.specialization || "",
				slmcRegistrationNumber: userDoc.doctorProfile?.slmcRegistrationNumber || "",
				yearsOfExperience: userDoc.doctorProfile?.yearsOfExperience ?? null,
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
		const user = await User.create({
			name: name.trim(),
			email: email.toLowerCase().trim(),
			phoneNumber: phoneNumber.trim(),
			password: hashedPassword,
			role: role || "patient",
			doctorProfile:
				(role || "patient") === "doctor"
					? {
						specialization: doctorProfile.specialization.trim(),
						slmcRegistrationNumber: doctorProfile.slmcRegistrationNumber.trim(),
						yearsOfExperience: Number(doctorProfile.yearsOfExperience),
					}
					: undefined,
		});

		const token = generateAccessToken({ sub: user._id.toString(), role: user.role, email: user.email });

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

		const isPasswordValid = await bcrypt.compare(password, user.password);
		if (!isPasswordValid) {
			return res.status(401).json({ message: "invalid credentials" });
		}

		const token = generateAccessToken({ sub: user._id.toString(), role: user.role, email: user.email });

		return res.status(200).json({
			message: "login successful",
			user: sanitizeUser(user),
			token,
		});
	} catch (error) {
		return res.status(500).json({ message: "failed to login", error: error.message });
	}
};

module.exports = {
	register,
	login,
};
