import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { loginUser } from "../services/authApi";
import { getDashboardPathForRole } from "../utils/auth";

function LoginPage() {
	const navigate = useNavigate();
	const [formData, setFormData] = useState({ email: "", password: "" });
	const [isLoading, setIsLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState("");

	const handleChange = (event) => {
		setFormData((prev) => ({ ...prev, [event.target.name]: event.target.value }));
	};

	const handleSubmit = async (event) => {
		event.preventDefault();
		setErrorMessage("");
		setIsLoading(true);

		try {
			const response = await loginUser(formData);
			localStorage.setItem("healthmate_token", response.token);
			localStorage.setItem("healthmate_user", JSON.stringify(response.user));
			navigate(getDashboardPathForRole(response.user.role));
		} catch (error) {
			setErrorMessage(error.response?.data?.message || "Unable to login. Please try again.");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<AuthLayout
			title="Welcome back"
			subtitle="Sign in to continue managing healthcare workflows"
			footerText="Don’t have an account?"
			footerLink="/register"
			footerLinkText="Create one"
		>
			<form className="space-y-4" onSubmit={handleSubmit}>
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
					<label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="password">
						Password
					</label>
					<input
						id="password"
						name="password"
						type="password"
						required
						value={formData.password}
						onChange={handleChange}
						placeholder="••••••••"
						className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
					/>
				</div>

				{errorMessage && (
					<p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
						{errorMessage}
					</p>
				)}

				<button
					type="submit"
					disabled={isLoading}
					className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
				>
					{isLoading ? "Signing in..." : "Sign In"}
				</button>
			</form>
		</AuthLayout>
	);
}

export default LoginPage;
