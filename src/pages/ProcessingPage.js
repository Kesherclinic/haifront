import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000";

const STAGES = {
  processing:           "מעבד וידאו...",
  facial_analysis:      "מנתח הבעות פנים (DeepFace)...",
  audio_analysis:       "מנתח רגש קולי (SpeechBrain)...",
  affinity_calculation: "מחשב מדד נטיית הלב...",
  complete:             "הניתוח הושלם ✓",
};

export default function ProcessingPage() {
  const { sessionId } = useParams();
  const nav = useNavigate();
  const [status, setStatus]   = useState({ status: "processing", progress: 0, stage: "processing" });
  const [dots, setDots]       = useState(".");

  // Animated dots
  useEffect(() => {
    const t = setInterval(() => setDots(d => d.length >= 3 ? "." : d + "."), 500);
    return () => clearInterval(t);
  }, []);

  // Poll for status
  useEffect(() => {
    const poll = setInterval(async () => {
      try {
        const res = await fetch(`${API}/sessions/${sessionId}`);
        const data = await res.json();
        setStatus(data);
        if (data.status === "complete") {
          clearInterval(poll);
          setTimeout(() => nav(`/results/${sessionId}`), 800);
        }
        if (data.status === "error") {
          clearInterval(poll);
        }
      } catch {}
    }, 2000);
    return () => clearInterval(poll);
  }, [sessionId, nav]);

  const stageLabel = STAGES[status.stage] || STAGES[status.status] || "מעבד...";
  const progress   = status.progress || 0;

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 520 }}>
        <div className="card fade-up" style={{ textAlign: "center", padding: "3.5rem 2.5rem" }}>

          {status.status === "error" ? (
            <>
              <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>⚠️</div>
              <h2 style={{ marginBottom: "0.75rem" }}>שגיאה בניתוח</h2>
              <p style={{ marginBottom: "1.5rem" }}>{status.error || "אירעה שגיאה בעיבוד הוידאו"}</p>
              <button className="btn btn-secondary" onClick={() => nav("/")}>חזור להתחלה</button>
            </>
          ) : (
            <>
              {/* Animated brain/analysis icon */}
              <div style={{ marginBottom: "2rem", position: "relative", display: "inline-block" }}>
                <div style={{
                  width: 80, height: 80, borderRadius: "50%",
                  background: "var(--accent-soft)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "2.2rem"
                }}>
                  🧠
                </div>
                {status.status !== "complete" && (
                  <div style={{
                    position: "absolute", inset: -4,
                    borderRadius: "50%",
                    border: "3px solid transparent",
                    borderTopColor: "var(--accent)",
                    animation: "spin 1.2s linear infinite"
                  }} />
                )}
              </div>

              <h2 style={{ marginBottom: "0.5rem" }}>
                {status.status === "complete" ? "הניתוח הושלם" : `מנתח${dots}`}
              </h2>
              <p style={{ marginBottom: "2rem", minHeight: 24 }}>
                {status.status === "complete"
                  ? "מעביר לדוח התוצאות..."
                  : stageLabel}
              </p>

              {/* Progress bar */}
              <div style={{ marginBottom: "0.5rem" }}>
                <div className="progress-bar" style={{ height: 6 }}>
                  <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
                </div>
              </div>
              <p style={{ fontSize: "0.82rem", color: "var(--ink-muted)" }}>{progress}%</p>

              {/* Stage steps */}
              <div style={{ marginTop: "2rem", textAlign: "right" }}>
                {Object.entries(STAGES).slice(0, -1).map(([key, label], i) => {
                  const stageOrder = ["processing","facial_analysis","audio_analysis","affinity_calculation"];
                  const currentIdx = stageOrder.indexOf(status.stage);
                  const isDone = i < currentIdx || status.status === "complete";
                  const isActive = key === status.stage;
                  return (
                    <div key={key} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "8px 0",
                      borderBottom: i < 3 ? "1px solid var(--border)" : "none",
                      color: isDone ? "var(--teal)" : isActive ? "var(--ink)" : "var(--ink-muted)"
                    }}>
                      <span style={{ fontSize: "0.85rem", minWidth: 16, textAlign: "center" }}>
                        {isDone ? "✓" : isActive ? "→" : "○"}
                      </span>
                      <span style={{ fontSize: "0.9rem" }}>{label.replace("...", "")}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <p style={{ fontSize: "0.82rem", color: "var(--ink-muted)", textAlign: "center", marginTop: "1rem" }}>
          סשן: <span className="mono">{sessionId?.slice(0, 8)}...</span>
        </p>
      </div>
    </div>
  );
}
