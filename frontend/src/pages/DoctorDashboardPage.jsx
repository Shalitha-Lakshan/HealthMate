import DashboardShell from "../components/DashboardShell";
import { getStoredUser } from "../utils/auth";

function DoctorDashboardPage() {
	const user = getStoredUser() || {};
	const doctorProfile = user.doctorProfile || {};

	return (
		<DashboardShell
			role="doctor"
			title={`Welcome, Dr. ${user.name || "User"}`}
			subtitle="Manage consultations, availability, and prescriptions."
		>
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
						<p className="text-xs uppercase tracking-wide text-slate-500">Specialization</p>
						<p className="mt-2 text-sm font-semibold text-slate-900">{doctorProfile.specialization || "N/A"}</p>
					</div>
					<div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
						<p className="text-xs uppercase tracking-wide text-slate-500">SLMC No</p>
						<p className="mt-2 text-sm font-semibold text-slate-900">{doctorProfile.slmcRegistrationNumber || "N/A"}</p>
					</div>
					<div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
						<p className="text-xs uppercase tracking-wide text-slate-500">Experience</p>
						<p className="mt-2 text-sm font-semibold text-slate-900">
							{doctorProfile.yearsOfExperience ?? "N/A"} years
						</p>
					</div>
					<div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
						<p className="text-xs uppercase tracking-wide text-blue-700">Consultations</p>
						<p className="mt-2 text-sm font-semibold text-blue-900">Session management module</p>
					</div>
			</div>
		</DashboardShell>
	);
}

export default DoctorDashboardPage;
