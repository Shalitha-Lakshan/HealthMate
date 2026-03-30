import { useEffect, useMemo, useState } from "react";
import { getStoredUser } from "../utils/auth";
import AgoraVideoCall from "../telemedicine/AgoraVideoCall";

const TELEMEDICINE_BASE_URL = import.meta.env.VITE_TELEMEDICINE_BASE_URL || "http://localhost:5007";

function DoctorTelemedicinePage() {
	const user = useMemo(() => getStoredUser() || {}, []);
	const displayName = useMemo(() => user?.name || user?.email || "Doctor", [user]);

	const [roomId, setRoomId] = useState(crypto?.randomUUID?.() || `room-${Date.now()}`);
	const [agoraSession, setAgoraSession] = useState(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState("");

	useEffect(() => {
		setAgoraSession(null);
		setError("");
	}, []);

	const createSession = async () => {
		setIsLoading(true);
		setError("");
		setAgoraSession(null);
		try {
			const response = await fetch(`${TELEMEDICINE_BASE_URL}/api/telemedicine/sessions`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					roomId,
					displayName,
					role: "doctor",
				}),
			});

			const payload = await response.json().catch(() => ({}));
			if (!response.ok) {
				throw new Error(payload?.message || `Failed to create session (HTTP ${response.status})`);
			}

			setAgoraSession(payload);
		} catch (err) {
			setError(err.message || "Something went wrong");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
			<section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
				<h2 className="text-lg font-bold text-slate-900">Start a telemedicine session</h2>
				<p className="mt-2 text-sm text-slate-600">Create a secure Agora session and share the room ID with the patient.</p>

				<div className="mt-5 grid gap-4">
					<label className="grid gap-2">
						<span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Room ID</span>
						<input
							value={roomId}
							onChange={(e) => setRoomId(e.target.value)}
							className="rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
							placeholder="e.g. appointment-12345"
						/>
					</label>

					<button
						type="button"
						onClick={createSession}
						disabled={!roomId || isLoading}
						className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
					>
						{isLoading ? "Creating..." : "Create session"}
					</button>

					{error && (
						<div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
					)}

					{agoraSession && (
						<div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
							<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Share with patient</p>
							<p className="mt-2 text-sm text-slate-700">
								Room ID: <span className="font-semibold">{roomId}</span>
							</p>
							<p className="mt-1 text-xs text-slate-500">Patient should join using the same Room ID.</p>
						</div>
					)}
				</div>
			</section>

			<section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
				<h2 className="text-lg font-bold text-slate-900">Video call portal (Agora)</h2>
				<p className="mt-2 text-sm text-slate-600">Allow microphone/camera permissions when prompted.</p>

				{agoraSession ? (
					<div className="mt-4">
						<AgoraVideoCall
							appId={agoraSession.appId}
							channelName={agoraSession.channelName}
							token={agoraSession.token}
							uid={agoraSession.uid}
							mode="doctor"
						/>
					</div>
				) : (
					<div className="mt-4 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-sm text-slate-600">
						Create a session to start the video call.
					</div>
				)}
			</section>
		</div>
	);
}

export default DoctorTelemedicinePage;
