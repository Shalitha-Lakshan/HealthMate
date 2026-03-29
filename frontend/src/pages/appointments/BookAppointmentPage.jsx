import { useState, useEffect } from "react";
import DashboardShell from "../../components/DashboardShell";
import { doctorAPI, appointmentAPI } from "../../api/axiosConfig";
import { useParams, useNavigate } from "react-router-dom";
import { getStoredUser } from "../../utils/auth";

function BookAppointmentPage() {
	const { id } = useParams();
	const navigate = useNavigate();
	const user = getStoredUser() || {};
	
	const [doctor, setDoctor] = useState(null);
	const [loading, setLoading] = useState(true);
	
	const [selectedDate, setSelectedDate] = useState("");
	const [selectedSlot, setSelectedSlot] = useState("");
	const [symptoms, setSymptoms] = useState("");
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		const fetchDoctor = async () => {
			try {
				const response = await doctorAPI.get(`/${id}`);
				setDoctor(response.data);
			} catch (err) {
				console.error("Failed to load doctor:", err);
			} finally {
				setLoading(false);
			}
		};

		if (id) fetchDoctor();
	}, [id]);

	const handleBooking = async (e) => {
		e.preventDefault();
		if (!selectedDate || !selectedSlot) {
			alert("Please select a date and time slot.");
			return;
		}

		setSubmitting(true);
		try {
			await appointmentAPI.post("/", {
				patientId: user.id || user._id || "temp-patient-123",
				doctorId: doctor._id,
				date: selectedDate,
				timeSlot: selectedSlot,
				symptoms: symptoms,
			});
			// Success
			navigate("/dashboard/patient/appointments");
		} catch (error) {
			console.error("Booking error:", error);
			alert("Failed to book appointment. Please try again.");
		} finally {
			setSubmitting(false);
		}
	};

	if (loading) {
		return (
			<DashboardShell role="patient" title="Book Appointment">
				<p className="text-slate-500">Loading doctor details...</p>
			</DashboardShell>
		);
	}

	if (!doctor) {
		return (
			<DashboardShell role="patient" title="Book Appointment">
				<p className="text-rose-500">Doctor not found.</p>
			</DashboardShell>
		);
	}

	return (
		<DashboardShell
			role="patient"
			title={`Book with ${doctor.name}`}
			subtitle={`Specialty: ${doctor.specialty} | Fee: $${doctor.consultationFee}`}
		>
			<div className="mx-auto max-w-2xl">
				<div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
					<h3 className="mb-2 text-sm font-bold text-slate-900 uppercase tracking-wide">Doctor Profile</h3>
					<p className="text-sm text-slate-600 mb-4">{doctor.bio || "No bio provided."}</p>
					<div className="flex gap-4 text-sm">
						<span className="rounded bg-slate-100 px-2 py-1 font-medium text-slate-700">Exp: {doctor.experienceYears}y</span>
						{doctor.qualifications?.map((q, idx) => (
							<span key={idx} className="rounded bg-blue-50 px-2 py-1 font-medium text-blue-700">{q}</span>
						))}
					</div>
				</div>

				<form onSubmit={handleBooking} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
					<h3 className="mb-4 text-sm font-bold text-slate-900 uppercase tracking-wide">Booking Details</h3>
					
					<div className="space-y-4">
						<div>
							<label className="mb-1 block text-sm font-medium text-slate-700">Appointment Date <span className="text-rose-500">*</span></label>
							<input
								type="date"
								required
								value={selectedDate}
								onChange={(e) => setSelectedDate(e.target.value)}
								className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
							/>
						</div>

						<div>
							<label className="mb-1 block text-sm font-medium text-slate-700">Time Slot <span className="text-rose-500">*</span></label>
							<select
								required
								value={selectedSlot}
								onChange={(e) => setSelectedSlot(e.target.value)}
								className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
							>
								<option value="" disabled>-- Select a Slot --</option>
								{doctor.availableSlots?.map((slot, index) => (
									<option key={index} value={`${slot.dayOfWeek} ${slot.startTime}-${slot.endTime}`}>
										{slot.dayOfWeek}: {slot.startTime} - {slot.endTime}
									</option>
								))}
							</select>
						</div>

						<div>
							<label className="mb-1 block text-sm font-medium text-slate-700">Symptoms / Notes</label>
							<textarea
								rows="3"
								placeholder="Briefly describe your reason for visit..."
								value={symptoms}
								onChange={(e) => setSymptoms(e.target.value)}
								className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
							></textarea>
						</div>
					</div>

					<div className="mt-8 flex gap-3">
						<button
							type="submit"
							disabled={submitting}
							className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:bg-blue-300"
						>
							{submitting ? "Confirming..." : "Confirm Appointment"}
						</button>
						<button
							type="button"
							onClick={() => navigate("/dashboard/patient/book")}
							className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
						>
							Cancel
						</button>
					</div>
				</form>
			</div>
		</DashboardShell>
	);
}

export default BookAppointmentPage;