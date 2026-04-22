import { useEffect, useMemo, useState } from "react";
import {
	deletePrescription,
	fetchDoctorPrescriptions,
	issuePrescription,
	updatePrescription,
} from "../services/prescriptionApi";

const createMedicationEntry = () => ({
	name: "",
	dosage: "",
	frequency: "",
	duration: "",
	instructions: "",
});

const createInitialFormState = () => ({
	diagnosis: "",
	medications: [createMedicationEntry()],
	notes: "",
});

const normalizeMedications = (medications = []) =>
	medications
		.map((medication) => ({
			name: String(medication?.name || "").trim(),
			dosage: String(medication?.dosage || "").trim(),
			frequency: String(medication?.frequency || "").trim(),
			duration: String(medication?.duration || "").trim(),
			instructions: String(medication?.instructions || "").trim(),
		}))
		.filter((medication) =>
			medication.name || medication.dosage || medication.frequency || medication.duration || medication.instructions
		);

const mapPrescriptionToFormState = (prescription) => ({
	diagnosis: prescription?.diagnosis || "",
	medications:
		Array.isArray(prescription?.medications) && prescription.medications.length > 0
			? prescription.medications.map((medication) => ({
				name: medication?.name || "",
				dosage: medication?.dosage || "",
				frequency: medication?.frequency || "",
				duration: medication?.duration || "",
				instructions: medication?.instructions || "",
			}))
			: [createMedicationEntry()],
	notes: prescription?.notes || "",
});

function DoctorPrescriptionsPage({ consultation = null }) {
	const selectedPatientName = consultation?.patientName || "";
	const selectedAppointmentId = consultation?._id || consultation?.id || "";
	const isCompletedConsultation = consultation?.status === "completed";

	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const [isEditOpen, setIsEditOpen] = useState(false);
	const [editingPrescriptionId, setEditingPrescriptionId] = useState("");
	const [isLoadingPrescriptions, setIsLoadingPrescriptions] = useState(false);
	const [isIssuing, setIsIssuing] = useState(false);
	const [isUpdating, setIsUpdating] = useState(false);
	const [deletingPrescriptionId, setDeletingPrescriptionId] = useState("");
	const [prescriptions, setPrescriptions] = useState([]);
	const [formState, setFormState] = useState(createInitialFormState());
	const [editFormState, setEditFormState] = useState(createInitialFormState());
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

	const updateMedicationField = (setState, index, field, value) => {
		setState((prev) => {
			const medications = prev.medications.map((medication, medicationIndex) =>
				medicationIndex === index ? { ...medication, [field]: value } : medication
			);
			return { ...prev, medications };
		});
	};

	const addMedicationRow = (setState) => {
		setState((prev) => ({
			...prev,
			medications: [...prev.medications, createMedicationEntry()],
		}));
	};

	const removeMedicationRow = (setState, index) => {
		setState((prev) => {
			if (prev.medications.length <= 1) {
				return prev;
			}
			return {
				...prev,
				medications: prev.medications.filter((_, medicationIndex) => medicationIndex !== index),
			};
		});
	};

	const validateMedicationPayload = (rawMedications) => {
		const medications = normalizeMedications(rawMedications);
		if (medications.length === 0) {
			return { ok: false, message: "Add at least one medication.", medications: [] };
		}

		const hasInvalidMedication = medications.some((medication) => !medication.name || !medication.dosage || !medication.frequency);
		if (hasInvalidMedication) {
			return {
				ok: false,
				message: "Each medication needs name, dosage, and frequency.",
				medications,
			};
		}

		return { ok: true, medications };
	};

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

		const validation = validateMedicationPayload(formState.medications);
		if (!validation.ok) {
			setErrorMessage(validation.message);
			return;
		}

		setIsIssuing(true);
		try {
			await issuePrescription({
				appointmentId: selectedAppointmentId,
				diagnosis,
				medications: validation.medications,
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

	const openEditModal = (prescription) => {
		setEditingPrescriptionId(String(prescription.id || ""));
		setEditFormState(mapPrescriptionToFormState(prescription));
		setErrorMessage("");
		setSuccessMessage("");
		setIsEditOpen(true);
	};

	const handleUpdatePrescription = async (event) => {
		event.preventDefault();
		setErrorMessage("");
		setSuccessMessage("");

		if (!editingPrescriptionId) {
			setErrorMessage("Invalid prescription selected for edit.");
			return;
		}

		const diagnosis = editFormState.diagnosis.trim();
		if (!diagnosis) {
			setErrorMessage("Diagnosis is required.");
			return;
		}

		const validation = validateMedicationPayload(editFormState.medications);
		if (!validation.ok) {
			setErrorMessage(validation.message);
			return;
		}

		setIsUpdating(true);
		try {
			await updatePrescription(editingPrescriptionId, {
				diagnosis,
				medications: validation.medications,
				notes: editFormState.notes.trim(),
			});

			setSuccessMessage("Prescription updated successfully.");
			setIsEditOpen(false);
			setEditingPrescriptionId("");
			setEditFormState(createInitialFormState());
			await loadPrescriptions();
		} catch (error) {
			setErrorMessage(error?.response?.data?.message || "Failed to update prescription.");
		} finally {
			setIsUpdating(false);
		}
	};

	const handleDeletePrescription = async (prescription) => {
		const prescriptionId = String(prescription?.id || "");
		if (!prescriptionId) {
			setErrorMessage("Invalid prescription selected for deletion.");
			return;
		}

		const shouldDelete = window.confirm(
			`Delete prescription ${prescription.prescriptionId || ""} for ${prescription.patientName || "this patient"}?`
		);
		if (!shouldDelete) {
			return;
		}

		setErrorMessage("");
		setSuccessMessage("");
		setDeletingPrescriptionId(prescriptionId);
		try {
			await deletePrescription(prescriptionId);
			setSuccessMessage("Prescription deleted successfully.");
			await loadPrescriptions();
		} catch (error) {
			setErrorMessage(error?.response?.data?.message || "Failed to delete prescription.");
		} finally {
			setDeletingPrescriptionId("");
		}
	};

	const renderMedicationRows = ({ medications, onChange, onAdd, onRemove }) => (
		<div className="space-y-3">
			<div className="flex items-center justify-between">
				<span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Medications</span>
				<button
					type="button"
					onClick={onAdd}
					className="rounded-lg border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
				>
					Add Medication
				</button>
			</div>

			{medications.map((medication, index) => (
				<div key={`medication-${index}`} className="rounded-xl border border-slate-200 p-3">
					<div className="mb-2 flex items-center justify-between">
						<p className="text-xs font-semibold text-slate-700">Medication {index + 1}</p>
						<button
							type="button"
							onClick={() => onRemove(index)}
							disabled={medications.length <= 1}
							className="rounded-lg border border-rose-300 px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
						>
							Remove
						</button>
					</div>

					<div className="grid gap-3 sm:grid-cols-3">
						<label className="block sm:col-span-3">
							<span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Medication Name</span>
							<input
								value={medication.name}
								onChange={(event) => onChange(index, "name", event.target.value)}
								className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500"
								placeholder="e.g. Paracetamol"
							/>
						</label>
						<label className="block">
							<span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Dosage</span>
							<input
								value={medication.dosage}
								onChange={(event) => onChange(index, "dosage", event.target.value)}
								className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500"
								placeholder="500mg"
							/>
						</label>
						<label className="block">
							<span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Frequency</span>
							<input
								value={medication.frequency}
								onChange={(event) => onChange(index, "frequency", event.target.value)}
								className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500"
								placeholder="Twice daily"
							/>
						</label>
						<label className="block">
							<span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Duration</span>
							<input
								value={medication.duration}
								onChange={(event) => onChange(index, "duration", event.target.value)}
								className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500"
								placeholder="5 days"
							/>
						</label>
					</div>

					<label className="mt-3 block">
						<span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Medication Instructions</span>
						<textarea
							rows={2}
							value={medication.instructions}
							onChange={(event) => onChange(index, "instructions", event.target.value)}
							className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500"
							placeholder="After meals"
						/>
					</label>
				</div>
			))}
		</div>
	);

	return (
		<div className="space-y-6">
			<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
				<h2 className="text-base font-semibold text-slate-900">Prescription Workspace</h2>
				<p className="mt-1 text-sm text-slate-600">Issue digital prescriptions linked to completed consultations.</p>
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
						type="button"
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
						{prescriptions.map((item) => {
							const id = item.id || item.prescriptionId;
							return (
								<div key={id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
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
											<button
												type="button"
												onClick={() => openEditModal(item)}
												className="rounded-lg border border-blue-300 px-2 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-50"
											>
												Edit
											</button>
											<button
												type="button"
												onClick={() => handleDeletePrescription(item)}
												disabled={deletingPrescriptionId === String(item.id || "")}
												className="rounded-lg border border-rose-300 px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
											>
												{deletingPrescriptionId === String(item.id || "") ? "Deleting..." : "Delete"}
											</button>
										</div>
									</div>
									<p className="mt-2 text-xs text-slate-500">
										Issued: {new Date(item.issuedAt || item.createdAt).toLocaleString()}
									</p>
									{item.notes && <p className="mt-1 text-xs text-slate-500">Notes: {item.notes}</p>}
									{Array.isArray(item.medications) && item.medications.length > 0 && (
										<div className="mt-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
											{item.medications.map((medication, index) => (
												<p key={`${id}-medication-${index}`} className={index > 0 ? "mt-1" : ""}>
													{medication.name} • {medication.dosage} • {medication.frequency}
													{medication.duration ? ` • ${medication.duration}` : ""}
													{medication.instructions ? ` • ${medication.instructions}` : ""}
												</p>
											))}
										</div>
									)}
								</div>
							);
						})}
					</div>
				)}
			</section>

			{isCreateOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
					<form onSubmit={handleCreatePrescription} className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
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

						<div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
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

							{renderMedicationRows({
								medications: formState.medications,
								onChange: (index, field, value) => updateMedicationField(setFormState, index, field, value),
								onAdd: () => addMedicationRow(setFormState),
								onRemove: (index) => removeMedicationRow(setFormState, index),
							})}

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

			{isEditOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
					<form onSubmit={handleUpdatePrescription} className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
						<div className="mb-4 flex items-center justify-between">
							<h3 className="text-base font-semibold text-slate-900">Edit Prescription</h3>
							<button
								type="button"
								onClick={() => {
									setIsEditOpen(false);
									setEditingPrescriptionId("");
								}}
								className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
							>
								Close
							</button>
						</div>

						<div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
							<label className="block">
								<span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Diagnosis</span>
								<input
									value={editFormState.diagnosis}
									onChange={(event) => setEditFormState((prev) => ({ ...prev, diagnosis: event.target.value }))}
									className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500"
									placeholder="e.g. Viral fever"
								/>
							</label>

							{renderMedicationRows({
								medications: editFormState.medications,
								onChange: (index, field, value) => updateMedicationField(setEditFormState, index, field, value),
								onAdd: () => addMedicationRow(setEditFormState),
								onRemove: (index) => removeMedicationRow(setEditFormState, index),
							})}

							<label className="block">
								<span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</span>
								<textarea
									rows={3}
									value={editFormState.notes}
									onChange={(event) => setEditFormState((prev) => ({ ...prev, notes: event.target.value }))}
									className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500"
									placeholder="Optional doctor notes"
								/>
							</label>
						</div>

						<div className="mt-5 flex justify-end gap-2">
							<button
								type="button"
								onClick={() => {
									setIsEditOpen(false);
									setEditingPrescriptionId("");
								}}
								className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
							>
								Cancel
							</button>
							<button
								type="submit"
								disabled={isUpdating}
								className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
							>
								{isUpdating ? "Saving..." : "Save Changes"}
							</button>
						</div>
					</form>
				</div>
			)}
		</div>
	);
}

export default DoctorPrescriptionsPage;
