// API service for payment-related requests (frontend)
// Only comments added, no code changes
// Import axios for HTTP requests
import axios from "axios";

// Create axios instance for payment API
const paymentApi = axios.create({
	baseURL: import.meta.env.VITE_PAYMENT_API_URL || "http://localhost:5005/api/payments",
	headers: {
		"Content-Type": "application/json",
	},
});

// Attach auth token to every request if present
paymentApi.interceptors.request.use((config) => {
	const token = localStorage.getItem("healthmate_token");
	if (token) {
		config.headers.Authorization = `Bearer ${token}`;
	}
	return config;
});

// Initiate a payment (calls backend)
export const initiatePayment = async (payload) => {
	const response = await paymentApi.post("/initiate", payload);
	return response.data;
};

// Complete a payment (calls backend)
export const completePayment = async (transactionId, payload) => {
	const response = await paymentApi.post(`/${transactionId}/complete`, payload);
	return response.data;
};
