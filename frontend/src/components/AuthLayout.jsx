import { Link } from "react-router-dom";

function AuthLayout({ title, subtitle, children, footerText, footerLink, footerLinkText }) {
	return (
		<div className="min-h-screen bg-linear-to-b from-slate-100 via-slate-50 to-white px-4 py-10 text-slate-900 sm:px-6 lg:px-8">
			<div className="mx-auto w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
				<div className="grid min-h-155 lg:grid-cols-2">
					<section className="auth-gradient relative px-8 py-10 text-white sm:px-10 sm:py-12">
						<Link to="/" className="inline-flex items-center gap-3">
							<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-lg font-bold">
								H
							</div>
							<div>
								<p className="text-lg font-semibold">HealthMate</p>
								<p className="text-xs text-blue-100">Smart Healthcare Platform</p>
							</div>
						</Link>

						<div className="mt-14 space-y-5">
							<span className="inline-flex rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-medium tracking-wide">
								Trusted Healthcare Platform
							</span>
							<h1 className="text-3xl font-bold leading-tight sm:text-4xl">
								Secure Access for Better Healthcare
							</h1>
							<p className="text-sm leading-7 text-blue-100 sm:text-base">
								Manage appointments, telemedicine sessions, digital prescriptions,
								and medical reports in one professional workflow.
							</p>
						</div>

						<div className="mt-10 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
							<div className="rounded-xl bg-white/10 p-4">JWT secured authentication</div>
							<div className="rounded-xl bg-white/10 p-4">Role-based platform access</div>
							<div className="rounded-xl bg-white/10 p-4">Modern telemedicine workflows</div>
							<div className="rounded-xl bg-white/10 p-4">Designed for MERN microservices</div>
						</div>
					</section>

					<section className="px-8 py-10 sm:px-10 sm:py-12">
						<div className="max-w-md">
							<h2 className="text-2xl font-bold text-slate-900">{title}</h2>
							<p className="mt-2 text-sm text-slate-600">{subtitle}</p>
							<div className="mt-8">{children}</div>
							<p className="mt-6 text-sm text-slate-600">
								{footerText}{" "}
								<Link className="font-semibold text-blue-700 hover:text-blue-600" to={footerLink}>
									{footerLinkText}
								</Link>
							</p>
						</div>
					</section>
				</div>
			</div>
		</div>
	);
}

export default AuthLayout;
