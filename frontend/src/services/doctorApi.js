const DOCTOR_SERVICE_BASE_URL = import.meta.env.VITE_DOCTOR_SERVICE_URL || "http://localhost:5003/api/doctors";

export const getDoctorAvailability = async (doctorId, token) => {
	const response = await fetch(`${DOCTOR_SERVICE_BASE_URL}/${doctorId}/availability`, {
		headers: {
			Authorization: `Bearer ${token}`,
		},
	});

	if (!response.ok) {
		if (response.status === 404) {
			return null;
		}
		const errorData = await response.json();
		throw new Error(errorData.message || "Failed to fetch doctor availability");
	}

	return response.json();
};

export const updateDoctorAvailability = async (doctorId, token, slots) => {
	const response = await fetch(`${DOCTOR_SERVICE_BASE_URL}/${doctorId}/availability`, {
		method: "PUT",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify({ slots }),
	});

	if (!response.ok) {
		const errorData = await response.json();
		throw new Error(errorData.message || "Failed to update availability");
	}

	return response.json();
};