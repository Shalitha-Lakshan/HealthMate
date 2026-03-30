import { useMemo, useState } from "react";
import { getStoredUser } from "../utils/auth";
import AgoraVideoCall from "../telemedicine/AgoraVideoCall";

const TELEMEDICINE_BASE_URL = import.meta.env.VITE_TELEMEDICINE_BASE_URL || "http://localhost:5007";

function PatientTelemedicinePage() {
	const user = useMemo(() => getStoredUser() || {}, []);
	const displayName = useMemo(() => user?.name || user?.email || "Patient", [user]);

	const [roomId, setRoomId] = useState("");
	const [agoraSession, setAgoraSession] = useState(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState("");

	const joinSession = async () => {
		setIsLoading(true);
		setError("");
		setAgoraSession(null);

		try {
			const response = await fetch(`${TELEMEDICINE_BASE_URL}/api/telemedicine/sessions`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ roomId, displayName, role: "patient" }),
			});

			const payload = await response.json().catch(() => ({}));
			if (!response.ok) {
				throw new Error(payload?.message || `Failed to join session (HTTP ${response.status})`);
			}

			setAgoraSession(payload);
		} catch (err) {
			setError(err.message || "Something went wrong");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
			<section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
				<h2 className="text-lg font-bold text-slate-900">Join telemedicine session</h2>
				<p className="mt-2 text-sm text-slate-600">
					Enter the Room ID provided by your doctor to join the Agora call.
				</p>

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
						onClick={joinSession}
						disabled={!roomId || isLoading}
						className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
					>
						{isLoading ? "Joining..." : "Join session"}
					</button>

					{error && (
						<div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
							{error}
						</div>
					)}

					{agoraSession && (
						<div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
							<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Connected</p>
							<p className="mt-2 text-sm text-slate-700">
								Room ID:{" "}
								<span className="font-semibold">{roomId}</span>
							</p>
						</div>
					)}
				</div>
			</section>

			<section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
				<h2 className="text-lg font-bold text-slate-900">Video call portal (Agora)</h2>
				<p className="mt-2 text-sm text-slate-600">
					Allow microphone/camera permissions when prompted.
				</p>

				{agoraSession ? (
					<div className="mt-4">
						<AgoraVideoCall
							appId={agoraSession.appId}
							channelName={agoraSession.channelName}
							token={agoraSession.token}
							uid={agoraSession.uid}
							mode="patient"
						/>
					</div>
				) : (
					<div className="mt-4 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-sm text-slate-600">
						Join a session to start the video call.
					</div>
				)}
			</section>
		</div>
	);
}

export default PatientTelemedicinePage;
