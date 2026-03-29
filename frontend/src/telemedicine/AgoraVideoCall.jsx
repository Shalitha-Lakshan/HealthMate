import { useEffect, useMemo, useRef, useState } from "react";
import AgoraRTC from "agora-rtc-sdk-ng";

function AgoraVideoCall({ appId, channelName, token, uid, mode }) {
	const client = useMemo(() => AgoraRTC.createClient({ mode: "rtc", codec: "vp8" }), []);
	const localVideoRef = useRef(null);
	const remoteContainerRef = useRef(null);
	const tracksRef = useRef({ audio: null, video: null });
	const hasLeftRef = useRef(false);

	const [status, setStatus] = useState("idle");
	const [error, setError] = useState("");

	const leaveCall = async () => {
		try {
			setError("");
			hasLeftRef.current = true;
			const { audio, video } = tracksRef.current || {};
			audio?.stop();
			audio?.close();
			video?.stop();
			video?.close();
			tracksRef.current = { audio: null, video: null };

			client.removeAllListeners();
			await client.leave();
			if (remoteContainerRef.current) remoteContainerRef.current.innerHTML = "";
			setStatus("left");
		} catch (err) {
			setError(err?.message || "Failed to leave call");
		}
	};

	useEffect(() => {
		let cancelled = false;
		let joined = false;
		let localAudioTrack;
		let localVideoTrack;

		const safeSetStatus = (next) => {
			if (!cancelled) setStatus(next);
		};
		const safeSetError = (msg) => {
			if (!cancelled) setError(msg);
		};

		const onUserPublished = async (user, mediaType) => {
			try {
				await client.subscribe(user, mediaType);
				if (cancelled) return;

				if (mediaType === "video") {
					const el = document.createElement("div");
					el.style.width = "100%";
					el.style.height = "100%";
					el.style.minHeight = "280px";
					el.style.borderRadius = "16px";
					el.style.overflow = "hidden";
					el.id = `remote-${user.uid}`;
					if (remoteContainerRef.current) {
						remoteContainerRef.current.innerHTML = "";
						remoteContainerRef.current.appendChild(el);
					}
					user.videoTrack?.play(el);
				}
				if (mediaType === "audio") {
					user.audioTrack?.play();
				}
			} catch {
				// ignore
			}
		};

		const onUserUnpublished = (user) => {
			const el = document.getElementById(`remote-${user.uid}`);
			if (el && el.parentNode) {
				el.parentNode.removeChild(el);
			}
		};

		const join = async () => {
			safeSetStatus("joining");
			safeSetError("");

			try {
				client.removeAllListeners();
				client.on("user-published", onUserPublished);
				client.on("user-unpublished", onUserUnpublished);

				await client.join(appId, channelName, token, uid);
				joined = true;
				if (cancelled) return;

				localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
				localVideoTrack = await AgoraRTC.createCameraVideoTrack();
				tracksRef.current = { audio: localAudioTrack, video: localVideoTrack };
				if (cancelled) return;

				if (localVideoRef.current) {
					localVideoTrack.play(localVideoRef.current);
				}

				await client.publish([localAudioTrack, localVideoTrack]);
				if (cancelled) return;

				safeSetStatus("connected");
			} catch (err) {
				if (cancelled) return;
				safeSetError(err?.message || "Failed to join Agora call");
				safeSetStatus("error");
			}
		};

		if (!hasLeftRef.current && appId && channelName && token && typeof uid !== "undefined") {
			join();
		}

		return () => {
			cancelled = true;
			(async () => {
				try {
					localAudioTrack?.stop();
					localAudioTrack?.close();
					localVideoTrack?.stop();
					localVideoTrack?.close();
					tracksRef.current = { audio: null, video: null };

					client.off("user-published", onUserPublished);
					client.off("user-unpublished", onUserUnpublished);

					if (joined) {
						await client.leave();
					}
				} catch {
					// ignore
				}
			})();
		};
	}, [appId, channelName, token, uid, client]);

	return (
		<div className="grid gap-4">
			<div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
				<p className="text-sm font-semibold text-slate-900">Agora Call</p>
				<div className="flex items-center gap-3">
					<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
						{mode} • {status}
					</p>
					<button
						type="button"
						onClick={leaveCall}
						disabled={status !== "connected"}
						className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
					>
						Leave
					</button>
				</div>
			</div>

			{error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

			<div className="grid gap-4 lg:grid-cols-2">
				<div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-950">
					<div className="p-3">
						<p className="text-xs font-semibold uppercase tracking-wide text-slate-200">You</p>
					</div>
					<div ref={localVideoRef} className="h-72 w-full" />
				</div>

				<div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-900">
					<div className="p-3">
						<p className="text-xs font-semibold uppercase tracking-wide text-slate-200">Remote</p>
					</div>
					<div ref={remoteContainerRef} className="h-72 w-full p-3" />
				</div>
			</div>
		</div>
	);
}

export default AgoraVideoCall;
