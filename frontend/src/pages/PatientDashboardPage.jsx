import { useState } from "react";
import DashboardShell from "../components/DashboardShell";
import PatientTelemedicinePage from "./PatientTelemedicinePage";
import SymptomChatbot from "../components/SymptomChatbot";
import { getStoredUser } from "../utils/auth";
import { createAppointment, fetchMyAppointments } from "../services/appointmentApi";
import { fetchDoctors } from "../services/authApi";

const INITIAL_FORM_STATE = {
	patientName: "",
	patientAge: "",
	doctorName: "",
	specialty: "",
	appointmentDateTime: "",
	mode: "in-person",
	reason: "",
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
	const [activeMenuItem, setActiveMenuItem] = useState("Overview");
	const [formData, setFormData] = useState({ ...INITIAL_FORM_STATE, patientName: user.name || "" });
	const [appointments, setAppointments] = useState([]);
	const [doctors, setDoctors] = useState([]);
	const [isLoadingDoctors, setIsLoadingDoctors] = useState(false);
	const [isLoadingAppointments, setIsLoadingAppointments] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
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

	const specialties = [...new Set(doctors.map((doctor) => doctor.specialty).filter(Boolean))];

	const doctorsForSelectedSpecialty = doctors.filter((doctor) => doctor.specialty === formData.specialty);

	const handleAppointmentChange = (event) => {
		const { name, value } = event.target;

		if (name === "specialty") {
			setFormData((prev) => ({ ...prev, specialty: value, doctorName: "" }));
			return;
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
				...formData,
				patientAge: Number(formData.patientAge),
				appointmentDateTime: new Date(formData.appointmentDateTime).toISOString(),
			};

			await createAppointment(payload);
			setSuccessMessage("Appointment created successfully.");
			setFormData({ ...INITIAL_FORM_STATE, patientName: user.name || "" });
			await loadDoctors();
			await loadAppointments();
		} catch (error) {
			setErrorMessage(error.response?.data?.message || "Failed to create appointment.");
		} finally {
			setIsSubmitting(false);
		}
	};

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
				<h2 className="text-sm font-semibold text-slate-900">Create Appointment</h2>
				<p className="mt-1 text-xs text-slate-500">Submit your request and track status in one place.</p>

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
						<label htmlFor="doctorName" className="mb-1 block text-xs font-semibold text-slate-600">
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
						<label htmlFor="doctorName" className="mb-1 block text-xs font-semibold text-slate-600">
							Doctor Name
						</label>
						<select
							id="doctorName"
							name="doctorName"
							required
							value={formData.doctorName}
							onChange={handleAppointmentChange}
							disabled={!formData.specialty}
							className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
						>
							<option value="">{formData.specialty ? "Select doctor" : "Select specialty first"}</option>
							{doctorsForSelectedSpecialty.map((doctor) => (
								<option key={doctor.id} value={doctor.name}>
									{doctor.name}
								</option>
							))}
						</select>
					</div>

					<div className="grid gap-3 sm:grid-cols-2">
						<div>
							<label htmlFor="appointmentDateTime" className="mb-1 block text-xs font-semibold text-slate-600">
								Date & Time
							</label>
							<input
								id="appointmentDateTime"
								name="appointmentDateTime"
								type="datetime-local"
								required
								value={formData.appointmentDateTime}
								onChange={handleAppointmentChange}
								className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
							/>
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
						{isSubmitting ? "Creating..." : "Create Appointment"}
					</button>
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
									<span className="rounded-lg bg-amber-100 px-2 py-1 text-[11px] font-semibold uppercase text-amber-700">
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
								<p className="mt-2 text-xs text-slate-600">Reason: {appointment.reason}</p>
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
			initialActiveMenuItem="Overview"
			onMenuChange={(menuItem) => {
				setActiveMenuItem(menuItem);
				if (menuItem === "Appointments") {
					loadDoctors();
					loadAppointments();
				}
			}}
			title={`Welcome, ${user.name || "Patient"}`}
			subtitle="Manage appointments, reports, and telemedicine sessions."
		>
			{activeMenuItem === "Telemedicine" ? (
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
