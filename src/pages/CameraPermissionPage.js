import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

export default function CameraPermissionPage() {
  const nav = useNavigate();
  const { sessionId } = useParams();
  const [searchParams] = useSearchParams();
  const gender = searchParams.get("gender") || "";

  const [status, setStatus] = useState("requesting"); // requesting | denied | error
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setStatus("requesting");

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        stream.getTracks().forEach((t) => t.stop());
        if (!cancelled) {
          nav(`/camera-setup/${sessionId}?gender=${gender}`);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setStatus(err && err.name === "NotAllowedError" ? "denied" : "error");
      });

    return () => {
      cancelled = true;
    };
  }, [sessionId, gender, nav, attempt]);

  const retry = () => setAttempt((a) => a + 1);

  return (
    <div
      className="page"
      style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}
    >
      <div className="card fade-up" style={{ maxWidth: 480, width: "100%", textAlign: "center", padding: "3rem 2rem" }}>
        {status === "requesting" && (
          <>
            <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3, margin: "0 auto 1.5rem" }} />
            <h2 style={{ marginBottom: "0.75rem" }}>מבקש הרשאת מצלמה ומיקרופון</h2>
            <p style={{ color: "var(--ink-soft)" }}>
              אשר/י את הבקשה שתופיע בדפדפן כדי להמשיך לבדיקה
            </p>
          </>
        )}

        {status === "denied" && (
          <>
            <h2 style={{ marginBottom: "0.75rem", color: "var(--accent)" }}>הגישה למצלמה נחסמה</h2>
            <p style={{ color: "var(--ink-soft)", marginBottom: "1.5rem" }}>
              הבדיקה דורשת גישה למצלמה ולמיקרופון. יש לאפשר גישה בהגדרות הדפדפן
              (בדרך כלל בלחיצה על סמל המנעול / המצלמה בשורת הכתובת) ואז לנסות שוב.
            </p>
            <button className="btn btn-primary btn-lg btn-full" onClick={retry}>
              נסה/י שוב
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <h2 style={{ marginBottom: "0.75rem", color: "var(--accent)" }}>לא הצלחנו לגשת למצלמה</h2>
            <p style={{ color: "var(--ink-soft)", marginBottom: "1.5rem" }}>
              ודא/י שאין תוכנה אחרת שמשתמשת כרגע במצלמה או במיקרופון, ונסה/י שוב.
            </p>
            <button className="btn btn-primary btn-lg btn-full" onClick={retry}>
              נסה/י שוב
            </button>
          </>
        )}
      </div>
    </div>
  );
}
