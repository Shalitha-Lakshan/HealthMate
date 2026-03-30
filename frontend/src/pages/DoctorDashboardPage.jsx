import { useState } from "react";
import DashboardShell from "../components/DashboardShell";
import DoctorTelemedicinePage from "./DoctorTelemedicinePage";
import { getStoredUser } from "../utils/auth";

function DoctorDashboardPage() {
	const [activeMenuItem, setActiveMenuItem] = useState("Overview");
	const user = getStoredUser() || {};
	const doctorProfile = user.doctorProfile || {};

	const doctorStats = [
		{ label: "Today Sessions", value: "06", meta: "2 pending" },
		{ label: "Avg Rating", value: "4.8", meta: "Patient feedback" },
		{ label: "Prescriptions", value: "24", meta: "This week" },
		{ label: "Response Time", value: "08m", meta: "Average" },
	];

	const consultationQueue = [
		{ patient: "Shenal M.", topic: "Follow-up", slot: "10:30 AM", status: "Waiting" },
		{ patient: "Nadeesha K.", topic: "New consultation", slot: "11:15 AM", status: "Ready" },
		{ patient: "Kasun P.", topic: "Lab review", slot: "12:00 PM", status: "Scheduled" },
	];

	return (
		<DashboardShell
			role="doctor"
			initialActiveMenuItem="Overview"
			onMenuChange={setActiveMenuItem}
			title={`Welcome back, Dr. ${doctorProfile.lastName || (user.name || "Doctor")}`}
			subtitle="Manage availability, patient consultations, and issue digital prescriptions."
		>
			{activeMenuItem === "Telemedicine" ? (
				<DoctorTelemedicinePage />
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
								<button className="text-xs font-semibold text-blue-700">Manage slots</button>
							</div>
							<div className="space-y-3">
								{consultationQueue.map((item) => (
									<div key={`${item.patient}-${item.slot}`} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
										<div className="flex items-center justify-between gap-3">
											<div>
												<p className="text-sm font-semibold text-slate-900">{item.patient}</p>
												<p className="text-xs text-slate-500">{item.topic}</p>
											</div>
											<span className="rounded-lg bg-blue-100 px-2 py-1 text-[11px] font-semibold text-blue-700">
												{item.status}
											</span>
										</div>
										<p className="mt-3 text-xs font-medium text-slate-600">{item.slot}</p>
									</div>
								))}
							</div>
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
