jest.mock("../../models/Prescription", () => ({
	findOne: jest.fn(),
	create: jest.fn(),
	find: jest.fn(),
}));

const Prescription = require("../../models/Prescription");
const {
	createPrescription,
	getDoctorPrescriptions,
} = require("../prescriptionController");

const createRes = () => {
	const res = {};
	res.status = jest.fn().mockReturnValue(res);
	res.json = jest.fn().mockReturnValue(res);
	return res;
};

describe("Prescription create/list authorization", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: async () => ({
				appointment: {
					id: "apt-1",
					appointmentId: "APT-001",
					patientId: "pat-1",
					patientName: "Patient",
					doctorId: "doc-1",
					doctorName: "Doctor",
					status: "completed",
				},
			}),
		});
	});

	test("blocks prescription creation for consultation not owned by requester doctor", async () => {
		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: async () => ({
				appointment: {
					id: "apt-2",
					appointmentId: "APT-002",
					patientId: "pat-1",
					patientName: "Patient",
					doctorId: "doc-2",
					doctorName: "Doctor B",
					status: "completed",
				},
			}),
		});

		const req = {
			user: { sub: "doc-1", role: "doctor" },
			body: {
				appointmentId: "APT-002",
				diagnosis: "Diagnosis",
				medications: [{ name: "Paracetamol", dosage: "500mg", frequency: "BID" }],
			},
		};
		const res = createRes();

		await createPrescription(req, res);

		expect(res.status).toHaveBeenCalledWith(403);
		expect(res.json.mock.calls[0][0].message).toMatch(/own consultations/i);
		expect(Prescription.create).not.toHaveBeenCalled();
	});

	test("allows prescription creation for completed consultation owned by doctor", async () => {
		Prescription.findOne.mockResolvedValue(null);
		Prescription.create.mockResolvedValue({
			_id: "p1",
			prescriptionId: "PRC-1",
			appointmentId: "apt-1",
			appointmentReference: "APT-001",
			patientId: "pat-1",
			patientName: "Patient",
			doctorId: "doc-1",
			doctorName: "Doctor",
			diagnosis: "Diagnosis",
			medications: [{ name: "Paracetamol", dosage: "500mg", frequency: "BID" }],
			notes: "",
			status: "Issued",
			issuedAt: new Date(),
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		const req = {
			user: { sub: "doc-1", role: "doctor" },
			body: {
				appointmentId: "APT-001",
				diagnosis: "Diagnosis",
				medications: [{ name: "Paracetamol", dosage: "500mg", frequency: "BID" }],
			},
		};
		const res = createRes();

		await createPrescription(req, res);

		expect(Prescription.findOne).toHaveBeenCalled();
		expect(Prescription.create).toHaveBeenCalled();
		expect(res.status).toHaveBeenCalledWith(201);
	});

	test("doctor list endpoint queries only requester doctorId", async () => {
		Prescription.find.mockReturnValue({ sort: jest.fn().mockResolvedValue([]) });

		const req = { user: { sub: "doc-1", role: "doctor" } };
		const res = createRes();

		await getDoctorPrescriptions(req, res);

		expect(Prescription.find).toHaveBeenCalledWith({ doctorId: "doc-1" });
		expect(res.status).toHaveBeenCalledWith(200);
	});

	test("rejects doctor list when token payload has no requester id", async () => {
		const req = { user: { role: "doctor" } };
		const res = createRes();

		await getDoctorPrescriptions(req, res);

		expect(res.status).toHaveBeenCalledWith(401);
		expect(Prescription.find).not.toHaveBeenCalled();
	});
});
