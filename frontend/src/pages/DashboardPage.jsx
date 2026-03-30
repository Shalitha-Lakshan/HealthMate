import { Link, useNavigate } from "react-router-dom";

function DashboardPage() {
	const navigate = useNavigate();
	const user = JSON.parse(localStorage.getItem("healthmate_user") || "{}");

	const handleLogout = () => {
		localStorage.removeItem("healthmate_token");
		localStorage.removeItem("healthmate_user");
		navigate("/login");
	};

	return (
		<div className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
			<div className="mx-auto w-full max-w-5xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
				<div className="flex flex-wrap items-center justify-between gap-4">
					<div>
						<p className="text-sm font-medium uppercase tracking-wide text-blue-600">Authenticated</p>
						<h1 className="mt-1 text-3xl font-bold text-slate-900">Welcome to HealthMate</h1>
						<p className="mt-2 text-sm text-slate-600">
							Frontend auth flow is live. Next, connect role-based modules.
						</p>
					</div>
					<button
						onClick={handleLogout}
						className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
					>
						Logout
					</button>
				</div>

				<div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
						<p className="text-xs uppercase tracking-wide text-slate-500">Name</p>
						<p className="mt-2 text-base font-semibold text-slate-900">{user.name || "N/A"}</p>
					</div>
					<div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
						<p className="text-xs uppercase tracking-wide text-slate-500">Email</p>
						<p className="mt-2 text-base font-semibold text-slate-900">{user.email || "N/A"}</p>
					</div>
					<div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
						<p className="text-xs uppercase tracking-wide text-slate-500">Phone</p>
						<p className="mt-2 text-base font-semibold text-slate-900">{user.phoneNumber || "N/A"}</p>
					</div>
					<div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
						<p className="text-xs uppercase tracking-wide text-slate-500">Role</p>
						<p className="mt-2 text-base font-semibold capitalize text-slate-900">{user.role || "N/A"}</p>
					</div>
				</div>

				{user.role === "doctor" && user.doctorProfile && (
					<div className="mt-4 grid gap-4 sm:grid-cols-3">
						<div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
							<p className="text-xs uppercase tracking-wide text-slate-500">Specialization</p>
							<p className="mt-2 text-base font-semibold text-slate-900">
								{user.doctorProfile.specialization || "N/A"}
							</p>
						</div>
						<div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
							<p className="text-xs uppercase tracking-wide text-slate-500">SLMC No</p>
							<p className="mt-2 text-base font-semibold text-slate-900">
								{user.doctorProfile.slmcRegistrationNumber || "N/A"}
							</p>
						</div>
						<div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
							<p className="text-xs uppercase tracking-wide text-slate-500">Experience</p>
							<p className="mt-2 text-base font-semibold text-slate-900">
								{user.doctorProfile.yearsOfExperience ?? "N/A"} years
							</p>
						</div>
					</div>
				)}

				<div className="mt-8 rounded-2xl bg-blue-50 p-5 text-sm text-blue-900">
					Next suggested pages: Patient Dashboard, Doctor Dashboard, Admin Panel.
					<Link to="/" className="ml-1 font-semibold underline underline-offset-2">
						Back to Home
					</Link>
				</div>
			</div>
		</div>
	);
}

export default DashboardPage;
