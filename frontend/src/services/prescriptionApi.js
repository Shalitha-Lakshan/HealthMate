import axios from "axios";

const prescriptionApi = axios.create({
	baseURL: import.meta.env.VITE_PRESCRIPTION_API_URL || "http://localhost:5008/api/prescriptions",
	headers: {
		"Content-Type": "application/json",
	},
});

prescriptionApi.interceptors.request.use((config) => {
	const token = localStorage.getItem("healthmate_token");
	if (token) {
		config.headers.Authorization = `Bearer ${token}`;
	}
	return config;
});

export const issuePrescription = async (payload) => {
	const response = await prescriptionApi.post("/", payload);
	return response.data;
};

export const fetchDoctorPrescriptions = async () => {
	const response = await prescriptionApi.get("/doctor");
	return response.data;
};

export const fetchMyPrescriptions = async () => {
	const response = await prescriptionApi.get("/my");
	return response.data;
};
