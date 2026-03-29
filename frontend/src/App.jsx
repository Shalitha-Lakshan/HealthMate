import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import PatientDashboardPage from "./pages/PatientDashboardPage";
import DoctorDashboardPage from "./pages/DoctorDashboardPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import PatientAppointmentsPage from "./pages/appointments/PatientAppointmentsPage";
import DoctorListPage from "./pages/appointments/DoctorListPage";
import BookAppointmentPage from "./pages/appointments/BookAppointmentPage";
import { getDashboardPathForRole, getStoredUser } from "./utils/auth";

const ProtectedRoute = ({ children, allowedRoles }) => {
	const token = localStorage.getItem("healthmate_token");
	const user = getStoredUser();

	if (!token) {
		return <Navigate to="/login" replace />;
	}

	if (!user?.role) {
		return <Navigate to="/login" replace />;
	}

	if (allowedRoles && !allowedRoles.includes(user.role)) {
		return <Navigate to={getDashboardPathForRole(user.role)} replace />;
	}

	return children;
};

const DashboardRedirect = () => {
	const user = getStoredUser();
	if (!user?.role) {
		return <Navigate to="/login" replace />;
	}
	return <Navigate to={getDashboardPathForRole(user.role)} replace />;
};

function App() {
	return (
		<BrowserRouter>
			<Routes>
				<Route path="/" element={<LandingPage />} />
				<Route path="/login" element={<LoginPage />} />
				<Route path="/register" element={<RegisterPage />} />
				<Route
					path="/dashboard"
					element={
						<ProtectedRoute>
							<DashboardRedirect />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/dashboard/patient"
					element={
						<ProtectedRoute allowedRoles={["patient"]}>
							<PatientDashboardPage />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/dashboard/patient/appointments"
					element={
						<ProtectedRoute allowedRoles={["patient"]}>
							<PatientAppointmentsPage />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/dashboard/patient/book"
					element={
						<ProtectedRoute allowedRoles={["patient"]}>
							<DoctorListPage />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/dashboard/patient/book/:id"
					element={
						<ProtectedRoute allowedRoles={["patient"]}>
							<BookAppointmentPage />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/dashboard/doctor"
					element={
						<ProtectedRoute allowedRoles={["doctor"]}>
							<DoctorDashboardPage />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/dashboard/admin"
					element={
						<ProtectedRoute allowedRoles={["admin"]}>
							<AdminDashboardPage />
						</ProtectedRoute>
					}
				/>
				<Route path="*" element={<Navigate to="/" replace />} />
			</Routes>
		</BrowserRouter>
	);
}

export default App;
