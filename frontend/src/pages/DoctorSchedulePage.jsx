import { useState, useEffect, useMemo } from "react";
import { getStoredUser } from "../utils/auth";
import {
	fetchDoctorAppointments,
	approveDoctorAppointment,
	rejectDoctorAppointment,
	cancelDoctorAppointment,
} from "../services/appointmentApi";
import { getDoctorAvailability, updateDoctorAvailability } from "../services/doctorApi";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

const WEEK_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const convertTo12HourLabel = (timeValue) => {
	if (!timeValue || typeof timeValue !== "string") {
		return "";
	}

	const raw = timeValue.trim();
	const twelveHourMatch = raw.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);
	if (twelveHourMatch) {
		const hours = String(Number(twelveHourMatch[1])).padStart(2, "0");
		const minutes = twelveHourMatch[2];
		const meridiem = twelveHourMatch[3].toUpperCase();
		return `${hours}:${minutes} ${meridiem}`;
	}

	const twentyFourHourMatch = raw.match(/^(\d{1,2}):(\d{2})$/);
	if (!twentyFourHourMatch) {
		return "";
	}

	const hours24 = Number(twentyFourHourMatch[1]);
	const minutes = Number(twentyFourHourMatch[2]);
	if (Number.isNaN(hours24) || Number.isNaN(minutes) || hours24 > 23 || minutes > 59) {
		return "";
	}

	const meridiem = hours24 >= 12 ? "PM" : "AM";
	const hours12 = hours24 % 12 || 12;
	return `${String(hours12).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${meridiem}`;
};

const buildDefaultAvailability = () => [
	{ day: "Monday", isWorking: true, startTime: "09:00 AM", endTime: "05:00 PM" },
	{ day: "Tuesday", isWorking: true, startTime: "09:00 AM", endTime: "05:00 PM" },
	{ day: "Wednesday", isWorking: true, startTime: "09:00 AM", endTime: "05:00 PM" },
	{ day: "Thursday", isWorking: true, startTime: "09:00 AM", endTime: "05:00 PM" },
	{ day: "Friday", isWorking: true, startTime: "09:00 AM", endTime: "05:00 PM" },
	{ day: "Saturday", isWorking: false, startTime: "09:00 AM", endTime: "01:00 PM" },
	{ day: "Sunday", isWorking: false, startTime: "09:00 AM", endTime: "01:00 PM" },
];

const normalizeAvailabilitySlots = (slots = []) => {
	const defaultsByDay = buildDefaultAvailability().reduce((acc, slot) => {
		acc[slot.day.toLowerCase()] = slot;
		return acc;
	}, {});

	const incomingByDay = (Array.isArray(slots) ? slots : []).reduce((acc, slot) => {
		const dayKey = String(slot?.day || "").trim().toLowerCase();
		if (dayKey) {
			acc[dayKey] = slot;
		}
		return acc;
	}, {});

	return WEEK_DAYS.map((day) => {
		const dayKey = day.toLowerCase();
		const defaultSlot = defaultsByDay[dayKey];
		const incomingSlot = incomingByDay[dayKey] || null;

		const startTime = convertTo12HourLabel(incomingSlot?.startTime) || defaultSlot.startTime;
		const endTime = convertTo12HourLabel(incomingSlot?.endTime) || defaultSlot.endTime;
		const isWorking =
			typeof incomingSlot?.isWorking === "boolean"
				? incomingSlot.isWorking
				: Boolean(incomingSlot);

		return {
			day,
			isWorking,
			startTime,
			endTime,
		};
	});
};

function DoctorSchedulePage({ onOpenTelemedicine = () => {} }) {
	const [activeTab, setActiveTab] = useState("calendar");
	const [selectedDate, setSelectedDate] = useState(new Date());
	const [appointments, setAppointments] = useState([]);
	const [loading, setLoading] = useState(false);
	const [availability, setAvailability] = useState([]);
	const [saving, setSaving] = useState(false);
	const [selectedAppointment, setSelectedAppointment] = useState(null);
	const [isUpdatingDecision, setIsUpdatingDecision] = useState(false);
	
	const user = getStoredUser() || {};
	const doctorId = user.id || user._id;
	const token = localStorage.getItem("healthmate_token");

	useEffect(() => {
		const loadData = async () => {
			if (!doctorId) return;
			setLoading(true);
			try {
				if (activeTab === "calendar" || activeTab === "requests") {
					const data = await fetchDoctorAppointments(doctorId);
					setAppointments(data.appointments || []);
				} else if (activeTab === "availability") {
					const data = await getDoctorAvailability(doctorId, token);
					if (data && data.slots && data.slots.length > 0) {
						setAvailability(normalizeAvailabilitySlots(data.slots));
					} else {
						setAvailability(buildDefaultAvailability());
					}
				}
			} catch (err) {
				console.error("Failed to load data", err);
				if (activeTab === "availability") {
					setAvailability(buildDefaultAvailability());
				}
			} finally {
				setLoading(false);
			}
		};
		loadData();
	}, [activeTab, doctorId, token]);

	const handleSaveAvailability = async () => {
		setSaving(true);
		try {
			// Save current availability state
			await updateDoctorAvailability(doctorId, token, availability);
			alert("Availability saved successfully!");
		} catch (err) {
			console.error("Failed to save availability", err);
			alert("Failed to save availability");
		} finally {
			setSaving(false);
		}
	};

	const handleAvailabilityChange = (index, field, value) => {
		const newAvailability = [...availability];
		newAvailability[index][field] = value;
		setAvailability(newAvailability);
	};

	const getAppointmentId = (appointment) => appointment?._id || appointment?.id || "";
	const normalizeStatus = (statusValue) => (statusValue || "").toString().trim().toLowerCase();

	const handleAppointmentDecision = async (appointment, decision) => {
		const appointmentId = getAppointmentId(appointment);
		if (!appointmentId) {
			alert("Appointment ID is missing.");
			return;
		}

		if (decision === "cancel") {
			const shouldCancel = window.confirm("Cancel this appointment?");
			if (!shouldCancel) return;
		}

		if (decision === "reject") {
			const shouldReject = window.confirm("Reject this appointment request?");
			if (!shouldReject) return;
		}

		try {
			setIsUpdatingDecision(true);
			const response = decision === "confirm"
				? await approveDoctorAppointment(appointmentId)
				: decision === "reject"
					? await rejectDoctorAppointment(appointmentId)
					: await cancelDoctorAppointment(appointmentId);

			const nextStatus = response?.appointment?.status
				|| (decision === "confirm" ? "pending_payment" : decision === "reject" ? "rejected" : "cancelled");

			setAppointments((prev) => prev.map((item) => (
				getAppointmentId(item) === appointmentId ? { ...item, status: nextStatus } : item
			)));

			setSelectedAppointment((prev) => (
				prev && getAppointmentId(prev) === appointmentId ? { ...prev, status: nextStatus } : prev
			));

			alert(
				decision === "confirm"
					? "Appointment confirmed. Patient can now proceed with payment."
					: decision === "reject"
						? "Appointment rejected."
						: "Appointment cancelled."
			);
		} catch (error) {
			alert(error?.response?.data?.message || `Failed to ${decision} appointment.`);
		} finally {
			setIsUpdatingDecision(false);
		}
	};

	const timeOptions = [];
	for (let i = 0; i < 24; i++) {
		const hour = i % 12 || 12;
		const ampm = i < 12 ? "AM" : "PM";
		timeOptions.push(`${hour.toString().padStart(2, '0')}:00 ${ampm}`);
		timeOptions.push(`${hour.toString().padStart(2, '0')}:30 ${ampm}`);
	}

	const today = new Date();
	const yyyy = today.getFullYear();
	const mm = String(today.getMonth() + 1).padStart(2, '0');
	const dd = String(today.getDate()).padStart(2, '0');
	const selectedYyyy = selectedDate.getFullYear();
	const selectedMm = String(selectedDate.getMonth() + 1).padStart(2, '0');
	const selectedDd = String(selectedDate.getDate()).padStart(2, '0');
	const selectedDateStr = `${selectedYyyy}-${selectedMm}-${selectedDd}`;

	const toDateKey = (dateValue) => {
		if (!dateValue) {
			return "";
		}
		if (typeof dateValue === "string") {
			const dateMatch = dateValue.match(/^(\d{4}-\d{2}-\d{2})/);
			if (dateMatch) {
				return dateMatch[1];
			}
		}
		const parsed = new Date(dateValue);
		if (Number.isNaN(parsed.getTime())) {
			return "";
		}
		const year = parsed.getFullYear();
		const month = String(parsed.getMonth() + 1).padStart(2, "0");
		const day = String(parsed.getDate()).padStart(2, "0");
		return `${year}-${month}-${day}`;
	};

	const getStatusMeta = (statusValue) => {
		const statusKey = (statusValue || "").toLowerCase();
		switch (statusKey) {
			case "confirmed":
				return { label: "Confirmed", className: "bg-green-100 text-green-700" };
			case "pending":
				return { label: "Pending Confirmation", className: "bg-blue-100 text-blue-700" };
			case "pending_payment":
				return { label: "Pending Payment", className: "bg-amber-100 text-amber-700" };
			case "completed":
				return { label: "Completed", className: "bg-slate-100 text-slate-700" };
			case "cancelled":
				return { label: "Cancelled", className: "bg-rose-100 text-rose-700" };
			case "rejected":
				return { label: "Rejected", className: "bg-rose-100 text-rose-700" };
			case "payment_failed":
				return { label: "Payment Failed", className: "bg-amber-100 text-amber-700" };
			case "expired":
				return { label: "Expired", className: "bg-slate-100 text-slate-600" };
			default:
				return {
					label: statusValue ? statusValue : "Scheduled",
					className: "bg-purple-100 text-purple-700",
				};
		}
	};

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

		// Keep UI join window consistent with telemedicine-service validation.
		const now = Date.now();
		const start = startTime.getTime();
		const joinOpensAt = start - 15 * 60 * 1000;
		const joinClosesAt = start + 120 * 60 * 1000;
		return now >= joinOpensAt && now <= joinClosesAt;
	};

	const handleJoinTelemedicine = (appointment) => {
		const roomId = appointment?.appointmentId || appointment?._id || appointment?.id;
		onOpenTelemedicine(roomId);
	};

	const appointmentDateKeys = useMemo(() => {
		const keys = new Set();
		appointments.forEach((app) => {
			const dateKey = toDateKey(app.appointmentDate || app.appointmentDateTime);
			if (dateKey) {
				keys.add(dateKey);
			}
		});
		return keys;
	}, [appointments]);

	const scheduleData = appointments
		.filter((app) => {
			const dateKey = toDateKey(app.appointmentDate || app.appointmentDateTime);
			return dateKey === selectedDateStr;
		})
		.map((app) => {
			const patientName = app.patientName || app.patient?.name || "Patient";
			const statusMeta = getStatusMeta(app.status);
			const appointmentDate = toDateKey(app.appointmentDate || app.appointmentDateTime) || selectedDateStr;
			return {
				id: app._id || app.id,
				patient: patientName,
				patientInitial: patientName.charAt(0).toUpperCase(),
				time: app.slotTime ? `${appointmentDate} ${app.slotTime}` : appointmentDate,
				type: app.mode || "Consultation",
				statusLabel: statusMeta.label,
				statusClassName: statusMeta.className,
				raw: app,
			};
		});

	const pendingRequests = appointments
		.filter((appointment) => normalizeStatus(appointment.status) === "pending")
		.sort((first, second) => new Date(first.appointmentDateTime) - new Date(second.appointmentDateTime));

	// Calculate Daily Summary logic
	const totalSlots = availability.length > 0 ? availability.length * 8 : 16; // Simple estimation based on hours 
	const bookedSlots = scheduleData.length;
	const availableSlots = Math.max(0, totalSlots - bookedSlots);

	const getCalendarTileClassName = ({ date, view }) => {
		if (view !== "month") {
			return "";
		}

		const dateKey = toDateKey(date);
		if (!appointmentDateKeys.has(dateKey)) {
			return "";
		}

		return "bg-amber-100 text-amber-900 font-semibold rounded-lg ring-1 ring-amber-200";
	};

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h2 className="text-xl font-bold text-slate-900">My Schedule</h2>
					<p className="mt-1 text-sm text-slate-500">Manage your upcoming appointments and availability.</p>
				</div>
			</div>

			<div className="flex items-center gap-4 border-b border-slate-200 pb-4">
				<button
					onClick={() => setActiveTab("calendar")}
					className={`pb-4 -mb-4 text-sm font-medium transition ${
						activeTab === "calendar"
							? "border-b-2 border-blue-600 text-blue-700"
							: "text-slate-500 hover:text-slate-700"
					}`}
				>
					Daily Schedule
				</button>
				<button
					onClick={() => setActiveTab("requests")}
					className={`pb-4 -mb-4 text-sm font-medium transition ${
						activeTab === "requests"
							? "border-b-2 border-blue-600 text-blue-700"
							: "text-slate-500 hover:text-slate-700"
					}`}
				>
					Appointment Requests
				</button>
				<button
					onClick={() => setActiveTab("availability")}
					className={`pb-4 -mb-4 text-sm font-medium transition ${
						activeTab === "availability"
							? "border-b-2 border-blue-600 text-blue-700"
							: "text-slate-500 hover:text-slate-700"
					}`}
				>
					Manage Availability
				</button>
			</div>

			{activeTab === "calendar" && (
				<div className="grid gap-6 lg:grid-cols-[1fr_300px]">
					<div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
						<div className="border-b border-slate-200 p-5">
							<h3 className="font-semibold text-slate-900">Appointments for {selectedDate.toLocaleDateString()}</h3>
						</div>
						<div className="divide-y divide-slate-100">
							{scheduleData.length > 0 ? (
								scheduleData.map((slot) => (
									<div key={slot.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
										<div className="flex items-start gap-4">
											<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 font-bold">
												{slot.patientInitial}
											</div>
											<div>
												<p className="font-semibold text-slate-900">{slot.patient}</p>
												<div className="mt-1 flex items-center gap-3 text-sm text-slate-500">
													<span className="flex items-center gap-1">
														<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
															<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
														</svg>
														{slot.time}
													</span>
													<span className="flex items-center gap-1">
														<span className="h-1.5 w-1.5 rounded-full bg-slate-300"></span>
														{slot.type}
													</span>
												</div>
											</div>
										</div>
										<div className="flex items-center gap-3 mt-3 sm:mt-0">
											<span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${slot.statusClassName}`}>
												{slot.statusLabel}
											</span>
											{normalizeStatus(slot.raw?.status) === "pending" && (
												<div className="flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
													<button
														type="button"
														onClick={() => handleAppointmentDecision(slot.raw, "confirm")}
														disabled={isUpdatingDecision}
														className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
													>
														Confirm
													</button>
													<button
														type="button"
														onClick={() => handleAppointmentDecision(slot.raw, "reject")}
														disabled={isUpdatingDecision}
														className="rounded-lg border border-rose-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
													>
														Reject
													</button>
												</div>
											)}
											<button 
												onClick={() => setSelectedAppointment(slot.raw)}
												className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
											>
												Details
											</button>
										</div>
									</div>
								))
							) : (
								<div className="p-5 text-center text-sm text-slate-500">No appointments scheduled for this date.</div>
							)}
						</div>
					</div>

					<div className="space-y-6">
						<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
							<h3 className="mb-4 text-sm font-semibold text-slate-900">Select Date</h3>
							<div className="calendar-container w-full [&_.react-calendar]:w-full [&_.react-calendar]:border-none [&_.react-calendar]:font-sans [&_.react-calendar__tile--active]:bg-blue-600 [&_.react-calendar__tile--active]:text-white [&_.react-calendar__tile--active]:rounded-lg">
								<Calendar 
									onChange={setSelectedDate} 
									value={selectedDate} 
									tileClassName={getCalendarTileClassName}
									className="w-full text-sm text-slate-700"
								/>
							</div>
							<p className="mt-3 text-xs text-slate-500">
								<span className="mr-1 inline-block h-2 w-2 rounded-full bg-amber-400 align-middle"></span>
								Highlighted dates have appointments.
							</p>
						</div>
						
						<div className="rounded-2xl border border-slate-200 bg-white p-5">
							<h3 className="text-sm font-semibold text-slate-900">Daily Summary</h3>
							<div className="mt-4 space-y-3">
								<div className="flex justify-between text-sm">
									<span className="text-slate-500">Total Slots</span>
									<span className="font-medium text-slate-900">{totalSlots}</span>
								</div>
								<div className="flex justify-between text-sm">
									<span className="text-slate-500">Booked</span>
									<span className="font-medium text-slate-900">{bookedSlots}</span>
								</div>
								<div className="flex justify-between text-sm">
									<span className="text-slate-500">Available</span>
									<span className="font-medium text-green-600">{availableSlots}</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			)}

			{activeTab === "requests" && (
				<div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
					<div className="border-b border-slate-200 p-5">
						<h3 className="font-semibold text-slate-900">Pending Appointment Requests</h3>
						<p className="mt-1 text-xs text-slate-500">Review and confirm/reject patient appointment requests.</p>
					</div>
					<div className="divide-y divide-slate-100">
						{loading ? (
							<div className="p-5 text-sm text-slate-500">Loading requests...</div>
						) : pendingRequests.length === 0 ? (
							<div className="p-5 text-sm text-slate-500">No pending requests right now.</div>
						) : (
							pendingRequests.map((request) => (
								<div key={request._id || request.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
									<div>
										<p className="font-semibold text-slate-900">{request.patientName}</p>
										<p className="mt-1 text-xs text-slate-500">
											{request.appointmentDate} at {request.slotTime} • {request.mode}
										</p>
										<p className="mt-1 text-xs text-slate-600">Reason: {request.reason}</p>
									</div>
									<div className="flex items-center gap-2">
										<button
											type="button"
											onClick={() => handleAppointmentDecision(request, "confirm")}
											disabled={isUpdatingDecision}
											className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
										>
											{isUpdatingDecision ? "Updating..." : "Confirm"}
										</button>
										<button
											type="button"
											onClick={() => handleAppointmentDecision(request, "reject")}
											disabled={isUpdatingDecision}
											className="rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
										>
											{isUpdatingDecision ? "Updating..." : "Reject"}
										</button>
									</div>
								</div>
							))
						)}
					</div>
				</div>
			)}

			{activeTab === "availability" && (
				<div className="rounded-2xl border border-slate-200 bg-white p-6">
					<h3 className="mb-4 text-base font-semibold text-slate-900">Weekly Working Hours</h3>
					{loading ? (
						<p className="text-sm text-slate-500">Loading availability...</p>
					) : (
						<div className="space-y-4">
							{availability.map((item, index) => (
								<div key={item.day || index} className="flex items-center justify-between border-b border-slate-100 pb-4 last:border-0 last:pb-0">
									<div className="flex items-center gap-3 w-32">
										<input 
											type="checkbox" 
											className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600" 
											checked={item.isWorking}
											onChange={(e) => handleAvailabilityChange(index, "isWorking", e.target.checked)}
										/>
										<span className={`text-sm font-medium ${item.isWorking ? 'text-slate-700' : 'text-slate-400'}`}>{item.day}</span>
									</div>
									<div className={`flex flex-1 items-center gap-4 pl-4 ${!item.isWorking && 'opacity-50 pointer-events-none'}`}>
										<select 
											className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-blue-500"
											value={item.startTime || "09:00 AM"}
											onChange={(e) => handleAvailabilityChange(index, "startTime", e.target.value)}
											disabled={!item.isWorking}
										>
											{timeOptions.map((time) => <option key={`start-${time}`} value={time}>{time}</option>)}
										</select>
										<span className="text-slate-400">to</span>
										<select 
											className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-blue-500"
											value={item.endTime || "05:00 PM"}
											onChange={(e) => handleAvailabilityChange(index, "endTime", e.target.value)}
											disabled={!item.isWorking}
										>
											{timeOptions.map((time) => <option key={`end-${time}`} value={time}>{time}</option>)}
										</select>
									</div>
								</div>
							))}
						</div>
					)}
					<div className="mt-8 flex justify-end">
						<button onClick={handleSaveAvailability} disabled={saving || loading} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
							{saving ? "Saving..." : "Save Availability"}
						</button>
					</div>
				</div>
			)}

			{/* Appointment Details Modal */}
			{selectedAppointment && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 transition-opacity">
					<div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-200">
						<div className="flex items-center justify-between mb-5 border-b border-slate-100 pb-4">
							<h3 className="text-lg font-bold text-slate-900">Appointment Details</h3>
							<button 
								onClick={() => setSelectedAppointment(null)} 
								className="text-slate-400 hover:text-slate-600 rounded-full p-1 transition hover:bg-slate-100"
							>
								<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
								</svg>
							</button>
						</div>
						
						<div className="space-y-4 text-sm">
							<div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
								<p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Patient Info</p>
								<p className="font-medium text-slate-900 text-base">{selectedAppointment.patientName} <span className="text-slate-500 font-normal ml-1">({selectedAppointment.patientAge} yrs)</span></p>
								<div className="mt-2 flex flex-col gap-1 text-slate-600">
									<span className="flex items-center gap-2"><svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg> {selectedAppointment.patientEmail}</span>
									<span className="flex items-center gap-2"><svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg> {selectedAppointment.patientPhone}</span>
								</div>
							</div>
							
							<div className="grid grid-cols-2 gap-4">
								<div>
									<p className="text-xs font-bold uppercase tracking-wider text-slate-500">Schedule</p>
									<p className="mt-1 font-medium text-slate-900">{selectedAppointment.appointmentDate}</p>
									<p className="text-slate-600">{selectedAppointment.slotTime}</p>
								</div>
								<div>
									<p className="text-xs font-bold uppercase tracking-wider text-slate-500">Consultation</p>
									<p className="mt-1 font-medium capitalize text-slate-900">{selectedAppointment.mode}</p>
									<p className="text-slate-600 capitalize">Status: {selectedAppointment.status}</p>
								</div>
							</div>
							
							<div>
								<p className="text-xs font-bold uppercase tracking-wider text-slate-500">Reason for visit</p>
								<p className="mt-1 text-slate-800 bg-amber-50 p-3 rounded-lg border border-amber-100">{selectedAppointment.reason}</p>
							</div>
							
							<div className="pt-2 border-t border-slate-100">
								<p className="text-xs font-bold uppercase tracking-wider text-slate-500">Payment Details</p>
								<div className="mt-1 flex items-center justify-between">
									<p className="text-slate-700 capitalize">Status: <span className="font-semibold text-slate-900">{selectedAppointment.paymentStatus}</span></p>
									<p className="font-semibold text-emerald-600">{selectedAppointment.currency} {selectedAppointment.consultationFee}</p>
								</div>
								{selectedAppointment.paymentReference && (
									<p className="mt-1 text-xs text-slate-500">Ref: {selectedAppointment.paymentReference} ({selectedAppointment.paymentMethod})</p>
								)}
							</div>
						</div>
						
						<div className="mt-6 flex justify-end gap-3">
							<button onClick={() => setSelectedAppointment(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
								Close
							</button>
							{["pending", "pending_payment", "confirmed"].includes(normalizeStatus(selectedAppointment.status)) && (
								<>
									{normalizeStatus(selectedAppointment.status) === "pending" ? (
										<button
											onClick={() => handleAppointmentDecision(selectedAppointment, "reject")}
											disabled={isUpdatingDecision}
											className="rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
										>
											{isUpdatingDecision ? "Updating..." : "Reject Appointment"}
										</button>
									) : (
										<button
											onClick={() => handleAppointmentDecision(selectedAppointment, "cancel")}
											disabled={isUpdatingDecision}
											className="rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
										>
											{isUpdatingDecision ? "Updating..." : "Cancel Appointment"}
										</button>
									)}
									{normalizeStatus(selectedAppointment.status) === "pending" && (
										<button
											onClick={() => handleAppointmentDecision(selectedAppointment, "confirm")}
											disabled={isUpdatingDecision}
											className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
										>
											{isUpdatingDecision ? "Updating..." : "Confirm Appointment"}
										</button>
									)}
								</>
							)}
							{normalizeStatus(selectedAppointment.status) === "confirmed" && selectedAppointment.mode === "online" && (
								<button
									onClick={() => handleJoinTelemedicine(selectedAppointment)}
									disabled={!canJoinTelemedicine(selectedAppointment)}
									title={
										canJoinTelemedicine(selectedAppointment)
											? "Join telemedicine session"
											: "Join is available from 15 minutes before until 2 hours after the scheduled time"
									}
									className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
								>
									{canJoinTelemedicine(selectedAppointment) ? "Join Video Call" : "Join unavailable"}
								</button>
							)}
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

export default DoctorSchedulePage;