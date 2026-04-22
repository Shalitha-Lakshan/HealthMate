import { useEffect, useMemo, useState } from "react";
import DashboardShell from "../components/DashboardShell";
import DoctorTelemedicinePage from "./DoctorTelemedicinePage";
import DoctorSchedulePage from "./DoctorSchedulePage";
import DoctorConsultationsPage from "./DoctorConsultationsPage";
import DoctorPrescriptionsPage from "./DoctorPrescriptionsPage";
import DoctorMedicalReportsPage from "./DoctorMedicalReportsPage";
import { getStoredUser } from "../utils/auth";
import { updateCurrentUserProfile } from "../services/authApi";
import { DOCTOR_SPECIALIZATIONS } from "../constants/doctorSpecializations";
import { fetchDoctorAppointments } from "../services/appointmentApi";

function DoctorDashboardPage() {
	const QUEUE_REFRESH_INTERVAL_MS = 10000;
	const [activeMenuItem, setActiveMenuItem] = useState("Overview");
	const [telemedicineRoomId, setTelemedicineRoomId] = useState("");
	const [user, setUser] = useState(() => getStoredUser() || {});
	const doctorProfile = user.doctorProfile || {};
	const doctorId = doctorProfile._id || user.id || user._id || "";
	const [doctorAppointments, setDoctorAppointments] = useState([]);
	const [isQueueLoading, setIsQueueLoading] = useState(false);
	const [queueError, setQueueError] = useState("");
	const [profileMessage, setProfileMessage] = useState({ type: "idle", text: "" });
	const [profileForm, setProfileForm] = useState(() => ({
		name: user.name || "",
		email: user.email || "",
		phoneNumber: user.phoneNumber || "",
		specialization: doctorProfile.specialization || "",
		slmcRegistrationNumber: doctorProfile.slmcRegistrationNumber || "",
		yearsOfExperience: doctorProfile.yearsOfExperience ?? "",
		profilePhoto: user.profilePhoto || "",
	}));

	const doctorStats = [
		{ label: "Today Sessions", value: "06", meta: "2 pending" },
		{ label: "Avg Rating", value: "4.8", meta: "Patient feedback" },
		{ label: "Prescriptions", value: "24", meta: "This week" },
		{ label: "Response Time", value: "08m", meta: "Average" },
	];

	const formatQueueSlot = (appointment) => {
		const dateValue = appointment?.appointmentDateTime
			|| (appointment?.appointmentDate && appointment?.slotTime
				? `${appointment.appointmentDate}T${appointment.slotTime}:00`
				: null);

		if (!dateValue) {
			return appointment?.slotTime || "Time not set";
		}

		const parsed = new Date(dateValue);
		if (Number.isNaN(parsed.getTime())) {
			return appointment?.slotTime || "Time not set";
		}

		return parsed.toLocaleString([], {
			month: "short",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const mapAppointmentStatusToQueue = (status) => {
		if (status === "confirmed") {
			return { label: "Ready", badgeClass: "bg-emerald-100 text-emerald-700" };
		}

		if (status === "pending_payment") {
			return { label: "Awaiting Payment", badgeClass: "bg-amber-100 text-amber-700" };
		}

		if (status === "pending") {
			return { label: "Awaiting Approval", badgeClass: "bg-blue-100 text-blue-700" };
		}

		if (status === "completed") {
			return { label: "Completed", badgeClass: "bg-slate-200 text-slate-700" };
		}

		if (status === "cancelled" || status === "rejected" || status === "expired" || status === "payment_failed") {
			return { label: "Closed", badgeClass: "bg-rose-100 text-rose-700" };
		}

		return { label: status || "Scheduled", badgeClass: "bg-slate-200 text-slate-700" };
	};

	const consultationQueue = useMemo(() => {
		return doctorAppointments
			.filter((appointment) => ["pending", "pending_payment", "confirmed"].includes(appointment.status))
			.sort((a, b) => {
				const aTime = new Date(a.appointmentDateTime || `${a.appointmentDate}T${a.slotTime || "00:00"}:00`).getTime();
				const bTime = new Date(b.appointmentDateTime || `${b.appointmentDate}T${b.slotTime || "00:00"}:00`).getTime();
				if (Number.isNaN(aTime) || Number.isNaN(bTime)) {
					return 0;
				}
				return aTime - bTime;
			})
			.slice(0, 8)
			.map((appointment) => {
				const statusMeta = mapAppointmentStatusToQueue(appointment.status);
				return {
					id: appointment.id || appointment._id || appointment.appointmentId,
					patient: appointment.patientName || "Unknown patient",
					topic: appointment.reason || "General consultation",
					slot: formatQueueSlot(appointment),
					status: statusMeta.label,
					badgeClass: statusMeta.badgeClass,
				};
			});
	}, [doctorAppointments]);

	useEffect(() => {
		if (!doctorId) {
			return;
		}

		let isMounted = true;

		const loadDoctorAppointments = async ({ silent = false } = {}) => {
			if (!silent) {
				setIsQueueLoading(true);
			}

			try {
				const data = await fetchDoctorAppointments(doctorId);
				if (!isMounted) {
					return;
				}
				setDoctorAppointments(data.appointments || data.data || []);
				setQueueError("");
			} catch (error) {
				if (!isMounted) {
					return;
				}
				setQueueError(error?.response?.data?.message || "Failed to load live consultation queue.");
			} finally {
				if (isMounted && !silent) {
					setIsQueueLoading(false);
				}
			}
		};

		loadDoctorAppointments();

		const intervalId = setInterval(() => {
			if (activeMenuItem === "Overview") {
				loadDoctorAppointments({ silent: true });
			}
		}, QUEUE_REFRESH_INTERVAL_MS);

		return () => {
			isMounted = false;
			clearInterval(intervalId);
		};
	}, [doctorId, activeMenuItem]);

	const handleManageConsultationQueue = () => {
		setActiveMenuItem("Consultations");
	};

	const handleOpenTelemedicineFromAppointment = (roomId) => {
		if (roomId) {
			setTelemedicineRoomId(String(roomId));
		}
		setActiveMenuItem("Telemedicine");
	};

	const handleProfileInputChange = (event) => {
		const { name, value } = event.target;
		setProfileForm((prev) => ({ ...prev, [name]: value }));
	};

	const handleResetProfileForm = () => {
		setProfileForm({
			name: user.name || "",
			email: user.email || "",
			phoneNumber: user.phoneNumber || "",
			specialization: doctorProfile.specialization || "",
			slmcRegistrationNumber: doctorProfile.slmcRegistrationNumber || "",
			yearsOfExperience: doctorProfile.yearsOfExperience ?? "",
			profilePhoto: user.profilePhoto || "",
		});
		setProfileMessage({ type: "idle", text: "" });
	};

	const handleProfilePhotoChange = (event) => {
		const selectedFile = event.target.files?.[0];
		if (!selectedFile) {
			return;
		}

		const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
		if (!allowedTypes.includes(selectedFile.type)) {
			setProfileMessage({ type: "error", text: "Please upload PNG, JPG, or WEBP image." });
			event.target.value = "";
			return;
		}

		if (selectedFile.size > 2 * 1024 * 1024) {
			setProfileMessage({ type: "error", text: "Profile photo must be 2MB or smaller." });
			event.target.value = "";
			return;
		}

		const reader = new FileReader();
		reader.onload = () => {
			setProfileForm((prev) => ({ ...prev, profilePhoto: String(reader.result || "") }));
			setProfileMessage({ type: "idle", text: "" });
		};
		reader.onerror = () => {
			setProfileMessage({ type: "error", text: "Failed to read selected image." });
		};
		reader.readAsDataURL(selectedFile);
		event.target.value = "";
	};

	const handleRemoveProfilePhoto = () => {
		setProfileForm((prev) => ({ ...prev, profilePhoto: "" }));
	};

	const handleSaveProfile = async (event) => {
		event.preventDefault();

		const trimmedName = profileForm.name.trim();
		const trimmedSpecialization = profileForm.specialization.trim();
		const trimmedSlmc = profileForm.slmcRegistrationNumber.trim();
		const experienceValue = Number(profileForm.yearsOfExperience);

		if (!trimmedName) {
			setProfileMessage({ type: "error", text: "Name is required." });
			return;
		}

		if (!trimmedSpecialization) {
			setProfileMessage({ type: "error", text: "Specialization is required." });
			return;
		}

		if (!trimmedSlmc) {
			setProfileMessage({ type: "error", text: "SLMC registration number is required." });
			return;
		}

		if (Number.isNaN(experienceValue) || experienceValue < 0 || experienceValue > 60) {
			setProfileMessage({ type: "error", text: "Years of experience must be between 0 and 60." });
			return;
		}

		try {
			const payload = {
				name: trimmedName,
				email: profileForm.email.trim(),
				phoneNumber: profileForm.phoneNumber.trim(),
				profilePhoto: profileForm.profilePhoto,
				doctorProfile: {
					specialization: trimmedSpecialization,
					slmcRegistrationNumber: trimmedSlmc,
					yearsOfExperience: experienceValue,
				},
			};

			const response = await updateCurrentUserProfile(payload);
			const updatedUser = response?.user;

			if (!updatedUser) {
				throw new Error("Invalid profile update response");
			}

			localStorage.setItem("healthmate_user", JSON.stringify(updatedUser));
			setUser(updatedUser);
			setProfileForm({
				name: updatedUser.name || "",
				email: updatedUser.email || "",
				phoneNumber: updatedUser.phoneNumber || "",
				specialization: updatedUser.doctorProfile?.specialization || "",
				slmcRegistrationNumber: updatedUser.doctorProfile?.slmcRegistrationNumber || "",
				yearsOfExperience: updatedUser.doctorProfile?.yearsOfExperience ?? "",
				profilePhoto: updatedUser.profilePhoto || "",
			});
			setProfileMessage({ type: "success", text: response?.message || "Profile updated successfully." });
		} catch (error) {
			setProfileMessage({
				type: "error",
				text: error?.response?.data?.message || error?.message || "Failed to update profile.",
			});
		}
	};

	return (
		<DashboardShell
			role="doctor"
			activeMenuItem={activeMenuItem}
			initialActiveMenuItem="Overview"
			onMenuChange={setActiveMenuItem}
			title={`Welcome back, Dr. ${doctorProfile.lastName || (user.name || "Doctor")}`}
			subtitle="Manage availability, patient consultations, and issue digital prescriptions."
		>
			{activeMenuItem === "Telemedicine" ? (
				<DoctorTelemedicinePage initialRoomId={telemedicineRoomId} />
			) : activeMenuItem === "Schedule" ? (
				<DoctorSchedulePage onOpenTelemedicine={handleOpenTelemedicineFromAppointment} />
			) : activeMenuItem === "Consultations" ? (
				<DoctorConsultationsPage />
			) : activeMenuItem === "Prescriptions" ? (
				<DoctorPrescriptionsPage />
			) : activeMenuItem === "Medical Reports" ? (
				<DoctorMedicalReportsPage />
			) : activeMenuItem === "Profile" ? (
				<div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
					<section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
						<div className="bg-linear-to-r from-sky-700 via-blue-700 to-cyan-600 p-5 text-white">
							<div className="mb-3 flex items-center gap-3">
								{(profileForm.profilePhoto || user.profilePhoto) ? (
									<img
										src={profileForm.profilePhoto || user.profilePhoto}
										alt="Doctor profile"
										className="h-14 w-14 rounded-xl border border-white/40 object-cover"
									/>
								) : (
									<div className="flex h-14 w-14 items-center justify-center rounded-xl border border-white/40 bg-white/20 text-sm font-bold">
										{(user.name || "Doctor")
											.split(" ")
											.filter(Boolean)
											.slice(0, 2)
											.map((part) => part[0]?.toUpperCase())
											.join("") || "DR"}
									</div>
								)}
								<div>
									<p className="text-xs uppercase tracking-wide text-sky-100">Doctor Profile</p>
									<h2 className="mt-1 text-xl font-bold">{user.name || "Doctor"}</h2>
									<p className="text-xs text-cyan-100">{doctorProfile.specialization || "General Practice"}</p>
								</div>
							</div>
						</div>

						<form onSubmit={handleSaveProfile} className="space-y-4 p-5">
							<div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
								<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Profile Photo</p>
								<div className="mt-2 flex flex-wrap items-center gap-2">
									<label className="inline-flex cursor-pointer items-center rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800">
										Upload Photo
										<input
											type="file"
											accept="image/png,image/jpeg,image/jpg,image/webp"
											onChange={handleProfilePhotoChange}
											className="hidden"
										/>
									</label>
									<button
										type="button"
										onClick={handleRemoveProfilePhoto}
										className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-white"
									>
										Remove
									</button>
									<p className="text-[11px] text-slate-500">PNG/JPG/WEBP up to 2MB</p>
								</div>
							</div>

							<div className="grid gap-3 sm:grid-cols-2">
								<label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
									Full Name
									<input
										type="text"
										name="name"
										value={profileForm.name}
										onChange={handleProfileInputChange}
										className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500"
									/>
								</label>
								<label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
									Email
									<input
										type="email"
										name="email"
										value={profileForm.email}
										onChange={handleProfileInputChange}
										className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500"
									/>
								</label>
								<label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
									Phone Number
									<input
										type="text"
										name="phoneNumber"
										value={profileForm.phoneNumber}
										onChange={handleProfileInputChange}
										className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500"
									/>
								</label>
								<label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
									Specialization
									<select
										name="specialization"
										value={profileForm.specialization}
										onChange={handleProfileInputChange}
										className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500"
									>
										<option value="">Select specialization</option>
										{DOCTOR_SPECIALIZATIONS.map((specialization) => (
											<option key={specialization} value={specialization}>
												{specialization}
											</option>
										))}
									</select>
								</label>
								<label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
									SLMC Registration
									<input
										type="text"
										name="slmcRegistrationNumber"
										value={profileForm.slmcRegistrationNumber}
										onChange={handleProfileInputChange}
										className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500"
									/>
								</label>
								<label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
									Years Of Experience
									<input
										type="number"
										name="yearsOfExperience"
										min="0"
										max="60"
										value={profileForm.yearsOfExperience}
										onChange={handleProfileInputChange}
										className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500"
									/>
								</label>
							</div>

							{profileMessage.text && (
								<div className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
									profileMessage.type === "success"
										? "border-emerald-200 bg-emerald-50 text-emerald-700"
										: "border-red-200 bg-red-50 text-red-700"
								}`}>
									{profileMessage.text}
								</div>
							)}

							<div className="flex flex-wrap gap-2">
								<button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700">
									Save Changes
								</button>
								<button
									type="button"
									onClick={handleResetProfileForm}
									className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
								>
									Reset
								</button>
							</div>
						</form>
					</section>

					<section className="space-y-4">
						<div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
							<p className="text-xs uppercase tracking-wide text-slate-500">Profile Snapshot</p>
							<p className="mt-2 text-sm font-semibold text-slate-900">{doctorProfile.specialization || "General Practice"}</p>
							<p className="mt-2 text-xs text-slate-600">SLMC: {doctorProfile.slmcRegistrationNumber || "Not set"}</p>
							<p className="mt-1 text-xs text-slate-600">Experience: {doctorProfile.yearsOfExperience ?? "N/A"} years</p>
						</div>
						<div className="rounded-2xl border border-slate-200 bg-emerald-50 p-5">
							<h3 className="text-sm font-semibold text-emerald-900">Doctor Workspace</h3>
							<ul className="mt-3 space-y-2 text-sm text-emerald-800">
								<li>• Manage consultations</li>
								<li>• Control telemedicine sessions</li>
								<li>• Issue prescriptions faster</li>
							</ul>
						</div>
					</section>
				</div>
			) : (
				<>
					<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
						{doctorStats.map((item) => (
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
								<h2 className="text-sm font-semibold text-slate-900">Consultation Queue</h2>
								<div className="flex items-center gap-3">
									<span className="text-[11px] text-slate-500">Auto-refresh: 10s</span>
									<button
										type="button"
										onClick={handleManageConsultationQueue}
										className="text-xs font-semibold text-blue-700 hover:text-blue-800"
									>
										Manage slots
									</button>
								</div>
							</div>
							{isQueueLoading ? (
								<p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-sm text-slate-500">
									Loading live queue...
								</p>
							) : queueError ? (
								<p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-4 text-sm text-rose-700">{queueError}</p>
							) : consultationQueue.length === 0 ? (
								<p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-sm text-slate-500">
									No active consultations in queue.
								</p>
							) : (
								<div className="space-y-3">
									{consultationQueue.map((item) => (
										<div key={item.id || `${item.patient}-${item.slot}`} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
											<div className="flex items-center justify-between gap-3">
												<div>
													<p className="text-sm font-semibold text-slate-900">{item.patient}</p>
													<p className="text-xs text-slate-500">{item.topic}</p>
												</div>
												<span className={`rounded-lg px-2 py-1 text-[11px] font-semibold ${item.badgeClass}`}>
													{item.status}
												</span>
											</div>
											<p className="mt-3 text-xs font-medium text-slate-600">{item.slot}</p>
										</div>
									))}
								</div>
							)}
						</section>

						<section className="space-y-5">
							<div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
								<h3 className="text-sm font-semibold text-slate-900">Professional Profile</h3>
								<div className="mt-4 space-y-2 text-sm">
									<p className="text-slate-700">
										<span className="text-slate-500">Specialization:</span> {doctorProfile.specialization || "N/A"}
									</p>
									<p className="text-slate-700">
										<span className="text-slate-500">SLMC No:</span> {doctorProfile.slmcRegistrationNumber || "N/A"}
									</p>
									<p className="text-slate-700">
										<span className="text-slate-500">Experience:</span> {doctorProfile.yearsOfExperience ?? "N/A"} years
									</p>
								</div>
							</div>

							<div className="rounded-2xl border border-slate-200 bg-emerald-50 p-5">
								<h3 className="text-sm font-semibold text-emerald-900">Clinical Actions</h3>
								<ul className="mt-3 space-y-2 text-sm text-emerald-800">
									<li>• Open live telemedicine session</li>
									<li>• Issue digital prescription</li>
									<li>• Update availability schedule</li>
								</ul>
							</div>
						</section>
					</div>
				</>
			)}
		</DashboardShell>
	);
}

export default DoctorDashboardPage;
