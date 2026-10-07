import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

export default function CameraSetupPage() {
  const nav = useNavigate();
  const { sessionId } = useParams();
  const [searchParams] = useSearchParams();
  const gender = searchParams.get("gender") || "";

  const videoRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let stream;
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((s) => {
        stream = s;
        if (videoRef.current) videoRef.current.srcObject = s;
      })
      .catch(() => nav(`/camera-permission/${sessionId}?gender=${gender}`));

    return () => stream && stream.getTracks().forEach((t) => t.stop());
  }, [sessionId, gender, nav]);

  const proceed = () => nav(`/test/${sessionId}?gender=${gender}`);

  const silhouette =
    "M 200 35 C 165 35 145 60 145 95 C 145 122 158 140 172 150 " +
    "C 130 165 100 200 90 300 L 310 300 " +
    "C 300 200 270 165 228 150 C 242 140 255 122 255 95 " +
    "C 255 60 235 35 200 35 Z";

  return (
    <div
      className="page"
      style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}
    >
      <div className="card fade-up" style={{ maxWidth: 560, width: "100%" }}>
        <h2 style={{ textAlign: "center", marginBottom: "0.5rem" }}>מיקום מול המצלמה</h2>
        <p style={{ textAlign: "center", color: "var(--ink-soft)", marginBottom: "1.25rem", fontSize: "0.95rem" }}>
          וודא שהראש והכתפיים שלך נמצאים בתוך המסגרת
        </p>

        <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", background: "#111", marginBottom: "1.25rem" }}>
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            style={{ width: "100%", display: "block", transform: "scaleX(-1)" }}
          />
          <svg
            viewBox="0 0 400 300"
            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" }}
          >
            <defs>
              <mask id="cutout">
                <rect width="400" height="300" fill="white" />
                <path d={silhouette} fill="black" />
              </mask>
            </defs>
            <rect width="400" height="300" fill="rgba(0,0,0,0.55)" mask="url(#cutout)" />
            <path d={silhouette} fill="none" stroke="#3fb950" strokeWidth="3" />
            <circle cx="200" cy="95" r="4" fill="#3fb950" />
            <text x="200" y="20" textAnchor="middle" fill="rgba(255,255,255,0.9)" fontSize="13" fontFamily="Heebo, sans-serif">
              יישר את עצמך עם המסגרת
            </text>
          </svg>
        </div>

        <ul style={{ paddingRight: "1.25rem", lineHeight: 2, color: "var(--ink-soft)", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
          <li>שב במרחק של כ-60 ס&quot;מ מהמצלמה</li>
          <li>וודא שהפנים מוארות היטב</li>
          <li>השאר את הראש בתוך המסגרת לאורך הבדיקה</li>
        </ul>

        <div
          style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1.25rem", cursor: "pointer" }}
          onClick={() => setReady((r) => !r)}
        >
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              border: "2px solid " + (ready ? "var(--accent)" : "var(--border)"),
              background: ready ? "var(--accent)" : "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s",
              flexShrink: 0,
            }}
          >
            {ready && <span style={{ color: "#fff", fontSize: 14 }}>✓</span>}
          </div>
          <span style={{ color: "var(--ink-soft)", fontSize: "0.9rem" }}>
            אני ממוקם נכון מול המצלמה ומוכן להתחיל
          </span>
        </div>

        <div className="divider" />
        <button className="btn btn-primary btn-lg btn-full" onClick={proceed} disabled={!ready}>
          התחל בדיקה
        </button>
      </div>
    </div>
  );
}