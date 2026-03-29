import { useState } from "react";
import DashboardShell from "../components/DashboardShell";
import PatientTelemedicinePage from "./PatientTelemedicinePage";
import SymptomChatbot from "../components/SymptomChatbot";
import { getStoredUser } from "../utils/auth";

function PatientDashboardPage() {
	const [activeMenuItem, setActiveMenuItem] = useState("Overview");
	const user = getStoredUser() || {};

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

	return (
		<DashboardShell
			role="patient"
			initialActiveMenuItem="Overview"
			onMenuChange={setActiveMenuItem}
			title={`Welcome, ${user.name || "Patient"}`}
			subtitle="Manage appointments, reports, and telemedicine sessions."
		>
			{activeMenuItem === "Telemedicine" ? (
				<PatientTelemedicinePage />
			) : activeMenuItem === "AI Assistant" ? (
				<SymptomChatbot />
			) : (
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
			)}
		</DashboardShell>
	);
}

export default PatientDashboardPage;
