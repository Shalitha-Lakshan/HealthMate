import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardShell from "../components/DashboardShell";
import { fetchMyProfile, saveMyPatientProfile } from "../services/authApi";
import { getStoredUser, setStoredUser } from "../utils/auth";

const INITIAL_PROFILE_STATE = {
	name: "",
	phoneNumber: "",
	photoData: "",
	dateOfBirth: "",
	gender: "",
	bloodGroup: "",
	address: "",
	emergencyContactName: "",
	emergencyContactPhone: "",
};

const getTodayInputDate = () => {
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, "0");
	const day = String(now.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
};

const getMinDobInputDate = () => {
	const date = new Date();
	date.setFullYear(date.getFullYear() - 140);
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
};

function PatientProfilePage() {
	const navigate = useNavigate();
	const user = getStoredUser() || {};
	const maxDateOfBirth = getTodayInputDate();
	const minDateOfBirth = getMinDobInputDate();
	const [isLoadingProfile, setIsLoadingProfile] = useState(false);
	const [isSavingProfile, setIsSavingProfile] = useState(false);
	const [profileError, setProfileError] = useState("");
	const [profileSuccess, setProfileSuccess] = useState("");
	const [profileFormData, setProfileFormData] = useState({
		...INITIAL_PROFILE_STATE,
		name: user.name || "",
		phoneNumber: user.phoneNumber || "",
	});

	const loadProfile = async () => {
		setIsLoadingProfile(true);
		setProfileError("");

		try {
			const response = await fetchMyProfile();
			const profileUser = response.user || {};
			setStoredUser(profileUser);
			setProfileFormData({
				name: profileUser.name || "",
				phoneNumber: profileUser.phoneNumber || "",
				photoData: profileUser.patientProfile?.photoData || "",
				dateOfBirth: profileUser.patientProfile?.dateOfBirth
					? new Date(profileUser.patientProfile.dateOfBirth).toISOString().slice(0, 10)
					: "",
				gender: profileUser.patientProfile?.gender || "",
				bloodGroup: profileUser.patientProfile?.bloodGroup || "",
				address: profileUser.patientProfile?.address || "",
				emergencyContactName: profileUser.patientProfile?.emergencyContactName || "",
				emergencyContactPhone: profileUser.patientProfile?.emergencyContactPhone || "",
			});
		} catch (error) {
			setProfileError(error.response?.data?.message || "Failed to load profile.");
		} finally {
			setIsLoadingProfile(false);
		}
	};

	useEffect(() => {
		loadProfile();
	}, []);

	const handleProfileChange = (event) => {
		const { name, value } = event.target;
		setProfileFormData((prev) => ({ ...prev, [name]: value }));
		setProfileError("");
		setProfileSuccess("");
	};

	const handlePhotoChange = async (event) => {
		const file = event.target.files?.[0];
		if (!file) {
			return;
		}

		if (!file.type.startsWith("image/")) {
			setProfileError("Please choose a valid image file.");
			return;
		}

		const reader = new FileReader();
		reader.onload = () => {
			const result = typeof reader.result === "string" ? reader.result : "";
			setProfileFormData((prev) => ({ ...prev, photoData: result }));
			setProfileError("");
			setProfileSuccess("");
		};
		reader.readAsDataURL(file);
	};

	const handleProfileSave = async (event) => {
		event.preventDefault();
		setProfileError("");
		setProfileSuccess("");

		if (
			profileFormData.dateOfBirth &&
			(profileFormData.dateOfBirth < minDateOfBirth || profileFormData.dateOfBirth > maxDateOfBirth)
		) {
			setProfileError("Date of birth must be within the last 140 years and cannot be in the future.");
			return;
		}

		setIsSavingProfile(true);

		try {
			const payload = {
				name: profileFormData.name,
				phoneNumber: profileFormData.phoneNumber,
				patientProfile: {
					photoData: profileFormData.photoData || "",
					dateOfBirth: profileFormData.dateOfBirth || "",
					gender: profileFormData.gender,
					bloodGroup: profileFormData.bloodGroup,
					address: profileFormData.address,
					emergencyContactName: profileFormData.emergencyContactName,
					emergencyContactPhone: profileFormData.emergencyContactPhone,
				},
			};

			const response = await saveMyPatientProfile(payload);
			setStoredUser(response.user);
			setProfileSuccess("Profile saved successfully.");
		} catch (error) {
			setProfileError(error.response?.data?.message || "Failed to save profile.");
		} finally {
			setIsSavingProfile(false);
		}
	};

	return (
		<DashboardShell
			role="patient"
			initialActiveMenuItem="Overview"
			title="Patient Profile"
			subtitle="Manage your personal and emergency details."
		>
			<section className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-5">
				<div className="mb-4 flex items-center justify-between">
					<h2 className="text-sm font-semibold text-slate-900">Profile Details</h2>
					<button
						type="button"
						onClick={() => navigate("/dashboard/patient")}
						className="text-xs font-semibold text-blue-700"
					>
						Back to Overview
					</button>
				</div>

				<form className="space-y-3" onSubmit={handleProfileSave}>
					<div className="flex items-center gap-3">
						{profileFormData.photoData ? (
							<img
								src={profileFormData.photoData}
								alt="Patient profile"
								className="h-24 w-24 rounded-full object-cover"
							/>
						) : (
							<div className="flex h-24 w-24 items-center justify-center rounded-full bg-blue-100 text-2xl font-bold text-blue-700">
								{(profileFormData.name || "P").trim().charAt(0).toUpperCase()}
							</div>
						)}
						<div className="flex-1">
							<label className="mb-1 block text-xs font-semibold text-slate-600">Patient Photo</label>
							<input
								type="file"
								accept="image/*"
								onChange={handlePhotoChange}
								className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
							/>
						</div>
					</div>

					<div>
						<label htmlFor="name" className="mb-1 block text-xs font-semibold text-slate-600">Full Name</label>
						<input
							id="name"
							name="name"
							required
							value={profileFormData.name}
							onChange={handleProfileChange}
							placeholder="Full name"
							className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
						/>
					</div>
					<div>
						<label htmlFor="phoneNumber" className="mb-1 block text-xs font-semibold text-slate-600">Phone Number</label>
						<input
							id="phoneNumber"
							name="phoneNumber"
							required
							value={profileFormData.phoneNumber}
							onChange={handleProfileChange}
							placeholder="Phone number"
							className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
						/>
					</div>
					<div className="grid gap-3 sm:grid-cols-2">
						<div>
							<label htmlFor="dateOfBirth" className="mb-1 block text-xs font-semibold text-slate-600">Date of Birth</label>
							<input
								id="dateOfBirth"
								name="dateOfBirth"
								type="date"
								min={minDateOfBirth}
								max={maxDateOfBirth}
								value={profileFormData.dateOfBirth}
								onChange={handleProfileChange}
								className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
							/>
						</div>
						<div>
							<label htmlFor="gender" className="mb-1 block text-xs font-semibold text-slate-600">Gender</label>
							<select
								id="gender"
								name="gender"
								value={profileFormData.gender}
								onChange={handleProfileChange}
								className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
							>
								<option value="">Select gender</option>
								<option value="male">Male</option>
								<option value="female">Female</option>
								<option value="other">Other</option>
								<option value="prefer_not_to_say">Prefer not to say</option>
							</select>
						</div>
					</div>
					<div>
						<label htmlFor="bloodGroup" className="mb-1 block text-xs font-semibold text-slate-600">Blood Group</label>
						<select
							id="bloodGroup"
							name="bloodGroup"
							value={profileFormData.bloodGroup}
							onChange={handleProfileChange}
							className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
						>
							<option value="">Select blood group</option>
							<option value="A+">A+</option>
							<option value="A-">A-</option>
							<option value="B+">B+</option>
							<option value="B-">B-</option>
							<option value="AB+">AB+</option>
							<option value="AB-">AB-</option>
							<option value="O+">O+</option>
							<option value="O-">O-</option>
						</select>
					</div>
					<div>
						<label htmlFor="address" className="mb-1 block text-xs font-semibold text-slate-600">Address</label>
						<textarea
							id="address"
							name="address"
							rows={2}
							value={profileFormData.address}
							onChange={handleProfileChange}
							placeholder="Address"
							className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
						/>
					</div>
					<div className="grid gap-3 sm:grid-cols-2">
						<div>
							<label htmlFor="emergencyContactName" className="mb-1 block text-xs font-semibold text-slate-600">
								Emergency Contact Name
							</label>
							<input
								id="emergencyContactName"
								name="emergencyContactName"
								value={profileFormData.emergencyContactName}
								onChange={handleProfileChange}
								placeholder="Emergency contact name"
								className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
							/>
						</div>
						<div>
							<label htmlFor="emergencyContactPhone" className="mb-1 block text-xs font-semibold text-slate-600">
								Emergency Contact Phone
							</label>
							<input
								id="emergencyContactPhone"
								name="emergencyContactPhone"
								value={profileFormData.emergencyContactPhone}
								onChange={handleProfileChange}
								placeholder="Emergency contact phone"
								className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
							/>
						</div>
					</div>

					{isLoadingProfile && <p className="text-xs text-slate-500">Loading profile...</p>}
					{profileError && <p className="text-xs text-rose-600">{profileError}</p>}
					{profileSuccess && <p className="text-xs text-emerald-700">{profileSuccess}</p>}

					<button
						type="submit"
						disabled={isSavingProfile || isLoadingProfile}
						className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
					>
						{isSavingProfile ? "Saving..." : "Save Profile"}
					</button>
				</form>
			</section>
		</DashboardShell>
	);
}

export default PatientProfilePage;
