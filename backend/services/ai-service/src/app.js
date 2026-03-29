const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
	res.status(200).json({ service: "ai-service", status: "ok" });
});

const SAFE_DISCLAIMER =
	"I’m not a doctor. This is general information, not a diagnosis. If symptoms are severe or urgent, seek medical care immediately.";

// --- Rule-based fallback (used if no API key / Groq errors) ---
const commonRules = [
	{
		match: ["chest pain", "tight chest", "pressure chest"],
		specialty: "Cardiology / Emergency",
		advice:
			"Chest pain can be serious. If it’s severe, with sweating, shortness of breath, fainting, or pain spreading to arm/jaw, seek emergency care.",
	},
	{
		match: ["shortness of breath", "breathless", "difficulty breathing"],
		specialty: "General Physician / Emergency",
		advice:
			"Breathing difficulty can be serious. If sudden or severe, or with blue lips, confusion, or chest pain, seek urgent care.",
	},
	{
		match: ["fever", "high temperature"],
		specialty: "General Physician",
		advice:
			"Monitor temperature, hydration, and rest. If fever persists >3 days, is very high, or with rash, stiff neck, or severe weakness, consult a doctor.",
	},
	{
		match: ["cough", "sore throat"],
		specialty: "General Physician / ENT",
		advice:
			"Could be viral. If symptoms last >7–10 days, high fever, breathing trouble, or chest pain, consult a doctor.",
	},
	{
		match: ["headache", "migraine"],
		specialty: "Neurology / General Physician",
		advice: "If sudden ‘worst headache’, with weakness, confusion, fainting, or vision changes, seek urgent care.",
	},
	{
		match: ["stomach pain", "abdominal pain", "vomiting", "diarrhea"],
		specialty: "Gastroenterology / General Physician",
		advice:
			"Hydrate. If severe pain, blood in stool/vomit, signs of dehydration, or persistent symptoms, consult a doctor.",
	},
	{
		match: ["rash", "itch"],
		specialty: "Dermatology",
		advice:
			"If rash spreads quickly, involves face/eyes, or with difficulty breathing/swelling, seek urgent care.",
	},
];

function analyzeSymptomsRuleBased(text) {
	const input = String(text || "").toLowerCase();
	const hits = commonRules.filter((r) => r.match.some((m) => input.includes(m)));

	const specialties = [...new Set(hits.map((h) => h.specialty))];
	const suggestions = hits.map((h) => ({ specialty: h.specialty, advice: h.advice }));

	if (specialties.length === 0) {
		return {
			message:
				"Tell me your main symptoms, how long you’ve had them, your age, and any existing conditions. I can suggest a likely specialty and next steps.",
			specialties: ["General Physician"],
			suggestions: [
				{
					specialty: "General Physician",
					advice:
						"If symptoms are mild, start with a general physician. Seek urgent care if symptoms are severe, sudden, or worsening.",
				},
			],
			disclaimer: SAFE_DISCLAIMER,
		};
	}

	return {
		message: "Based on what you shared, these specialties may be relevant:",
		specialties,
		suggestions,
		disclaimer: SAFE_DISCLAIMER,
	};
}

function extractFirstJsonObject(text) {
	const s = String(text || "");
	const start = s.indexOf("{");
	if (start === -1) return null;
	let depth = 0;
	let inString = false;
	let escape = false;
	for (let i = start; i < s.length; i += 1) {
		const ch = s[i];
		if (escape) {
			escape = false;
			continue;
		}
		if (ch === "\\") {
			escape = true;
			continue;
		}
		if (ch === '"') {
			inString = !inString;
			continue;
		}
		if (inString) continue;
		if (ch === "{") depth += 1;
		if (ch === "}") depth -= 1;
		if (depth === 0) return s.slice(start, i + 1);
	}
	return null;
}

async function analyzeSymptomsWithGroq({ message, history }) {
	const apiKey = process.env.GROQ_API_KEY;
	if (!apiKey) {
		return {
			...analyzeSymptomsRuleBased(message),
			meta: { provider: "rule-based", reason: "GROQ_API_KEY not set" },
		};
	}

	// eslint-disable-next-line global-require
	const Groq = require("groq-sdk");
	const client = new Groq({ apiKey });
	const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

	const systemPrompt =
		"You are a cautious healthcare triage assistant. You must:\n" +
		"- Ask up to 3 concise follow-up questions only when critical info is missing (age, duration, severity, red flags, pregnancy, chronic conditions, meds, allergies).\n" +
		"- Provide general education and triage guidance, not a diagnosis.\n" +
		"- Always include urgent-care escalation guidance when red flags appear.\n" +
		"- Return a JSON object ONLY with keys: message, specialties, suggestions, disclaimer.\n" +
		"Where specialties is an array of strings, suggestions is an array of {specialty, advice}.\n" +
		"IMPORTANT: Output JSON only. No markdown. No code fences. No extra text.";

	const userPayload = {
		patient_message: message,
		history: Array.isArray(history)
			? history.slice(-10).map((h) => ({ role: h.role, content: h.content }))
			: [],
	};

	const completion = await client.chat.completions.create({
		model,
		temperature: 0.2,
		messages: [
			{ role: "system", content: systemPrompt },
			{ role: "user", content: JSON.stringify(userPayload) },
		],
	});

	const content = completion?.choices?.[0]?.message?.content;
	const jsonCandidate = extractFirstJsonObject(content) || content;

	let parsed;
	try {
		parsed = JSON.parse(jsonCandidate);
	} catch (e) {
		return {
			...analyzeSymptomsRuleBased(message),
			meta: { provider: "rule-based", reason: "Groq returned non-JSON" },
		};
	}

	return {
		message: parsed.message || "Here’s what I suggest:",
		specialties: Array.isArray(parsed.specialties) ? parsed.specialties : [],
		suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
		disclaimer: parsed.disclaimer || SAFE_DISCLAIMER,
		meta: { provider: "groq", model },
	};
}

app.post("/api/ai/symptom-check", async (req, res) => {
	const { message, history } = req.body || {};

	if (!message || String(message).trim().length < 3) {
		return res.status(400).json({ message: "Please describe your symptoms." });
	}

	try {
		const result = await analyzeSymptomsWithGroq({ message, history });
		return res.status(200).json({
			input: message,
			message: result.message,
			specialties: result.specialties,
			suggestions: result.suggestions,
			disclaimer: result.disclaimer,
			meta: {
				...(result.meta || {}),
				historyItems: Array.isArray(history) ? history.length : 0,
			},
		});
	} catch (err) {
		const fallback = analyzeSymptomsRuleBased(message);
		return res.status(200).json({
			input: message,
			...fallback,
			meta: {
				provider: "rule-based",
				reason: "Groq error",
				error: String(err && err.message ? err.message : err),
				historyItems: Array.isArray(history) ? history.length : 0,
			},
		});
	}
});

module.exports = app;
