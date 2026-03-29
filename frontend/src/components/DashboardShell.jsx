import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearAuthStorage, getStoredUser } from "../utils/auth";

const menuByRole = {
	patient: ["Overview", "Appointments", "Medical Reports", "Telemedicine"],
	doctor: ["Overview", "Schedule", "Consultations", "Prescriptions", "Telemedicine"],
	admin: ["Overview", "User Management", "Doctor Verification", "Operations"],
};

function DashboardShell({ role = "patient", title, subtitle, children, onMenuChange, initialActiveMenuItem }) {
	const navigate = useNavigate();
	const user = getStoredUser() || {};
	const [isSidebarOpen, setIsSidebarOpen] = useState(false);

	const menuItems = useMemo(() => menuByRole[role] || menuByRole.patient, [role]);
	const defaultMenuItem = initialActiveMenuItem || menuItems[0] || "Overview";
	const [activeMenuItem, setActiveMenuItem] = useState(defaultMenuItem);

	const handleLogout = () => {
		clearAuthStorage();
		navigate("/login");
	};

	return (
		<div className="h-screen bg-slate-100/80 px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
			<div className="grid h-full w-full gap-6 lg:grid-cols-[280px_1fr]">
				{isSidebarOpen && (
					<button
						type="button"
						onClick={() => setIsSidebarOpen(false)}
						className="fixed inset-0 z-30 bg-slate-900/30 lg:hidden"
						aria-label="Close sidebar backdrop"
					/>
				)}

				<aside
					className={`fixed inset-y-4 left-4 z-40 w-70 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-transform duration-200 lg:static lg:inset-auto lg:w-auto lg:translate-x-0 ${
						isSidebarOpen ? "translate-x-0" : "-translate-x-[120%]"
					}`}
				>
					<div className="flex items-center gap-3 border-b border-slate-200 pb-5">
						<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white shadow-sm">
							H
						</div>
						<div>
							<p className="text-sm font-bold text-slate-900">HealthMate</p>
							<p className="text-xs capitalize text-slate-500">{role} workspace</p>
						</div>
					</div>

					<nav className="mt-5 space-y-2">
						{menuItems.map((item) => (
							<button
								type="button"
								key={item}
								onClick={() => {
									setActiveMenuItem(item);
									if (typeof onMenuChange === "function") {
										onMenuChange(item);
									}
									setIsSidebarOpen(false);
								}}
								className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition ${
									activeMenuItem === item
										? "bg-blue-50 text-blue-700"
										: "text-slate-600 hover:bg-slate-50"
								}`}
							>
								{item}
								{activeMenuItem === item && <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />}
							</button>
						))}
					</nav>

					<div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
						<p className="text-xs uppercase tracking-wide text-slate-500">Signed In As</p>
						<p className="mt-2 text-sm font-semibold text-slate-900">{user.name || "User"}</p>
						<p className="mt-1 text-xs text-slate-500">{user.email || "No email"}</p>
						<p className="mt-3 inline-flex rounded-lg bg-slate-200 px-2 py-1 text-[11px] font-semibold uppercase text-slate-700">
							{user.role || role}
						</p>
					</div>
				</aside>

				<section className="h-full overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
					<div className="mb-4 flex items-center justify-between gap-3 lg:hidden">
						<button
							type="button"
							onClick={() => setIsSidebarOpen(true)}
							className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
						>
							Menu
						</button>
						<p className="text-xs text-slate-500 capitalize">{role} workspace</p>
					</div>

					<div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
						<div className="flex items-center gap-2">
							<span className="inline-flex rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
								Live
							</span>
							<span className="text-xs text-slate-500">System status stable</span>
						</div>
						<p className="text-xs text-slate-500">{new Date().toLocaleString()}</p>
					</div>

					<header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
						<div>
							<p className="mb-2 text-xs font-medium capitalize text-slate-500">
								{role} / {activeMenuItem}
							</p>
							<p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
								{role} dashboard
							</p>
							<h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">{title}</h1>
							<p className="mt-2 text-sm text-slate-600">{subtitle}</p>
						</div>
						<button
							onClick={handleLogout}
							className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
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
