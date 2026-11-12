import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebaseClient";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000";

// ── שלב 1: מסך אישור לנבדק חוזר ──
// מוצג במקום טופס הפרטים האישיים כשהנבדק כבר מילא אותו בעבר
// (profile_completed=True) — ראו SubjectTosPage, שמנתב לכאן. מציג לנבדק
// במפורש איזה סשן זה (שני/שלישי/וכו', לפי session_count שהשרת סופר
// אוטומטית בכל פעם שווידאו נשמר בהצלחה — ראו increment_session_count
// ב-firebase_service.py), ומחייב אישור מודע ומפורש (לא אוטומטי/שקוף)
// לפני שממשיכים, בדיוק כמו שהתבקש.
const ORDINAL_HE = { 2: "שני", 3: "שלישי", 4: "רביעי", 5: "חמישי" };

export default function SubjectConfirmPage() {
  const nav = useNavigate();
  const [info, setInfo] = useState(null);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const user = auth.currentUser;
        if (!user) { nav("/login?mode=signin", { replace: true }); return; }
        const idToken = await user.getIdToken();
        const res = await fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${idToken}` } });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setInfo(data);
      } catch {
        setError("לא הצלחנו לטעון את פרטי החשבון. נסה/י לרענן את העמוד.");
      }
    })();
  }, [nav]);

  const nextSessionNumber = (info?.session_count || 0) + 1;
  const ordinal = ORDINAL_HE[nextSessionNumber] || `מספר ${nextSessionNumber}`;

  const confirmAndStart = async () => {
    setStarting(true); setError("");
    try {
      const user = auth.currentUser;
      const idToken = await user.getIdToken();
      const res = await fetch(`${API}/subjects/me/sessions?protocol_version=1.0`, {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) throw new Error("שגיאה ביצירת סשן");
      const { session_id } = await res.json();
      const genderParam = info?.gender ? `?gender=${info.gender}` : "";
      nav(`/camera-permission/${session_id}${genderParam}`);
    } catch (e) {
      setError("שגיאה בהתחלת הסשן. נסה/י שוב.");
      setStarting(false);
    }
  };

  return (
    <div className="page" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "1.5rem" }}>
      <div className="container" style={{ maxWidth: 480 }}>
        <div className="card fade-up" style={{ textAlign: "center", padding: "3rem 2.5rem" }}>
          {!info && !error ? (
            <p>טוען...</p>
          ) : error ? (
            <>
              <p style={{ color: "var(--coral)", marginBottom: "1.5rem" }}>{error}</p>
              <button className="btn btn-secondary" onClick={() => window.location.reload()}>רענון</button>
            </>
          ) : (
            <>
              <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>👋</div>
              <h2 style={{ marginBottom: "0.75rem" }}>
                {info.name ? `שלום, ${info.name}` : "שלום, נבדק/ת יקר/ה"}
              </h2>
              <p style={{ marginBottom: "0.5rem", fontSize: "1.05rem" }}>
                זהו הסשן ה{ordinal} שלך בבדיקה.
              </p>
              <p style={{ marginBottom: "2rem", color: "var(--ink-muted)" }}>
                לפני שממשיכים, נבקש ממך לאשר שזה אכן המשך הבדיקה שלך.
              </p>
              <button className="btn btn-primary btn-lg btn-full" onClick={confirmAndStart} disabled={starting}>
                {starting ? "מתחיל/ה..." : `מאשר/ת — התחל/י סשן ${nextSessionNumber} →`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
