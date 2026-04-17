jest.mock("../../models/Availability", () => ({
	findOne: jest.fn(),
	create: jest.fn(),
}));

const Availability = require("../../models/Availability");
const { getAvailability, updateAvailability } = require("../availabilityController");

const createRes = () => {
	const res = {};
	res.status = jest.fn().mockReturnValue(res);
	res.json = jest.fn().mockReturnValue(res);
	return res;
};

describe("Doctor availability ownership checks", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	test("blocks doctor from reading another doctor's availability", async () => {
		const req = {
			params: { doctorId: "doc-2" },
			user: { sub: "doc-1", role: "doctor" },
		};
		const res = createRes();

		await getAvailability(req, res);

		expect(res.status).toHaveBeenCalledWith(403);
		expect(res.json).toHaveBeenCalledWith({ message: "you can only view your own availability" });
		expect(Availability.findOne).not.toHaveBeenCalled();
	});

	test("allows patient to read doctor's availability", async () => {
		Availability.findOne.mockResolvedValue({ doctorId: "doc-2", slots: [] });

		const req = {
			params: { doctorId: "doc-2" },
			user: { sub: "pat-1", role: "patient" },
		};
		const res = createRes();

		await getAvailability(req, res);

		expect(Availability.findOne).toHaveBeenCalledWith({ doctorId: "doc-2" });
		expect(res.status).toHaveBeenCalledWith(200);
	});

	test("blocks doctor from updating another doctor's availability", async () => {
		const req = {
			params: { doctorId: "doc-2" },
			body: { slots: [{ day: "Monday", isWorking: true }] },
			user: { sub: "doc-1", role: "doctor" },
		};
		const res = createRes();

		await updateAvailability(req, res);

		expect(res.status).toHaveBeenCalledWith(403);
		expect(res.json).toHaveBeenCalledWith({ message: "you can only update your own availability" });
		expect(Availability.findOne).not.toHaveBeenCalled();
	});

	test("allows doctor to update own availability", async () => {
		const save = jest.fn().mockResolvedValue(undefined);
		Availability.findOne.mockResolvedValue({
			doctorId: "doc-1",
			slots: [],
			save,
		});

		const req = {
			params: { doctorId: "doc-1" },
			body: { slots: [{ day: "Monday", isWorking: true, startTime: "09:00 AM", endTime: "05:00 PM" }] },
			user: { sub: "doc-1", role: "doctor" },
		};
		const res = createRes();

		await updateAvailability(req, res);

		expect(Availability.findOne).toHaveBeenCalledWith({ doctorId: "doc-1" });
		expect(save).toHaveBeenCalled();
		expect(res.status).toHaveBeenCalledWith(200);
	});
});
