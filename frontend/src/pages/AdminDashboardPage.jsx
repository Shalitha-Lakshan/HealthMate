import { useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import "jspdf/dist/jspdf.umd.min.js";
import DashboardShell from "../components/DashboardShell";
import { getStoredUser } from "../utils/auth";
import {
	createAdminUser,
	deleteAdminUser,
	fetchAdminOverview,
	fetchAdminUsers,
	fetchAuditLogs,
	fetchDoctorVerificationQueue,
	fetchPaymentOverview,
	fetchPaymentTransactions,
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

const paymentStatusClass = (status) => {
	if (status === "succeeded") {
		return "bg-emerald-100 text-emerald-700";
	}

	if (status === "failed") {
		return "bg-rose-100 text-rose-700";
	}

	return "bg-amber-100 text-amber-700";
};

const formatAmount = (amount, currency = "LKR") =>
	new Intl.NumberFormat("en-LK", {
		style: "currency",
		currency: currency || "LKR",
		maximumFractionDigits: 2,
	}).format(Number(amount || 0));

const resolveUserId = (record) => String(record?.id || record?._id || "");

const buildPdfFileName = (prefix) => {
	const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
	return `${prefix}-${timestamp}.pdf`;
};

const createPdfReport = (title, subtitle, filters, rows, columns, stats = null) => {
	const doc = new jsPDF({
		orientation: "landscape",
		unit: "mm",
		format: "a4",
	});

	const pageHeight = doc.internal.pageSize.getHeight();
	const pageWidth = doc.internal.pageSize.getWidth();
	let yPosition = 10;

	// Professional header background
	doc.setFillColor(24, 46, 112); // Deep professional blue
	doc.rect(0, 0, pageWidth, 28, "F");

	// Company name and logo area
	doc.setFontSize(16);
	doc.setTextColor(255, 255, 255);
	doc.setFont(undefined, "bold");
	doc.text("HealthMate", 15, 12);

	doc.setFontSize(9);
	doc.setTextColor(220, 220, 220);
	doc.setFont(undefined, "normal");
	doc.text("Administrative Report", 15, 18);

	// Report date on right
	doc.setFontSize(9);
	doc.setTextColor(220, 220, 220);
	doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - 15, 12, { align: "right" });

	yPosition = 32;

	// Title and subtitle
	doc.setFontSize(14);
	doc.setTextColor(24, 46, 112);
	doc.setFont(undefined, "bold");
	doc.text(title, 15, yPosition);
	yPosition += 6;

	doc.setFontSize(10);
	doc.setTextColor(80, 80, 80);
	doc.setFont(undefined, "normal");
	doc.text(subtitle, 15, yPosition);
	yPosition += 6;

	// Summary box with key metrics
	if (stats) {
		doc.setFillColor(242, 243, 245);
		doc.rect(15, yPosition, pageWidth - 30, 12, "F");

		doc.setFontSize(9);
		doc.setTextColor(24, 46, 112);
		doc.setFont(undefined, "bold");
		doc.text("Summary", 18, yPosition + 4);

		doc.setFontSize(8);
		doc.setTextColor(80, 80, 80);
		doc.setFont(undefined, "normal");

		const statText = Object.entries(stats)
			.map(([key, value]) => `${key}: ${value}`)
			.join(" | ");

		doc.text(statText, 18, yPosition + 9, { maxWidth: pageWidth - 36 });
		yPosition += 14;
	}

	// Filters info box
	if (filters && Object.keys(filters).length > 0) {
		const activeFilters = Object.entries(filters)
			.filter(([, value]) => value && String(value).trim())
			.map(([key, value]) => `${key}: ${value}`)
			.join(" • ");

		if (activeFilters) {
			doc.setFillColor(255, 250, 235);
			doc.setDrawColor(220, 180, 100);
			doc.setLineWidth(0.5);
			doc.rect(15, yPosition, pageWidth - 30, 8, "FD");

			doc.setFontSize(8);
			doc.setTextColor(100, 80, 40);
			doc.setFont(undefined, "italic");
			doc.text(`Filters Applied: ${activeFilters}`, 18, yPosition + 5, { maxWidth: pageWidth - 36 });
			yPosition += 10;
		}
	}

	yPosition += 2;

	// Table
	const columnWidths = Array(columns.length).fill((pageWidth - 30) / columns.length);
	const rowHeight = 7;

	// Table header with gradient effect
	doc.setFillColor(24, 46, 112);
	doc.setTextColor(255, 255, 255);
	doc.setFontSize(8);
	doc.setFont(undefined, "bold");

	let xPosition = 15;
	columns.forEach((col, idx) => {
		doc.rect(xPosition, yPosition, columnWidths[idx], rowHeight, "F");
		doc.setDrawColor(200, 200, 200);
		doc.setLineWidth(0.3);
		doc.rect(xPosition, yPosition, columnWidths[idx], rowHeight);

		// Center text in header
		const textWidth = doc.getStringUnitWidth(col) * doc.internal.getFontSize() / doc.internal.scaleFactor;
		const textOffset = (columnWidths[idx] - textWidth) / 2;
		doc.text(col, xPosition + textOffset, yPosition + rowHeight - 1.5);
		xPosition += columnWidths[idx];
	});

	yPosition += rowHeight;

	// Table rows
	doc.setTextColor(40, 40, 40);
	doc.setFont(undefined, "normal");
	doc.setFontSize(8);
	doc.setDrawColor(220, 220, 220);
	doc.setLineWidth(0.2);

	rows.forEach((row, rowIdx) => {
		// Check if new page is needed
		if (yPosition + rowHeight > pageHeight - 12) {
			doc.addPage();
			yPosition = 10;

			// Repeat header on new page
			doc.setFillColor(24, 46, 112);
			doc.setTextColor(255, 255, 255);
			doc.setFont(undefined, "bold");
			doc.setFontSize(8);
			xPosition = 15;

			columns.forEach((col, idx) => {
				doc.rect(xPosition, yPosition, columnWidths[idx], rowHeight, "F");
				doc.setDrawColor(200, 200, 200);
				doc.setLineWidth(0.3);
				doc.rect(xPosition, yPosition, columnWidths[idx], rowHeight);

				const textWidth = doc.getStringUnitWidth(col) * doc.internal.getFontSize() / doc.internal.scaleFactor;
				const textOffset = (columnWidths[idx] - textWidth) / 2;
				doc.text(col, xPosition + textOffset, yPosition + rowHeight - 1.5);
				xPosition += columnWidths[idx];
			});

			yPosition += rowHeight;
			doc.setTextColor(40, 40, 40);
			doc.setFont(undefined, "normal");
		}

		// Row background (alternating light gray)
		if (rowIdx % 2 === 0) {
			doc.setFillColor(248, 248, 248);
			xPosition = 15;
			columns.forEach((_, idx) => {
				doc.rect(xPosition, yPosition, columnWidths[idx], rowHeight, "F");
				xPosition += columnWidths[idx];
			});
		}

		// Row borders
		xPosition = 15;
		columns.forEach((_, idx) => {
			doc.setDrawColor(220, 220, 220);
			doc.setLineWidth(0.2);
			doc.rect(xPosition, yPosition, columnWidths[idx], rowHeight);
			xPosition += columnWidths[idx];
		});

		// Row content
		xPosition = 15;
		row.forEach((cell, idx) => {
			const cellText = String(cell || "").substring(0, 35); // Truncate long text
			doc.text(cellText, xPosition + 2, yPosition + rowHeight - 1.5);
			xPosition += columnWidths[idx];
		});

		yPosition += rowHeight;
	});

	yPosition += 3;

	// Footer
	const pageCount = doc.getNumberOfPages();
	for (let i = 1; i <= pageCount; i++) {
		doc.setPage(i);

		// Footer line
		doc.setDrawColor(200, 200, 200);
		doc.setLineWidth(0.5);
		doc.line(15, pageHeight - 10, pageWidth - 15, pageHeight - 10);

		// Page number
		doc.setFontSize(8);
		doc.setTextColor(150, 150, 150);
		doc.text(
			`Page ${i} of ${pageCount}`,
			pageWidth / 2,
			pageHeight - 6,
			{ align: "center" }
		);

		// Footer company info
		doc.setFontSize(7);
		doc.setTextColor(170, 170, 170);
		doc.text("HealthMate - Medical Management System", 15, pageHeight - 6);
		doc.text(`Confidential • Report ID: ${Math.random().toString(36).substring(7).toUpperCase()}`, pageWidth - 15, pageHeight - 6, { align: "right" });
	}

	return doc;
};

const triggerPdfDownload = (filename, doc) => {
	doc.save(filename);
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
	const defaultPaymentFilters = {
		search: "",
		status: "",
		provider: "",
		currency: "",
		minAmount: "",
		maxAmount: "",
	};

	const [activeMenuItem, setActiveMenuItem] = useState("Overview");
	const [stats, setStats] = useState(null);
	const [recentUsers, setRecentUsers] = useState([]);
	const [users, setUsers] = useState([]);
	const [userPagination, setUserPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
	const [auditLogs, setAuditLogs] = useState([]);
	const [verificationQueue, setVerificationQueue] = useState([]);
	const [paymentStats, setPaymentStats] = useState(null);
	const [paymentTransactions, setPaymentTransactions] = useState([]);
	const [paymentPagination, setPaymentPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
	const [isLoading, setIsLoading] = useState(true);
	const [actionLoadingId, setActionLoadingId] = useState("");
	const [errorMessage, setErrorMessage] = useState("");
	const [successMessage, setSuccessMessage] = useState("");
	const [userFilters, setUserFilters] = useState(defaultUserFilters);
	const [paymentFilters, setPaymentFilters] = useState(defaultPaymentFilters);
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

	const paymentStatsCards = useMemo(
		() => [
			{ label: "Total Transactions", value: paymentStats?.totalTransactions ?? 0, meta: "All recorded payment attempts" },
			{ label: "Successful", value: paymentStats?.succeededTransactions ?? 0, meta: "Completed transactions" },
			{ label: "Pending", value: paymentStats?.pendingTransactions ?? 0, meta: "Awaiting completion" },
			{ label: "Revenue", value: formatAmount(paymentStats?.totalRevenue, "LKR"), meta: "Total collected revenue" },
		],
		[paymentStats]
	);

	const operationsStatsCards = useMemo(() => {
		const approvals = auditLogs.filter((log) => /approve/i.test(log.action || "")).length;
		const riskActions = auditLogs.filter((log) => /suspend|delete|reject/i.test(log.action || "")).length;

		return [
			{ label: "Audit Events", value: auditLogs.length, meta: "Recent tracked admin actions" },
			{ label: "Approvals", value: approvals, meta: "Approval actions in recent logs" },
			{ label: "Risk Actions", value: riskActions, meta: "Suspend, reject, or delete actions" },
		];
	}, [auditLogs]);

	const moduleKpiCatalog = useMemo(
		() => [
			...adminStats.map((card) => ({ ...card, module: "admin", domain: "users" })),
			...paymentStatsCards.map((card) => ({ ...card, module: "payment", domain: "payments" })),
			...operationsStatsCards.map((card) => ({ ...card, module: "operations", domain: "operations" })),
		],
		[adminStats, paymentStatsCards, operationsStatsCards]
	);

	const visibleKpiCards = useMemo(() => {
		const moduleKey =
			activeMenuItem === "Payment Management"
				? "payment"
				: activeMenuItem === "Operations"
					? "operations"
					: "admin";

		const cardsForModule = moduleKpiCatalog.filter((card) => card.module === moduleKey);

		if (moduleKey === "payment" || moduleKey === "operations") {
			return cardsForModule.filter((card) => card.domain !== "users");
		}

		return cardsForModule;
	}, [activeMenuItem, moduleKpiCatalog]);

	const hasActiveUserFilters = useMemo(
		() => Boolean(userFilters.search.trim() || userFilters.role || userFilters.accountStatus),
		[userFilters]
	);

	const hasActivePaymentFilters = useMemo(
		() =>
			Boolean(
				paymentFilters.search.trim() ||
				paymentFilters.status ||
				paymentFilters.provider ||
				paymentFilters.currency ||
				paymentFilters.minAmount ||
				paymentFilters.maxAmount
			),
		[paymentFilters]
	);

	const overviewCards = useMemo(() => {
		const totalTransactions = paymentStats?.totalTransactions ?? 0;
		const succeededTransactions = paymentStats?.succeededTransactions ?? 0;
		const successRate = totalTransactions > 0 ? Math.round((succeededTransactions / totalTransactions) * 100) : 0;
		const approvals = auditLogs.filter((log) => /approve/i.test(log.action || "")).length;
		const riskActions = auditLogs.filter((log) => /suspend|delete|reject/i.test(log.action || "")).length;

		return [
			{
				label: "Payment Revenue",
				value: formatAmount(paymentStats?.totalRevenue, "LKR"),
				description: "Cumulative processed revenue",
			},
			{
				label: "Payment Success Rate",
				value: `${successRate}%`,
				description: `${succeededTransactions} of ${totalTransactions} transactions`,
			},
			{
				label: "Audit Events",
				value: auditLogs.length,
				description: "Recent tracked admin actions",
			},
			{
				label: "Risk Actions",
				value: riskActions,
				description: `${approvals} approvals vs flagged actions`,
			},
		];
	}, [auditLogs, paymentStats]);

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

	const loadPaymentOverview = async () => {
		try {
			const response = await fetchPaymentOverview();
			setPaymentStats(response.stats || null);
		} catch {
			setPaymentStats(null);
		}
	};

	const loadPaymentTransactions = async (page = 1, overrides = {}) => {
		setErrorMessage("");
		try {
			const params = {
				page,
				limit: paymentPagination.limit,
				search: (overrides.search ?? paymentFilters.search).trim(),
				status: overrides.status ?? paymentFilters.status,
				provider: overrides.provider ?? paymentFilters.provider,
				currency: (overrides.currency ?? paymentFilters.currency).trim().toUpperCase(),
				minAmount: (overrides.minAmount ?? paymentFilters.minAmount).toString().trim(),
				maxAmount: (overrides.maxAmount ?? paymentFilters.maxAmount).toString().trim(),
			};

			const response = await fetchPaymentTransactions(params);
			setPaymentTransactions(response.transactions || []);
			setPaymentPagination(response.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 });
		} catch (error) {
			setErrorMessage(error.response?.data?.message || "Failed to load payment transactions.");
		}
	};

	const handleApplyPaymentFilters = async () => {
		await loadPaymentTransactions(1, {
			search: paymentFilters.search.trim(),
			currency: paymentFilters.currency.trim().toUpperCase(),
			minAmount: paymentFilters.minAmount,
			maxAmount: paymentFilters.maxAmount,
		});
	};

	const handleClearPaymentFilters = async () => {
		setPaymentFilters(defaultPaymentFilters);
		await loadPaymentTransactions(1, defaultPaymentFilters);
	};

	useEffect(() => {
		loadAdminData();
		loadAuditLogs();
		loadPaymentOverview();
	}, []);

	useEffect(() => {
		if (activeMenuItem === "User Management") {
			loadUsers(1);
		}

		if (activeMenuItem === "Payment Management") {
			loadPaymentOverview();
			loadPaymentTransactions(1);
		}

		if (activeMenuItem === "Operations") {
			loadPaymentOverview();
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

	useEffect(() => {
		if (activeMenuItem !== "Payment Management") {
			return undefined;
		}

		const debounceTimer = setTimeout(() => {
			loadPaymentTransactions(1, { search: paymentFilters.search.trim() });
		}, 400);

		return () => clearTimeout(debounceTimer);
	}, [activeMenuItem, paymentFilters.search]);

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
		const selectedUserId = resolveUserId(selectedUser);
		if (!selectedUserId) {
			setErrorMessage("User identifier is missing. Refresh and try again.");
			return;
		}

		setEditUserForm({
			id: selectedUserId,
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

	const collectPaginatedRecords = async (fetcher, dataKey, baseParams = {}) => {
		const exportedRecords = [];
		let page = 1;
		let totalPages = 1;

		do {
			const response = await fetcher({
				...baseParams,
				page,
				limit: 200,
			});

			exportedRecords.push(...(response?.[dataKey] || []));
			totalPages = response?.pagination?.totalPages || 1;
			page += 1;
		} while (page <= totalPages);

		return exportedRecords;
	};

	const handleExportUsersPdf = async () => {
		setErrorMessage("");
		setSuccessMessage("");
		setActionLoadingId("export-users");

		try {
			const filters = {
				search: userFilters.search.trim(),
				role: userFilters.role,
				accountStatus: userFilters.accountStatus,
			};

			const exportUsers = await collectPaginatedRecords(fetchAdminUsers, "users", filters);
			if (exportUsers.length === 0) {
				setErrorMessage("No users found to export for the selected filters.");
				return;
			}

			const columns = [
				"User ID",
				"Name",
				"Email",
				"Phone",
				"Role",
				"Status",
				"Verification",
				"Joined",
			];

			const rows = exportUsers.map((item) => [
				resolveUserId(item).substring(0, 12),
				item.name || "",
				item.email || "",
				item.phoneNumber || "",
				item.role || "",
				item.accountStatus || "active",
				item.role === "doctor" ? item.doctorProfile?.verificationStatus || "pending" : "N/A",
				formatDateTime(item.createdAt),
			]);

			// Calculate summary statistics
			const activeCount = exportUsers.filter((u) => u.accountStatus === "active").length;
			const suspendedCount = exportUsers.filter((u) => u.accountStatus === "suspended").length;
			const doctorCount = exportUsers.filter((u) => u.role === "doctor").length;
			const patientCount = exportUsers.filter((u) => u.role === "patient").length;

			const stats = {
				"Total Users": exportUsers.length,
				"Active": activeCount,
				"Suspended": suspendedCount,
				"Doctors": doctorCount,
				"Patients": patientCount,
			};

			const filterText = [
				userFilters.search.trim() && `Search: "${userFilters.search.trim()}"`,
				userFilters.role && `Role: ${userFilters.role}`,
				userFilters.accountStatus && `Status: ${userFilters.accountStatus}`,
			]
				.filter(Boolean)
				.join(" • ") || "No filters applied";

			const doc = createPdfReport(
				"User Management Report",
				`${filterText}`,
				filters,
				rows,
				columns,
				stats
			);

			triggerPdfDownload(buildPdfFileName("healthmate-users-report"), doc);
			setSuccessMessage(`Users PDF exported successfully (${exportUsers.length} records).`);
		} catch (error) {
			setErrorMessage(error.response?.data?.message || "Failed to export users PDF.");
		} finally {
			setActionLoadingId("");
		}
	};

	const handleExportPaymentsPdf = async () => {
		setErrorMessage("");
		setSuccessMessage("");
		setActionLoadingId("export-payments");

		try {
			const filters = {
				search: paymentFilters.search.trim(),
				status: paymentFilters.status,
				provider: paymentFilters.provider,
				currency: paymentFilters.currency.trim().toUpperCase(),
				minAmount: paymentFilters.minAmount.toString().trim(),
				maxAmount: paymentFilters.maxAmount.toString().trim(),
			};

			const exportPayments = await collectPaginatedRecords(fetchPaymentTransactions, "transactions", filters);
			if (exportPayments.length === 0) {
				setErrorMessage("No payment transactions found to export for the selected filters.");
				return;
			}

			const columns = [
				"Transaction ID",
				"Amount",
				"Provider",
				"Status",
				"Reference",
				"Appointment ID",
				"Created At",
			];

			const rows = exportPayments.map((item) => [
				item.transactionId || "",
				formatAmount(item.amount, item.currency || "LKR"),
				item.provider || "",
				item.status || "pending",
				item.paymentReference || "-",
				item.appointmentId || "-",
				formatDateTime(item.createdAt),
			]);

			// Calculate summary statistics
			const succeededCount = exportPayments.filter((p) => p.status === "succeeded").length;
			const pendingCount = exportPayments.filter((p) => p.status === "pending").length;
			const failedCount = exportPayments.filter((p) => p.status === "failed").length;
			const totalAmount = exportPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
			const succeededAmount = exportPayments
				.filter((p) => p.status === "succeeded")
				.reduce((sum, p) => sum + (p.amount || 0), 0);

			const stats = {
				"Total Transactions": exportPayments.length,
				"Successful": succeededCount,
				"Pending": pendingCount,
				"Failed": failedCount,
				"Total Amount": formatAmount(totalAmount, "LKR"),
				"Revenue": formatAmount(succeededAmount, "LKR"),
			};

			const filterText = [
				paymentFilters.search.trim() && `Search: "${paymentFilters.search.trim()}"`,
				paymentFilters.status && `Status: ${paymentFilters.status}`,
				paymentFilters.provider && `Provider: ${paymentFilters.provider}`,
				(paymentFilters.minAmount || paymentFilters.maxAmount) &&
					`Amount: ${paymentFilters.minAmount || "0"}-${paymentFilters.maxAmount || "∞"}`,
			]
				.filter(Boolean)
				.join(" • ") || "No filters applied";

			const doc = createPdfReport(
				"Payment Management Report",
				`${filterText}`,
				filters,
				rows,
				columns,
				stats
			);

			triggerPdfDownload(buildPdfFileName("healthmate-payments-report"), doc);
			setSuccessMessage(`Payments PDF exported successfully (${exportPayments.length} records).`);
		} catch (error) {
			setErrorMessage(error.response?.data?.message || "Failed to export payments PDF.");
		} finally {
			setActionLoadingId("");
		}
	};

	const renderOverview = () => (
		<div className="mt-5 space-y-5">
			<section className="rounded-2xl border border-slate-200 bg-white p-5">
				<div className="mb-4 flex flex-wrap items-center justify-between gap-2">
					<div>
						<h2 className="text-sm font-semibold text-slate-900">Executive Overview</h2>
						<p className="text-xs text-slate-500">Live snapshot of account, verification, and payment health.</p>
					</div>
					<span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
						Updated now
					</span>
				</div>
				<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
					{overviewCards.map((item) => (
						<div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
							<p className="text-xs uppercase tracking-wide text-slate-500">{item.label}</p>
							<p className="mt-2 text-2xl font-bold text-slate-900">{item.value}</p>
							<p className="mt-1 text-xs text-slate-500">{item.description}</p>
						</div>
					))}
				</div>
			</section>

			<div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
				<section className="rounded-2xl border border-slate-200 bg-white p-5">
					<div className="mb-4 flex items-center justify-between">
						<h3 className="text-sm font-semibold text-slate-900">Verification Queue</h3>
						<span className="text-xs font-semibold text-slate-500">{verificationQueue.length} pending</span>
					</div>
					<div className="space-y-3">
						{verificationQueue.length === 0 ? (
							<p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
								No pending doctor verifications.
							</p>
						) : (
							verificationQueue.slice(0, 4).map((item) => (
								<div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
									<div className="flex flex-wrap items-center justify-between gap-2">
										<div>
											<p className="text-sm font-semibold text-slate-900">{item.name}</p>
											<p className="text-xs text-slate-500">{item.doctorProfile?.specialization || "General"}</p>
										</div>
										<span className="rounded-lg bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-700">Pending</span>
									</div>
									<p className="mt-2 text-xs text-slate-500">Submitted: {formatDateTime(item.createdAt)}</p>
								</div>
							))
						)}
					</div>
				</section>

				<section className="space-y-5">
					<div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
						<h3 className="text-sm font-semibold text-slate-900">Recent Registrations</h3>
						<div className="mt-3 space-y-2">
							{recentUsers.length === 0 ? (
								<p className="text-xs text-slate-500">No recent registrations.</p>
							) : (
								recentUsers.slice(0, 4).map((item) => (
									<div key={item.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
										<div>
											<p className="text-xs font-semibold text-slate-900">{item.name}</p>
											<p className="text-[11px] capitalize text-slate-500">{item.role}</p>
										</div>
										<p className="text-[11px] text-slate-500">{formatDateTime(item.createdAt)}</p>
									</div>
								))
							)}
						</div>
					</div>

					<div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
						<h3 className="text-sm font-semibold text-slate-900">Latest Admin Actions</h3>
						<div className="mt-3 space-y-2">
							{auditLogs.length === 0 ? (
								<p className="text-xs text-slate-500">No audit logs yet.</p>
							) : (
								auditLogs.slice(0, 4).map((log) => (
									<div key={log._id} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
										<p className="text-xs font-semibold text-slate-800">{log.action}</p>
										<p className="mt-1 text-[11px] text-slate-500">
											By {log.actorName || "Admin"} • {formatDateTime(log.createdAt)}
										</p>
									</div>
								))
							)}
						</div>
					</div>
				</section>
			</div>
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
						onClick={handleExportUsersPdf}
						disabled={actionLoadingId === "export-users"}
						className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
					>
						Export PDF
					</button>
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
						{users.map((item) => {
							const userId = resolveUserId(item);

							return (
							<tr key={userId || `${item.email}-${item.createdAt}`} className="border-b border-slate-100 align-top text-slate-700">
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
												disabled={!userId || actionLoadingId === userId}
												className="rounded-lg border border-blue-300 px-2 py-1 text-[11px] font-semibold text-blue-700 disabled:opacity-60"
											>
												Edit
											</button>
											<button
												type="button"
												onClick={() => setDeleteTarget({ id: userId, name: item.name })}
												disabled={!userId || actionLoadingId === userId}
												className="rounded-lg border border-rose-300 px-2 py-1 text-[11px] font-semibold text-rose-700 disabled:opacity-60"
											>
												Delete
											</button>
											<button
												type="button"
												onClick={() => handleUserStatusAction(userId, "active")}
												disabled={!userId || actionLoadingId === userId}
												className="rounded-lg border border-emerald-300 px-2 py-1 text-[11px] font-semibold text-emerald-700 disabled:opacity-60"
											>
												Activate
											</button>
											<button
												type="button"
												onClick={() => handleUserStatusAction(userId, "suspended")}
												disabled={!userId || actionLoadingId === userId}
												className="rounded-lg border border-amber-300 px-2 py-1 text-[11px] font-semibold text-amber-700 disabled:opacity-60"
											>
												Suspend
											</button>
										</div>
									)}
								</td>
								<td className="py-3">{formatDateTime(item.createdAt)}</td>
							</tr>
							);
						})}
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

	const renderPaymentManagement = () => (
		<section className="rounded-2xl border border-slate-200 bg-white p-5">
			<div className="mb-4 flex items-center justify-between">
				<h2 className="text-sm font-semibold text-slate-900">Payment Management</h2>
				<div className="flex items-center gap-3">
					<span className="text-xs font-semibold text-slate-500">{paymentPagination.total} transactions</span>
					<button
						type="button"
						onClick={handleExportPaymentsPdf}
						disabled={actionLoadingId === "export-payments"}
						className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
					>
						Export PDF
					</button>
				</div>
			</div>

			<form
				onSubmit={(event) => {
					event.preventDefault();
					handleApplyPaymentFilters();
				}}
				className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4"
			>
				<div className="mb-3 flex items-center justify-between">
					<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Filter Transactions</p>
					{hasActivePaymentFilters && (
						<button
							type="button"
							onClick={handleClearPaymentFilters}
							className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700"
						>
							Clear All
						</button>
					)}
				</div>

				<div className="grid gap-3 lg:grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr_auto]">
					<input
						type="text"
						value={paymentFilters.search}
						onChange={(event) => setPaymentFilters((prev) => ({ ...prev, search: event.target.value }))}
						placeholder="Search by transaction ID/reference"
						className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
					/>
					<select
						value={paymentFilters.status}
						onChange={(event) => setPaymentFilters((prev) => ({ ...prev, status: event.target.value }))}
						className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
					>
						<option value="">All statuses</option>
						<option value="pending">Pending</option>
						<option value="succeeded">Succeeded</option>
						<option value="failed">Failed</option>
					</select>
					<input
						type="text"
						value={paymentFilters.provider}
						onChange={(event) => setPaymentFilters((prev) => ({ ...prev, provider: event.target.value }))}
						placeholder="Provider"
						className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
					/>
					<input
						type="text"
						maxLength={3}
						value={paymentFilters.currency}
						onChange={(event) => setPaymentFilters((prev) => ({ ...prev, currency: event.target.value.toUpperCase() }))}
						placeholder="Currency"
						className="rounded-xl border border-slate-300 px-3 py-2 text-sm uppercase"
					/>
					<input
						type="number"
						min="0"
						value={paymentFilters.minAmount}
						onChange={(event) => setPaymentFilters((prev) => ({ ...prev, minAmount: event.target.value }))}
						placeholder="Min"
						className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
					/>
					<input
						type="number"
						min="0"
						value={paymentFilters.maxAmount}
						onChange={(event) => setPaymentFilters((prev) => ({ ...prev, maxAmount: event.target.value }))}
						placeholder="Max"
						className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
					/>
					<button type="submit" className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
						Apply
					</button>
				</div>
			</form>

			<div className="overflow-x-auto">
				<table className="min-w-full text-left text-sm">
					<thead>
						<tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
							<th className="pb-2 pr-4">Transaction</th>
							<th className="pb-2 pr-4">Amount</th>
							<th className="pb-2 pr-4">Provider</th>
							<th className="pb-2 pr-4">Status</th>
							<th className="pb-2 pr-4">Reference</th>
							<th className="pb-2">Created</th>
						</tr>
					</thead>
					<tbody>
						{paymentTransactions.length === 0 ? (
							<tr>
								<td colSpan={6} className="py-6 text-center text-sm text-slate-500">
									No payment transactions found.
								</td>
							</tr>
						) : (
							paymentTransactions.map((item) => (
								<tr key={item.id} className="border-b border-slate-100 text-slate-700">
									<td className="py-3 pr-4 font-medium text-slate-900">{item.transactionId || "N/A"}</td>
									<td className="py-3 pr-4">{formatAmount(item.amount, item.currency || "LKR")}</td>
									<td className="py-3 pr-4">{item.provider || "N/A"}</td>
									<td className="py-3 pr-4">
										<span className={`rounded-lg px-2 py-1 text-[11px] font-semibold ${paymentStatusClass(item.status)}`}>
											{item.status || "pending"}
										</span>
									</td>
									<td className="py-3 pr-4 text-xs">{item.paymentReference || "-"}</td>
									<td className="py-3">{formatDateTime(item.createdAt)}</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>

			<div className="mt-4 flex items-center justify-between">
				<p className="text-xs text-slate-500">
					Page {paymentPagination.page} of {paymentPagination.totalPages}
				</p>
				<div className="flex gap-2">
					<button
						type="button"
						onClick={() => loadPaymentTransactions(Math.max(paymentPagination.page - 1, 1))}
						disabled={paymentPagination.page <= 1}
						className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50"
					>
						Previous
					</button>
					<button
						type="button"
						onClick={() => loadPaymentTransactions(Math.min(paymentPagination.page + 1, paymentPagination.totalPages))}
						disabled={paymentPagination.page >= paymentPagination.totalPages}
						className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50"
					>
						Next
					</button>
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

			{activeMenuItem !== "Overview" && (
				<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
					{visibleKpiCards.map((item) => (
						<div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
							<p className="text-xs uppercase tracking-wide text-slate-500">{item.label}</p>
							<p className="mt-2 text-2xl font-bold text-slate-900">{item.value}</p>
							<p className="mt-1 text-xs text-slate-500">{item.meta}</p>
						</div>
					))}
				</div>
			)}

			{isLoading ? (
				<div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">Loading admin data...</div>
			) : (
				<>
					{activeMenuItem === "Overview" && renderOverview()}
					{activeMenuItem === "User Management" && renderUserManagement()}
					{activeMenuItem === "Doctor Verification" && renderVerification()}
					{activeMenuItem === "Payment Management" && renderPaymentManagement()}
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
