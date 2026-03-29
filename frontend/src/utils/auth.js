export const getStoredUser = () => {
	try {
		return JSON.parse(localStorage.getItem("healthmate_user") || "null");
	} catch {
		return null;
	}
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
