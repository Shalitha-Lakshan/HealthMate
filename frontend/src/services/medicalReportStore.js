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
const normalizeId = (value) => {
	if (!value) {
		return "";
	}

	if (typeof value === "object") {
		if (typeof value.$oid === "string") {
			return value.$oid;
		}
		if (typeof value.toString === "function" && value.toString !== Object.prototype.toString) {
			return value.toString();
		}
	}

	return String(value);
};

const idsMatch = (left, right) => {
	const normalizedLeft = normalizeId(left);
	const normalizedRight = normalizeId(right);
	return Boolean(normalizedLeft && normalizedRight && normalizedLeft === normalizedRight);
};

export const addMedicalReport = (report) => {
	const currentReports = readStoredReports();
	const updatedReports = [report, ...currentReports];
	writeStoredReports(updatedReports);
	return updatedReports;
};

export const deleteMedicalReportById = (reportId) => {
	if (!reportId) {
		return readStoredReports();
	}

	const updatedReports = readStoredReports().filter(
		(report) => !idsMatch(report.id || report._id, reportId)
	);
	writeStoredReports(updatedReports);
	return updatedReports;
};

export const deleteMedicalReportByIdentity = ({ id, reportId }) => {
	if (!id && !reportId) {
		return readStoredReports();
	}

	const updatedReports = readStoredReports().filter((report) => {
		const reportIdentity = report.id || report._id;
		const reportPublicId = report.reportId;
		if (id && idsMatch(reportIdentity, id)) {
			return false;
		}
		if (reportId && String(reportPublicId || "") === String(reportId)) {
			return false;
		}
		return true;
	});

	writeStoredReports(updatedReports);
	return updatedReports;
};

export const getMedicalReportsForPatient = (patientUserId) => {
	if (!patientUserId) {
		return [];
	}

	return readStoredReports()
		.filter(
			(report) =>
				idsMatch(report.patientUserId, patientUserId) ||
				idsMatch(report.patientId, patientUserId) ||
				idsMatch(report.userId, patientUserId)
		)
		.sort((a, b) => new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0));
};

export const getMedicalReportsForDoctor = ({ doctorId, doctorName }) => {
	if (!doctorId && !doctorName) {
		return [];
	}

	const normalizedDoctorName = normalizeName(doctorName);

	return readStoredReports()
		.filter((report) => {
			if (
				doctorId &&
				(idsMatch(report.doctorId, doctorId) ||
					idsMatch(report.doctorUserId, doctorId) ||
					idsMatch(report.assignedDoctorId, doctorId))
			) {
				return true;
			}

			if (!report.doctorId && normalizedDoctorName && normalizeName(report.doctorName) === normalizedDoctorName) {
				return true;
			}

			return false;
		})
		.sort((a, b) => new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0));
};
