import { useState, useEffect } from "react";
import DashboardShell from "../../components/DashboardShell";
import { doctorAPI } from "../../api/axiosConfig";
import { Link } from "react-router-dom";

function DoctorListPage() {
	const [doctors, setDoctors] = useState([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchDoctors = async () => {
			try {
				const response = await doctorAPI.get("/");
				setDoctors(response.data);
			} catch (err) {
				console.error("Failed to load doctors:", err);
			} finally {
				setLoading(false);
			}
		};

		fetchDoctors();
	}, []);

	return (
		<DashboardShell
			role="patient"
			title="Available Doctors"
			subtitle="Select a doctor to book an appointment."
		>
			{loading ? (
				<p className="text-slate-500">Loading doctors...</p>
			) : doctors.length === 0 ? (
				<div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
					No doctors are currently available.
				</div>
			) : (
				<div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{doctors.map((doctor) => (
						<div key={doctor._id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-transform hover:-translate-y-1 hover:shadow-md flex flex-col h-full">
							<div className="flex-1">
								<h3 className="text-lg font-bold text-slate-900">{doctor.name}</h3>
								<p className="text-sm font-medium text-blue-600 mb-2">{doctor.specialty}</p>
								<div className="text-sm text-slate-600 space-y-1 mb-4">
									<p><span className="font-semibold text-slate-700">Exp:</span> {doctor.experienceYears} years</p>
									<p><span className="font-semibold text-slate-700">Fee:</span> ${doctor.consultationFee}</p>
								</div>
							</div>
							<Link 
								to={`/dashboard/patient/book/${doctor._id}`} 
								className="mt-4 block w-full rounded-xl bg-blue-50 text-blue-700 font-semibold py-2.5 text-center text-sm transition-colors hover:bg-blue-600 hover:text-white"
							>
								View & Book
							</Link>
						</div>
					))}
				</div>
			)}
		</DashboardShell>
	);
}

export default DoctorListPage;