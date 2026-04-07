import { useEffect, useMemo, useState } from "react";
import { fetchDoctorPrescriptions, issuePrescription } from "../services/prescriptionApi";

const createInitialFormState = () => ({
	diagnosis: "",
	medicationName: "",
	dosage: "",
	frequency: "",
	duration: "",
	instructions: "",
	notes: "",
});

function DoctorPrescriptionsPage({ consultation = null }) {
	const selectedPatientName = consultation?.patientName || "";
	const selectedAppointmentId = consultation?._id || consultation?.id || "";
	const isCompletedConsultation = consultation?.status === "completed";

	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const [isLoadingPrescriptions, setIsLoadingPrescriptions] = useState(false);
	const [isIssuing, setIsIssuing] = useState(false);
	const [prescriptions, setPrescriptions] = useState([]);
	const [formState, setFormState] = useState(createInitialFormState());
	const [errorMessage, setErrorMessage] = useState("");
	const [successMessage, setSuccessMessage] = useState("");

	const issuedTodayCount = useMemo(
		() =>
			prescriptions.filter((item) => {
				const issuedDate = new Date(item.issuedAt || item.createdAt || Date.now());
				const now = new Date();
				return issuedDate.toDateString() === now.toDateString();
			}).length,
		[prescriptions]
	);

	const loadPrescriptions = async () => {
		setIsLoadingPrescriptions(true);
		try {
			const response = await fetchDoctorPrescriptions();
			setPrescriptions(response.prescriptions || []);
		} catch (error) {
			setErrorMessage(error?.response?.data?.message || "Failed to load prescriptions.");
		} finally {
			setIsLoadingPrescriptions(false);
		}
	};

	useEffect(() => {
		loadPrescriptions();
	}, []);

	useEffect(() => {
		if (!successMessage && !errorMessage) {
			return;
		}

		const timeoutId = setTimeout(() => {
			setSuccessMessage("");
			setErrorMessage("");
		}, 3000);

		return () => clearTimeout(timeoutId);
	}, [successMessage, errorMessage]);

	const handleCreatePrescription = async (event) => {
		event.preventDefault();
		setErrorMessage("");
		setSuccessMessage("");

		if (!selectedAppointmentId) {
			setErrorMessage("Open prescription from a selected consultation.");
			return;
		}

		if (!isCompletedConsultation) {
			setErrorMessage("Consultation must be completed before issuing prescription.");
			return;
		}

		const diagnosis = formState.diagnosis.trim();
		if (!diagnosis) {
			setErrorMessage("Diagnosis is required.");
			return;
		}

		const medicationName = formState.medicationName.trim();
		const dosage = formState.dosage.trim();
		const frequency = formState.frequency.trim();
		if (!medicationName || !dosage || !frequency) {
			setErrorMessage("Medication name, dosage, and frequency are required.");
			return;
		}

		setIsIssuing(true);
		try {
			await issuePrescription({
				appointmentId: selectedAppointmentId,
				diagnosis,
				medications: [
					{
						name: medicationName,
						dosage,
						frequency,
						duration: formState.duration.trim(),
						instructions: formState.instructions.trim(),
					},
				],
				notes: formState.notes.trim(),
			});
			setSuccessMessage(`Prescription issued for ${selectedPatientName || "selected patient"}.`);
			setFormState(createInitialFormState());
			setIsCreateOpen(false);
			await loadPrescriptions();
		} catch (error) {
			setErrorMessage(error?.response?.data?.message || "Failed to issue prescription.");
		} finally {
			setIsIssuing(false);
		}
	};

	return (
		<div className="space-y-6">
			<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
				<h2 className="text-base font-semibold text-slate-900">Prescription Workspace</h2>
				<p className="mt-1 text-sm text-slate-600">
					Issue digital prescriptions linked to completed consultations.
				</p>
				{selectedPatientName && (
					<div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
						Issuing prescription for <span className="font-semibold">{selectedPatientName}</span>
						{selectedAppointmentId ? <span> (Appointment #{selectedAppointmentId.slice(-6)}).</span> : <span>.</span>}
					</div>
				)}
				{consultation && !isCompletedConsultation && (
					<div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
						Complete this consultation first, then issue the prescription.
					</div>
				)}
			</div>

			<div className="grid gap-4 sm:grid-cols-3">
				<div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
					<p className="text-sm font-medium text-blue-700">Issued Prescriptions</p>
					<p className="mt-2 text-2xl font-bold text-blue-900">{prescriptions.length}</p>
				</div>
				<div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
					<p className="text-sm font-medium text-emerald-700">Issued Today</p>
					<p className="mt-2 text-2xl font-bold text-emerald-900">{issuedTodayCount}</p>
				</div>
				<div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
					<p className="text-sm font-medium text-slate-600">Consultation Link</p>
					<p className="mt-2 text-2xl font-bold text-slate-900">{selectedAppointmentId ? "ON" : "OFF"}</p>
				</div>
			</div>

			<section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
				{errorMessage && (
					<div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
						{errorMessage}
					</div>
				)}

				{successMessage && (
					<div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
						{successMessage}
					</div>
				)}

				<div className="mb-4 flex items-center justify-between">
					<h3 className="text-sm font-semibold text-slate-900">Recent Prescription Activity</h3>
					<button
						onClick={() => setIsCreateOpen(true)}
						disabled={!selectedAppointmentId || !isCompletedConsultation}
						className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
					>
						Issue Prescription
					</button>
				</div>

				{isLoadingPrescriptions ? (
					<div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">Loading prescriptions...</div>
				) : prescriptions.length === 0 ? (
					<div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
						No prescriptions issued yet.
					</div>
				) : (
					<div className="space-y-3">
						{prescriptions.map((item) => (
						<div
							key={item.id || item.prescriptionId}
							className="rounded-xl border border-slate-200 bg-slate-50 p-4"
						>
							<div className="flex flex-wrap items-center justify-between gap-2">
								<div>
									<p className="text-sm font-semibold text-slate-900">{item.patientName}</p>
									<p className="text-xs text-slate-500">{item.diagnosis}</p>
									{item.appointmentId && (
										<p className="text-[11px] text-slate-500">Appointment #{String(item.appointmentId).slice(-6)}</p>
									)}
								</div>
								<div className="flex items-center gap-2">
									<span className="rounded-full bg-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700">
										{item.status || "Issued"}
									</span>
								</div>
							</div>
							<p className="mt-2 text-xs text-slate-500">Issued: {new Date(item.issuedAt || item.createdAt).toLocaleString()}</p>
							{item.notes && <p className="mt-1 text-xs text-slate-500">Notes: {item.notes}</p>}
							{Array.isArray(item.medications) && item.medications.length > 0 && (
								<div className="mt-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
									{item.medications[0].name} • {item.medications[0].dosage} • {item.medications[0].frequency}
								</div>
							)}
						</div>
						))}
					</div>
				)}
			</section>

			{isCreateOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
					<form
						onSubmit={handleCreatePrescription}
						className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
					>
						<div className="mb-4 flex items-center justify-between">
							<h3 className="text-base font-semibold text-slate-900">Issue Prescription</h3>
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
									value={selectedPatientName || "Select from consultation"}
									disabled
									className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500"
									placeholder="Patient"
								/>
								<p className="mt-1 text-[11px] text-slate-500">Patient is locked to the selected consultation.</p>
							</label>

							<label className="block">
								<span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Diagnosis</span>
								<input
									value={formState.diagnosis}
									onChange={(event) => setFormState((prev) => ({ ...prev, diagnosis: event.target.value }))}
									className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500"
									placeholder="e.g. Viral fever"
								/>
							</label>

							<div className="grid gap-3 sm:grid-cols-3">
								<label className="block sm:col-span-3">
									<span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Medication Name</span>
									<input
										value={formState.medicationName}
										onChange={(event) => setFormState((prev) => ({ ...prev, medicationName: event.target.value }))}
										className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500"
										placeholder="e.g. Paracetamol"
									/>
								</label>
								<label className="block">
									<span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Dosage</span>
									<input
										value={formState.dosage}
										onChange={(event) => setFormState((prev) => ({ ...prev, dosage: event.target.value }))}
										className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500"
										placeholder="500mg"
									/>
								</label>
								<label className="block">
									<span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Frequency</span>
									<input
										value={formState.frequency}
										onChange={(event) => setFormState((prev) => ({ ...prev, frequency: event.target.value }))}
										className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500"
										placeholder="Twice daily"
									/>
								</label>
								<label className="block">
									<span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Duration</span>
									<input
										value={formState.duration}
										onChange={(event) => setFormState((prev) => ({ ...prev, duration: event.target.value }))}
										className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500"
										placeholder="5 days"
									/>
								</label>
							</div>

							<label className="block">
								<span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Medication Instructions</span>
								<textarea
									rows={2}
									value={formState.instructions}
									onChange={(event) => setFormState((prev) => ({ ...prev, instructions: event.target.value }))}
									className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500"
									placeholder="After meals"
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
								disabled={isIssuing}
								className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
							>
								{isIssuing ? "Issuing..." : "Issue Prescription"}
							</button>
						</div>
					</form>
				</div>
			)}
		</div>
	);
}

export default DoctorPrescriptionsPage;
