import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000";

// ── שלב 1: טופס הפרטים האישיים — פעם אחת בלבד, בסשן הראשון ──
// מחליף, לזרימת הנבדק האמיתית, את החלק הזה שהיה קיים ב-IntakePage הישן.
// ה-name שממולא כאן הוא ששם התיקייה בסטוראג' ממשיך להסתמך עליו (ראו
// complete_subject_profile ב-firebase_service.py) — בלי שום קשר לשם
// המשתמש להתחברות. לאחר השמירה, יוצרים ישירות את הסשן הראשון וממשיכים
// לזרימת הבדיקה הקיימת (מצלמה → בדיקה → עיבוד), בלי לשנות אותה בכלל.
export default function SubjectDetailsPage() {
  const nav = useNavigate();
  const [form, setForm] = useState({ name: "", age: "", gender: "", email: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const start = async () => {
    if (!form.name.trim()) { setError("נא להזין שם מלא"); return; }
    if (!form.gender)      { setError("נא לבחור מגדר"); return; }
    setLoading(true); setError("");

    try {
      const user = auth.currentUser;
      if (!user) { nav("/login?mode=signin", { replace: true }); return; }
      const idToken = await user.getIdToken();
      const authHeader = { Authorization: `Bearer ${idToken}` };

      const profileRes = await fetch(
        `${API}/subjects/me/profile?name=${encodeURIComponent(form.name)}&age=${form.age || ""}&gender=${form.gender}&notes=${encodeURIComponent(form.email)}`,
        { method: "POST", headers: authHeader }
      );
      if (!profileRes.ok) throw new Error("שגיאה בשמירת הפרטים האישיים");

      const sessRes = await fetch(
        `${API}/subjects/me/sessions?protocol_version=1.0`,
        { method: "POST", headers: authHeader }
      );
      if (!sessRes.ok) throw new Error("שגיאה ביצירת סשן");
      const { session_id } = await sessRes.json();

      nav(`/camera-permission/${session_id}?gender=${form.gender}`);
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  };

  const isFemale = form.gender === "female";
  const isMale = form.gender === "male";

  return (
    <div className="page">
      <div className="container">
        <div style={{ marginBottom: "2.5rem" }} className="fade-up">
          <h1 style={{ marginBottom: "0.75rem" }}>פרטים אישיים</h1>
          <p style={{ fontSize: "1.1rem", maxWidth: 480 }}>
            עוד רגע לפני הבדיקה — נשלים כמה פרטים.
          </p>
        </div>

        <div className="card fade-up fade-up-delay-1">
          <div className="field">
            <label>שם מלא *</label>
            <input
              placeholder="ישראל ישראלי"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>

          <div className="field">
            <label>מגדר *</label>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              {[
                { value: "male", label: "זכר", icon: "♂" },
                { value: "female", label: "נקבה", icon: "♀" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => set("gender", opt.value)}
                  style={{
                    flex: 1, padding: "14px", borderRadius: 12,
                    border: `1.5px solid ${form.gender === opt.value ? "var(--accent)" : "var(--border)"}`,
                    background: form.gender === opt.value ? "var(--accent-soft)" : "#fff",
                    color: form.gender === opt.value ? "var(--accent)" : "var(--ink-soft)",
                    fontFamily: "'Heebo', sans-serif", fontSize: "1rem",
                    fontWeight: form.gender === opt.value ? 500 : 400,
                    cursor: "pointer", transition: "all 0.15s ease",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  }}
                >
                  <span style={{ fontSize: "1.2rem" }}>{opt.icon}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label>גיל (אופציונלי)</label>
            <input
              type="number" min="10" max="120"
              placeholder="35"
              value={form.age}
              onChange={(e) => set("age", e.target.value)}
            />
          </div>

          <div className="field">
            <label>כתובת מייל *</label>
            <textarea
              rows={3}
              placeholder="example@email.com"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              style={{ resize: "vertical" }}
            />
          </div>

          {error && (
            <div style={{
              padding: "10px 14px", borderRadius: 8,
              background: "var(--coral-soft)", color: "var(--coral)",
              fontSize: "0.9rem", marginBottom: "1rem"
            }}>
              {error}
            </div>
          )}

          <div className="divider" />

          <button className="btn btn-primary btn-lg btn-full" onClick={start} disabled={loading}>
            {loading
              ? <><div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> מכין סשן...</>
              : isFemale ? "התחילי בדיקה →"
              : isMale ? "התחל בדיקה →"
              : "התחל בדיקה →"}
          </button>
        </div>
      </div>
    </div>
  );
}
