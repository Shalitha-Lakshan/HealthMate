import { useEffect, useMemo, useState } from "react";
import {
	createPrescription,
	fetchDoctorPrescriptions,
	finalizePrescription,
	updatePrescription,
} from "../services/prescriptionApi";
import { getCurrentUserId } from "../utils/auth";

function DoctorPrescriptionsPage() {
	const selectedConsultation = useMemo(() => {
		try {
			return JSON.parse(localStorage.getItem("doctor_selected_consultation") || "null");
		} catch (_error) {
			return null;
		}
	}, []);

	const [prescriptions, setPrescriptions] = useState([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [feedback, setFeedback] = useState({ type: "", message: "" });
	const [form, setForm] = useState({
		patientName:
			selectedConsultation?.patientName ||
			selectedConsultation?.patient?.name ||
			"",
		patientId:
			selectedConsultation?.patientId ||
			selectedConsultation?.patient?._id ||
			selectedConsultation?.patient?.id ||
			"",
		diagnosis: "",
		medicines: "",
		instructions: "",
	});

	const doctorId = useMemo(() => getCurrentUserId(), []);

	useEffect(() => {
		const loadPrescriptions = async () => {
			if (!doctorId) {
				setLoading(false);
				return;
			}

			try {
				setLoading(true);
				const data = await fetchDoctorPrescriptions(doctorId);
				setPrescriptions(data.prescriptions || []);
			} catch (error) {
				console.error("Failed to fetch prescriptions:", error);
				setFeedback({ type: "error", message: "Failed to load prescriptions." });
			} finally {
				setLoading(false);
			}
		};

		loadPrescriptions();
	}, [doctorId]);

	const handleChange = (field, value) => {
		setForm((prev) => ({ ...prev, [field]: value }));
	};

	const handleCreateDraft = async () => {
		if (!selectedConsultation?._id) {
			setFeedback({ type: "error", message: "Select a consultation before creating a prescription." });
			return;
		}

		if (!form.medicines.trim()) {
			setFeedback({ type: "error", message: "At least one medicine is required." });
			return;
		}

		try {
			setSaving(true);
			const payload = {
				appointmentId: selectedConsultation?._id,
				diagnosis: form.diagnosis.trim(),
				medications: form.medicines,
				notes: form.instructions.trim(),
			};
			const created = await createPrescription(payload);
			setPrescriptions((prev) => [created.prescription, ...prev]);
			setForm((prev) => ({ ...prev, diagnosis: "", medicines: "", instructions: "" }));
			setFeedback({ type: "success", message: "Prescription draft created." });
		} catch (error) {
			console.error("Failed to create prescription:", error);
			setFeedback({ type: "error", message: error?.response?.data?.message || "Failed to create prescription." });
		} finally {
			setSaving(false);
		}
	};

	const handleFinalize = async (id) => {
		try {
			const data = await finalizePrescription(id);
			setPrescriptions((prev) =>
				prev.map((item) => (item._id === id ? { ...item, ...data.prescription } : item))
			);
			setFeedback({ type: "success", message: "Prescription finalized." });
		} catch (error) {
			console.error("Failed to finalize prescription:", error);
			setFeedback({ type: "error", message: error?.response?.data?.message || "Failed to finalize prescription." });
		}
	};

	const handleUpdateDraft = async (item) => {
		try {
			const data = await updatePrescription(item._id, {
				diagnosis: item.diagnosis,
				medications: item.medications,
				notes: item.notes,
			});
			setPrescriptions((prev) =>
				prev.map((current) => (current._id === item._id ? { ...current, ...data.prescription } : current))
			);
			setFeedback({ type: "success", message: "Prescription draft updated." });
		} catch (error) {
			console.error("Failed to update prescription:", error);
			setFeedback({ type: "error", message: error?.response?.data?.message || "Failed to update prescription." });
		}
	};

	const handleDraftChange = (id, field, value) => {
		setPrescriptions((prev) =>
			prev.map((item) => (item._id === id ? { ...item, [field]: value } : item))
		);
	};

	const getMedicationEditorValue = (medications) => {
		if (typeof medications === "string") {
			return medications;
		}

		if (Array.isArray(medications)) {
			return medications.map((med) => med.name).join("\n");
		}

		return "";
	};

	return (
		<div className="space-y-6">
			{feedback.message && (
				<div
					className={`rounded-xl border px-4 py-3 text-sm ${
						feedback.type === "error"
							? "border-rose-200 bg-rose-50 text-rose-700"
							: "border-emerald-200 bg-emerald-50 text-emerald-700"
					}`}
				>
					{feedback.message}
				</div>
			)}

			<div className="grid gap-4 sm:grid-cols-3">
				<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
					<p className="text-sm font-medium text-slate-500">Draft Prescriptions</p>
					<p className="mt-2 text-2xl font-bold text-slate-900">
						{prescriptions.filter((item) => item.status === "draft").length}
					</p>
				</div>
				<div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
					<p className="text-sm font-medium text-emerald-700">Finalized</p>
					<p className="mt-2 text-2xl font-bold text-emerald-900">
						{prescriptions.filter((item) => item.status === "finalized").length}
					</p>
				</div>
				<div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
					<p className="text-sm font-medium text-blue-700">Linked Consultation</p>
					<p className="mt-2 text-sm font-semibold text-blue-900">
						{selectedConsultation?._id ? `#${selectedConsultation._id.slice(-6)}` : "None"}
					</p>
				</div>
			</div>

			<div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
				<section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
					<h3 className="text-base font-semibold text-slate-900">Create Prescription Draft</h3>
					<div className="mt-4 grid gap-3">
						<input
							value={form.patientName}
							onChange={(e) => handleChange("patientName", e.target.value)}
							className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
							placeholder="Patient name"
						/>
						<input
							value={form.patientId}
							onChange={(e) => handleChange("patientId", e.target.value)}
							className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
							placeholder="Patient ID"
						/>
						<input
							value={form.diagnosis}
							onChange={(e) => handleChange("diagnosis", e.target.value)}
							className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
							placeholder="Diagnosis"
						/>
						<textarea
							value={form.medicines}
							onChange={(e) => handleChange("medicines", e.target.value)}
							className="min-h-24 rounded-xl border border-slate-300 px-3 py-2 text-sm"
							placeholder="Medicines (one per line or comma separated)"
						/>
						<textarea
							value={form.instructions}
							onChange={(e) => handleChange("instructions", e.target.value)}
							className="min-h-20 rounded-xl border border-slate-300 px-3 py-2 text-sm"
							placeholder="Instructions"
						/>
						<button
							type="button"
							onClick={handleCreateDraft}
							disabled={saving}
							className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
						>
							{saving ? "Saving..." : "Save Draft"}
						</button>
					</div>
				</section>

				<section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
					<h3 className="text-base font-semibold text-slate-900">Recent Prescriptions</h3>
					<div className="mt-4 space-y-3">
						{loading ? (
							<div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
								Loading prescriptions...
							</div>
						) : prescriptions.length === 0 ? (
							<div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
								No prescriptions yet. Start from a consultation and click Issue Digital Prescription.
							</div>
						) : (
							prescriptions.map((item) => (
								<div key={item._id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
									<div className="flex items-center justify-between gap-2">
										<p className="text-sm font-semibold text-slate-900">{item.patientName}</p>
										<span
											className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
												item.status === "finalized"
													? "bg-emerald-100 text-emerald-700"
													: "bg-amber-100 text-amber-700"
											}`}
										>
											{item.status.toUpperCase()}
										</span>
									</div>
									{item.status === "draft" ? (
										<div className="mt-3 space-y-2">
											<input
												value={item.diagnosis || ""}
												onChange={(e) => handleDraftChange(item._id, "diagnosis", e.target.value)}
												className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
												placeholder="Diagnosis"
											/>
											<textarea
												value={getMedicationEditorValue(item.medications)}
												onChange={(e) => handleDraftChange(item._id, "medications", e.target.value)}
												className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
												placeholder="Medicines"
											/>
											<textarea
												value={item.notes || ""}
												onChange={(e) => handleDraftChange(item._id, "notes", e.target.value)}
												className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
												placeholder="Instructions"
											/>
										</div>
									) : (
										<>
											{item.diagnosis && <p className="mt-2 text-xs text-slate-600">Diagnosis: {item.diagnosis}</p>}
											<p className="mt-1 text-xs text-slate-600">
												Medicines: {(item.medications || []).map((med) => med.name).join(", ") || "-"}
											</p>
											{item.notes && <p className="mt-1 text-xs text-slate-600">Instructions: {item.notes}</p>}
										</>
									)}
									<div className="mt-3 flex justify-end">
										{item.status !== "finalized" && (
											<div className="flex gap-2">
												<button
													type="button"
													onClick={() => handleUpdateDraft(item)}
													className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
												>
													Update
												</button>
												<button
													type="button"
													onClick={() => handleFinalize(item._id)}
													className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
												>
													Finalize
												</button>
											</div>
										)}
									</div>
								</div>
							))
						)}
					</div>
				</section>
			</div>
		</div>
	);
}

export default DoctorPrescriptionsPage;
