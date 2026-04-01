import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import DashboardShell from "../components/DashboardShell";
import DoctorTelemedicinePage from "./DoctorTelemedicinePage";
import DoctorSchedulePage from "./DoctorSchedulePage";
import DoctorConsultationsPage from "./DoctorConsultationsPage";
import DoctorPrescriptionsPage from "./DoctorPrescriptionsPage";
import { getCurrentUserId, getStoredUser } from "../utils/auth";
import { fetchDoctorAppointments } from "../services/appointmentApi";
import { fetchDoctorPrescriptions } from "../services/prescriptionApi";

const buildSectionPaths = (basePath) => ({
	Overview: basePath,
	Schedule: `${basePath}/schedule`,
	Consultations: `${basePath}/consultations`,
	Prescriptions: `${basePath}/prescriptions`,
	Telemedicine: `${basePath}/telemedicine`,
});

const resolveMenuFromPath = (pathname) => {
	const normalizedPath = (pathname || "").toLowerCase();
	if (normalizedPath.includes("/prescriptions") || normalizedPath.includes("/prescription")) {
		return "Prescriptions";
	}
	if (normalizedPath.includes("/consultations")) {
		return "Consultations";
	}
	if (normalizedPath.includes("/schedule")) {
		return "Schedule";
	}
	if (normalizedPath.includes("/telemedicine")) {
		return "Telemedicine";
	}
	return "Overview";
};

function DoctorDashboardPage() {
	const navigate = useNavigate();
	const location = useLocation();
	const user = getStoredUser() || {};
	const doctorProfile = user.doctorProfile || {};
	const doctorId = getCurrentUserId();
	const [doctorStats, setDoctorStats] = useState([]);
	const [overviewLoading, setOverviewLoading] = useState(true);
	const [overviewError, setOverviewError] = useState("");
	const [consultationQueue, setConsultationQueue] = useState([]);
	const doctorBasePath = location.pathname.toLowerCase().startsWith("/doctor") ? "/doctor" : "/dashboard/doctor";
	const sectionPaths = buildSectionPaths(doctorBasePath);
	const activeMenuItem = resolveMenuFromPath(location.pathname);
	const sectionMeta = {
		Overview: {
			title: `Welcome back, Dr. ${doctorProfile.lastName || (user.name || "Doctor")}`,
			subtitle: "Manage availability, patient consultations, and issue digital prescriptions.",
		},
		Schedule: {
			title: "Doctor Schedule",
			subtitle: "Plan and manage clinical availability and upcoming patient slots.",
		},
		Consultations: {
			title: "Doctor Consultations",
			subtitle: "Run active consultations, update SOAP notes, and complete visits.",
		},
		Prescriptions: {
			title: "Doctor Prescriptions",
			subtitle: "Create, review, send, and export patient prescriptions.",
		},
		Telemedicine: {
			title: "Doctor Telemedicine",
			subtitle: "Manage virtual sessions and launch secure video consultations.",
		},
	};

	const handleMenuChange = (nextMenuItem) => {
		navigate(sectionPaths[nextMenuItem] || sectionPaths.Overview);
	};

	useEffect(() => {
		const handleOpenPrescriptions = () => navigate(sectionPaths.Prescriptions);
		window.addEventListener("doctor:open-prescriptions", handleOpenPrescriptions);
		return () => window.removeEventListener("doctor:open-prescriptions", handleOpenPrescriptions);
	}, [navigate, sectionPaths.Prescriptions]);

	useEffect(() => {
		const getDateKey = (value) => {
			if (!value) {
				return "";
			}

			if (typeof value === "string") {
				const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
				if (match) {
					return match[1];
				}
			}

			const parsed = new Date(value);
			if (Number.isNaN(parsed.getTime())) {
				return "";
			}

			return parsed.toISOString().slice(0, 10);
		};

		const loadOverviewData = async () => {
			if (!doctorId) {
				setOverviewLoading(false);
				return;
			}

			try {
				setOverviewLoading(true);
				setOverviewError("");
				const [appointmentResult, prescriptionResult] = await Promise.allSettled([
					fetchDoctorAppointments(doctorId),
					fetchDoctorPrescriptions(doctorId),
				]);

				const appointments =
					appointmentResult.status === "fulfilled"
						? appointmentResult.value?.appointments || []
						: [];
				const prescriptions =
					prescriptionResult.status === "fulfilled"
						? prescriptionResult.value?.prescriptions || []
						: [];

				if (appointmentResult.status === "rejected" && prescriptionResult.status === "rejected") {
					setOverviewError("Unable to load dashboard data right now.");
				}

				const today = new Date().toISOString().slice(0, 10);
				const todayAppointments = appointments.filter((item) => {
					const dateKey = getDateKey(item.appointmentDate || item.appointmentDateTime);
					return dateKey === today;
				});
				const confirmedAppointments = appointments.filter((item) => item.status === "confirmed");
				const completedAppointments = appointments.filter((item) => item.status === "completed");
				const pendingAppointments = appointments.filter(
					(item) => item.status === "pending_payment" || item.status === "pending"
				);

				setDoctorStats([
					{
						label: "Today Sessions",
						value: String(todayAppointments.length).padStart(2, "0"),
						meta: `${pendingAppointments.length} pending`,
					},
					{
						label: "Completed",
						value: String(completedAppointments.length).padStart(2, "0"),
						meta: "Consultations",
					},
					{
						label: "Prescriptions",
						value: String(prescriptions.length).padStart(2, "0"),
						meta: "Total issued",
					},
					{
						label: "Upcoming",
						value: String(confirmedAppointments.length).padStart(2, "0"),
						meta: "Confirmed",
					},
				]);

				const queue = appointments
					.filter((item) => ["confirmed", "pending", "pending_payment"].includes(String(item.status || "").toLowerCase()))
					.slice()
					.sort((a, b) => new Date(a.appointmentDateTime || a.appointmentDate) - new Date(b.appointmentDateTime || b.appointmentDate))
					.slice(0, 4)
					.map((item) => ({
						patient: item.patientName || "Patient",
						topic: item.reason || "Consultation",
						slot: item.slotTime || "N/A",
						status: item.mode === "online" ? "Online" : "Scheduled",
					}));

				setConsultationQueue(queue);
			} catch (error) {
				console.error("Failed to load doctor overview data", error);
				setDoctorStats([]);
				setConsultationQueue([]);
				setOverviewError("Unable to load dashboard data right now.");
			} finally {
				setOverviewLoading(false);
			}
		};

		loadOverviewData();
	}, [doctorId]);

	return (
		<DashboardShell
			role="doctor"
			initialActiveMenuItem="Overview"
			activeMenuItem={activeMenuItem}
			onMenuChange={handleMenuChange}
			title={sectionMeta[activeMenuItem]?.title || sectionMeta.Overview.title}
			subtitle={sectionMeta[activeMenuItem]?.subtitle || sectionMeta.Overview.subtitle}
		>
			{activeMenuItem === "Telemedicine" ? (
				<DoctorTelemedicinePage />
			) : activeMenuItem === "Schedule" ? (
				<DoctorSchedulePage />
			) : activeMenuItem === "Consultations" ? (
				<DoctorConsultationsPage />
			) : activeMenuItem === "Prescriptions" ? (
				<DoctorPrescriptionsPage />
			) : (
				<>
					{overviewError && (
						<div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
							{overviewError}
						</div>
					)}

					{overviewLoading ? (
						<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
							{[1, 2, 3, 4].map((item) => (
								<div key={item} className="rounded-2xl border border-slate-200 bg-slate-50 p-5 animate-pulse">
									<div className="h-3 w-24 rounded bg-slate-200" />
									<div className="mt-3 h-8 w-12 rounded bg-slate-200" />
									<div className="mt-2 h-3 w-20 rounded bg-slate-200" />
								</div>
							))}
						</div>
					) : doctorStats.length > 0 ? (
						<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
							{doctorStats.map((item) => (
								<div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
									<p className="text-xs uppercase tracking-wide text-slate-500">{item.label}</p>
									<p className="mt-2 text-2xl font-bold text-slate-900">{item.value}</p>
									<p className="mt-1 text-xs text-slate-500">{item.meta}</p>
								</div>
							))}
						</div>
					) : (
						<div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
							No overview data available right now.
						</div>
					)}

					<div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
						<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Quick Actions</p>
						<div className="mt-3 grid gap-2 sm:grid-cols-3">
							<button
								onClick={() => navigate(sectionPaths.Schedule)}
								className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
							>
								Open Schedule
							</button>
							<button
								onClick={() => navigate(sectionPaths.Consultations)}
								className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
							>
								Open Consultations
							</button>
							<button
								onClick={() => navigate(sectionPaths.Prescriptions)}
								className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
							>
								Open Prescriptions
							</button>
						</div>
					</div>

					<div className="mt-5 grid gap-5 lg:grid-cols-[1.35fr_1fr]">
						<section className="rounded-2xl border border-slate-200 bg-white p-5">
							<div className="mb-4 flex items-center justify-between">
								<h2 className="text-sm font-semibold text-slate-900">Consultation Queue</h2>
								<button onClick={() => navigate(sectionPaths.Schedule)} className="text-xs font-semibold text-blue-700">Manage slots</button>
							</div>
							<div className="space-y-3">
								{consultationQueue.length === 0 ? (
									<div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-xs text-slate-500">
										No confirmed consultations yet.
									</div>
								) : consultationQueue.map((item) => (
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

						<section>
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
						</section>
					</div>
				</>
			)}
		</DashboardShell>
	);
}

export default DoctorDashboardPage;
