jest.mock("../../models/Appointment", () => ({
	updateMany: jest.fn(),
	findById: jest.fn(),
	find: jest.fn(),
}));

const Appointment = require("../../models/Appointment");
const {
	getDoctorAppointments,
	approveAppointmentByDoctor,
	rejectAppointmentByDoctor,
	cancelAppointmentByDoctor,
	completeConsultation,
} = require("../appointmentController");

const createRes = () => {
	const res = {};
	res.status = jest.fn().mockReturnValue(res);
	res.json = jest.fn().mockReturnValue(res);
	return res;
};

describe("Doctor appointment flow and authorization", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		Appointment.updateMany.mockResolvedValue({ modifiedCount: 0 });
		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: async () => ({ ok: true }),
		});
	});

	test("approve flow: doctor can approve own pending appointment", async () => {
		const save = jest.fn().mockResolvedValue(undefined);
		Appointment.findById.mockResolvedValue({
			doctorId: "doc-1",
			status: "pending",
			paymentStatus: "pending",
			save,
		});

		const req = { params: { id: "a1" }, user: { sub: "doc-1", role: "doctor" } };
		const res = createRes();

		await approveAppointmentByDoctor(req, res);

		expect(res.status).toHaveBeenCalledWith(200);
		expect(save).toHaveBeenCalled();
		expect(res.json.mock.calls[0][0].appointment.status).toBe("pending_payment");
	});

	test("reject flow: doctor can reject own pending appointment", async () => {
		const save = jest.fn().mockResolvedValue(undefined);
		Appointment.findById.mockResolvedValue({
			doctorId: "doc-1",
			status: "pending",
			paymentStatus: "pending",
			save,
		});

		const req = { params: { id: "a2" }, user: { sub: "doc-1", role: "doctor" } };
		const res = createRes();

		await rejectAppointmentByDoctor(req, res);

		expect(res.status).toHaveBeenCalledWith(200);
		expect(save).toHaveBeenCalled();
		expect(res.json.mock.calls[0][0].appointment.status).toBe("rejected");
	});

	test("cancel flow: doctor can cancel own confirmed appointment", async () => {
		const save = jest.fn().mockResolvedValue(undefined);
		Appointment.findById.mockResolvedValue({
			appointmentId: "APT-001",
			appointmentDate: "2026-04-20",
			slotTime: "10:00",
			patientName: "Patient A",
			doctorName: "Doctor X",
			doctorId: "doc-1",
			status: "confirmed",
			paymentStatus: "paid",
			save,
		});

		const req = { params: { id: "a3" }, user: { sub: "doc-1", role: "doctor" } };
		const res = createRes();

		await cancelAppointmentByDoctor(req, res);

		expect(res.status).toHaveBeenCalledWith(200);
		expect(save).toHaveBeenCalled();
		expect(res.json.mock.calls[0][0].appointment.status).toBe("cancelled");
	});

	test("complete flow: doctor can complete own confirmed appointment", async () => {
		const save = jest.fn().mockResolvedValue(undefined);
		Appointment.findById.mockResolvedValue({
			appointmentId: "APT-002",
			appointmentDate: "2026-04-20",
			slotTime: "11:00",
			patientName: "Patient B",
			doctorName: "Doctor X",
			doctorId: "doc-1",
			status: "confirmed",
			save,
		});

		const req = { params: { id: "a4" }, user: { sub: "doc-1", role: "doctor" } };
		const res = createRes();

		await completeConsultation(req, res);

		expect(res.status).toHaveBeenCalledWith(200);
		expect(save).toHaveBeenCalled();
		expect(res.json.mock.calls[0][0].appointment.status).toBe("completed");
	});

	test("authorization: doctor cannot list another doctor's appointments", async () => {
		const req = {
			params: { doctorId: "doc-2" },
			user: { sub: "doc-1", role: "doctor" },
		};
		const res = createRes();

		await getDoctorAppointments(req, res);

		expect(res.status).toHaveBeenCalledWith(403);
		expect(res.json).toHaveBeenCalledWith({ message: "you can only view your own appointments" });
		expect(Appointment.find).not.toHaveBeenCalled();
	});
});
