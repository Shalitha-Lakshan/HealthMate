import axios from "axios";

const appointmentApi = axios.create({
	baseURL: import.meta.env.VITE_APPOINTMENT_API_URL || "http://localhost:5004/api/appointments",
	headers: {
		"Content-Type": "application/json",
	},
});

appointmentApi.interceptors.request.use((config) => {
	const token = localStorage.getItem("healthmate_token");
	if (token) {
		config.headers.Authorization = `Bearer ${token}`;
	}
	return config;
});

export const fetchMyAppointments = async () => {
	const response = await appointmentApi.get("/my");
	return response.data;
};

export const createAppointment = async (payload) => {
	const response = await appointmentApi.post("/", payload);
	return response.data;
};
