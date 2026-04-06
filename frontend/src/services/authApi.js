import axios from "axios";
import {
	deleteMedicalReportById,
	getMedicalReportsForDoctor,
	getMedicalReportsForPatient,
} from "./medicalReportStore";

const api = axios.create({
	baseURL: import.meta.env.VITE_AUTH_API_URL || "http://localhost:5001/api/auth",
	headers: {
		"Content-Type": "application/json",
	},
});

api.interceptors.request.use((config) => {
	const token = localStorage.getItem("healthmate_token");
	if (token) {
		config.headers.Authorization = `Bearer ${token}`;
	}
	return config;
});

const shouldUseMedicalReportFallback = (error) => {
	if (!error?.response) {
		return true;
	}

	const status = Number(error.response.status);
	return [404, 405, 500, 502, 503, 504].includes(status);
};

const getStoredUser = () => {
	try {
		return JSON.parse(localStorage.getItem("healthmate_user") || "null") || {};
	} catch {
		return {};
	}
};

const getUserId = (user = {}) => {
	if (typeof user.id === "string" && user.id.trim()) {
		return user.id;
	}

	if (typeof user._id === "string" && user._id.trim()) {
		return user._id;
	}

	if (typeof user.sub === "string" && user.sub.trim()) {
		return user.sub;
	}

	if (user.id && typeof user.id === "object" && typeof user.id.toString === "function") {
		return user.id.toString();
	}

	if (user._id && typeof user._id === "object" && typeof user._id.toString === "function") {
		return user._id.toString();
	}

	return "";
};

export const registerUser = async (payload) => {
	const response = await api.post("/register", payload);
	return response.data;
};

export const loginUser = async (payload) => {
	const response = await api.post("/login", payload);
	return response.data;
};

export const fetchDoctors = async (specialty) => {
	const response = await api.get("/doctors", {
		params: specialty ? { specialty } : undefined,
	});
	return response.data;
};

export const fetchMyProfile = async () => {
	const response = await api.get("/me");
	return response.data;
};

export const saveMyPatientProfile = async (payload) => {
	const response = await api.put("/me/profile", payload);
	return response.data;
};

export const updateCurrentUserProfile = async (payload) => {
	const token = localStorage.getItem("healthmate_token");
	if (!token) {
		throw new Error("Authentication token not found. Please log in again.");
	}

	const response = await api.patch("/me", payload, {
		headers: {
			Authorization: `Bearer ${token}`,
		},
	});

	return response.data;
};

export const uploadMedicalReport = async (payload) => {
	const response = await api.post("/reports", payload);
	return response.data;
};

export const fetchMyMedicalReports = async () => {
	try {
		const response = await api.get("/reports/me");
		return response.data;
	} catch (error) {
		if (!shouldUseMedicalReportFallback(error)) {
			throw error;
		}

		const user = getStoredUser();
		return { reports: getMedicalReportsForPatient(getUserId(user)) };
	}
};

export const fetchDoctorMedicalReports = async () => {
	try {
		const response = await api.get("/reports/doctor");
		return response.data;
	} catch (error) {
		if (!shouldUseMedicalReportFallback(error)) {
			throw error;
		}

		const user = getStoredUser();
		return {
			reports: getMedicalReportsForDoctor({
				doctorId: getUserId(user),
				doctorName: user.name,
			}),
		};
	}
};

export const deleteMedicalReport = async (reportId) => {
	try {
		const response = await api.delete(`/reports/${reportId}`);
		return response.data;
	} catch (error) {
		if (!shouldUseMedicalReportFallback(error)) {
			throw error;
		}

		deleteMedicalReportById(reportId);
		return { message: "medical report deleted locally" };
	}
};
