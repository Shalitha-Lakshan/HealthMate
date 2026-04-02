import { useEffect, useMemo, useRef, useState } from "react";

const AI_BASE_URL = import.meta.env.VITE_AI_BASE_URL || "http://localhost:5010";

function formatTime(d) {
	try {
		return new Intl.DateTimeFormat(undefined, {
			hour: "2-digit",
			minute: "2-digit",
		}).format(d);
	} catch {
		return "";
	}
}

function InitialsBadge({ label }) {
	const initials = String(label || "AI")
		.trim()
		.split(/\s+/)
		.slice(0, 2)
		.map((p) => p[0]?.toUpperCase())
		.join("");

	return (
		<div className="grid h-9 w-9 place-items-center rounded-full bg-linear-to-br from-emerald-500 to-blue-600 text-xs font-bold text-white shadow-sm">
			{initials || "AI"}
		</div>
	);
}

function SymptomChatbot() {
	const [input, setInput] = useState("");
	const [messages, setMessages] = useState([
		{
			id: crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()),
			role: "assistant",
			content:
				"Hi — I’m your HealthMate assistant. Tell me your symptoms (what you feel, how long, your age, and any medical conditions). I’ll suggest likely specialties and safe next steps.",
			createdAt: new Date().toISOString(),
		},
	]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState("");
	const bottomRef = useRef(null);
	const inputRef = useRef(null);

	const history = useMemo(
		() => messages.map((m) => ({ role: m.role, content: m.content })),
		[messages]
	);

	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages.length]);

	const quickPrompts = [
		"I have a fever and sore throat for 2 days. I'm 22.",
		"Sharp stomach pain + vomiting since last night. I'm 30.",
		"Chest tightness and shortness of breath for 1 hour.",
		"Rash and itching after trying new food. Started today.",
	];

	const sendMessage = async (overrideText) => {
		const text = String(overrideText ?? input).trim();
		if (!text || isLoading) return;

		setError("");
		setIsLoading(true);
		setInput("");

		const nextMessages = [
			...messages,
			{
				id: crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()),
				role: "user",
				content: text,
				createdAt: new Date().toISOString(),
			},
		];
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

			const formatted = [];
			if (payload.message) formatted.push(payload.message);

			if (payload.specialties?.length) {
				formatted.push("");
				formatted.push(`Recommended specialty: ${payload.specialties.join(", ")}`);
			}
			if (payload.suggestions?.length) {
				formatted.push("");
				payload.suggestions.slice(0, 3).forEach((s) => {
					formatted.push(`• ${s.specialty}: ${s.advice}`);
				});
			}
			if (payload.disclaimer) {
				formatted.push("");
				formatted.push(payload.disclaimer);
			}

			setMessages((prev) => [
				...prev,
				{
					id: crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()),
					role: "assistant",
					content: formatted.join("\n").trim() || "I’m here — could you share a bit more detail?",
					createdAt: new Date().toISOString(),
				},
			]);
			setTimeout(() => inputRef.current?.focus(), 0);
		} catch (err) {
			setError(err?.message || "Something went wrong");
		} finally {
			setIsLoading(false);
		}
	};

	const clearChat = () => {
		setError("");
		setIsLoading(false);
		setInput("");
		setMessages([
			{
				id: crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()),
				role: "assistant",
				content:
					"Let’s start fresh. Describe your symptoms (what you feel, how long, your age, and any medical conditions).",
				createdAt: new Date().toISOString(),
			},
		]);
		setTimeout(() => inputRef.current?.focus(), 0);
	};

	return (
		<div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
			{/* Header */}
			<div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-linear-to-r from-emerald-50 via-white to-blue-50 px-5 py-4">
				<div className="flex items-start gap-3">
					<InitialsBadge label="HM" />
					<div>
						<h2 className="text-sm font-bold text-slate-900">HealthMate Symptom Assistant</h2>
						<p className="mt-1 text-xs text-slate-600">
							Share symptoms for preliminary guidance — not a medical diagnosis.
						</p>
						<div className="mt-2 flex flex-wrap items-center gap-2">
							<span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200">
								<span
									className={`h-1.5 w-1.5 rounded-full ${
										isLoading ? "bg-amber-500" : "bg-emerald-500"
									}`}
								/>
								{isLoading ? "Analyzing…" : "Ready"}
							</span>
							<span className="inline-flex items-center rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white">
								Private
							</span>
						</div>
					</div>
				</div>

				<button
					type="button"
					onClick={clearChat}
					className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
				>
					Clear
				</button>
			</div>

			{/* Quick prompts */}
			<div className="border-b border-slate-200 bg-white px-5 py-3">
				<p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
					Quick examples
				</p>
				<div className="mt-2 flex flex-wrap gap-2">
					{quickPrompts.map((p) => (
						<button
							key={p}
							type="button"
							onClick={() => sendMessage(p)}
							disabled={isLoading}
							className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
						>
							{p}
						</button>
					))}
				</div>
			</div>

			{/* Messages */}
			<div className="max-h-105 space-y-4 overflow-y-auto bg-slate-50/40 px-5 py-4">
				{messages.map((m) => {
					const isUser = m.role === "user";
					return (
						<div
							key={m.id}
							className={`flex items-end gap-2 ${isUser ? "justify-end" : "justify-start"}`}
						>
							{!isUser && <InitialsBadge label="AI" />}
							<div className={`max-w-[92%] ${isUser ? "items-end" : "items-start"}`}>
								<div
									className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ring-1 ${
										isUser
											? "bg-blue-600 text-white ring-blue-600/20"
											: "bg-white text-slate-800 ring-slate-200"
									}`}
								>
									{String(m.content)
										.split("\n")
										.filter((line) => line !== "")
										.map((line, i) => (
											<p key={i} className={i === 0 ? "" : "mt-2"}>
												{line}
											</p>
										))}
								</div>
								<p className="mt-1 text-[11px] text-slate-500">
									{m.createdAt ? formatTime(new Date(m.createdAt)) : ""}
								</p>
							</div>
						</div>
					);
				})}

				{isLoading && (
					<div className="flex items-end gap-2">
						<InitialsBadge label="AI" />
						<div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-700 shadow-sm ring-1 ring-slate-200">
							<span className="inline-flex items-center gap-2">
								<span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
								<span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500 [animation-delay:120ms]" />
								<span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500 [animation-delay:240ms]" />
							</span>
						</div>
					</div>
				)}

				<div ref={bottomRef} />
			</div>

			{/* Error */}
			{error && (
				<div className="border-t border-slate-200 bg-rose-50 px-5 py-3 text-sm text-rose-800">
					{error}
				</div>
			)}

			{/* Input */}
			<div className="border-t border-slate-200 bg-white px-5 py-4">
				<div className="flex items-end gap-3">
					<div className="flex-1">
						<label className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
							Your message
						</label>
						<textarea
							ref={inputRef}
							value={input}
							onChange={(e) => setInput(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter" && !e.shiftKey) {
									e.preventDefault();
									sendMessage();
								}
							}}
							rows={2}
							placeholder="Example: fever and cough for 2 days, age 24, no chronic conditions…"
							className="w-full resize-none rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm leading-relaxed text-slate-900 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
							disabled={isLoading}
						/>
						<p className="mt-2 text-xs text-slate-500">
							Tip: include age, duration, severity, medications, and allergies.
						</p>
					</div>
					<button
						type="button"
						onClick={() => sendMessage()}
						disabled={isLoading || !input.trim()}
						className="inline-flex h-11.5 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
					>
						{isLoading ? "Sending…" : "Send"}
					</button>
				</div>
			</div>
		</div>
	);
}

export default SymptomChatbot;
