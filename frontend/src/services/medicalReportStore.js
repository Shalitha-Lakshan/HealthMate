const MEDICAL_REPORTS_STORAGE_KEY = "healthmate-medical-reports";

const readStoredReports = () => {
	try {
		const raw = window.localStorage.getItem(MEDICAL_REPORTS_STORAGE_KEY);
		const parsed = JSON.parse(raw || "[]");
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
};

const writeStoredReports = (reports) => {
	window.localStorage.setItem(MEDICAL_REPORTS_STORAGE_KEY, JSON.stringify(reports));
};

const normalizeName = (name = "") => String(name).trim().toLowerCase();

export const addMedicalReport = (report) => {
	const currentReports = readStoredReports();
	const updatedReports = [report, ...currentReports];
	writeStoredReports(updatedReports);
	return updatedReports;
};

export const getMedicalReportsForPatient = (patientUserId) => {
	if (!patientUserId) {
		return [];
	}

	return readStoredReports()
		.filter((report) => report.patientUserId === patientUserId)
		.sort((a, b) => new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0));
};

export const getMedicalReportsForDoctor = ({ doctorId, doctorName }) => {
	if (!doctorId && !doctorName) {
		return [];
	}

	const normalizedDoctorName = normalizeName(doctorName);

	return readStoredReports()
		.filter((report) => {
			if (doctorId && report.doctorId === doctorId) {
				return true;
			}

			if (!report.doctorId && normalizedDoctorName && normalizeName(report.doctorName) === normalizedDoctorName) {
				return true;
			}

			return false;
		})
		.sort((a, b) => new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0));
};
