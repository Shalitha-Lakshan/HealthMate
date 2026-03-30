import axios from "axios";

const adminApi = axios.create({
	baseURL: import.meta.env.VITE_ADMIN_API_URL || "http://localhost:5009/api/admin",
	headers: {
		"Content-Type": "application/json",
	},
});

adminApi.interceptors.request.use((config) => {
	const token = localStorage.getItem("healthmate_token");
	if (token) {
		config.headers.Authorization = `Bearer ${token}`;
	}
	return config;
});

export const fetchAdminOverview = async () => {
	const response = await adminApi.get("/overview");
	return response.data;
};

export const fetchAdminUsers = async (params) => {
	const response = await adminApi.get("/users", { params });
	return response.data;
};

export const createAdminUser = async (payload) => {
	const response = await adminApi.post("/users", payload);
	return response.data;
};

export const updateAdminUser = async (userId, payload) => {
	const response = await adminApi.patch(`/users/${userId}`, payload);
	return response.data;
};

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
