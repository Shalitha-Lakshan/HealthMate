import axios from "axios";

const paymentApi = axios.create({
	baseURL: import.meta.env.VITE_PAYMENT_API_URL || "http://localhost:5005/api/payments",
	headers: {
		"Content-Type": "application/json",
	},
});

paymentApi.interceptors.request.use((config) => {
	const token = localStorage.getItem("healthmate_token");
	if (token) {
		config.headers.Authorization = `Bearer ${token}`;
	}
	return config;
});

export const initiatePayment = async (payload) => {
	const response = await paymentApi.post("/initiate", payload);
	return response.data;
};

export const completePayment = async (transactionId, payload) => {
	const response = await paymentApi.post(`/${transactionId}/complete`, payload);
	return response.data;
};
