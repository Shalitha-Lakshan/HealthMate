import { useEffect, useState } from "react";
import { jsPDF } from "jspdf";
import DashboardShell from "../components/DashboardShell";
import PatientTelemedicinePage from "./PatientTelemedicinePage";
import SymptomChatbot from "../components/SymptomChatbot";
import { DOCTOR_SPECIALIZATIONS } from "../constants/doctorSpecializations";
import { getStoredUser } from "../utils/auth";
import {
	createAppointmentHold,
	fetchAvailableSlots,
	fetchMyAppointments,
} from "../services/appointmentApi";
import { completePayment, initiatePayment } from "../services/paymentApi";
import { fetchDoctors } from "../services/authApi";

const INITIAL_FORM_STATE = {
	patientName: "",
	patientAge: "",
	doctorId: "",
	doctorName: "",
	doctorEmail: "",
	doctorPhone: "",
	specialty: "",
	appointmentDate: "",
	slotTime: "",
	mode: "in-person",
	reason: "",
};

const REPORT_TYPES = ["Lab Result", "Radiology", "Prescription", "Discharge Summary", "Other"];
const REPORT_ID_PREFIX = "RPT-";

const INITIAL_REPORT_STATE = {
	patientName: "",
	reportTitle: "",
	reportType: "",
	doctorName: "",
	hospitalLabName: "",
	reportDate: "",
	notes: "",
	file: null,
};

const formatAppointmentDate = (value) => {
	if (!value) {
		return "Not scheduled";
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

function PatientDashboardPage() {
	const user = getStoredUser() || {};
	const [activeMenuItem, setActiveMenuItem] = useState(() => {
		const paymentStatus = new URLSearchParams(window.location.search).get("payment");
		return paymentStatus ? "Appointments" : "Overview";
	});
	const [formData, setFormData] = useState({ ...INITIAL_FORM_STATE, patientName: user.name || "" });
	const [reportFormData, setReportFormData] = useState({
		...INITIAL_REPORT_STATE,
		patientName: user.name || "",
	});
	const [medicalReports, setMedicalReports] = useState([]);
	const [reportError, setReportError] = useState("");
	const [reportSuccess, setReportSuccess] = useState("");
	const [appointments, setAppointments] = useState([]);
	const [doctors, setDoctors] = useState([]);
	const [isLoadingDoctors, setIsLoadingDoctors] = useState(false);
	const [isLoadingAppointments, setIsLoadingAppointments] = useState(false);
	const [isLoadingSlots, setIsLoadingSlots] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isPaying, setIsPaying] = useState(false);
	const [availableSlots, setAvailableSlots] = useState([]);
	const [reservedAppointment, setReservedAppointment] = useState(null);
	const [errorMessage, setErrorMessage] = useState("");
	const [successMessage, setSuccessMessage] = useState("");

	const appointmentStats = [
		{ label: "Upcoming", value: "03", meta: "Next in 2h" },
		{ label: "Completed", value: "18", meta: "This quarter" },
		{ label: "Prescriptions", value: "12", meta: "Digital copies" },
		{ label: "Reports", value: "08", meta: "Uploaded files" },
	];

	const upcomingAppointments = [
		{ doctor: "Dr. Fernando", specialty: "Cardiology", time: "Today • 6:30 PM", status: "Confirmed" },
		{ doctor: "Dr. Wijesinghe", specialty: "General Physician", time: "Tue • 9:00 AM", status: "Pending" },
		{ doctor: "Dr. Perera", specialty: "Dermatology", time: "Fri • 3:15 PM", status: "Confirmed" },
	];

	const loadAppointments = async () => {
		setErrorMessage("");
		setIsLoadingAppointments(true);

		try {
			const response = await fetchMyAppointments();
			setAppointments(response.appointments || []);
		} catch (error) {
			setErrorMessage(error.response?.data?.message || "Failed to load appointments.");
		} finally {
			setIsLoadingAppointments(false);
		}
	};

	const loadDoctors = async (specialty) => {
		setIsLoadingDoctors(true);
		try {
			const response = await fetchDoctors(specialty);
			setDoctors(response.doctors || []);
		} catch {
			setDoctors([]);
		} finally {
			setIsLoadingDoctors(false);
		}
	};

	const specialties = DOCTOR_SPECIALIZATIONS;

	const doctorsForSelectedSpecialty = doctors.filter((doctor) => doctor.specialty === formData.specialty);

	const loadSlots = async (doctorId, date) => {
		if (!doctorId || !date) {
			setAvailableSlots([]);
			return;
		}

		setIsLoadingSlots(true);
		try {
			const response = await fetchAvailableSlots({ doctorId, date });
			setAvailableSlots(response.slots || []);
		} catch {
			setAvailableSlots([]);
		} finally {
			setIsLoadingSlots(false);
		}
	};

	const handleAppointmentChange = (event) => {
		const { name, value } = event.target;

		if (name === "specialty") {
			setFormData((prev) => ({
				...prev,
				specialty: value,
				doctorId: "",
				doctorName: "",
				doctorEmail: "",
				doctorPhone: "",
				appointmentDate: "",
				slotTime: "",
			}));
			setAvailableSlots([]);
			setReservedAppointment(null);
			return;
		}

		if (name === "doctorId") {
			const selectedDoctor = doctorsForSelectedSpecialty.find((doctor) => doctor.id === value);
			setFormData((prev) => ({
				...prev,
				doctorId: value,
				doctorName: selectedDoctor?.name || "",
				doctorEmail: selectedDoctor?.email || "",
				doctorPhone: selectedDoctor?.phoneNumber || "",
				appointmentDate: "",
				slotTime: "",
			}));
			setAvailableSlots([]);
			setReservedAppointment(null);
			return;
		}

		if (name === "appointmentDate") {
			setFormData((prev) => ({ ...prev, appointmentDate: value, slotTime: "" }));
			setReservedAppointment(null);
			loadSlots(formData.doctorId, value);
			return;
		}

		if (name === "slotTime") {
			setReservedAppointment(null);
		}

		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	const handleCreateAppointment = async (event) => {
		event.preventDefault();
		setErrorMessage("");
		setSuccessMessage("");
		setIsSubmitting(true);

		try {
			const payload = {
				patientName: formData.patientName,
				patientAge: Number(formData.patientAge),
				patientPhone: user.phoneNumber,
				doctorId: formData.doctorId,
				doctorName: formData.doctorName,
				doctorEmail: formData.doctorEmail,
				doctorPhone: formData.doctorPhone,
				specialty: formData.specialty,
				appointmentDate: formData.appointmentDate,
				slotTime: formData.slotTime,
				mode: formData.mode,
				reason: formData.reason,
			};

			const response = await createAppointmentHold(payload);
			setReservedAppointment(response.appointment);
			setSuccessMessage("Slot reserved. Complete payment to confirm appointment.");
			await loadAppointments();
		} catch (error) {
			setErrorMessage(error.response?.data?.message || "Failed to create appointment.");
		} finally {
			setIsSubmitting(false);
		}
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

		const extractReportSequence = (reportId = "") => {
			if (typeof reportId !== "string" || !reportId.startsWith(REPORT_ID_PREFIX)) {
				return 0;
			}

			const parsed = Number.parseInt(reportId.slice(REPORT_ID_PREFIX.length), 10);
			return Number.isNaN(parsed) ? 0 : parsed;
		};

		const generateReportId = () => {
			const highestSequence = medicalReports.reduce((maxSequence, report) => {
				const currentSequence = extractReportSequence(report.reportId);
				return currentSequence > maxSequence ? currentSequence : maxSequence;
			}, 0);

			const nextSequence = highestSequence + 1;
			return `${REPORT_ID_PREFIX}${String(nextSequence).padStart(4, "0")}`;
		};

		const downloadReportPdf = (report) => {
			const doc = new jsPDF();
			doc.setFont("helvetica", "bold");
			doc.setFontSize(16);
			doc.text("HealthMate Medical Report", 20, 20);

			doc.setFont("helvetica", "normal");
			doc.setFontSize(11);

			const details = [
				`Report ID: ${report.reportId}`,
				`Patient Name: ${report.patientName}`,
				`Report Title: ${report.reportTitle}`,
				`Report Type: ${report.reportType}`,
				`Doctor Name: ${report.doctorName}`,
				`Hospital/Lab Name: ${report.hospitalLabName}`,
				`Report Date: ${report.reportDate}`,
				`Uploaded At: ${formatAppointmentDate(report.uploadedAt)}`,
				`Uploaded File: ${report.fileName} (${formatFileSize(report.fileSize)})`,
				`Notes: ${report.notes || "N/A"}`,
			];

			let y = 32;
			details.forEach((line) => {
				const wrappedLines = doc.splitTextToSize(line, 170);
				doc.text(wrappedLines, 20, y);
				y += wrappedLines.length * 7;
			});

			doc.save(`${report.reportId || "medical-report"}.pdf`);
		};

		const printReport = (report) => {
			const printWindow = window.open("", "_blank", "width=900,height=700");
			if (!printWindow) {
				setReportError("Unable to open print window. Please allow pop-ups and try again.");
				return;
			}

			const reportHtml = `
				<html>
					<head>
						<title>${report.reportId} - Medical Report</title>
						<style>
							body { font-family: Arial, sans-serif; padding: 24px; color: #1e293b; }
							h1 { margin-bottom: 8px; }
							p { margin: 8px 0; font-size: 14px; }
							.label { font-weight: 700; }
						</style>
					</head>
					<body>
						<h1>HealthMate Medical Report</h1>
						<p><span class="label">Report ID:</span> ${report.reportId}</p>
						<p><span class="label">Patient Name:</span> ${report.patientName}</p>
						<p><span class="label">Report Title:</span> ${report.reportTitle}</p>
						<p><span class="label">Report Type:</span> ${report.reportType}</p>
						<p><span class="label">Doctor Name:</span> ${report.doctorName}</p>
						<p><span class="label">Hospital/Lab Name:</span> ${report.hospitalLabName}</p>
						<p><span class="label">Report Date:</span> ${report.reportDate}</p>
						<p><span class="label">Uploaded At:</span> ${formatAppointmentDate(report.uploadedAt)}</p>
						<p><span class="label">Uploaded File:</span> ${report.fileName} (${formatFileSize(report.fileSize)})</p>
						<p><span class="label">Notes:</span> ${report.notes || "N/A"}</p>
					</body>
				</html>
			`;

			printWindow.document.open();
			printWindow.document.write(reportHtml);
			printWindow.document.close();
			printWindow.focus();
			printWindow.print();
		};

	const handleReportChange = (event) => {
		const { name, value, files } = event.target;

		if (name === "file") {
			const selectedFile = files?.[0] || null;
			setReportFormData((prev) => ({ ...prev, file: selectedFile }));
			setReportError("");
			setReportSuccess("");
			return;
		}

		setReportFormData((prev) => ({ ...prev, [name]: value }));
		setReportError("");
		setReportSuccess("");
	};

	const handleReportSubmit = (event) => {
		event.preventDefault();
		setReportError("");
		setReportSuccess("");

		if (!reportFormData.patientName.trim()) {
			setReportError("Please provide patient name.");
			return;
		}

		if (!reportFormData.file) {
			setReportError("Please upload a report file before submitting.");
			return;
		}

		const reportEntry = {
			id: `${Date.now()}`,
			reportId: generateReportId(),
			patientName: reportFormData.patientName,
			reportTitle: reportFormData.reportTitle,
			reportType: reportFormData.reportType,
			doctorName: reportFormData.doctorName,
			hospitalLabName: reportFormData.hospitalLabName,
			reportDate: reportFormData.reportDate,
			notes: reportFormData.notes,
			fileName: reportFormData.file.name,
			fileSize: reportFormData.file.size,
			uploadedAt: new Date().toISOString(),
		};

		setMedicalReports((prev) => [reportEntry, ...prev]);
		setReportFormData({
			...INITIAL_REPORT_STATE,
			patientName: user.name || "",
		});
		setReportSuccess("Medical report saved successfully.");
	};

	const handleConfirmPayment = async (appointmentToPay = reservedAppointment) => {
		if (!appointmentToPay?._id) {
			setErrorMessage("No appointment selected for payment.");
			return;
		}

		if (appointmentToPay.status !== "pending_payment") {
			setErrorMessage("Payment is enabled only after doctor confirmation.");
			return;
		}

		setErrorMessage("");
		setSuccessMessage("");
		setIsPaying(true);

		try {
			const initiated = await initiatePayment({
				appointmentId: appointmentToPay._id,
				amount: appointmentToPay.consultationFee,
				currency: appointmentToPay.currency,
				provider: "stripe",
				successUrl: `${window.location.origin}/dashboard/patient?payment=success`,
				cancelUrl: `${window.location.origin}/dashboard/patient?payment=cancel`,
			});

			if (!initiated.checkoutUrl) {
				setErrorMessage("Unable to create Stripe checkout session.");
				return;
			}

			window.location.href = initiated.checkoutUrl;
		} catch (error) {
			setErrorMessage(error.response?.data?.message || "Payment failed.");
		} finally {
			setIsPaying(false);
		}
	};

	useEffect(() => {
		if (activeMenuItem !== "Appointments") {
			return;
		}

		loadDoctors();
		loadAppointments();
	}, [activeMenuItem]);

	useEffect(() => {
		const handleStripeReturn = async () => {
			const params = new URLSearchParams(window.location.search);
			const paymentStatus = params.get("payment");
			const transactionId = params.get("tx");
			const sessionId = params.get("session_id");

			if (!paymentStatus) {
				return;
			}

			setActiveMenuItem("Appointments");
			setErrorMessage("");
			setSuccessMessage("");

			if (paymentStatus === "cancel") {
				setErrorMessage("Payment cancelled. You can retry before payment window expires.");
				window.history.replaceState({}, "", "/dashboard/patient");
				await loadAppointments();
				return;
			}

			if (paymentStatus === "success" && transactionId && sessionId) {
				setIsPaying(true);
				try {
					await completePayment(transactionId, {
						paymentMethod: "stripe-card",
						gatewaySessionId: sessionId,
					});

					setSuccessMessage("Payment successful. Appointment confirmed.");
					setReservedAppointment(null);
					setFormData({ ...INITIAL_FORM_STATE, patientName: user.name || "" });
					setAvailableSlots([]);
					await loadDoctors();
					await loadAppointments();
				} catch (error) {
					setErrorMessage(error.response?.data?.message || "Payment verification failed.");
				} finally {
					setIsPaying(false);
					window.history.replaceState({}, "", "/dashboard/patient");
				}
			}
		};

		handleStripeReturn();
	}, [user.name]);

	const renderOverview = () => (
		<>
			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				{appointmentStats.map((item) => (
					<div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
						<p className="text-xs uppercase tracking-wide text-slate-500">{item.label}</p>
						<p className="mt-2 text-2xl font-bold text-slate-900">{item.value}</p>
						<p className="mt-1 text-xs text-slate-500">{item.meta}</p>
					</div>
				))}
			</div>

			<div className="mt-5 grid gap-5 lg:grid-cols-[1.35fr_1fr]">
				<section className="rounded-2xl border border-slate-200 bg-white p-5">
					<div className="mb-4 flex items-center justify-between">
						<h2 className="text-sm font-semibold text-slate-900">Upcoming Appointments</h2>
						<button className="text-xs font-semibold text-blue-700">View all</button>
					</div>
					<div className="space-y-3">
						{upcomingAppointments.map((appointment) => (
							<div
								key={`${appointment.doctor}-${appointment.time}`}
								className="rounded-xl border border-slate-200 bg-slate-50 p-4"
							>
								<div className="flex items-center justify-between gap-3">
									<div>
										<p className="text-sm font-semibold text-slate-900">{appointment.doctor}</p>
										<p className="text-xs text-slate-500">{appointment.specialty}</p>
									</div>
									<span
										className={`rounded-lg px-2 py-1 text-[11px] font-semibold ${
											appointment.status === "Confirmed"
												? "bg-emerald-100 text-emerald-700"
												: "bg-amber-100 text-amber-700"
										}`}
									>
										{appointment.status}
									</span>
								</div>
								<p className="mt-3 text-xs font-medium text-slate-600">{appointment.time}</p>
							</div>
						))}
					</div>
				</section>

				<section className="space-y-5">
					<div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
						<h3 className="text-sm font-semibold text-slate-900">Profile Snapshot</h3>
						<div className="mt-4 space-y-2 text-sm">
							<p className="text-slate-700">
								<span className="text-slate-500">Email:</span> {user.email || "N/A"}
							</p>
							<p className="text-slate-700">
								<span className="text-slate-500">Phone:</span> {user.phoneNumber || "N/A"}
							</p>
							<p className="text-slate-700">
								<span className="text-slate-500">Role:</span> {user.role || "patient"}
							</p>
						</div>
					</div>

					<div className="rounded-2xl border border-slate-200 bg-blue-50 p-5">
						<h3 className="text-sm font-semibold text-blue-900">Quick Actions</h3>
						<ul className="mt-3 space-y-2 text-sm text-blue-800">
							<li>• Book a new appointment</li>
							<li>• Upload a new medical report</li>
							<li>• Join upcoming telemedicine session</li>
						</ul>
					</div>
				</section>
			</div>
		</>
	);

	const renderAppointments = () => (
		<div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
			<section className="rounded-2xl border border-slate-200 bg-white p-5">
				<h2 className="text-sm font-semibold text-slate-900">Book Appointment</h2>
				<p className="mt-1 text-xs text-slate-500">Submit request first. Doctor confirmation is required before payment.</p>

				<form className="mt-4 space-y-3" onSubmit={handleCreateAppointment}>
					<div className="grid gap-3 sm:grid-cols-2">
						<div>
							<label htmlFor="patientName" className="mb-1 block text-xs font-semibold text-slate-600">
								Patient Name
							</label>
							<input
								id="patientName"
								name="patientName"
								required
								value={formData.patientName}
								onChange={handleAppointmentChange}
								placeholder="Your full name"
								className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
							/>
						</div>

						<div>
							<label htmlFor="patientAge" className="mb-1 block text-xs font-semibold text-slate-600">
								Patient Age
							</label>
							<input
								id="patientAge"
								name="patientAge"
								type="number"
								min="0"
								max="120"
								required
								value={formData.patientAge}
								onChange={handleAppointmentChange}
								placeholder="Age"
								className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
							/>
						</div>
					</div>

					<div>
						<label htmlFor="specialty" className="mb-1 block text-xs font-semibold text-slate-600">
							Specialty
						</label>
						<select
							id="specialty"
							name="specialty"
							required
							value={formData.specialty}
							onChange={handleAppointmentChange}
							disabled={isLoadingDoctors || specialties.length === 0}
							className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
						>
							<option value="">
								{isLoadingDoctors ? "Loading specialties..." : "Select specialty"}
							</option>
							{specialties.map((specialty) => (
								<option key={specialty} value={specialty}>
									{specialty}
								</option>
							))}
						</select>
					</div>

					<div>
						<label htmlFor="doctorId" className="mb-1 block text-xs font-semibold text-slate-600">
							Doctor Name
						</label>
						<select
							id="doctorId"
							name="doctorId"
							required
							value={formData.doctorId}
							onChange={handleAppointmentChange}
							disabled={!formData.specialty}
							className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
						>
							<option value="">{formData.specialty ? "Select doctor" : "Select specialty first"}</option>
							{doctorsForSelectedSpecialty.map((doctor) => (
								<option key={doctor.id} value={doctor.id}>
									{doctor.name} ({doctor.yearsOfExperience ?? "-"}y)
								</option>
							))}
						</select>
					</div>

					<div className="grid gap-3 sm:grid-cols-2">
						<div>
							<label htmlFor="appointmentDate" className="mb-1 block text-xs font-semibold text-slate-600">
								Appointment Date
							</label>
							<input
								id="appointmentDate"
								name="appointmentDate"
								type="date"
								required
								value={formData.appointmentDate}
								onChange={handleAppointmentChange}
								disabled={!formData.doctorId}
								className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
							/>
						</div>

						<div>
							<label htmlFor="slotTime" className="mb-1 block text-xs font-semibold text-slate-600">
								Doctor Slot
							</label>
							<select
								id="slotTime"
								name="slotTime"
								required
								value={formData.slotTime}
								onChange={handleAppointmentChange}
								disabled={!formData.appointmentDate || isLoadingSlots}
								className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
							>
								<option value="">
									{isLoadingSlots ? "Loading slots..." : formData.appointmentDate ? "Select available slot" : "Select date first"}
								</option>
								{availableSlots
									.filter((slot) => slot.available)
									.map((slot) => (
										<option key={slot.time} value={slot.time}>
											{slot.time}
										</option>
									))}
							</select>
						</div>
					</div>

					<div>
						<label htmlFor="mode" className="mb-1 block text-xs font-semibold text-slate-600">
							Mode
						</label>
						<select
							id="mode"
							name="mode"
							value={formData.mode}
							onChange={handleAppointmentChange}
							className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
						>
							<option value="in-person">In-person</option>
							<option value="online">Online</option>
						</select>
					</div>

					<div>
						<label htmlFor="reason" className="mb-1 block text-xs font-semibold text-slate-600">
							Reason
						</label>
						<textarea
							id="reason"
							name="reason"
							required
							rows={4}
							value={formData.reason}
							onChange={handleAppointmentChange}
							placeholder="Briefly describe your symptoms or consultation reason"
							className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
						/>
					</div>

					{errorMessage && (
						<p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p>
					)}

					{successMessage && (
						<p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
							{successMessage}
						</p>
					)}

					<button
						type="submit"
						disabled={isSubmitting}
						className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
					>
						{isSubmitting ? "Submitting request..." : "Submit Appointment Request"}
					</button>

					{reservedAppointment && (
						<div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
							<p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Request Submitted</p>
							<p className="mt-2 text-sm text-emerald-900">
								Requested slot: {reservedAppointment.appointmentDate} • {reservedAppointment.slotTime}
							</p>
							<p className="mt-1 text-xs text-emerald-700">Waiting for doctor confirmation before payment.</p>
						</div>
					)}
				</form>
			</section>

			<section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
				<div className="mb-4 flex items-center justify-between">
					<h2 className="text-sm font-semibold text-slate-900">My Appointments</h2>
					<button
						type="button"
						onClick={loadAppointments}
						disabled={isLoadingAppointments}
						className="text-xs font-semibold text-blue-700 disabled:text-blue-300"
					>
						{isLoadingAppointments ? "Loading..." : "Refresh"}
					</button>
				</div>

				{appointments.length === 0 ? (
					<p className="rounded-xl border border-dashed border-slate-300 bg-white px-3 py-4 text-sm text-slate-500">
						No appointments yet. Create your first request.
					</p>
				) : (
					<div className="space-y-3">
						{appointments.map((appointment) => (
							<div key={appointment._id} className="rounded-xl border border-slate-200 bg-white p-4">
								<p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-blue-700">
									ID: {appointment.appointmentId}
								</p>
								<div className="flex items-center justify-between gap-2">
									<div>
										<p className="text-sm font-semibold text-slate-900">{appointment.doctorName}</p>
										<p className="text-xs text-slate-500">{appointment.specialty}</p>
									</div>
									<span
										className={`rounded-lg px-2 py-1 text-[11px] font-semibold uppercase ${
											appointment.status === "confirmed"
												? "bg-emerald-100 text-emerald-700"
												: appointment.status === "pending"
													? "bg-amber-100 text-amber-700"
												: appointment.status === "pending_payment"
													? "bg-purple-100 text-purple-700"
													: appointment.status === "expired" || appointment.status === "payment_failed"
														? "bg-rose-100 text-rose-700"
														: "bg-slate-200 text-slate-700"
										}`}
									>
										{appointment.status}
									</span>
								</div>
								<p className="mt-3 text-xs font-medium text-slate-600">
									{formatAppointmentDate(appointment.appointmentDateTime)}
								</p>
								<p className="mt-2 text-xs text-slate-600">
									Patient: {appointment.patientName} ({appointment.patientAge})
								</p>
								<p className="mt-2 text-xs text-slate-600">Mode: {appointment.mode}</p>
								{appointment.consultationFee !== undefined && (
									<p className="mt-2 text-xs text-slate-600">
										Payment: {appointment.paymentStatus} • {appointment.currency} {appointment.consultationFee}
									</p>
								)}
								{appointment.status === "pending_payment" && (
									<>
										{appointment.paymentExpiresAt && (
											<p className="mt-2 text-xs text-slate-600">
												Pay before: {formatAppointmentDate(appointment.paymentExpiresAt)}
											</p>
										)}
										<button
											type="button"
											onClick={() => handleConfirmPayment(appointment)}
											disabled={isPaying}
											className="mt-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
										>
											{isPaying ? "Processing..." : "Pay Now"}
										</button>
									</>
								)}
								<p className="mt-2 text-xs text-slate-600">Reason: {appointment.reason}</p>
							</div>
						))}
					</div>
				)}
			</section>
		</div>
	);

	const renderMedicalReports = () => (
		<div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
			<section className="rounded-2xl border border-slate-200 bg-white p-5">
				<h2 className="text-sm font-semibold text-slate-900">Upload Medical Report</h2>
				<p className="mt-1 text-xs text-slate-500">Capture report details and attach the source file.</p>

				<form className="mt-4 space-y-3" onSubmit={handleReportSubmit}>
					<div>
						<label htmlFor="patientName" className="mb-1 block text-xs font-semibold text-slate-600">
							Patient Name
						</label>
						<input
							id="patientName"
							name="patientName"
							required
							value={reportFormData.patientName}
							onChange={handleReportChange}
							placeholder="John Doe"
							className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
						/>
					</div>

					<div>
						<label htmlFor="reportTitle" className="mb-1 block text-xs font-semibold text-slate-600">
							Report Title
						</label>
						<input
							id="reportTitle"
							name="reportTitle"
							required
							value={reportFormData.reportTitle}
							onChange={handleReportChange}
							placeholder="Complete Blood Count"
							className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
						/>
					</div>

					<div>
						<label htmlFor="reportType" className="mb-1 block text-xs font-semibold text-slate-600">
							Report Type
						</label>
						<select
							id="reportType"
							name="reportType"
							required
							value={reportFormData.reportType}
							onChange={handleReportChange}
							className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
						>
							<option value="">Select report type</option>
							{REPORT_TYPES.map((type) => (
								<option key={type} value={type}>
									{type}
								</option>
							))}
						</select>
					</div>

					<div className="grid gap-3 sm:grid-cols-2">
						<div>
							<label htmlFor="doctorName" className="mb-1 block text-xs font-semibold text-slate-600">
								Doctor Name
							</label>
							<input
								id="doctorName"
								name="doctorName"
								required
								value={reportFormData.doctorName}
								onChange={handleReportChange}
								placeholder="Dr. Jane Smith"
								className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
							/>
						</div>

						<div>
							<label htmlFor="hospitalLabName" className="mb-1 block text-xs font-semibold text-slate-600">
								Hospital/Lab Name
							</label>
							<input
								id="hospitalLabName"
								name="hospitalLabName"
								required
								value={reportFormData.hospitalLabName}
								onChange={handleReportChange}
								placeholder="City Diagnostics Lab"
								className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
							/>
						</div>
					</div>

					<div>
						<label htmlFor="reportDate" className="mb-1 block text-xs font-semibold text-slate-600">
							Report Date
						</label>
						<input
							id="reportDate"
							name="reportDate"
							type="date"
							required
							value={reportFormData.reportDate}
							onChange={handleReportChange}
							className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
						/>
					</div>

					<div>
						<label htmlFor="notes" className="mb-1 block text-xs font-semibold text-slate-600">
							Notes
						</label>
						<textarea
							id="notes"
							name="notes"
							rows={4}
							value={reportFormData.notes}
							onChange={handleReportChange}
							placeholder="Add any relevant comments or observations"
							className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
						/>
					</div>

					<div>
						<label htmlFor="file" className="mb-1 block text-xs font-semibold text-slate-600">
							Upload File
						</label>
						<input
							id="file"
							name="file"
							type="file"
							required
							onChange={handleReportChange}
							accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
							className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
						/>
						{reportFormData.file && (
							<p className="mt-2 text-xs text-slate-600">
								Selected: {reportFormData.file.name} ({formatFileSize(reportFormData.file.size)})
							</p>
						)}
					</div>

					{reportError && (
						<p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{reportError}</p>
					)}

					{reportSuccess && (
						<p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
							{reportSuccess}
						</p>
					)}

					<button
						type="submit"
						className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
					>
						Save Medical Report
					</button>
				</form>
			</section>

			<section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
				<h2 className="text-sm font-semibold text-slate-900">Uploaded Reports</h2>
				<p className="mt-1 text-xs text-slate-500">Recently submitted reports with report IDs will appear here.</p>

				{medicalReports.length === 0 ? (
					<p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white px-3 py-4 text-sm text-slate-500">
						No reports uploaded yet.
					</p>
				) : (
					<div className="mt-4 space-y-3">
						{medicalReports.map((report) => (
							<div key={report.id} className="rounded-xl border border-slate-200 bg-white p-4">
								<p className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
									Report ID: {report.reportId}
								</p>
								<p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">
									{report.reportType}
								</p>
								<p className="mt-2 text-sm font-semibold text-slate-900">{report.reportTitle}</p>
								<p className="mt-1 text-xs text-slate-600">Patient Name: {report.patientName}</p>
								<p className="mt-1 text-xs text-slate-600">Doctor: {report.doctorName}</p>
								<p className="mt-1 text-xs text-slate-600">Hospital/Lab: {report.hospitalLabName}</p>
								<p className="mt-1 text-xs text-slate-600">Report Date: {report.reportDate}</p>
								<p className="mt-1 text-xs text-slate-600">Uploaded At: {formatAppointmentDate(report.uploadedAt)}</p>
								<p className="mt-1 text-xs text-slate-600">
									File: {report.fileName} ({formatFileSize(report.fileSize)})
								</p>
								{report.notes && <p className="mt-2 text-xs text-slate-600">Notes: {report.notes}</p>}
								<div className="mt-3 flex flex-wrap gap-2">
									<button
										type="button"
										onClick={() => printReport(report)}
										className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
									>
										Print Report
									</button>
									<button
										type="button"
										onClick={() => downloadReportPdf(report)}
										className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700"
									>
										Download PDF
									</button>
								</div>
							</div>
						))}
					</div>
				)}
			</section>
		</div>
	);

	return (
		<DashboardShell
			role="patient"
			initialActiveMenuItem={activeMenuItem}
			onMenuChange={(menuItem) => {
				setActiveMenuItem(menuItem);
			}}
			title={`Welcome, ${user.name || "Patient"}`}
			subtitle="Manage appointments, reports, and telemedicine sessions."
		>
			{activeMenuItem === "Medical Reports" ? (
				renderMedicalReports()
			) : activeMenuItem === "Telemedicine" ? (
				<PatientTelemedicinePage />
			) : activeMenuItem === "Appointments" ? (
				renderAppointments()
			) : activeMenuItem === "AI Assistant" ? (
				<SymptomChatbot />
			) : (
				renderOverview()
			)}
		</DashboardShell>
	);
}

export default PatientDashboardPage;
