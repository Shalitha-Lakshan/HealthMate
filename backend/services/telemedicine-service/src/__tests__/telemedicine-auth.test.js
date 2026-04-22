const request = require("supertest");

jest.mock("jsonwebtoken", () => ({
	verify: jest.fn(),
}));

jest.mock("agora-token", () => ({
	RtcTokenBuilder: {
		buildTokenWithUid: jest.fn(() => "mock-agora-token"),
	},
	RtcRole: {
		PUBLISHER: 1,
		SUBSCRIBER: 2,
	},
}));

const jwt = require("jsonwebtoken");
const app = require("../app");

describe("Telemedicine authorization", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		process.env.JWT_SECRET = "test-secret";
		process.env.AGORA_APP_ID = "agora-app-id";
		process.env.AGORA_APP_CERTIFICATE = "agora-cert";

		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: async () => ({
				appointment: {
					doctorId: "doc-1",
					patientId: "pat-1",
					mode: "online",
					status: "confirmed",
					appointmentDateTime: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
				},
			}),
		});
	});

	test("returns 401 when token is missing", async () => {
		const response = await request(app)
			.post("/api/telemedicine/sessions")
			.send({ roomId: "APT-1001" });

		expect(response.status).toBe(401);
		expect(response.body.message).toMatch(/authorization header/i);
	});

	test("returns 403 when doctor tries to access another doctor's appointment", async () => {
		jwt.verify.mockReturnValue({ sub: "doc-2", role: "doctor" });

		const response = await request(app)
			.post("/api/telemedicine/sessions")
			.set("Authorization", "Bearer valid")
			.send({ roomId: "APT-1002" });

		expect(response.status).toBe(403);
		expect(response.body.message).toMatch(/own appointments/i);
	});

	test("returns 403 when patient tries to access another patient's appointment", async () => {
		jwt.verify.mockReturnValue({ sub: "pat-2", role: "patient" });

		const response = await request(app)
			.post("/api/telemedicine/sessions")
			.set("Authorization", "Bearer valid")
			.send({ roomId: "APT-1003" });

		expect(response.status).toBe(403);
		expect(response.body.message).toMatch(/own appointments/i);
	});

	test("returns 403 when appointment is outside join window", async () => {
		jwt.verify.mockReturnValue({ sub: "doc-1", role: "doctor" });
		global.fetch.mockResolvedValue({
			ok: true,
			status: 200,
			json: async () => ({
				appointment: {
					doctorId: "doc-1",
					patientId: "pat-1",
					mode: "online",
					status: "confirmed",
					appointmentDateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
				},
			}),
		});

		const response = await request(app)
			.post("/api/telemedicine/sessions")
			.set("Authorization", "Bearer valid")
			.send({ roomId: "APT-1004" });

		expect(response.status).toBe(403);
		expect(response.body.message).toMatch(/session join is allowed/i);
	});

	test("returns 201 for authorized doctor on valid confirmed online appointment", async () => {
		jwt.verify.mockReturnValue({ sub: "doc-1", role: "doctor" });

		const response = await request(app)
			.post("/api/telemedicine/sessions")
			.set("Authorization", "Bearer valid")
			.send({ roomId: "APT-1005" });

		expect(response.status).toBe(201);
		expect(response.body).toHaveProperty("token", "mock-agora-token");
		expect(response.body).toHaveProperty("provider", "agora");
	});
});
