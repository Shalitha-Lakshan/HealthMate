import { Link } from "react-router-dom";

function LandingPage() {
	const stats = [
		{ value: "20K+", label: "Monthly Appointments" },
		{ value: "350+", label: "Verified Doctors" },
		{ value: "24/7", label: "Patient Support" },
	];

	const features = [
		{
			title: "Book in Seconds",
			description:
				"Search doctors by specialty, compare availability, and confirm appointments instantly.",
		},
		{
			title: "Secure Telemedicine",
			description:
				"Join encrypted video consultations and receive digital prescriptions from anywhere.",
		},
		{
			title: "Smart Health Records",
			description:
				"Upload reports, track medical history, and access prescriptions in one secure dashboard.",
		},
	];

	return (
		<div className="relative flex min-h-screen flex-col overflow-hidden bg-slate-50 text-slate-900">
			<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.16),transparent_40%)]" />
			<div className="pointer-events-none absolute -left-24 top-28 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(191,219,254,0.55),transparent_70%)]" />
			<div className="pointer-events-none absolute -right-20 bottom-8 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(148,163,184,0.25),transparent_70%)]" />

			<header className="relative z-10 flex w-full items-center justify-between px-6 py-5 lg:px-12">
				<div className="flex items-center gap-3">
					<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-lg font-bold text-white">
						H
					</div>
					<div>
						<p className="text-lg font-semibold">HealthMate</p>
						<p className="text-xs text-slate-500">Smart Healthcare Platform</p>
					</div>
				</div>
				<div className="flex items-center gap-3">
					<Link
						to="/login"
						className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
					>
						Sign In
					</Link>
					<Link
						to="/register"
						className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
					>
						Create Account
					</Link>
				</div>
			</header>

			<main className="relative z-10 grid w-full flex-1 gap-10 px-6 pb-14 pt-6 lg:grid-cols-2 lg:gap-14 lg:px-12 lg:pt-10">
				<section className="flex flex-col justify-center space-y-8 lg:pr-8">
					<span className="inline-flex rounded-full border border-blue-100 bg-blue-50 px-4 py-1 text-xs font-semibold tracking-wide text-blue-700">
						AI-Enabled Telemedicine for Sri Lanka
					</span>
					<h1 className="text-4xl font-bold leading-tight tracking-tight text-slate-900 md:text-6xl">
						Better Care,
						<span className="block text-blue-600">Faster Appointments.</span>
					</h1>
					<p className="max-w-xl text-base leading-7 text-slate-600 md:text-lg">
						HealthMate connects patients, doctors, and administrators on one
						secure platform for appointments, video consultations, digital
						prescriptions, and report management.
					</p>
					<div className="flex flex-wrap gap-3">
						<Link
							to="/register"
							className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-blue-200 transition hover:bg-blue-700"
						>
							Get Started
						</Link>
						<Link
							to="/login"
							className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
						>
							Book Demo
						</Link>
					</div>
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
						{stats.map((item) => (
							<div
								key={item.label}
								className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
							>
								<p className="text-2xl font-bold text-slate-900">{item.value}</p>
								<p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">
									{item.label}
								</p>
							</div>
						))}
					</div>
				</section>

				<section className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-xl shadow-slate-200/70 backdrop-blur md:p-8">
					<div className="mb-4 flex items-center justify-between">
						<h2 className="text-2xl font-semibold text-slate-900">Platform Services</h2>
						<span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Live</span>
					</div>
					<p className="mt-2 text-sm text-slate-600">
						Built for patients, doctors, and admins with role-based secure access.
					</p>
					<div className="mt-6 space-y-4">
						{[
							"Patient Profile & Medical Reports",
							"Doctor Availability & Prescriptions",
							"Real-time Appointment Management",
							"Secure Video Consultation Sessions",
							"Online Payment & Notifications",
						].map((item) => (
							<div key={item} className="flex items-start gap-3 rounded-xl bg-slate-50 p-3">
								<span className="mt-1 inline-block h-2.5 w-2.5 rounded-full bg-blue-600" />
								<p className="text-sm font-medium text-slate-700">{item}</p>
							</div>
						))}
					</div>
					<div className="mt-6 rounded-2xl bg-slate-900 p-4 text-white">
						<p className="text-xs uppercase tracking-[0.2em] text-slate-300">Next Available Slots</p>
						<div className="mt-3 flex flex-wrap gap-2">
							{["Colombo 09:30", "Galle 10:00", "Kandy 11:15"].map((slot) => (
								<span key={slot} className="rounded-full bg-slate-700 px-3 py-1 text-xs font-semibold text-slate-200">
									{slot}
								</span>
							))}
						</div>
					</div>
				</section>
			</main>

			<section className="relative z-10 w-full px-6 pb-16 lg:px-12">
				<div className="rounded-3xl bg-slate-900 p-8 md:p-10">
					<h3 className="text-2xl font-semibold text-white">Why HealthMate</h3>
					<div className="mt-6 grid gap-4 md:grid-cols-3">
						{features.map((feature) => (
							<article key={feature.title} className="rounded-2xl bg-slate-800 p-5">
								<h4 className="text-base font-semibold text-white">{feature.title}</h4>
								<p className="mt-2 text-sm leading-6 text-slate-300">
									{feature.description}
								</p>
							</article>
						))}
					</div>
				</div>
			</section>
		</div>
	);
}

export default LandingPage;
