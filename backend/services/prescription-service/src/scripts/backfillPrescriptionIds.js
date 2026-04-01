require("dotenv").config();
const mongoose = require("mongoose");
const Prescription = require("../models/Prescription");

const generatePrescriptionId = () => {
	const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
	const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
	return `RX-${datePart}-${randomPart}`;
};

const run = async () => {
	const mongoUri = process.env.MONGO_URI;
	if (!mongoUri) {
		throw new Error("MONGO_URI is required");
	}

	await mongoose.connect(mongoUri);

	const missing = await Prescription.find({
		$or: [{ prescriptionId: { $exists: false } }, { prescriptionId: null }, { prescriptionId: "" }],
	});

	if (missing.length === 0) {
		console.log("No prescriptions require backfill.");
		return;
	}

	for (const doc of missing) {
		doc.prescriptionId = generatePrescriptionId();
		await doc.save();
	}

	console.log(`Backfilled prescriptionId for ${missing.length} prescriptions.`);
};

run()
	.then(() => mongoose.disconnect())
	.catch(async (error) => {
		console.error("Backfill failed:", error.message);
		await mongoose.disconnect();
		process.exit(1);
	});
