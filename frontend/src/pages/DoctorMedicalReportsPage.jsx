import { useEffect, useMemo, useState } from "react";
import { deleteDoctorMedicalReport, fetchDoctorMedicalReports } from "../services/authApi";
import { deleteMedicalReportByIdentity, getMedicalReportsForDoctor } from "../services/medicalReportStore";
import { getStoredUser } from "../utils/auth";

const formatDateTime = (value) => {
	if (!value) {
		return "N/A";
	}

	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) {
		return value;
	}

	return new Intl.DateTimeFormat("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	}).format(parsed);
};

const formatFileSize = (bytes) => {
	if (!bytes) {
		return "0 KB";
	}

	if (bytes < 1024 * 1024) {
		return `${(bytes / 1024).toFixed(1)} KB`;
	}

	return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const getUserId = (user = {}) => {
	if (typeof user.id === "string" && user.id.trim()) {
		return user.id;
	}

	if (typeof user._id === "string" && user._id.trim()) {
		return user._id;
	}

	if (typeof user.sub === "string" && user.sub.trim()) {
		return user.sub;
	}

	if (user.id && typeof user.id === "object" && typeof user.id.toString === "function") {
		return user.id.toString();
	}

	if (user._id && typeof user._id === "object" && typeof user._id.toString === "function") {
		return user._id.toString();
	}

	return "";
};

const shouldUseDoctorReportFallback = (error) => {
	if (!error?.response) {
		return true;
	}

	const status = Number(error.response.status);
	return [404, 405, 500, 502, 503, 504].includes(status);
};

function DoctorMedicalReportsPage() {
	const [reports, setReports] = useState([]);
	const [isLoading, setIsLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState("");
	const [actionMessage, setActionMessage] = useState("");

	const loadReports = async () => {
		setIsLoading(true);
		setErrorMessage("");
		setActionMessage("");
		try {
			const response = await fetchDoctorMedicalReports();
			setReports(response.reports || []);
		} catch (error) {
			const storedUser = getStoredUser() || {};
			const localReports = getMedicalReportsForDoctor({
				doctorId: getUserId(storedUser),
				doctorName: storedUser.name,
			});

			if (localReports.length > 0) {
				setReports(localReports);
				setErrorMessage("");
			} else {
				setErrorMessage(error.response?.data?.message || "Failed to load medical reports.");
			}
		} finally {
			setIsLoading(false);
		}
	};

	const normalizeId = (value) => {
		if (!value) {
			return "";
		}
		if (typeof value === "object" && typeof value.toString === "function") {
			return value.toString();
		}
		return String(value);
	};

	const handleRemoveFromDoctorView = async (report) => {
		const confirmed = window.confirm("Remove this report from doctor medical reports list?");
		if (!confirmed) {
			return;
		}

		const reportIdentity = report.id || report._id;
		if (!reportIdentity) {
			setActionMessage("Unable to remove report: missing report id.");
			return;
		}

		try {
			await deleteDoctorMedicalReport(reportIdentity);
			await loadReports();
			setActionMessage(`Removed report ${report.reportId || ""} from doctor list.`.trim());
			return;
		} catch (error) {
			if (!shouldUseDoctorReportFallback(error)) {
				setErrorMessage(error?.response?.data?.message || "Failed to remove report from server.");
				return;
			}

			// Fallback only when server route is unavailable/unreachable.
			deleteMedicalReportByIdentity({ id: reportIdentity, reportId: report.reportId });
			setReports((prev) =>
				prev.filter(
					(item) =>
						normalizeId(item.id || item._id) !== normalizeId(reportIdentity)
						&& String(item.reportId || "") !== String(report.reportId || "")
				)
			);
			setActionMessage(`Removed report ${report.reportId || ""} locally (server unavailable).`.trim());
		}
	};

	useEffect(() => {
		loadReports();
	}, []);

	const totalReports = reports.length;
	const latestUpload = useMemo(() => {
		if (reports.length === 0) {
			return "N/A";
		}
		return formatDateTime(reports[0].uploadedAt);
	}, [reports]);

	return (
		<div className="space-y-5">
			<section className="grid gap-4 sm:grid-cols-2">
				<div className="rounded-2xl border border-slate-200 bg-white p-5">
					<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Assigned Reports</p>
					<p className="mt-2 text-3xl font-bold text-slate-900">{totalReports}</p>
					<p className="mt-1 text-xs text-slate-500">Reports sent to you by patients.</p>
				</div>
				<div className="rounded-2xl border border-slate-200 bg-white p-5">
					<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Latest Upload</p>
					<p className="mt-2 text-lg font-semibold text-slate-900">{latestUpload}</p>
					<button
						type="button"
						onClick={loadReports}
						className="mt-3 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
					>
						Refresh
					</button>
				</div>
			</section>

			<section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
				<h2 className="text-sm font-semibold text-slate-900">Patient Medical Reports</h2>
				<p className="mt-1 text-xs text-slate-500">Only reports assigned to your profile are shown here.</p>
				{actionMessage ? (
					<p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{actionMessage}</p>
				) : null}

				{errorMessage ? (
					<p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-4 text-sm text-red-700">{errorMessage}</p>
				) : isLoading ? (
					<p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white px-3 py-4 text-sm text-slate-500">
						Loading medical reports...
					</p>
				) : reports.length === 0 ? (
					<p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white px-3 py-4 text-sm text-slate-500">
						No medical reports have been assigned to you yet.
					</p>
				) : (
					<div className="mt-4 space-y-3">
						{reports.map((report) => (
							<div key={report.id} className="rounded-xl border border-slate-200 bg-white p-4">
								<div className="flex flex-wrap items-center justify-between gap-2">
									<p className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
										Report ID: {report.reportId}
									</p>
									<p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">{report.reportType}</p>
								</div>
								<p className="mt-2 text-sm font-semibold text-slate-900">{report.reportTitle}</p>
								<p className="mt-1 text-xs text-slate-600">Patient: {report.patientName}</p>
								<p className="mt-1 text-xs text-slate-600">Hospital/Lab: {report.hospitalLabName}</p>
								<p className="mt-1 text-xs text-slate-600">Report Date: {report.reportDate}</p>
								<p className="mt-1 text-xs text-slate-600">Uploaded At: {formatDateTime(report.uploadedAt)}</p>
								<p className="mt-1 text-xs text-slate-600">
									File: {report.fileName} ({formatFileSize(report.fileSize)})
								</p>
								{report.fileData ? (
									<a
										href={report.fileData}
										download={report.fileName || "medical-report"}
										className="mt-2 inline-flex rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700"
									>
										Download File
									</a>
								) : null}
								{report.notes ? <p className="mt-2 text-xs text-slate-600">Notes: {report.notes}</p> : null}
								<button
									type="button"
									onClick={() => handleRemoveFromDoctorView(report)}
									className="mt-3 inline-flex rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100"
								>
									Remove
								</button>
							</div>
						))}
					</div>
				)}
			</section>
		</div>
	);
}

export default DoctorMedicalReportsPage;
