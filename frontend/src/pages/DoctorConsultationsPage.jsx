// src/pages/DoctorConsultationsPage.jsx
import { useState, useEffect } from "react";
import {
	fetchDoctorAppointments,
	completeConsultation,
} from "../services/appointmentApi";
import { getStoredUser } from "../utils/auth";
import { format, parseISO } from "date-fns";
import DoctorTelemedicinePage from "./DoctorTelemedicinePage";
import DoctorPrescriptionsPage from "./DoctorPrescriptionsPage";

export default function DoctorConsultationsPage() {
	const user = getStoredUser() || {};
	const doctorProfile = user.doctorProfile || {};

	const [appointments, setAppointments] = useState([]);
	const [loading, setLoading] = useState(true);
	const [activeTab, setActiveTab] = useState("Upcoming");
	const [selectedConsultation, setSelectedConsultation] = useState(null);
	const [activeActionPage, setActiveActionPage] = useState("consultations");
	const [isCompleting, setIsCompleting] = useState(false);
	const [telemedicineRoomId, setTelemedicineRoomId] = useState("");

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
		setActiveActionPage("telemedicine");
	};

	useEffect(() => {
		async function fetchConsultations() {
			try {
				setLoading(true);
				if (doctorProfile._id || user.id || user._id) {
					const docId = doctorProfile._id || user.id || user._id;
					const data = await fetchDoctorAppointments(docId);
					setAppointments(data.appointments || data.data || []);
				}
			} catch (error) {
				console.error("Failed to fetch consultations:", error);
			} finally {
				setLoading(false);
			}
		}

		fetchConsultations();
	}, [doctorProfile._id]);

	const filteredConsultations = appointments.filter((apt) => {
		if (activeTab === "Upcoming") return apt.status === "confirmed";
		if (activeTab === "Completed") return apt.status === "completed";
		if (activeTab === "Cancelled") return apt.status === "cancelled";
		return true;
	});

	const getConsultationId = (consultation) => consultation?._id || consultation?.id || "";

	const handleComplete = async (consultation) => {
		const appointmentId = getConsultationId(consultation);
		if (!appointmentId) {
			alert("Appointment ID is missing.");
			return;
		}

		try {
			setIsCompleting(true);
			await completeConsultation(appointmentId);
			// Update local state to reflect the change
			setAppointments((prev) => prev.map((apt) =>
				getConsultationId(apt) === appointmentId ? { ...apt, status: "completed" } : apt
			));
			if (getConsultationId(selectedConsultation) === appointmentId) {
				setSelectedConsultation((prev) => ({ ...prev, status: "completed" }));
			}
			alert("Consultation marked as completed.");
		} catch (error) {
			console.error("Failed to complete consultation:", error);
			alert(error?.response?.data?.message || "Failed to mark consultation as completed.");
		} finally {
			setIsCompleting(false);
		}
	};

	if (activeActionPage === "telemedicine") {
		return (
			<div className="space-y-4">
				<div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4">
					<div>
						<p className="text-sm font-semibold text-slate-900">Telemedicine Session</p>
						<p className="text-xs text-slate-500">Started from consultation profile.</p>
					</div>
					<button
						onClick={() => setActiveActionPage("consultations")}
						className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
					>
						Back to Consultations
					</button>
				</div>
				<DoctorTelemedicinePage initialRoomId={telemedicineRoomId} />
			</div>
		);
	}

	if (activeActionPage === "prescriptions") {
		return (
			<div className="space-y-4">
				<div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4">
					<div>
						<p className="text-sm font-semibold text-slate-900">Digital Prescription</p>
						<p className="text-xs text-slate-500">Opened from consultation profile.</p>
					</div>
					<button
						onClick={() => setActiveActionPage("consultations")}
						className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
					>
						Back to Consultations
					</button>
				</div>
				<DoctorPrescriptionsPage />
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Stats Overview */}
			<div className="grid gap-4 sm:grid-cols-3">
				<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
					<p className="text-sm font-medium text-slate-500">Total Consultations</p>
					<p className="mt-2 text-2xl font-bold text-slate-900">{appointments.length}</p>
				</div>
				<div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
					<p className="text-sm font-medium text-blue-700">Upcoming</p>
					<p className="mt-2 text-2xl font-bold text-blue-900">
						{appointments.filter((a) => a.status === "confirmed").length}
					</p>
				</div>
				<div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
					<p className="text-sm font-medium text-emerald-700">Completed</p>
					<p className="mt-2 text-2xl font-bold text-emerald-900">
						{appointments.filter((a) => a.status === "completed").length}
					</p>
				</div>
			</div>

			{/* Main Content Area */}
			<div className="grid gap-6 lg:grid-cols-[1fr_300px] xl:grid-cols-[1fr_350px]">
				<div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
					{/* Tabs */}
					<div className="flex border-b border-slate-200 px-5 pt-5">
						{["Upcoming", "Completed", "Cancelled", "All Consultations"].map((tab) => (
							<button
								key={tab}
								onClick={() => setActiveTab(tab)}
								className={`mr-6 border-b-2 pb-3 text-sm font-medium transition-colors ${
									activeTab === tab
										? "border-blue-600 text-blue-700"
										: "border-transparent text-slate-500 hover:text-slate-700"
								}`}
							>
								{tab}
							</button>
						))}
					</div>

					{/* List */}
					<div className="p-5">
						{loading ? (
							<div className="flex h-32 items-center justify-center text-sm text-slate-500 animate-pulse">
								Loading consultations...
							</div>
						) : filteredConsultations.length === 0 ? (
							<div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 py-10 text-center">
								<div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
									<svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
									</svg>
								</div>
								<h3 className="mt-4 text-sm font-semibold text-slate-900">No {activeTab.toLowerCase()} consultations</h3>
								<p className="mt-1 text-xs text-slate-500">There are no consultations to array for this category.</p>
							</div>
						) : (
							<div className="space-y-3">
								{filteredConsultations.map((consult) => (
									<div
										key={getConsultationId(consult)}
										onClick={() => setSelectedConsultation(consult)}
										className={`group cursor-pointer rounded-xl border p-4 transition-all hover:shadow-md ${
											getConsultationId(selectedConsultation) === getConsultationId(consult)
												? "border-blue-300 bg-blue-50"
												: "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50"
										}`}
									>
										<div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
											<div className="flex items-center gap-4">
												<div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-700">
													{consult.patientName?.[0] || "P"}
												</div>
												<div>
													<h4 className="font-semibold text-slate-900">{consult.patientName || "Unknown Patient"}</h4>
													<p className="text-xs text-slate-500 mt-0.5">
														<span className="font-medium text-slate-700">Date:</span> {" "}
														{consult.appointmentDate ? format(parseISO(consult.appointmentDate), "MMM dd, yyyy") : "N/A"} at {consult.slotTime}
													</p>
													{consult.reason && (
														<p className="mt-1 text-xs text-slate-500 truncate max-w-xs">
															<span className="font-medium text-slate-600">Reason:</span> {consult.reason}
														</p>
													)}
												</div>
											</div>
											<div className="flex items-center gap-3 w-full sm:w-auto justify-end border-t border-slate-100 pt-3 sm:border-0 sm:pt-0">
												<span className={`rounded-full px-2.5 py-1 text-[11px] font-medium tracking-wide ${
														consult.status === "confirmed" ? "bg-blue-100 text-blue-700" :
													consult.status === "completed" ? "bg-emerald-100 text-emerald-700" :
													consult.status === "cancelled" ? "bg-red-100 text-red-700" :
													"bg-slate-100 text-slate-700"
												}`}>
													{consult.status ? consult.status.toUpperCase() : "UNKNOWN"}
												</span>
												{consult.mode === "online" && (
													<span className="rounded-full bg-purple-100 px-2.5 py-1 text-[11px] font-medium text-purple-700">
														VIDEO
													</span>
												)}
												<button className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-blue-600 border border-slate-200 shadow-sm transition hover:bg-slate-50">
													View Details
												</button>
											</div>
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				</div>

				{/* Quick Action / Details Panel */}
				<div className="space-y-4">
					<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sticky top-6">
						{selectedConsultation ? (
							<>
								<div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-4">
									<h3 className="font-semibold text-slate-900">Consultation Profile</h3>
									<button onClick={() => setSelectedConsultation(null)} className="text-xs text-slate-400 hover:text-slate-600">Close</button>
								</div>
								
								<div className="flex items-center gap-3 mb-5">
									<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-lg font-bold text-slate-700">
										{selectedConsultation.patientName?.[0] || "P"}
									</div>
									<div>
										<p className="font-semibold text-slate-900">{selectedConsultation.patientName || "Unknown Patient"}</p>
										<p className="text-xs text-slate-500">Scheduled ID: #{selectedConsultation._id?.slice(-6) || "N/A"}</p>
									</div>
								</div>

								<div className="space-y-4">
									<div className="rounded-xl bg-slate-50 p-3 text-sm">
										<p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Appointment Details</p>
										<div className="flex justify-between py-1 border-b border-slate-200/60">
											<span className="text-slate-500 text-xs">Date</span>
											<span className="font-medium text-slate-900 text-xs">
												{selectedConsultation.appointmentDate ? format(parseISO(selectedConsultation.appointmentDate), "MMM dd, yyyy") : "N/A"}
											</span>
										</div>
										<div className="flex justify-between py-1 border-b border-slate-200/60">
											<span className="text-slate-500 text-xs">Time</span>
											<span className="font-medium text-slate-900 text-xs">{selectedConsultation.slotTime || "N/A"}</span>
										</div>
										<div className="flex justify-between py-1">
											<span className="text-slate-500 text-xs">Type</span>
											<span className="font-medium text-slate-900 text-xs capitalize">{selectedConsultation.mode || "In-person"}</span>
										</div>
									</div>

									<div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 text-sm">
										<p className="text-xs font-semibold uppercase tracking-wide text-blue-800 mb-2">Notes & Reason</p>
										{selectedConsultation.reason ? (
											<div className="text-xs text-slate-700 whitespace-pre-wrap">
												{selectedConsultation.reason}
											</div>
										) : (
											<p className="text-xs text-slate-500 italic">No reason detailed.</p>
										)}
									</div>
								</div>

								<div className="mt-6 pt-5 border-t border-slate-100 space-y-2">
									{selectedConsultation.status === "confirmed" && selectedConsultation.mode === "online" && (
										<button
											onClick={() => handleJoinTelemedicine(selectedConsultation)}
											disabled={!canJoinTelemedicine(selectedConsultation)}
											title={
												canJoinTelemedicine(selectedConsultation)
													? "Join telemedicine session"
													: "Join is available at the scheduled time"
											}
											className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition flex justify-center items-center gap-2 disabled:cursor-not-allowed disabled:bg-slate-300"
										>
											<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
											</svg>
											{canJoinTelemedicine(selectedConsultation) ? "Join Video Call" : "Join at scheduled time"}
										</button>
									)}
										<button
											onClick={() => setActiveActionPage("prescriptions")}
											className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-900 transition"
										>
										Issue Digital Prescription
									</button>
									{selectedConsultation.status === "confirmed" && (
										<button 
												onClick={() => handleComplete(selectedConsultation)}
												disabled={isCompleting}
												className="w-full rounded-xl bg-slate-100 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200 transition disabled:cursor-not-allowed disabled:opacity-60"
										>
												{isCompleting ? "Updating..." : "Mark as Completed"}
										</button>
									)}
								</div>
							</>
						) : (
							<div className="flex flex-col items-center justify-center h-48 text-center px-4">
								<div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 mb-3">
									<svg className="h-6 w-6 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
									</svg>
								</div>
								<p className="text-sm font-medium text-slate-600">Select a consultation</p>
								<p className="mt-1 text-xs text-slate-400">Click on any appointment from the list to view full details and take action.</p>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
