import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { registerUser } from "../services/authApi";

function RegisterPage() {
	const navigate = useNavigate();
	const [formData, setFormData] = useState({
		name: "",
		email: "",
		phoneNumber: "",
		password: "",
		confirmPassword: "",
		role: "patient",
		specialization: "",
		slmcRegistrationNumber: "",
		yearsOfExperience: "",
	});
	const [isLoading, setIsLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState("");
	const [successMessage, setSuccessMessage] = useState("");

	const handleChange = (event) => {
		setFormData((prev) => ({ ...prev, [event.target.name]: event.target.value }));
	};

	const handleSubmit = async (event) => {
		event.preventDefault();
		setErrorMessage("");
		setSuccessMessage("");

		if (formData.password !== formData.confirmPassword) {
			setErrorMessage("Password and confirm password do not match.");
			return;
		}

		if (formData.role === "doctor") {
			if (!formData.specialization || !formData.slmcRegistrationNumber || formData.yearsOfExperience === "") {
				setErrorMessage("Please complete all doctor professional fields.");
				return;
			}
		}

		setIsLoading(true);

		try {
			const payload = {
				name: formData.name,
				email: formData.email,
				phoneNumber: formData.phoneNumber,
				password: formData.password,
				role: formData.role,
				doctorProfile:
					formData.role === "doctor"
						? {
							specialization: formData.specialization,
							slmcRegistrationNumber: formData.slmcRegistrationNumber,
							yearsOfExperience: Number(formData.yearsOfExperience),
						}
						: undefined,
			};
			await registerUser(payload);
			setSuccessMessage("Registration successful");
			setTimeout(() => {
				navigate("/login");
			}, 1200);
		} catch (error) {
			setErrorMessage(error.response?.data?.message || "Unable to register. Please try again.");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<AuthLayout
			title="Create account"
			subtitle="Register as a patient or doctor to access HealthMate"
			footerText="Already have an account?"
			footerLink="/login"
			footerLinkText="Sign in"
		>
			<form className="space-y-4" onSubmit={handleSubmit}>
				<div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-800">
					Account Setup • Step 1 of 1
				</div>

				<div>
					<label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="name">
						Full Name
					</label>
					<input
						id="name"
						name="name"
						type="text"
						required
						value={formData.name}
						onChange={handleChange}
						placeholder="John Perera"
						className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
					/>
				</div>

				<div>
					<label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="email">
						Email
					</label>
					<input
						id="email"
						name="email"
						type="email"
						required
						value={formData.email}
						onChange={handleChange}
						placeholder="you@example.com"
						className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
					/>
				</div>

				<div>
					<label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="phoneNumber">
						Phone Number
					</label>
					<input
						id="phoneNumber"
						name="phoneNumber"
						type="tel"
						required
						value={formData.phoneNumber}
						onChange={handleChange}
						placeholder="0771234567 or +94771234567"
						className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
					/>
				</div>

				<div>
					<label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="role">
						Role
					</label>
					<select
						id="role"
						name="role"
						value={formData.role}
						onChange={handleChange}
						className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
					>
						<option value="patient">Patient</option>
						<option value="doctor">Doctor</option>
					</select>
				</div>

				{formData.role === "doctor" && (
					<div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
						<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
							Doctor Professional Details
						</p>

						<div>
							<label
								className="mb-1.5 block text-sm font-medium text-slate-700"
								htmlFor="specialization"
							>
								Specialization
							</label>
							<select
								id="specialization"
								name="specialization"
								required={formData.role === "doctor"}
								value={formData.specialization}
								onChange={handleChange}
								className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
							>
								<option value="">Select specialization</option>
								<option value="General Physician">General Physician</option>
								<option value="Cardiology">Cardiology</option>
								<option value="Dermatology">Dermatology</option>
								<option value="Pediatrics">Pediatrics</option>
								<option value="Neurology">Neurology</option>
								<option value="Orthopedics">Orthopedics</option>
								<option value="Psychiatry">Psychiatry</option>
							</select>
						</div>

						<div>
							<label
								className="mb-1.5 block text-sm font-medium text-slate-700"
								htmlFor="slmcRegistrationNumber"
							>
								SLMC Registration Number
							</label>
							<input
								id="slmcRegistrationNumber"
								name="slmcRegistrationNumber"
								type="text"
								required={formData.role === "doctor"}
								value={formData.slmcRegistrationNumber}
								onChange={handleChange}
								placeholder="SLMC/12345"
								className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
							/>
						</div>

						<div>
							<label
								className="mb-1.5 block text-sm font-medium text-slate-700"
								htmlFor="yearsOfExperience"
							>
								Years of Experience
							</label>
							<input
								id="yearsOfExperience"
								name="yearsOfExperience"
								type="number"
								min="0"
								max="60"
								required={formData.role === "doctor"}
								value={formData.yearsOfExperience}
								onChange={handleChange}
								placeholder="8"
								className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
							/>
						</div>
					</div>
				)}

				<div>
					<label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="password">
						Password
					</label>
					<input
						id="password"
						name="password"
						type="password"
						required
						minLength={6}
						value={formData.password}
						onChange={handleChange}
						placeholder="Minimum 6 characters"
						className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
					/>
				</div>

				<div>
					<label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="confirmPassword">
						Confirm Password
					</label>
					<input
						id="confirmPassword"
						name="confirmPassword"
						type="password"
						required
						minLength={6}
						value={formData.confirmPassword}
						onChange={handleChange}
						placeholder="Re-enter password"
						className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
					/>
				</div>

				{errorMessage && (
					<p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
						{errorMessage}
					</p>
				)}

				{successMessage && (
					<p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
						{successMessage}
					</p>
				)}

				<button
					type="submit"
					disabled={isLoading || Boolean(successMessage)}
					className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
				>
					{isLoading ? "Creating account..." : successMessage ? "Redirecting..." : "Create Account"}
				</button>
			</form>
		</AuthLayout>
	);
}

export default RegisterPage;
