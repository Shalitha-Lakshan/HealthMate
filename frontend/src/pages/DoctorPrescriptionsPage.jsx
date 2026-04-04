import { useMemo, useState } from "react";

function DoctorPrescriptionsPage() {
	const createPrescriptionId = () => `rx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

	const seedPrescriptions = useMemo(
		() => [
			{ id: "seed-1", patient: "Nadeesha K.", condition: "Upper respiratory infection", updatedAt: "Today, 10:25 AM", status: "Draft" },
			{ id: "seed-2", patient: "Shenal M.", condition: "Hypertension follow-up", updatedAt: "Today, 09:40 AM", status: "Ready to issue" },
			{ id: "seed-3", patient: "Kasun P.", condition: "Lipid profile review", updatedAt: "Yesterday, 04:10 PM", status: "Issued" },
		],
		[]
	);
	const [draftPrescriptions, setDraftPrescriptions] = useState(seedPrescriptions);
	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const [formState, setFormState] = useState({ patient: "", condition: "", notes: "" });

	const handleCreatePrescription = (event) => {
		event.preventDefault();

		const patient = formState.patient.trim();
		const condition = formState.condition.trim();
		if (!patient || !condition) {
			alert("Patient name and condition are required.");
			return;
		}

		const now = new Date();
		const newDraft = {
			id: createPrescriptionId(),
			patient,
			condition,
			updatedAt: now.toLocaleString(),
			status: "Draft",
			notes: formState.notes.trim(),
		};

		setDraftPrescriptions((prev) => [newDraft, ...prev]);
		setFormState({ patient: "", condition: "", notes: "" });
		setIsCreateOpen(false);
	};

	const handleDeletePrescription = (prescriptionId) => {
		const shouldDelete = window.confirm("Delete this prescription activity item?");
		if (!shouldDelete) {
			return;
		}

		setDraftPrescriptions((prev) => prev.filter((item) => item.id !== prescriptionId));
	};

	return (
		<div className="space-y-6">
			<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
				<h2 className="text-base font-semibold text-slate-900">Prescription Workspace</h2>
				<p className="mt-1 text-sm text-slate-600">
					Manage medication drafts, review patient-specific notes, and issue digital prescriptions.
				</p>
			</div>

			<div className="grid gap-4 sm:grid-cols-3">
				<div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
					<p className="text-sm font-medium text-blue-700">Pending Drafts</p>
					<p className="mt-2 text-2xl font-bold text-blue-900">04</p>
				</div>
				<div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
					<p className="text-sm font-medium text-emerald-700">Issued Today</p>
					<p className="mt-2 text-2xl font-bold text-emerald-900">07</p>
				</div>
				<div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
					<p className="text-sm font-medium text-slate-600">Interaction Alerts</p>
					<p className="mt-2 text-2xl font-bold text-slate-900">01</p>
				</div>
			</div>

			<section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
				<div className="mb-4 flex items-center justify-between">
					<h3 className="text-sm font-semibold text-slate-900">Recent Prescription Activity</h3>
					<button
						onClick={() => setIsCreateOpen(true)}
						className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
					>
						Create New Prescription
					</button>
				</div>

				<div className="space-y-3">
					{draftPrescriptions.map((item) => (
						<div
							key={item.id}
							className="rounded-xl border border-slate-200 bg-slate-50 p-4"
						>
							<div className="flex flex-wrap items-center justify-between gap-2">
								<div>
									<p className="text-sm font-semibold text-slate-900">{item.patient}</p>
									<p className="text-xs text-slate-500">{item.condition}</p>
								</div>
								<div className="flex items-center gap-2">
									<span className="rounded-full bg-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700">
										{item.status}
									</span>
									<button
										type="button"
										onClick={() => handleDeletePrescription(item.id)}
										className="rounded-md border border-rose-200 bg-white px-2 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50"
									>
										Delete
									</button>
								</div>
							</div>
							<p className="mt-2 text-xs text-slate-500">Updated: {item.updatedAt}</p>
							{item.notes && <p className="mt-1 text-xs text-slate-500">Notes: {item.notes}</p>}
						</div>
					))}
				</div>
			</section>

			{isCreateOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
					<form
						onSubmit={handleCreatePrescription}
						className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
					>
						<div className="mb-4 flex items-center justify-between">
							<h3 className="text-base font-semibold text-slate-900">Create New Prescription</h3>
							<button
								type="button"
								onClick={() => setIsCreateOpen(false)}
								className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
							>
								Close
							</button>
						</div>

						<div className="space-y-3">
							<label className="block">
								<span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Patient Name</span>
								<input
									value={formState.patient}
									onChange={(event) => setFormState((prev) => ({ ...prev, patient: event.target.value }))}
									className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500"
									placeholder="Enter patient name"
								/>
							</label>

							<label className="block">
								<span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Condition</span>
								<input
									value={formState.condition}
									onChange={(event) => setFormState((prev) => ({ ...prev, condition: event.target.value }))}
									className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500"
									placeholder="e.g. Viral fever"
								/>
							</label>

							<label className="block">
								<span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</span>
								<textarea
									rows={3}
									value={formState.notes}
									onChange={(event) => setFormState((prev) => ({ ...prev, notes: event.target.value }))}
									className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500"
									placeholder="Optional doctor notes"
								/>
							</label>
						</div>

						<div className="mt-5 flex justify-end gap-2">
							<button
								type="button"
								onClick={() => setIsCreateOpen(false)}
								className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
							>
								Cancel
							</button>
							<button
								type="submit"
								className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
							>
								Create Draft
							</button>
						</div>
					</form>
				</div>
			)}
		</div>
	);
}

export default DoctorPrescriptionsPage;
