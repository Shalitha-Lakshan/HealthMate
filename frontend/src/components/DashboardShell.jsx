import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearAuthStorage, getStoredUser } from "../utils/auth";

const menuByRole = {
	patient: ["Overview", "Appointments", "Prescriptions", "Medical Reports", "Telemedicine", "AI Assistant"],
	doctor: ["Overview", "Schedule", "Consultations", "Prescriptions", "Medical Reports", "Telemedicine"],
	admin: ["Overview", "User Management", "Doctor Verification", "Appointment Management", "Payment Management", "Operations"],
};

function DashboardShell({ role = "patient", title, subtitle, children, onMenuChange, initialActiveMenuItem, activeMenuItem: externalActiveMenuItem }) {
	const navigate = useNavigate();
	const user = getStoredUser() || {};
	const [isSidebarOpen, setIsSidebarOpen] = useState(false);
	const profilePhoto = user.profilePhoto || user.patientProfile?.photoData || "";
	const profileInitials = (user.name || "User")
		.split(" ")
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase())
		.join("") || "U";

	const menuItems = useMemo(() => menuByRole[role] || menuByRole.patient, [role]);
	const defaultMenuItem = initialActiveMenuItem || menuItems[0] || "Overview";
	const [activeMenuItem, setActiveMenuItem] = useState(defaultMenuItem);

	const resolvedActiveMenuItem =
		typeof externalActiveMenuItem === "string" && externalActiveMenuItem.length > 0
			? externalActiveMenuItem
			: activeMenuItem;

	const handleLogout = () => {
		clearAuthStorage();
		navigate("/login");
	};

	const handleMenuItemClick = (item) => {
		setActiveMenuItem(item);

		if (typeof onMenuChange === "function") {
			onMenuChange(item);
			setIsSidebarOpen(false);
			return;
		}

		const dashboardPathByRole = {
			patient: "/dashboard/patient",
			doctor: "/dashboard/doctor",
			admin: "/dashboard/admin",
		};

		const destination = dashboardPathByRole[role] || "/dashboard";
		navigate(destination, { state: { activeMenuItem: item } });
	};

	return (
		<div className="h-screen bg-blue-50 px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
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
					className={`fixed inset-y-4 left-4 z-40 flex w-70 flex-col rounded-3xl border border-blue-100 bg-blue-50/80 p-5 shadow-sm transition-transform duration-200 lg:static lg:inset-auto lg:w-auto lg:translate-x-0 ${
						isSidebarOpen ? "translate-x-0" : "-translate-x-[120%]"
					}`}
				>
					<div className="flex h-full flex-col">
					<div className="flex items-center gap-3 border-b border-slate-200 pb-5">
						<div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
							<img src="/icons.svg" alt="HealthMate logo" className="h-10 w-10" />
						</div>
						<div>
							<p className="text-sm font-bold text-slate-900">HealthMate</p>
							<p className="text-xs capitalize text-slate-500">{role} workspace</p>
						</div>
					</div>

					<nav className="mt-5 flex-1 space-y-2">
						{menuItems.map((item) => (
							<button
								type="button"
								key={item}
								onClick={() => handleMenuItemClick(item)}
								className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition ${
									resolvedActiveMenuItem === item
										? "bg-blue-50 text-blue-700"
										: "text-slate-600 hover:bg-slate-50"
								}`}
							>
								{item}
								{resolvedActiveMenuItem === item && (
									<span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
								)}
							</button>
						))}
					</nav>

					<div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
						<p className="text-xs uppercase tracking-wide text-slate-500">Signed In As</p>
						<div className="mt-3 flex items-center gap-3">
							{profilePhoto ? (
								<img
									src={profilePhoto}
									alt="Profile"
									className="h-12 w-12 rounded-xl border border-slate-200 object-cover"
								/>
							) : (
								<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white">
									{profileInitials}
								</div>
							)}
							<div className="min-w-0">
								<p className="truncate text-sm font-semibold text-slate-900">{user.name || "User"}</p>
								<p className="truncate text-xs text-slate-500">{user.email || "No email"}</p>
							</div>
						</div>
						<p className="mt-3 inline-flex rounded-lg bg-slate-200 px-2 py-1 text-[11px] font-semibold uppercase text-slate-700">
							{user.role || role}
						</p>
					</div>

					{role === "patient" && (
						<button
							type="button"
							onClick={() => {
								navigate("/dashboard/patient/profile");
								setIsSidebarOpen(false);
							}}
							className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
						>
							Profile
						</button>
					)}
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

					<header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
						<div>
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
