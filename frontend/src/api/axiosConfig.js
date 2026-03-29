// src/api/axiosConfig.js
import axios from "axios";

// Using default ports based on the backend setup, assuming no single API Gateway is fully configured right now.
export const doctorAPI = axios.create({
	baseURL: "http://localhost:5003/api/doctors",
});

export const appointmentAPI = axios.create({
	baseURL: "http://localhost:5004/api/appointments",
});
