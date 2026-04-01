export const getStoredUser = () => {
	try {
		return JSON.parse(localStorage.getItem("healthmate_user") || "null");
	} catch {
		return null;
	}
};

export const getTokenPayload = () => {
	try {
		const token = localStorage.getItem("healthmate_token");
		if (!token) {
			return null;
		}

		const parts = token.split(".");
		if (parts.length < 2) {
			return null;
		}

		const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
		const decoded = atob(normalized);
		return JSON.parse(decoded);
	} catch {
		return null;
	}
};

export const getCurrentUserId = () => {
	const user = getStoredUser() || {};
	const tokenPayload = getTokenPayload() || {};
	return tokenPayload.sub || user.id || user._id || user.doctorProfile?._id || null;
};

export const getDashboardPathForRole = (role) => {
	switch (role) {
		case "doctor":
			return "/dashboard/doctor";
		case "admin":
			return "/dashboard/admin";
		case "patient":
		default:
			return "/dashboard/patient";
	}
};

export const clearAuthStorage = () => {
	localStorage.removeItem("healthmate_token");
	localStorage.removeItem("healthmate_user");
};
