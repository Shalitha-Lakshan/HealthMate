import { Link } from "react-router-dom";

function AuthLayout({ title, subtitle, children, footerText, footerLink, footerLinkText }) {
	return (
		<div className="relative min-h-screen bg-slate-100 px-4 py-10 text-slate-900 sm:px-6 lg:px-8">
			<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.16),transparent_40%)]" />
			<div className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 translate-x-20 translate-y-16 rounded-full bg-[radial-gradient(circle,rgba(148,163,184,0.22),transparent_70%)]" />
			<div className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/60">
				<div className="grid min-h-155 lg:grid-cols-2">
					<section className="auth-gradient relative flex flex-col justify-between px-8 py-10 text-white sm:px-10 sm:py-12">
						<Link to="/" className="inline-flex items-center gap-3">
							<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-lg font-bold">
								H
							</div>
							<div>
								<p className="text-lg font-semibold">HealthMate</p>
								<p className="text-[11px] uppercase tracking-[0.2em] text-blue-100">Secure Clinical Access</p>
							</div>
						</Link>

						<div className="mt-12 space-y-5">
							<span className="inline-flex w-fit rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]">
								Trusted Healthcare Platform
							</span>
							<h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
								Secure Access for Better Healthcare
							</h1>
							<p className="text-sm leading-7 text-blue-100 sm:text-base">
								Manage appointments, telemedicine sessions, digital prescriptions,
								and medical reports in one professional workflow.
							</p>
						</div>

						<div className="mt-10 grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
							<div className="rounded-xl bg-white/10 px-4 py-3 font-medium">JWT secured authentication</div>
							<div className="rounded-xl bg-white/10 px-4 py-3 font-medium">Role-based platform access</div>
							<div className="rounded-xl bg-white/10 px-4 py-3 font-medium">Telemedicine-ready workflows</div>
							<div className="rounded-xl bg-white/10 px-4 py-3 font-medium">Audit-friendly data trails</div>
						</div>

						<div className="mt-8 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-wide text-blue-100">
							<span className="rounded-full bg-white/10 px-3 py-1">ISO-ready</span>
							<span className="rounded-full bg-white/10 px-3 py-1">24/7 support</span>
							<span className="rounded-full bg-white/10 px-3 py-1">Encrypted data</span>
						</div>
					</section>

					<section className="px-8 py-10 sm:px-10 sm:py-12">
						<div className="max-w-md">
							<h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
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
