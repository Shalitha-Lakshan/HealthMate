import axios from "axios";

const api = axios.create({
	baseURL: import.meta.env.VITE_AUTH_API_URL || "http://localhost:5001/api/auth",
	headers: {
		"Content-Type": "application/json",
	},
});

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
