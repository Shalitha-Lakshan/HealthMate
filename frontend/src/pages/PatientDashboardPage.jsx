import DashboardShell from "../components/DashboardShell";
import { getStoredUser } from "../utils/auth";

function PatientDashboardPage() {
	const user = getStoredUser() || {};

	return (
		<DashboardShell
			role="patient"
			title={`Welcome, ${user.name || "Patient"}`}
			subtitle="Manage appointments, reports, and telemedicine sessions."
		>
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
						<p className="text-xs uppercase tracking-wide text-slate-500">Email</p>
						<p className="mt-2 text-sm font-semibold text-slate-900">{user.email || "N/A"}</p>
					</div>
					<div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
						<p className="text-xs uppercase tracking-wide text-slate-500">Phone</p>
						<p className="mt-2 text-sm font-semibold text-slate-900">{user.phoneNumber || "N/A"}</p>
					</div>
					<div className="rounded-2xl border border-slate-200 bg-blue-50 p-5">
						<p className="text-xs uppercase tracking-wide text-blue-700">Appointments</p>
						<p className="mt-2 text-sm font-semibold text-blue-900">Upcoming bookings module</p>
					</div>
					<div className="rounded-2xl border border-slate-200 bg-emerald-50 p-5">
						<p className="text-xs uppercase tracking-wide text-emerald-700">Reports</p>
						<p className="mt-2 text-sm font-semibold text-emerald-900">Medical reports module</p>
					</div>
			</div>
		</DashboardShell>
	);
}

export default PatientDashboardPage;
