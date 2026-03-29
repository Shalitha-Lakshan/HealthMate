import DashboardShell from "../components/DashboardShell";
import { getStoredUser } from "../utils/auth";

function AdminDashboardPage() {
	const user = getStoredUser() || {};

	return (
		<DashboardShell
			role="admin"
			title={`Welcome, ${user.name || "Admin"}`}
			subtitle="Manage users, doctor verifications, and platform operations."
		>
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
						<p className="text-xs uppercase tracking-wide text-slate-500">Role</p>
						<p className="mt-2 text-sm font-semibold capitalize text-slate-900">{user.role || "admin"}</p>
					</div>
					<div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
						<p className="text-xs uppercase tracking-wide text-slate-500">Email</p>
						<p className="mt-2 text-sm font-semibold text-slate-900">{user.email || "N/A"}</p>
					</div>
					<div className="rounded-2xl border border-violet-200 bg-violet-50 p-5">
						<p className="text-xs uppercase tracking-wide text-violet-700">User Ops</p>
						<p className="mt-2 text-sm font-semibold text-violet-900">Account management module</p>
					</div>
					<div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
						<p className="text-xs uppercase tracking-wide text-amber-700">Financial Ops</p>
						<p className="mt-2 text-sm font-semibold text-amber-900">Transaction oversight module</p>
					</div>
			</div>
		</DashboardShell>
	);
}

export default AdminDashboardPage;
