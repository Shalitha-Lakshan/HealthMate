import { useEffect, useMemo, useState } from "react";
import DashboardShell from "../components/DashboardShell";
import { getStoredUser } from "../utils/auth";
import {
	createAdminUser,
	deleteAdminUser,
	fetchAdminOverview,
	fetchAdminUsers,
	fetchAuditLogs,
	fetchDoctorVerificationQueue,
	updateAdminUser,
	updateDoctorVerificationStatus,
	updateUserStatus,
} from "../services/adminApi";

const formatDateTime = (value) => {
	if (!value) {
		return "N/A";
	}

	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) {
		return value;
	}

	return new Intl.DateTimeFormat("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	}).format(parsed);
};

const verificationBadgeClass = (status) => {
	if (status === "approved") {
		return "bg-emerald-100 text-emerald-700";
	}

	if (status === "rejected") {
		return "bg-rose-100 text-rose-700";
	}

	return "bg-amber-100 text-amber-700";
};

const accountStatusClass = (status) => {
	if (status === "active") {
		return "bg-emerald-100 text-emerald-700";
	}

	if (status === "suspended") {
		return "bg-amber-100 text-amber-700";
	}

	return "bg-slate-200 text-slate-700";
};

function AdminDashboardPage() {
	const user = getStoredUser() || {};
	const initialUserForm = {
		name: "",
		email: "",
		phoneNumber: "",
		password: "",
		role: "patient",
		specialization: "",
		slmcRegistrationNumber: "",
		yearsOfExperience: "",
	};
	const defaultUserFilters = {
		search: "",
		role: "",
		accountStatus: "",
	};

	const [activeMenuItem, setActiveMenuItem] = useState("Overview");
	const [stats, setStats] = useState(null);
	const [recentUsers, setRecentUsers] = useState([]);
	const [users, setUsers] = useState([]);
	const [userPagination, setUserPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
	const [auditLogs, setAuditLogs] = useState([]);
	const [verificationQueue, setVerificationQueue] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [actionLoadingId, setActionLoadingId] = useState("");
	const [errorMessage, setErrorMessage] = useState("");
	const [successMessage, setSuccessMessage] = useState("");
	const [userFilters, setUserFilters] = useState(defaultUserFilters);
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const [isEditModalOpen, setIsEditModalOpen] = useState(false);
	const [deleteTarget, setDeleteTarget] = useState(null);
	const [createUserForm, setCreateUserForm] = useState(initialUserForm);
	const [editUserForm, setEditUserForm] = useState({ ...initialUserForm, id: "" });

	const adminStats = useMemo(
		() => [
			{ label: "Total Users", value: stats?.totalUsers ?? 0, meta: "All registered accounts" },
			{ label: "Patients", value: stats?.totalPatients ?? 0, meta: "Patient accounts" },
			{ label: "Doctors", value: stats?.totalDoctors ?? 0, meta: "Doctor accounts" },
			{ label: "Pending Verifications", value: stats?.pendingVerifications ?? 0, meta: "Awaiting admin review" },
		],
		[stats]
	);

	const hasActiveUserFilters = useMemo(
		() => Boolean(userFilters.search.trim() || userFilters.role || userFilters.accountStatus),
		[userFilters]
	);

	const loadAdminData = async () => {
		setErrorMessage("");
		setIsLoading(true);

		try {
			const [overviewResponse, usersResponse, queueResponse] = await Promise.all([
				fetchAdminOverview(),
				fetchAdminUsers(),
				fetchDoctorVerificationQueue(),
			]);

			setStats(overviewResponse.stats || null);
			setRecentUsers(overviewResponse.recentUsers || []);
			setUsers(usersResponse.users || []);
			setVerificationQueue(queueResponse.doctors || []);
		} catch (error) {
			setErrorMessage(error.response?.data?.message || "Failed to load admin dashboard data.");
		} finally {
			setIsLoading(false);
		}
	};

	const loadUsers = async (page = 1, overrides = {}) => {
		setErrorMessage("");
		try {
			const params = {
				page,
				limit: userPagination.limit,
				search: (overrides.search ?? userFilters.search).trim(),
				role: overrides.role ?? userFilters.role,
				accountStatus: overrides.accountStatus ?? userFilters.accountStatus,
			};

			const usersResponse = await fetchAdminUsers(params);
			setUsers(usersResponse.users || []);
			setUserPagination(usersResponse.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 });
		} catch (error) {
			setErrorMessage(error.response?.data?.message || "Failed to load users.");
		}
	};

	const handleApplyUserFilters = async () => {
		await loadUsers(1, { search: userFilters.search.trim() });
	};

	const handleClearUserFilters = async () => {
		setUserFilters(defaultUserFilters);
		await loadUsers(1, defaultUserFilters);
	};

	const loadAuditLogs = async () => {
		try {
			const response = await fetchAuditLogs({ page: 1, limit: 10 });
			setAuditLogs(response.logs || []);
		} catch {
			setAuditLogs([]);
		}
	};

	useEffect(() => {
		loadAdminData();
		loadAuditLogs();
	}, []);

	useEffect(() => {
		if (activeMenuItem === "User Management") {
			loadUsers(1);
		}
	}, [activeMenuItem]);

	useEffect(() => {
		if (activeMenuItem !== "User Management") {
			return undefined;
		}

		const debounceTimer = setTimeout(() => {
			loadUsers(1, { search: userFilters.search.trim() });
		}, 400);

		return () => clearTimeout(debounceTimer);
	}, [activeMenuItem, userFilters.search]);

	const handleVerificationAction = async (doctorId, status) => {
		setErrorMessage("");
		setSuccessMessage("");
		setActionLoadingId(doctorId);

		try {
			await updateDoctorVerificationStatus(doctorId, { status });
			setSuccessMessage(`Doctor ${status} successfully.`);
			await loadAdminData();
		} catch (error) {
			setErrorMessage(error.response?.data?.message || "Failed to update verification status.");
		} finally {
			setActionLoadingId("");
		}
	};

	const handleUserStatusAction = async (targetUserId, status) => {
		setErrorMessage("");
		setSuccessMessage("");
		setActionLoadingId(targetUserId);

		try {
			await updateUserStatus(targetUserId, { status });
			setSuccessMessage(`User marked as ${status}.`);
			await Promise.all([
				loadUsers(userPagination.page),
				loadAdminData(),
				loadAuditLogs(),
			]);
		} catch (error) {
			setErrorMessage(error.response?.data?.message || "Failed to update user status.");
		} finally {
			setActionLoadingId("");
		}
	};

	const handleCreateUser = async (event) => {
		event.preventDefault();
		setErrorMessage("");
		setSuccessMessage("");
		setActionLoadingId("create-user");

		try {
			const payload = {
				name: createUserForm.name,
				email: createUserForm.email,
				phoneNumber: createUserForm.phoneNumber,
				password: createUserForm.password,
				role: createUserForm.role,
			};

			if (createUserForm.role === "doctor") {
				payload.doctorProfile = {
					specialization: createUserForm.specialization,
					slmcRegistrationNumber: createUserForm.slmcRegistrationNumber,
					yearsOfExperience: Number(createUserForm.yearsOfExperience),
				};
			}

			await createAdminUser(payload);
			setSuccessMessage("User created successfully.");
			setCreateUserForm(initialUserForm);
			setIsCreateModalOpen(false);
			await Promise.all([loadUsers(1), loadAdminData(), loadAuditLogs()]);
		} catch (error) {
			setErrorMessage(error.response?.data?.message || "Failed to create user.");
		} finally {
			setActionLoadingId("");
		}
	};

	const openEditModal = (selectedUser) => {
		setEditUserForm({
			id: selectedUser.id,
			name: selectedUser.name || "",
			email: selectedUser.email || "",
			phoneNumber: selectedUser.phoneNumber || "",
			password: "",
			role: selectedUser.role || "patient",
			specialization: selectedUser.doctorProfile?.specialization || "",
			slmcRegistrationNumber: selectedUser.doctorProfile?.slmcRegistrationNumber || "",
			yearsOfExperience:
				selectedUser.doctorProfile?.yearsOfExperience === null || selectedUser.doctorProfile?.yearsOfExperience === undefined
					? ""
					: String(selectedUser.doctorProfile.yearsOfExperience),
		});
		setIsEditModalOpen(true);
	};

	const handleEditUser = async (event) => {
		event.preventDefault();
		setErrorMessage("");
		setSuccessMessage("");
		setActionLoadingId("edit-user");

		try {
			const payload = {
				name: editUserForm.name,
				email: editUserForm.email,
				phoneNumber: editUserForm.phoneNumber,
				role: editUserForm.role,
			};

			if (editUserForm.role === "doctor") {
				payload.doctorProfile = {
					specialization: editUserForm.specialization,
					slmcRegistrationNumber: editUserForm.slmcRegistrationNumber,
					yearsOfExperience: Number(editUserForm.yearsOfExperience),
				};
			}

			await updateAdminUser(editUserForm.id, payload);
			setSuccessMessage("User updated successfully.");
			setIsEditModalOpen(false);
			setEditUserForm({ ...initialUserForm, id: "" });
			await Promise.all([loadUsers(userPagination.page), loadAdminData(), loadAuditLogs()]);
		} catch (error) {
			setErrorMessage(error.response?.data?.message || "Failed to update user.");
		} finally {
			setActionLoadingId("");
		}
	};

	const handleDeleteUser = async () => {
		if (!deleteTarget?.id) {
			return;
		}

		setErrorMessage("");
		setSuccessMessage("");
		setActionLoadingId(deleteTarget.id);

		try {
			await deleteAdminUser(deleteTarget.id);
			setSuccessMessage("User deleted successfully.");
			setDeleteTarget(null);
			await Promise.all([loadUsers(userPagination.page), loadAdminData(), loadAuditLogs()]);
		} catch (error) {
			setErrorMessage(error.response?.data?.message || "Failed to delete user.");
		} finally {
			setActionLoadingId("");
		}
	};

	const renderOverview = () => (
		<div className="mt-5 grid gap-5 lg:grid-cols-[1.35fr_1fr]">
			<section className="rounded-2xl border border-slate-200 bg-white p-5">
				<div className="mb-4 flex items-center justify-between">
					<h2 className="text-sm font-semibold text-slate-900">Doctor Verification Queue</h2>
					<span className="text-xs font-semibold text-slate-500">{verificationQueue.length} pending</span>
				</div>
				<div className="space-y-3">
					{verificationQueue.length === 0 ? (
						<p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
							No pending doctor verifications.
						</p>
					) : (
						verificationQueue.slice(0, 5).map((item) => (
							<div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
								<div className="flex items-center justify-between gap-3">
									<div>
										<p className="text-sm font-semibold text-slate-900">{item.name}</p>
										<p className="text-xs text-slate-500">{item.doctorProfile?.specialization || "General"}</p>
									</div>
									<span className="rounded-lg bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-700">
										Pending
									</span>
								</div>
								<p className="mt-2 text-xs text-slate-500">Submitted: {formatDateTime(item.createdAt)}</p>
							</div>
						))
					)}
				</div>
			</section>

			<section className="space-y-5">
				<div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
					<h3 className="text-sm font-semibold text-slate-900">User Distribution</h3>
					<ul className="mt-3 space-y-2 text-sm text-slate-700">
						<li className="flex items-center justify-between"><span>Admins</span><span>{stats?.totalAdmins ?? 0}</span></li>
						<li className="flex items-center justify-between"><span>Doctors</span><span>{stats?.totalDoctors ?? 0}</span></li>
						<li className="flex items-center justify-between"><span>Patients</span><span>{stats?.totalPatients ?? 0}</span></li>
					</ul>
				</div>

				<div className="rounded-2xl border border-violet-200 bg-violet-50 p-5">
					<h3 className="text-sm font-semibold text-violet-900">Admin Actions</h3>
					<ul className="mt-3 space-y-2 text-sm text-violet-800">
						<li>• Verify pending doctor applications</li>
						<li>• Monitor newly registered users</li>
						<li>• Review account role distribution</li>
					</ul>
				</div>
			</section>
		</div>
	);

	const renderUserManagement = () => (
		<section className="rounded-2xl border border-slate-200 bg-white p-5">
			<div className="mb-4 flex items-center justify-between">
				<h2 className="text-sm font-semibold text-slate-900">User Management</h2>
				<div className="flex items-center gap-3">
					<span className="text-xs font-semibold text-slate-500">{userPagination.total} users</span>
					<button
						type="button"
						onClick={() => {
							setCreateUserForm(initialUserForm);
							setIsCreateModalOpen(true);
						}}
						className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
					>
						Create User
					</button>
				</div>
			</div>
			<form
				onSubmit={(event) => {
					event.preventDefault();
					handleApplyUserFilters();
				}}
				className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4"
			>
				<div className="mb-3 flex items-center justify-between">
					<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Filter Users</p>
					{hasActiveUserFilters && (
						<button
							type="button"
							onClick={handleClearUserFilters}
							className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700"
						>
							Clear All
						</button>
					)}
				</div>

				<div className="grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr_auto]">
					<input
						type="text"
						value={userFilters.search}
						onChange={(event) => setUserFilters((prev) => ({ ...prev, search: event.target.value }))}
						placeholder="Search by name, email, or phone"
						className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
					/>
					<select
						value={userFilters.role}
						onChange={(event) => setUserFilters((prev) => ({ ...prev, role: event.target.value }))}
						className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
					>
						<option value="">All roles</option>
						<option value="patient">Patients</option>
						<option value="doctor">Doctors</option>
						<option value="admin">Admins</option>
					</select>
					<select
						value={userFilters.accountStatus}
						onChange={(event) => setUserFilters((prev) => ({ ...prev, accountStatus: event.target.value }))}
						className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
					>
						<option value="">All statuses</option>
						<option value="active">Active</option>
						<option value="suspended">Suspended</option>
						<option value="deactivated">Deactivated</option>
					</select>
					<button type="submit" className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
						Apply
					</button>
				</div>

				{hasActiveUserFilters && (
					<div className="mt-3 flex flex-wrap items-center gap-2">
						<span className="text-xs text-slate-500">Active filters:</span>
						{userFilters.search.trim() && (
							<span className="rounded-lg bg-white px-2 py-1 text-xs font-semibold text-slate-700">Search: {userFilters.search.trim()}</span>
						)}
						{userFilters.role && (
							<span className="rounded-lg bg-white px-2 py-1 text-xs font-semibold text-slate-700">Role: {userFilters.role}</span>
						)}
						{userFilters.accountStatus && (
							<span className="rounded-lg bg-white px-2 py-1 text-xs font-semibold text-slate-700">Status: {userFilters.accountStatus}</span>
						)}
					</div>
				)}
			</form>
			<div className="overflow-x-auto">
				<table className="min-w-full text-left text-sm">
					<thead>
						<tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
							<th className="pb-2 pr-4">Name</th>
							<th className="pb-2 pr-4">Role</th>
							<th className="pb-2 pr-4">Email</th>
							<th className="pb-2 pr-4">Account</th>
							<th className="pb-2 pr-4">Verification</th>
							<th className="pb-2 pr-4">Actions</th>
							<th className="pb-2">Joined</th>
						</tr>
					</thead>
					<tbody>
						{users.map((item) => (
							<tr key={item.id} className="border-b border-slate-100 align-top text-slate-700">
								<td className="py-3 pr-4 font-medium text-slate-900">{item.name}</td>
								<td className="py-3 pr-4 capitalize">{item.role}</td>
								<td className="py-3 pr-4">{item.email}</td>
								<td className="py-3 pr-4">
									<span className={`rounded-lg px-2 py-1 text-[11px] font-semibold ${accountStatusClass(item.accountStatus || "active")}`}>
										{item.accountStatus || "active"}
									</span>
								</td>
								<td className="py-3 pr-4">
									{item.role === "doctor" ? (
										<span
											className={`rounded-lg px-2 py-1 text-[11px] font-semibold ${verificationBadgeClass(
												item.doctorProfile?.verificationStatus
											)}`}
										>
											{item.doctorProfile?.verificationStatus || "pending"}
										</span>
									) : (
										<span className="text-xs text-slate-500">N/A</span>
									)}
								</td>
								<td className="py-3 pr-4">
									{item.role === "admin" ? (
										<span className="text-xs text-slate-500">Protected</span>
									) : (
										<div className="flex gap-2">
											<button
												type="button"
												onClick={() => openEditModal(item)}
												disabled={actionLoadingId === item.id}
												className="rounded-lg border border-blue-300 px-2 py-1 text-[11px] font-semibold text-blue-700 disabled:opacity-60"
											>
												Edit
											</button>
											<button
												type="button"
												onClick={() => setDeleteTarget({ id: item.id, name: item.name })}
												disabled={actionLoadingId === item.id}
												className="rounded-lg border border-rose-300 px-2 py-1 text-[11px] font-semibold text-rose-700 disabled:opacity-60"
											>
												Delete
											</button>
											<button
												type="button"
												onClick={() => handleUserStatusAction(item.id, "active")}
												disabled={actionLoadingId === item.id}
												className="rounded-lg border border-emerald-300 px-2 py-1 text-[11px] font-semibold text-emerald-700 disabled:opacity-60"
											>
												Activate
											</button>
											<button
												type="button"
												onClick={() => handleUserStatusAction(item.id, "suspended")}
												disabled={actionLoadingId === item.id}
												className="rounded-lg border border-amber-300 px-2 py-1 text-[11px] font-semibold text-amber-700 disabled:opacity-60"
											>
												Suspend
											</button>
										</div>
									)}
								</td>
								<td className="py-3">{formatDateTime(item.createdAt)}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
			<div className="mt-4 flex items-center justify-between">
				<p className="text-xs text-slate-500">
					Page {userPagination.page} of {userPagination.totalPages}
				</p>
				<div className="flex gap-2">
					<button
						type="button"
						onClick={() => loadUsers(Math.max(userPagination.page - 1, 1))}
						disabled={userPagination.page <= 1}
						className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50"
					>
						Previous
					</button>
					<button
						type="button"
						onClick={() => loadUsers(Math.min(userPagination.page + 1, userPagination.totalPages))}
						disabled={userPagination.page >= userPagination.totalPages}
						className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50"
					>
						Next
					</button>
				</div>
			</div>
		</section>
	);

	const renderVerification = () => (
		<section className="rounded-2xl border border-slate-200 bg-white p-5">
			<div className="mb-4 flex items-center justify-between">
				<h2 className="text-sm font-semibold text-slate-900">Doctor Verification</h2>
				<span className="text-xs font-semibold text-slate-500">{verificationQueue.length} pending</span>
			</div>
			<div className="space-y-3">
				{verificationQueue.length === 0 ? (
					<p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
						No doctors pending verification.
					</p>
				) : (
					verificationQueue.map((item) => (
						<div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
							<div className="flex flex-wrap items-start justify-between gap-3">
								<div>
									<p className="text-sm font-semibold text-slate-900">{item.name}</p>
									<p className="text-xs text-slate-500">{item.email}</p>
									<p className="mt-1 text-xs text-slate-500">
										{item.doctorProfile?.specialization || "General"} • SLMC: {item.doctorProfile?.slmcRegistrationNumber || "N/A"}
									</p>
									<p className="mt-1 text-xs text-slate-500">Submitted: {formatDateTime(item.createdAt)}</p>
								</div>
								<div className="flex gap-2">
									<button
										type="button"
										onClick={() => handleVerificationAction(item.id, "approved")}
										disabled={actionLoadingId === item.id}
										className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
									>
										Approve
									</button>
									<button
										type="button"
										onClick={() => handleVerificationAction(item.id, "rejected")}
										disabled={actionLoadingId === item.id}
										className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
									>
										Reject
									</button>
								</div>
							</div>
						</div>
					))
				)}
			</div>
		</section>
	);

	const renderOperations = () => (
		<section className="rounded-2xl border border-slate-200 bg-white p-5">
			<h2 className="text-sm font-semibold text-slate-900">Recent Registrations & Audit Trail</h2>
			<p className="mt-1 text-xs text-slate-500">Latest users and recent admin actions.</p>
			<div className="mt-4 space-y-3">
				{recentUsers.length === 0 ? (
					<p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
						No recent registrations found.
					</p>
				) : (
					recentUsers.map((item) => (
						<div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
							<div className="flex items-center justify-between gap-3">
								<div>
									<p className="text-sm font-semibold text-slate-900">{item.name}</p>
									<p className="text-xs capitalize text-slate-500">{item.role}</p>
								</div>
								<p className="text-xs text-slate-500">{formatDateTime(item.createdAt)}</p>
							</div>
						</div>
					))
				)}
			</div>
			<div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
				<h3 className="text-sm font-semibold text-slate-900">Latest Admin Actions</h3>
				<div className="mt-3 space-y-2">
					{auditLogs.length === 0 ? (
						<p className="text-xs text-slate-500">No audit logs yet.</p>
					) : (
						auditLogs.map((log) => (
							<div key={log._id} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
								<p className="text-xs font-semibold text-slate-800">{log.action}</p>
								<p className="mt-1 text-xs text-slate-500">
									By {log.actorName || "Admin"} • {formatDateTime(log.createdAt)}
								</p>
							</div>
						))
					)}
				</div>
			</div>
		</section>
	);

	const renderUserModalFields = (form, setForm, includePassword) => (
		<div className="grid gap-3 md:grid-cols-2">
			<input
				type="text"
				value={form.name}
				onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
				placeholder="Full name"
				required
				className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
			/>
			<input
				type="email"
				value={form.email}
				onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
				placeholder="Email"
				required
				className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
			/>
			<input
				type="text"
				value={form.phoneNumber}
				onChange={(event) => setForm((prev) => ({ ...prev, phoneNumber: event.target.value }))}
				placeholder="Phone number"
				required
				className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
			/>
			{includePassword ? (
				<input
					type="password"
					value={form.password}
					onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
					placeholder="Temporary password"
					required
					className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
				/>
			) : (
				<div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
					Password change is not part of this form.
				</div>
			)}
			<select
				value={form.role}
				onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))}
				className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
			>
				<option value="patient">Patient</option>
				<option value="doctor">Doctor</option>
			</select>
			{form.role === "doctor" && (
				<>
					<input
						type="text"
						value={form.specialization}
						onChange={(event) => setForm((prev) => ({ ...prev, specialization: event.target.value }))}
						placeholder="Specialization"
						required
						className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
					/>
					<input
						type="text"
						value={form.slmcRegistrationNumber}
						onChange={(event) => setForm((prev) => ({ ...prev, slmcRegistrationNumber: event.target.value }))}
						placeholder="SLMC registration"
						required
						className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
					/>
					<input
						type="number"
						min="0"
						max="60"
						value={form.yearsOfExperience}
						onChange={(event) => setForm((prev) => ({ ...prev, yearsOfExperience: event.target.value }))}
						placeholder="Years of experience"
						required
						className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
					/>
				</>
			)}
		</div>
	);

	return (
		<>
			<DashboardShell
				role="admin"
				initialActiveMenuItem="Overview"
				onMenuChange={setActiveMenuItem}
				title={`Welcome, ${user.name || "Admin"}`}
				subtitle="Manage users, doctor verifications, and platform operations."
			>
			{errorMessage && (
				<div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage}</div>
			)}
			{successMessage && (
				<div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
					{successMessage}
				</div>
			)}

			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				{adminStats.map((item) => (
					<div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
						<p className="text-xs uppercase tracking-wide text-slate-500">{item.label}</p>
						<p className="mt-2 text-2xl font-bold text-slate-900">{item.value}</p>
						<p className="mt-1 text-xs text-slate-500">{item.meta}</p>
					</div>
				))}
			</div>

			{isLoading ? (
				<div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">Loading admin data...</div>
			) : (
				<>
					{activeMenuItem === "Overview" && renderOverview()}
					{activeMenuItem === "User Management" && renderUserManagement()}
					{activeMenuItem === "Doctor Verification" && renderVerification()}
					{activeMenuItem === "Operations" && renderOperations()}
				</>
			)}
			</DashboardShell>

			{isCreateModalOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
					<div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-5">
						<div className="mb-4 flex items-center justify-between">
							<h3 className="text-base font-semibold text-slate-900">Create User</h3>
							<button
								type="button"
								onClick={() => setIsCreateModalOpen(false)}
								className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700"
							>
								Close
							</button>
						</div>
						<form onSubmit={handleCreateUser} className="space-y-4">
							{renderUserModalFields(createUserForm, setCreateUserForm, true)}
							<div className="flex justify-end gap-2">
								<button
									type="button"
									onClick={() => setIsCreateModalOpen(false)}
									className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
								>
									Cancel
								</button>
								<button
									type="submit"
									disabled={actionLoadingId === "create-user"}
									className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
								>
									Create User
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{isEditModalOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
					<div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-5">
						<div className="mb-4 flex items-center justify-between">
							<h3 className="text-base font-semibold text-slate-900">Edit User</h3>
							<button
								type="button"
								onClick={() => setIsEditModalOpen(false)}
								className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700"
							>
								Close
							</button>
						</div>
						<form onSubmit={handleEditUser} className="space-y-4">
							{renderUserModalFields(editUserForm, setEditUserForm, false)}
							<div className="flex justify-end gap-2">
								<button
									type="button"
									onClick={() => setIsEditModalOpen(false)}
									className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
								>
									Cancel
								</button>
								<button
									type="submit"
									disabled={actionLoadingId === "edit-user"}
									className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
								>
									Save Changes
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{deleteTarget && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
					<div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5">
						<h3 className="text-base font-semibold text-slate-900">Delete User</h3>
						<p className="mt-2 text-sm text-slate-600">
							Are you sure you want to delete <span className="font-semibold text-slate-900">{deleteTarget.name}</span>? This action cannot be undone.
						</p>
						<div className="mt-5 flex justify-end gap-2">
							<button
								type="button"
								onClick={() => setDeleteTarget(null)}
								className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={handleDeleteUser}
								disabled={actionLoadingId === deleteTarget.id}
								className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
							>
								Delete User
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
}

export default AdminDashboardPage;
