import { useState, useEffect } from "react";
import DashboardShell from "../../components/DashboardShell";
import { appointmentAPI, doctorAPI } from "../../api/axiosConfig";
import { getStoredUser } from "../../utils/auth";
import { Link, useNavigate } from "react-router-dom";

function PatientAppointmentsPage() {
	const user = getStoredUser() || {};
	const [appointments, setAppointments] = useState([]);
	const [doctors, setDoctors] = useState({});
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchData = async () => {
			try {
				const apptRes = await appointmentAPI.get(`/patient/${user.id || user._id || "temp-patient-123"}`);
				setAppointments(apptRes.data);

				// optionally fetch doctors if we need their names
				const docRes = await doctorAPI.get("/");
				const docMap = {};
				docRes.data.forEach(d => { docMap[d._id] = d.name });
				setDoctors(docMap);
			} catch (err) {
				console.error("Failed to load appointments:", err);
			} finally {
				setLoading(false);
			}
		};

		fetchData();
	}, [user.id, user._id]);

	return (
		<DashboardShell
			role="patient"
			title="My Appointments"
			subtitle="View your past and upcoming medical appointments."
		>
			<div className="mb-6 flex justify-end">
				<Link 
					to="/dashboard/patient/book" 
					className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
				>
					+ Book New Appointment
				</Link>
			</div>

			<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
				{loading ? (
					<p className="text-slate-500">Loading appointments...</p>
				) : appointments.length === 0 ? (
					<p className="text-slate-500">You have no appointments yet.</p>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full text-left text-sm text-slate-600">
							<thead className="border-b border-slate-200 text-xs uppercase text-slate-900 bg-slate-50">
								<tr>
									<th className="p-4 rounded-tl-xl">Doctor</th>
									<th className="p-4">Date</th>
									<th className="p-4">Time</th>
									<th className="p-4">Status</th>
									<th className="p-4 rounded-tr-xl">Symptoms</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100">
								{appointments.map((appt) => (
									<tr key={appt._id} className="hover:bg-slate-50/50">
										<td className="p-4 font-medium text-slate-900">
											{doctors[appt.doctorId] || appt.doctorId}
										</td>
										<td className="p-4">{new Date(appt.date).toLocaleDateString()}</td>
										<td className="p-4">{appt.timeSlot}</td>
										<td className="p-4">
											<span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
												appt.status === "Confirmed" ? "bg-emerald-100 text-emerald-700" : 
												appt.status === "Pending" ? "bg-amber-100 text-amber-700" :
												appt.status === "Cancelled" ? "bg-rose-100 text-rose-700" :
												"bg-blue-100 text-blue-700"
											}`}>
												{appt.status}
											</span>
										</td>
										<td className="p-4 text-xs">{appt.symptoms || "-"}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>
		</DashboardShell>
	);
}

export default PatientAppointmentsPage;