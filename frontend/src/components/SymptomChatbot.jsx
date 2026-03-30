import { useMemo, useRef, useState } from "react";

const AI_BASE_URL = import.meta.env.VITE_AI_BASE_URL || "http://localhost:5010";

function SymptomChatbot() {
	const [input, setInput] = useState("");
	const [messages, setMessages] = useState([
		{
			role: "assistant",
			content:
				"Tell me your symptoms (what you feel, how long, age, and any medical conditions). I can suggest a likely doctor specialty.",
		},
	]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState("");
	const bottomRef = useRef(null);

	const history = useMemo(
		() => messages.map((m) => ({ role: m.role, content: m.content })),
		[messages]
	);

	const sendMessage = async () => {
		const text = input.trim();
		if (!text) return;

		setError("");
		setIsLoading(true);
		setInput("");

		const nextMessages = [...messages, { role: "user", content: text }];
		setMessages(nextMessages);

		try {
			const res = await fetch(`${AI_BASE_URL}/api/ai/symptom-check`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ message: text, history }),
			});

			const payload = await res.json().catch(() => ({}));
			if (!res.ok) {
				throw new Error(payload?.message || `Request failed (HTTP ${res.status})`);
			}

			const formatted = [payload.message];
			if (payload.specialties?.length) {
				formatted.push(`Recommended specialty: ${payload.specialties.join(", ")}`);
			}
			if (payload.suggestions?.length) {
				payload.suggestions.slice(0, 3).forEach((s) => {
					formatted.push(`• ${s.specialty}: ${s.advice}`);
				});
			}
			if (payload.disclaimer) {
				formatted.push("");
				formatted.push(payload.disclaimer);
			}

			setMessages((prev) => [...prev, { role: "assistant", content: formatted.join("\n") }]);
			setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
		} catch (err) {
			setError(err.message || "Something went wrong");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
			<div className="flex items-start justify-between gap-4 rounded-t-3xl border-b border-slate-200 bg-slate-50 px-5 py-4">
				<div>
					<h2 className="text-sm font-bold text-slate-900">AI Symptom Checker</h2>
					<p className="mt-1 text-xs text-slate-600">
						Share symptoms for preliminary guidance (not a medical diagnosis).
					</p>
				</div>
				<span className="rounded-lg bg-slate-200 px-2 py-1 text-[11px] font-semibold uppercase text-slate-700">
					Demo
				</span>
			</div>

			<div className="max-h-90 space-y-3 overflow-y-auto px-5 py-4">
				{messages.map((m, idx) => (
					<div
						key={`${m.role}-${idx}`}
						className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
							m.role === "user"
								? "ml-auto bg-blue-600 text-white"
								: "bg-slate-100 text-slate-800"
						}`}
					>
						{m.content.split("\n").map((line, i) => (
							<p key={i} className={i === 0 ? "" : "mt-2"}>
								{line}
							</p>
						))}
					</div>
				))}
				<div ref={bottomRef} />
			</div>

			{error && <div className="px-5 pb-3 text-sm text-red-700">{error}</div>}

			<div className="flex gap-3 border-t border-slate-200 px-5 py-4">
				<input
					value={input}
					onChange={(e) => setInput(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") sendMessage();
					}}
					placeholder="e.g., I have fever and cough for 2 days..."
					className="flex-1 rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
					disabled={isLoading}
				/>
				<button
					type="button"
					onClick={sendMessage}
					disabled={isLoading}
					className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
				>
					{isLoading ? "..." : "Send"}
				</button>
			</div>
		</div>
	);
}

export default SymptomChatbot;
