const MedicalReport = require("../models/MedicalReport");
const User = require("../models/User");

const MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024;

const buildReportId = () => {
	const timestampPart = Date.now().toString(36).toUpperCase();
	const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase();
	return `RPT-${timestampPart}${randomPart}`;
};

const serializeReport = (reportDoc) => ({
	id: reportDoc._id.toString(),
	reportId: reportDoc.reportId,
	patientId: reportDoc.patientId?.toString?.() || reportDoc.patientId,
	patientName: reportDoc.patientName,
	reportTitle: reportDoc.reportTitle,
	reportType: reportDoc.reportType,
	doctorId: reportDoc.doctorId?.toString?.() || reportDoc.doctorId,
	doctorName: reportDoc.doctorName,
	hospitalLabName: reportDoc.hospitalLabName,
	reportDate: reportDoc.reportDate ? new Date(reportDoc.reportDate).toISOString().slice(0, 10) : "",
	notes: reportDoc.notes || "",
	fileName: reportDoc.fileName,
	fileSize: reportDoc.fileSize,
	fileData: reportDoc.fileData,
	uploadedAt: reportDoc.createdAt,
});

const parseReportDate = (dateText) => {
	const parsedDate = new Date(`${dateText}T00:00:00`);
	return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const createMedicalReport = async (req, res) => {
	try {
		if (req.user?.role !== "patient") {
			return res.status(403).json({ message: "only patients can upload medical reports" });
		}

		const {
			patientName,
			reportTitle,
			reportType,
			doctorId,
			hospitalLabName,
			reportDate,
			notes,
			fileName,
			fileSize,
			fileData,
		} = req.body;

		if (!patientName || !reportTitle || !reportType || !doctorId || !hospitalLabName || !reportDate || !fileName || !fileData) {
			return res.status(400).json({ message: "missing required medical report fields" });
		}

		if (!/^data:[^;]+;base64,/.test(String(fileData))) {
			return res.status(400).json({ message: "invalid report file format" });
		}

		const numericFileSize = Number(fileSize);
		if (Number.isNaN(numericFileSize) || numericFileSize <= 0 || numericFileSize > MAX_FILE_SIZE_BYTES) {
			return res.status(400).json({ message: "report file must be between 1 byte and 4MB" });
		}

		const parsedDate = parseReportDate(reportDate);
		if (!parsedDate) {
			return res.status(400).json({ message: "invalid report date" });
		}

		const patient = await User.findById(req.user.sub).select("name role");
		if (!patient || patient.role !== "patient") {
			return res.status(404).json({ message: "patient not found" });
		}

		const doctor = await User.findById(doctorId).select("name role");
		if (!doctor || doctor.role !== "doctor") {
			return res.status(404).json({ message: "selected doctor not found" });
		}

		const medicalReport = await MedicalReport.create({
			reportId: buildReportId(),
			patientId: patient._id,
			patientName: String(patientName).trim(),
			reportTitle: String(reportTitle).trim(),
			reportType: String(reportType).trim(),
			doctorId: doctor._id,
			doctorName: doctor.name,
			hospitalLabName: String(hospitalLabName).trim(),
			reportDate: parsedDate,
			notes: String(notes || "").trim(),
			fileName: String(fileName).trim(),
			fileSize: numericFileSize,
			fileData: String(fileData),
		});

		return res.status(201).json({
			message: "medical report uploaded successfully",
			report: serializeReport(medicalReport),
		});
	} catch (error) {
		return res.status(500).json({ message: "failed to upload medical report", error: error.message });
	}
};

const getMyMedicalReports = async (req, res) => {
	try {
		if (req.user?.role !== "patient") {
			return res.status(403).json({ message: "only patients can access this endpoint" });
		}

		const reports = await MedicalReport.find({ patientId: req.user.sub }).sort({ createdAt: -1 }).lean();
		return res.status(200).json({ reports: reports.map(serializeReport) });
	} catch (error) {
		return res.status(500).json({ message: "failed to fetch patient medical reports", error: error.message });
	}
};

const getAssignedMedicalReports = async (req, res) => {
	try {
		if (req.user?.role !== "doctor") {
			return res.status(403).json({ message: "only doctors can access this endpoint" });
		}

		const reports = await MedicalReport.find({ doctorId: req.user.sub }).sort({ createdAt: -1 }).lean();
		return res.status(200).json({ reports: reports.map(serializeReport) });
	} catch (error) {
		return res.status(500).json({ message: "failed to fetch doctor medical reports", error: error.message });
	}
};

module.exports = {
	createMedicalReport,
	getMyMedicalReports,
	getAssignedMedicalReports,
};
