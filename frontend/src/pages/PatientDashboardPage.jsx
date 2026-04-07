import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { jsPDF } from "jspdf";
import DashboardShell from "../components/DashboardShell";
import PatientTelemedicinePage from "./PatientTelemedicinePage";
import SymptomChatbot from "../components/SymptomChatbot";
import { DOCTOR_SPECIALIZATIONS } from "../constants/doctorSpecializations";
import { getStoredUser, setStoredUser } from "../utils/auth";
import {
	createAppointmentHold,
	deleteExpiredAppointment,
	fetchAvailableSlots,
	fetchMyAppointments,
} from "../services/appointmentApi";
import { completePayment, initiatePayment } from "../services/paymentApi";
import {
	fetchDoctors,
	fetchMyMedicalReports,
	fetchMyProfile,
	saveMyPatientProfile,
	deleteMedicalReport,
	uploadMedicalReport,
} from "../services/authApi";

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
	doctorId: "",
	doctorName: "",
	hospitalLabName: "",
	reportDate: "",
	notes: "",
	file: null,
};

const INITIAL_PROFILE_STATE = {
	name: "",
	phoneNumber: "",
	photoData: "",
	dateOfBirth: "",
	gender: "",
	bloodGroup: "",
	address: "",
	emergencyContactName: "",
	emergencyContactPhone: "",
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

const formatSlotTimeLabel = (slotTime) => {
	if (!slotTime || typeof slotTime !== "string") {
		return "N/A";
	}

	const normalized = slotTime.trim().toLowerCase();
	if (/^\d{1,2}[:.]\d{2}\s?(am|pm)$/.test(normalized)) {
		return normalized.replace(":", ".").replace(" ", "");
	}

	const match = normalized.match(/^(\d{1,2})[:.](\d{2})$/);
	if (!match) {
		return slotTime;
	}

	const hours = Number(match[1]);
	const minutes = Number(match[2]);

	if (Number.isNaN(hours) || Number.isNaN(minutes)) {
		return slotTime;
	}

	const meridiem = hours >= 12 ? "pm" : "am";
	const displayHours = hours % 12 || 12;
	return `${displayHours}.${String(minutes).padStart(2, "0")}${meridiem}`;
};

const formatAppointmentSchedule = (appointmentDate, slotTime) => {
	if (!appointmentDate) {
		return formatSlotTimeLabel(slotTime);
	}

	const parsedDate = new Date(`${appointmentDate}T00:00:00`);
	if (Number.isNaN(parsedDate.getTime())) {
		return `${appointmentDate} • ${formatSlotTimeLabel(slotTime)}`;
	}

	const dateLabel = new Intl.DateTimeFormat("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
	}).format(parsedDate);

	return `${dateLabel}, ${formatSlotTimeLabel(slotTime)}`;
};

const getTodayInputDate = () => {
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, "0");
	const day = String(now.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
};

const getMaxAppointmentInputDate = () => {
	const date = new Date();
	date.setMonth(date.getMonth() + 3);
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
};

const getMinReportInputDate = () => {
	const date = new Date();
	date.setMonth(date.getMonth() - 1);
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
};

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

function PatientDashboardPage() {
	const navigate = useNavigate();
	const location = useLocation();
	const user = getStoredUser() || {};
	const minAppointmentDate = getTodayInputDate();
	const maxAppointmentDate = getMaxAppointmentInputDate();
	const minReportDate = getMinReportInputDate();
	const maxReportDate = getTodayInputDate();
	const [activeMenuItem, setActiveMenuItem] = useState(() => {
		const paymentStatus = new URLSearchParams(window.location.search).get("payment");
		if (paymentStatus) {
			return "Appointments";
		}

		if (location.state?.activeMenuItem) {
			return location.state.activeMenuItem;
		}

		return "Overview";
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
	const [isLoadingProfile, setIsLoadingProfile] = useState(false);
	const [isSavingProfile, setIsSavingProfile] = useState(false);
	const [deletingAppointmentId, setDeletingAppointmentId] = useState("");
	const [deletingReportId, setDeletingReportId] = useState("");
	const [availableSlots, setAvailableSlots] = useState([]);
	const [slotError, setSlotError] = useState("");
	const [reservedAppointment, setReservedAppointment] = useState(null);
	const [telemedicineRoomId, setTelemedicineRoomId] = useState("");
	const [profileFormData, setProfileFormData] = useState({
		...INITIAL_PROFILE_STATE,
		name: user.name || "",
		phoneNumber: user.phoneNumber || "",
	});
	const [profileError, setProfileError] = useState("");
	const [profileSuccess, setProfileSuccess] = useState("");
	const [errorMessage, setErrorMessage] = useState("");
	const [successMessage, setSuccessMessage] = useState("");

	const appointmentStats = [
		{ label: "Upcoming", value: "03", meta: "Next in 2h" },
		{ label: "Completed", value: "18", meta: "This quarter" },
		{ label: "Prescriptions", value: "12", meta: "Digital copies" },
		{ label: "Reports", value: "08", meta: "Uploaded files" },
	];

	const getAppointmentStart = (appointment) => {
		if (!appointment) {
			return null;
		}

		const dateTimeValue = appointment.appointmentDateTime
			|| (appointment.appointmentDate && appointment.slotTime
				? `${appointment.appointmentDate}T${appointment.slotTime}:00`
				: appointment.appointmentDate
					? `${appointment.appointmentDate}T00:00:00`
					: null);

		if (!dateTimeValue) {
			return null;
		}

		const parsed = new Date(dateTimeValue);
		return Number.isNaN(parsed.getTime()) ? null : parsed;
	};

	const canJoinTelemedicine = (appointment) => {
		if (!appointment || appointment.mode !== "online" || appointment.status !== "confirmed") {
			return false;
		}

		const startTime = getAppointmentStart(appointment);
		if (!startTime) {
			return false;
		}

		return Date.now() >= startTime.getTime();
	};

	const handleJoinTelemedicine = (appointment) => {
		const roomId = appointment?.appointmentId || appointment?._id || appointment?.id;
		if (!roomId) {
			return;
		}
		setTelemedicineRoomId(String(roomId));
		setActiveMenuItem("Telemedicine");
	};

	const upcomingAppointments = appointments
		.filter((appointment) => {
			const status = String(appointment.status || "").toLowerCase();
			if (["cancelled", "completed", "rejected", "expired", "payment_failed"].includes(status)) {
				return false;
			}

			const appointmentDateTime = new Date(
				appointment.appointmentDateTime || `${appointment.appointmentDate || ""}T00:00:00`
			);
			if (Number.isNaN(appointmentDateTime.getTime())) {
				return false;
			}

			return appointmentDateTime.getTime() >= Date.now();
		})
		.sort((a, b) => new Date(a.appointmentDateTime || a.appointmentDate) - new Date(b.appointmentDateTime || b.appointmentDate))
		.slice(0, 5);

	const loadAppointments = async ({ showError = true } = {}) => {
		if (showError) {
			setErrorMessage("");
		}
		setIsLoadingAppointments(true);

		try {
			const response = await fetchMyAppointments();
			setAppointments(response.appointments || []);
		} catch (error) {
			if (showError) {
				setErrorMessage(error.response?.data?.message || "Failed to load appointments.");
			}
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

	const loadMyMedicalReports = async ({ showError = true } = {}) => {
		if (showError) {
			setReportError("");
		}

		try {
			const response = await fetchMyMedicalReports();
			setMedicalReports(response.reports || []);
		} catch (error) {
			if (showError) {
				setReportError(error.response?.data?.message || "Failed to load medical reports.");
			}
		}
	};

	const loadProfile = async () => {
		setIsLoadingProfile(true);
		setProfileError("");

		try {
			const response = await fetchMyProfile();
			const profileUser = response.user || {};
			setStoredUser(profileUser);
			setProfileFormData({
				name: profileUser.name || "",
				phoneNumber: profileUser.phoneNumber || "",
				photoData: profileUser.patientProfile?.photoData || "",
				dateOfBirth: profileUser.patientProfile?.dateOfBirth
					? new Date(profileUser.patientProfile.dateOfBirth).toISOString().slice(0, 10)
					: "",
				gender: profileUser.patientProfile?.gender || "",
				bloodGroup: profileUser.patientProfile?.bloodGroup || "",
				address: profileUser.patientProfile?.address || "",
				emergencyContactName: profileUser.patientProfile?.emergencyContactName || "",
				emergencyContactPhone: profileUser.patientProfile?.emergencyContactPhone || "",
			});
		} catch (error) {
			setProfileError(error.response?.data?.message || "Failed to load profile.");
		} finally {
			setIsLoadingProfile(false);
		}
	};

	const handleProfileChange = (event) => {
		const { name, value } = event.target;
		setProfileFormData((prev) => ({ ...prev, [name]: value }));
		setProfileError("");
		setProfileSuccess("");
	};

	const handleProfileSave = async (event) => {
		event.preventDefault();
		setIsSavingProfile(true);
		setProfileError("");
		setProfileSuccess("");

		try {
			const payload = {
				name: profileFormData.name,
				phoneNumber: profileFormData.phoneNumber,
				patientProfile: {
					photoData: profileFormData.photoData || "",
					dateOfBirth: profileFormData.dateOfBirth || "",
					gender: profileFormData.gender,
					bloodGroup: profileFormData.bloodGroup,
					address: profileFormData.address,
					emergencyContactName: profileFormData.emergencyContactName,
					emergencyContactPhone: profileFormData.emergencyContactPhone,
				},
			};

			const response = await saveMyPatientProfile(payload);
			setStoredUser(response.user);
			setProfileSuccess("Profile saved successfully.");
		} catch (error) {
			setProfileError(error.response?.data?.message || "Failed to save profile.");
		} finally {
			setIsSavingProfile(false);
		}
	};

	const specialties = DOCTOR_SPECIALIZATIONS;

	const doctorsForSelectedSpecialty = doctors.filter((doctor) => doctor.specialty === formData.specialty);
	const reportDoctorOptions = doctors
		.filter((doctor) => doctor?.name)
		.map((doctor) => ({
			id: normalizeId(doctor.id || doctor._id),
			name: doctor.name,
			specialty: doctor.specialty,
		}));

	const loadSlots = async (doctorId, date) => {
		if (!doctorId || !date) {
			setAvailableSlots([]);
			setSlotError("");
			return;
		}

		setIsLoadingSlots(true);
		setSlotError("");
		try {
			const response = await fetchAvailableSlots({ doctorId, date });
			setAvailableSlots(response.slots || []);
		} catch (error) {
			setSlotError(error.response?.data?.message || "Failed to load available slots.");
			setAvailableSlots([]);
		} finally {
			setIsLoadingSlots(false);
		}
	};

	useEffect(() => {
		if (!formData.doctorId || !formData.appointmentDate) {
			return;
		}
		loadSlots(formData.doctorId, formData.appointmentDate);
	}, [formData.doctorId, formData.appointmentDate]);

	const handleAppointmentChange = (event) => {
		const { name, value } = event.target;

		if (name === "patientName") {
			if (value === "") {
				setFormData((prev) => ({ ...prev, patientName: "" }));
				return;
			}

			if (!/^[A-Za-z ]+$/.test(value)) {
				return;
			}

			setFormData((prev) => ({ ...prev, patientName: value }));
			return;
		}

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
			setSlotError("");
			setReservedAppointment(null);
			return;
		}

		if (name === "doctorId") {
			const selectedDoctor = doctorsForSelectedSpecialty.find(
				(doctor) => normalizeId(doctor.id || doctor._id) === normalizeId(value)
			);
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
			setSlotError("");
			setReservedAppointment(null);
			return;
		}

		if (name === "patientAge") {
			if (value === "") {
				setFormData((prev) => ({ ...prev, patientAge: "" }));
				return;
			}

			if (!/^\d+$/.test(value)) {
				return;
			}

			const numericAge = Number(value);
			if (numericAge < 1 || numericAge > 150) {
				return;
			}

			setFormData((prev) => ({ ...prev, patientAge: value }));
			return;
		}

		if (name === "appointmentDate") {
			setFormData((prev) => ({ ...prev, appointmentDate: value, slotTime: "" }));
			setReservedAppointment(null);
			return;
		}

		if (name === "slotTime") {
			setReservedAppointment(null);
		}

		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	const handlePatientNameKeyDown = (event) => {
		const allowedControlKeys = [
			"Backspace",
			"Delete",
			"Tab",
			"ArrowLeft",
			"ArrowRight",
			"Home",
			"End",
		];

		if (allowedControlKeys.includes(event.key)) {
			return;
		}

		if (!/^[A-Za-z ]$/.test(event.key)) {
			event.preventDefault();
		}
	};

	const handlePatientNamePaste = (event) => {
		const pastedText = event.clipboardData.getData("text");
		if (!/^[A-Za-z ]+$/.test(pastedText.trim())) {
			event.preventDefault();
		}
	};

	const handlePatientAgeKeyDown = (event) => {
		const allowedControlKeys = [
			"Backspace",
			"Delete",
			"Tab",
			"ArrowLeft",
			"ArrowRight",
			"Home",
			"End",
		];

		if (allowedControlKeys.includes(event.key)) {
			return;
		}

		if (!/^\d$/.test(event.key)) {
			event.preventDefault();
			return;
		}

		const input = event.currentTarget;
		const selectionStart = input.selectionStart ?? input.value.length;
		const selectionEnd = input.selectionEnd ?? input.value.length;
		const nextValue = `${input.value.slice(0, selectionStart)}${event.key}${input.value.slice(selectionEnd)}`;

		if (!/^\d+$/.test(nextValue)) {
			event.preventDefault();
			return;
		}

		const numericAge = Number(nextValue);
		if (numericAge < 1 || numericAge > 150) {
			event.preventDefault();
		}
	};

	const handlePatientAgePaste = (event) => {
		const pastedText = event.clipboardData.getData("text").trim();
		if (!/^\d+$/.test(pastedText)) {
			event.preventDefault();
			return;
		}

		const numericAge = Number(pastedText);
		if (numericAge < 1 || numericAge > 150) {
			event.preventDefault();
		}
	};

	const handleCreateAppointment = async (event) => {
		event.preventDefault();
		setErrorMessage("");
		setSuccessMessage("");

		const patientName = formData.patientName.trim();
		if (!/^[A-Za-z ]+$/.test(patientName)) {
			setErrorMessage("Patient name can contain letters and spaces only.");
			return;
		}

		const patientAge = Number(formData.patientAge);
		if (!Number.isFinite(patientAge) || patientAge < 1 || patientAge > 150) {
			setErrorMessage("Patient age must be between 1 and 150.");
			return;
		}

		const selectedAppointmentDate = new Date(`${formData.appointmentDate}T00:00:00`);
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		if (
			!formData.appointmentDate ||
			Number.isNaN(selectedAppointmentDate.getTime()) ||
			selectedAppointmentDate < today
		) {
			setErrorMessage("Appointment date cannot be in the past.");
			return;
		}

		const maxBookableDate = new Date(`${maxAppointmentDate}T23:59:59`);
		if (selectedAppointmentDate > maxBookableDate) {
			setErrorMessage("Appointment date must be within 3 months from today.");
			return;
		}

		setIsSubmitting(true);

		try {
			const payload = {
				patientName,
				patientAge,
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


	const handleReportChange = (event) => {
		const { name, value, files } = event.target;

		if (name === "file") {
			const selectedFile = files?.[0] || null;
			setReportFormData((prev) => ({ ...prev, file: selectedFile }));
			setReportError("");
			setReportSuccess("");
			return;
		}

		if (name === "patientName") {
			if (value === "") {
				setReportFormData((prev) => ({ ...prev, patientName: "" }));
				setReportError("");
				setReportSuccess("");
				return;
			}

			if (!/^[A-Za-z ]+$/.test(value)) {
				return;
			}

			setReportFormData((prev) => ({ ...prev, patientName: value }));
			setReportError("");
			setReportSuccess("");
			return;
		}

		setReportFormData((prev) => ({ ...prev, [name]: value }));
		setReportError("");
		setReportSuccess("");
	};

	const handleReportPatientNameKeyDown = (event) => {
		const allowedControlKeys = [
			"Backspace",
			"Delete",
			"Tab",
			"ArrowLeft",
			"ArrowRight",
			"Home",
			"End",
		];

		if (allowedControlKeys.includes(event.key)) {
			return;
		}

		if (!/^[A-Za-z ]$/.test(event.key)) {
			event.preventDefault();
		}
	};

	const handleReportPatientNamePaste = (event) => {
		const pastedText = event.clipboardData.getData("text");
		if (!/^[A-Za-z ]+$/.test(pastedText.trim())) {
			event.preventDefault();
		}
	};

	const convertFileToDataUrl = (file) =>
		new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(String(reader.result || ""));
			reader.onerror = () => reject(new Error("Failed to read uploaded file."));
			reader.readAsDataURL(file);
		});

	const handleReportSubmit = async (event) => {
		event.preventDefault();
		setReportError("");
		setReportSuccess("");

		const reportPatientName = reportFormData.patientName.trim();
		if (!reportPatientName) {
			setReportError("Please provide patient name.");
			return;
		}

		if (!/^[A-Za-z ]+$/.test(reportPatientName)) {
			setReportError("Patient name can contain letters and spaces only.");
			return;
		}

		if (!reportFormData.doctorId) {
			setReportError("Please select a doctor.");
			return;
		}

		const selectedDoctor = reportDoctorOptions.find(
			(doctor) => normalizeId(doctor.id) === normalizeId(reportFormData.doctorId)
		);
		if (!selectedDoctor) {
			setReportError("Selected doctor is not available. Please choose again.");
			return;
		}

		if (!reportFormData.file) {
			setReportError("Please upload a report file before submitting.");
			return;
		}

		if (reportFormData.file.size > 4 * 1024 * 1024) {
			setReportError("Report file must be 4MB or smaller.");
			return;
		}

		const selectedReportDate = new Date(`${reportFormData.reportDate}T00:00:00`);
		const allowedMinDate = new Date(`${minReportDate}T00:00:00`);
		const allowedMaxDate = new Date(`${maxReportDate}T23:59:59`);

		if (
			!reportFormData.reportDate ||
			Number.isNaN(selectedReportDate.getTime()) ||
			selectedReportDate < allowedMinDate ||
			selectedReportDate > allowedMaxDate
		) {
			setReportError("Report date must be within the last 1 month and cannot be in the future.");
			return;
		}

		try {
			const fileData = await convertFileToDataUrl(reportFormData.file);
			const response = await uploadMedicalReport({
				patientName: reportPatientName,
				reportTitle: reportFormData.reportTitle,
				reportType: reportFormData.reportType,
				doctorId: normalizeId(selectedDoctor.id),
				doctorName: selectedDoctor.name,
				hospitalLabName: reportFormData.hospitalLabName,
				reportDate: reportFormData.reportDate,
				notes: reportFormData.notes,
				fileName: reportFormData.file.name,
				fileSize: reportFormData.file.size,
				fileData,
			});

			const uploadedReport = response.report;
			if (uploadedReport) {
				setMedicalReports((prev) => [uploadedReport, ...prev]);
			} else {
				await loadMyMedicalReports({ showError: false });
			}

			setReportFormData({
				...INITIAL_REPORT_STATE,
				patientName: user.name || "",
			});
			setReportSuccess("Medical report uploaded successfully.");
		} catch (error) {
			setReportError(error.response?.data?.message || error.message || "Failed to upload medical report.");
		}
	};

	const handleConfirmPayment = async () => {
		if (!reservedAppointment?._id) {
			setErrorMessage("No reserved appointment found for payment.");
			return;
		}

		setErrorMessage("");
		setSuccessMessage("");
		setIsPaying(true);

		try {
			const initiated = await initiatePayment({
				appointmentId: reservedAppointment._id,
				amount: reservedAppointment.consultationFee,
				currency: reservedAppointment.currency,
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

	const handleDeleteExpiredAppointment = async (appointmentId) => {
		const shouldDelete = window.confirm("Delete this expired appointment?");
		if (!shouldDelete) {
			return;
		}

		setErrorMessage("");
		setSuccessMessage("");
		setDeletingAppointmentId(appointmentId);

		try {
			await deleteExpiredAppointment(appointmentId);
			setSuccessMessage("Expired appointment deleted.");
			await loadAppointments();
		} catch (error) {
			setErrorMessage(error.response?.data?.message || "Failed to delete expired appointment.");
		} finally {
			setDeletingAppointmentId("");
		}
	};

	const handleDeleteReport = async (reportId) => {
		const shouldDelete = window.confirm("Delete this uploaded report?");
		if (!shouldDelete) {
			return;
		}

		setReportError("");
		setReportSuccess("");
		setDeletingReportId(reportId);

		try {
			await deleteMedicalReport(reportId);
			setMedicalReports((prev) => prev.filter((report) => report.id !== reportId));
			setReportSuccess("Medical report deleted successfully.");
		} catch (error) {
			setReportError(error.response?.data?.message || "Failed to delete medical report.");
		} finally {
			setDeletingReportId("");
		}
	};

	useEffect(() => {
		if (activeMenuItem !== "Appointments" && activeMenuItem !== "Medical Reports") {
			return;
		}

		loadDoctors();

		if (activeMenuItem === "Appointments") {
			loadAppointments();
			return;
		}

		loadMyMedicalReports();
	}, [activeMenuItem]);

	useEffect(() => {
		if (activeMenuItem !== "Overview") {
			return;
		}

		loadProfile();
		loadAppointments({ showError: false });
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
				setErrorMessage("Payment cancelled. Your slot is still pending until expiry.");
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
			<section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
				<img
					src="/overview-banner.png"
					alt="Health services banner"
					className="h-60 w-full object-cover sm:h-72 lg:h-[30rem]"
				/>
				<button
					type="button"
					onClick={() => setActiveMenuItem("Appointments")}
					className="absolute bottom-20 left-0 inline-flex items-stretch overflow-hidden rounded-md border border-slate-300 shadow-md transition hover:scale-[1.01] hover:shadow-lg sm:bottom-24 sm:left-6 lg:bottom-26"
					aria-label="Go to booking appointment page"
				>
					<span className="bg-slate-800 px-3.5 py-1.5 text-sm font-medium text-white sm:px-5 sm:py-2.5 sm:text-base">
						Book an Appointment
					</span>
					<span className="flex w-9 items-center justify-center bg-white text-xl font-bold text-slate-700 sm:w-10">
						›
					</span>
				</button>
			</section>

			<div className="mt-5 grid gap-5 lg:grid-cols-[1.35fr_1fr]">
				<section className="rounded-2xl border border-slate-200 bg-white p-5">
					<div className="mb-4 flex items-center justify-between">
						<h2 className="text-sm font-semibold text-slate-900">Upcoming Appointments</h2>
						<button
							type="button"
							onClick={() => setActiveMenuItem("Appointments")}
							className="text-xs font-semibold text-blue-700"
						>
							View all
						</button>
					</div>
					{isLoadingAppointments ? (
						<p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-sm text-slate-500">
							Loading upcoming appointments...
						</p>
					) : upcomingAppointments.length === 0 ? (
						<p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-sm text-slate-500">
							No upcoming appointments yet.
						</p>
					) : (
						<div className="space-y-3">
							{upcomingAppointments.map((appointment) => (
								<div key={appointment._id || appointment.appointmentId} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
									<div className="flex items-center justify-between gap-3">
										<div>
											<p className="text-sm font-semibold text-slate-900">{appointment.doctorName}</p>
											<p className="text-xs text-slate-500">{appointment.specialty}</p>
										</div>
										<span
											className={`rounded-lg px-2 py-1 text-[11px] font-semibold uppercase ${
												appointment.status === "confirmed"
													? "bg-emerald-100 text-emerald-700"
													: appointment.status === "pending_payment" || appointment.status === "pending"
														? "bg-amber-100 text-amber-700"
														: "bg-slate-200 text-slate-700"
											}`}
										>
											{appointment.status}
										</span>
									</div>
									<p className="mt-3 text-xs font-medium text-slate-600">
										{formatAppointmentSchedule(appointment.appointmentDate, appointment.slotTime)}
									</p>
								</div>
							))}
						</div>
					)}
				</section>

			</div>
		</>
	);

	const renderAppointments = () => (
		<div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
			<section className="rounded-2xl border border-slate-200 bg-white p-5">
				<h2 className="text-sm font-semibold text-slate-900">Book Appointment</h2>
				<p className="mt-1 text-xs text-slate-500">Select a doctor slot, pay, and confirm your appointment.</p>

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
								onKeyDown={handlePatientNameKeyDown}
								onPaste={handlePatientNamePaste}
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
								min="1"
								max="150"
								required
								value={formData.patientAge}
								onChange={handleAppointmentChange}
								onKeyDown={handlePatientAgeKeyDown}
								onPaste={handlePatientAgePaste}
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
								min={minAppointmentDate}
								max={maxAppointmentDate}
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
									{isLoadingSlots
										? "Loading slots..."
										: formData.appointmentDate
											? availableSlots.length > 0
												? "Select available slot"
												: "No available slots"
											: "Select date first"}
								</option>
								{availableSlots
									.filter((slot) => (typeof slot === "string" ? true : slot.available))
									.map((slot) => {
										const value = typeof slot === "string" ? slot : slot.time;
										return (
											<option key={value} value={value}>
												{value}
											</option>
										);
									})}
							</select>
							{slotError && (
								<p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
									{slotError}
								</p>
							)}
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
						{isSubmitting ? "Reserving slot..." : "Reserve Slot"}
					</button>

					{reservedAppointment && (
						<div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
							<p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Payment Required</p>
							<p className="mt-2 text-sm text-emerald-900">
								Reserved slot: {reservedAppointment.appointmentDate} • {reservedAppointment.slotTime}
							</p>
							<p className="mt-1 text-sm text-emerald-900">
								Fee: {reservedAppointment.currency} {reservedAppointment.consultationFee}
							</p>
							<p className="mt-1 text-xs text-emerald-700">
								Pay before: {formatAppointmentDate(reservedAppointment.paymentExpiresAt)}
							</p>
							<button
								type="button"
								onClick={handleConfirmPayment}
								disabled={isPaying}
								className="mt-3 w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
							>
								{isPaying ? "Processing payment..." : "Pay & Confirm Appointment"}
							</button>
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
												: appointment.status === "pending_payment"
													? "bg-amber-100 text-amber-700"
													: appointment.status === "expired" || appointment.status === "payment_failed"
														? "bg-rose-100 text-rose-700"
														: "bg-slate-200 text-slate-700"
										}`}
									>
										{appointment.status}
									</span>
								</div>
								<p className="mt-3 text-xs font-medium text-slate-600">
									{formatAppointmentSchedule(appointment.appointmentDate, appointment.slotTime)}
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
								<p className="mt-2 text-xs text-slate-600">Reason: {appointment.reason}</p>
								{appointment.status === "confirmed" && appointment.mode === "online" && (
									<button
										type="button"
										onClick={() => handleJoinTelemedicine(appointment)}
										disabled={!canJoinTelemedicine(appointment)}
										title={
											canJoinTelemedicine(appointment)
												? "Join telemedicine session"
												: "Join is available at the scheduled time"
										}
										className="mt-3 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
									>
										{canJoinTelemedicine(appointment) ? "Join Video Call" : "Join at scheduled time"}
									</button>
								)}
								{appointment.status === "expired" && (
									<button
										type="button"
										onClick={() => handleDeleteExpiredAppointment(appointment._id)}
										disabled={deletingAppointmentId === appointment._id}
										className="mt-3 rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-rose-300"
									>
										{deletingAppointmentId === appointment._id ? "Deleting..." : "Delete Expired Appointment"}
									</button>
								)}
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
							onKeyDown={handleReportPatientNameKeyDown}
							onPaste={handleReportPatientNamePaste}
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
							<label htmlFor="doctorId" className="mb-1 block text-xs font-semibold text-slate-600">
								Doctor
							</label>
							<select
								id="doctorId"
								name="doctorId"
								required
								value={reportFormData.doctorId}
								onChange={handleReportChange}
								disabled={isLoadingDoctors || reportDoctorOptions.length === 0}
								className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
							>
								<option value="">
									{isLoadingDoctors
										? "Loading doctors..."
										: reportDoctorOptions.length === 0
											? "No doctors available"
											: "Select doctor"}
								</option>
								{reportDoctorOptions.map((doctor) => (
									<option key={doctor.id} value={doctor.id}>
										{doctor.name}{doctor.specialty ? ` (${doctor.specialty})` : ""}
									</option>
								))}
							</select>
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
							min={minReportDate}
							max={maxReportDate}
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
										onClick={() => downloadReportPdf(report)}
										className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700"
									>
										Download PDF
									</button>
									<button
										type="button"
										onClick={() => handleDeleteReport(report.id)}
										disabled={deletingReportId === report.id}
										className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-rose-300"
									>
										{deletingReportId === report.id ? "Deleting..." : "Delete"}
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
			subtitle="Track appointments, upload reports, and stay on top of your care plan from one place."
		>
			{activeMenuItem === "Medical Reports" ? (
				renderMedicalReports()
			) : activeMenuItem === "Telemedicine" ? (
				<PatientTelemedicinePage initialRoomId={telemedicineRoomId} />
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
