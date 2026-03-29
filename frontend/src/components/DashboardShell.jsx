import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { clearAuthStorage, getStoredUser } from "../utils/auth";

const menuByRole = {
	patient: ["Overview", "Appointments", "Medical Reports", "Telemedicine"],
	doctor: ["Overview", "Schedule", "Consultations", "Prescriptions"],
	admin: ["Overview", "User Management", "Doctor Verification", "Operations"],
};

function DashboardShell({ role = "patient", title, subtitle, children }) {
	const navigate = useNavigate();
	const user = getStoredUser() || {};

	const menuItems = useMemo(() => menuByRole[role] || menuByRole.patient, [role]);

	const handleLogout = () => {
		clearAuthStorage();
		navigate("/login");
	};

	return (
		<div className="min-h-screen bg-slate-100/70 px-4 py-6 sm:px-6 lg:px-8">
			<div className="mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-[280px_1fr]">
				<aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
					<div className="flex items-center gap-3 border-b border-slate-200 pb-4">
						<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white">
							H
						</div>
						<div>
							<p className="text-sm font-bold text-slate-900">HealthMate</p>
							<p className="text-xs text-slate-500">{role} workspace</p>
						</div>
					</div>

					<nav className="mt-4 space-y-2">
						{menuItems.map((item, index) => (
							<div
								key={item}
								className={`rounded-xl px-3 py-2 text-sm font-medium ${
									index === 0
										? "bg-blue-50 text-blue-700"
										: "text-slate-600 hover:bg-slate-50"
								}`}
							>
								{item}
							</div>
						))}
					</nav>

					<div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
						<p className="text-xs uppercase tracking-wide text-slate-500">Signed In As</p>
						<p className="mt-2 text-sm font-semibold text-slate-900">{user.name || "User"}</p>
						<p className="mt-1 text-xs text-slate-500">{user.email || "No email"}</p>
					</div>
				</aside>

				<section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
					<header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
						<div>
							<p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
								{role} dashboard
							</p>
							<h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">{title}</h1>
							<p className="mt-2 text-sm text-slate-600">{subtitle}</p>
						</div>
						<button
							onClick={handleLogout}
							className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
						>
							Logout
						</button>
					</header>

					<div className="mt-6">{children}</div>
				</section>
			</div>
		</div>
	);
}

export default DashboardShell;
