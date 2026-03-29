import DashboardShell from "../components/DashboardShell";
import { getStoredUser } from "../utils/auth";

function AdminDashboardPage() {
	const user = getStoredUser() || {};

	const adminStats = [
		{ label: "Active Users", value: "1,248", meta: "+4.2% this week" },
		{ label: "Pending Verifications", value: "14", meta: "Doctor applications" },
		{ label: "Open Incidents", value: "02", meta: "Needs follow-up" },
		{ label: "Revenue (LKR)", value: "2.4M", meta: "Current month" },
	];

	const verificationQueue = [
		{ name: "Dr. Savindi Jayasuriya", specialty: "Neurology", submittedAt: "2h ago" },
		{ name: "Dr. Pasindu Silva", specialty: "Orthopedics", submittedAt: "5h ago" },
		{ name: "Dr. Tharushi Perera", specialty: "Pediatrics", submittedAt: "1d ago" },
	];

	return (
		<DashboardShell
			role="admin"
			title={`Welcome, ${user.name || "Admin"}`}
			subtitle="Manage users, doctor verifications, and platform operations."
		>
			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				{adminStats.map((item) => (
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
						<h2 className="text-sm font-semibold text-slate-900">Doctor Verification Queue</h2>
						<button className="text-xs font-semibold text-blue-700">Review all</button>
					</div>
					<div className="space-y-3">
						{verificationQueue.map((item) => (
							<div key={item.name} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
								<div className="flex items-center justify-between gap-3">
									<div>
										<p className="text-sm font-semibold text-slate-900">{item.name}</p>
										<p className="text-xs text-slate-500">{item.specialty}</p>
									</div>
									<span className="rounded-lg bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-700">
										{item.submittedAt}
									</span>
								</div>
							</div>
						))}
					</div>
				</section>

				<section className="space-y-5">
					<div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
						<h3 className="text-sm font-semibold text-slate-900">Platform Health</h3>
						<ul className="mt-3 space-y-2 text-sm text-slate-700">
							<li className="flex items-center justify-between"><span>API Gateway</span><span className="text-emerald-700">Operational</span></li>
							<li className="flex items-center justify-between"><span>Auth Service</span><span className="text-emerald-700">Operational</span></li>
							<li className="flex items-center justify-between"><span>Notification Queue</span><span className="text-amber-700">Degraded</span></li>
						</ul>
					</div>

					<div className="rounded-2xl border border-violet-200 bg-violet-50 p-5">
						<h3 className="text-sm font-semibold text-violet-900">Admin Actions</h3>
						<ul className="mt-3 space-y-2 text-sm text-violet-800">
							<li>• Verify new doctor accounts</li>
							<li>• Review flagged transactions</li>
							<li>• Monitor system-wide incidents</li>
						</ul>
					</div>
				</section>
			</div>
		</DashboardShell>
	);
}

export default AdminDashboardPage;
