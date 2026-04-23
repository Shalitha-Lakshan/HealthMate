// API service for admin-related requests (frontend)
// Only comments added, no code changes
// Import axios for HTTP requests
import axios from "axios";

// Create axios instance for admin API
const adminApi = axios.create({
	baseURL: import.meta.env.VITE_ADMIN_API_URL || "http://localhost:5009/api/admin",
	headers: {
		"Content-Type": "application/json",
	},
});

// Attach auth token to every request if present
adminApi.interceptors.request.use((config) => {
	const token = localStorage.getItem("healthmate_token");
	if (token) {
		config.headers.Authorization = `Bearer ${token}`;
	}
	return config;
});

// Fetch admin dashboard overview
export const fetchAdminOverview = async () => {
	const response = await adminApi.get("/overview");
	return response.data;
};

// Fetch admin users list
export const fetchAdminUsers = async (params) => {
	const response = await adminApi.get("/users", { params });
	return response.data;
};

// Create a new admin user
export const createAdminUser = async (payload) => {
	const response = await adminApi.post("/users", payload);
	return response.data;
};

// Update an existing admin user
export const updateAdminUser = async (userId, payload) => {
	const response = await adminApi.patch(`/users/${userId}`, payload);
	return response.data;
};

// Delete an admin user
export const deleteAdminUser = async (userId) => {
	const response = await adminApi.delete(`/users/${userId}`);
	return response.data;
};

export const fetchAuditLogs = async (params) => {
	const response = await adminApi.get("/audit-logs", { params });
	return response.data;
};

export const fetchDoctorVerificationQueue = async () => {
	const response = await adminApi.get("/verifications");
	return response.data;
};

export const updateDoctorVerificationStatus = async (doctorId, payload) => {
	const response = await adminApi.patch(`/verifications/${doctorId}`, payload);
	return response.data;
};

export const updateUserStatus = async (userId, payload) => {
	const response = await adminApi.patch(`/users/${userId}/status`, payload);
	return response.data;
};

export const fetchPaymentOverview = async () => {
	const response = await adminApi.get("/payments/overview");
	return response.data;
};

export const fetchPaymentTransactions = async (params) => {
	const response = await adminApi.get("/payments/transactions", { params });
	return response.data;
};
