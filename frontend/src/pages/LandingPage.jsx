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
		<div className="min-h-screen bg-slate-50 text-slate-900">
			<header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5 lg:px-8">
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

			<main className="mx-auto grid w-full max-w-7xl gap-12 px-6 pb-16 pt-8 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:pt-16">
				<section className="space-y-8">
					<span className="inline-flex rounded-full border border-blue-100 bg-blue-50 px-4 py-1 text-xs font-semibold tracking-wide text-blue-700">
						AI-Enabled Telemedicine for Sri Lanka
					</span>
					<h1 className="text-4xl font-bold leading-tight tracking-tight text-slate-900 md:text-5xl">
						Better Care,
						<span className="block text-blue-600">Faster Appointments.</span>
					</h1>
					<p className="max-w-xl text-base leading-7 text-slate-600 md:text-lg">
						HealthMate connects patients, doctors, and administrators on one
						secure platform for appointments, video consultations, digital
						prescriptions, and report management.
					</p>
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
						{stats.map((item) => (
							<div
								key={item.label}
								className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm"
							>
								<p className="text-2xl font-bold text-slate-900">{item.value}</p>
								<p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">
									{item.label}
								</p>
							</div>
						))}
					</div>
				</section>

				<section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
					<h2 className="text-2xl font-semibold text-slate-900">Platform Services</h2>
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
				</section>
			</main>

			<section className="mx-auto w-full max-w-7xl px-6 pb-20 lg:px-8">
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
