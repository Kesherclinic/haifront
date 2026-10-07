import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000";

export default function IntakePage() {
  const nav = useNavigate();
  const [form, setForm]       = useState({ name: "", age: "", gender: "", email: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const start = async () => {
    if (!form.name.trim())   { setError("נא להזין שם נבדק"); return; }
    if (!form.gender)        { setError("נא לבחור מגדר"); return; }
    setLoading(true); setError("");

    try {
      const sRes = await fetch(
        `${API}/subjects?name=${encodeURIComponent(form.name)}&age=${form.age || ""}&notes=${encodeURIComponent(form.email)}&gender=${form.gender}`,
        { method: "POST" }
      );
      if (!sRes.ok) throw new Error("שגיאה ביצירת נבדק");
      const { subject_id } = await sRes.json();

      const sessRes = await fetch(
        `${API}/sessions?subject_id=${subject_id}&protocol_version=1.0`,
        { method: "POST" }
      );
      if (!sessRes.ok) throw new Error("שגיאה ביצירת סשן");
      const { session_id } = await sessRes.json();

      // Pass gender in URL so TestPage can use it
      nav(`/camera-permission/${session_id}?gender=${form.gender}`);
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  };

  const isFemale = form.gender === "female";
  const isMale   = form.gender === "male";

  return (
    <div className="page">
      <div className="container">

        <nav className="nav">
          <span className="nav-logo">נטיית <span>הלב</span></span>
          <div className="nav-links">
            <Link to="/history">היסטוריה</Link><Link to="/import">ייבוא נתונים</Link>
            <Link to="/upload">ניתוח סרטון</Link>
          </div>
        </nav>

        <div style={{ marginBottom: "2.5rem" }} className="fade-up">
          <h1 style={{ marginBottom: "0.75rem" }}>בדיקת<br/>נטיית הלב</h1>
          <p style={{ fontSize: "1.1rem", maxWidth: 480 }}>
            ניתוח ביומטרי של תגובות רגשיות לגירויים ויזואליים ושמיעתיים —
            לזיהוי תחומי החיים שהנבדק מתחבר אליהם באמת.
          </p>
        </div>

        <div className="card fade-up fade-up-delay-1">
          <h3 style={{ marginBottom: "1.5rem", fontFamily: "'Heebo', sans-serif", fontWeight: 500 }}>
            פרטי נבדק
          </h3>

          {/* Name */}
          <div className="field">
            <label>שם מלא *</label>
            <input
              placeholder="ישראל ישראלי"
              value={form.name}
              onChange={e => set("name", e.target.value)}
            />
          </div>

          {/* Gender */}
          <div className="field">
            <label>מגדר *</label>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              {[
                { value: "male",   label: "זכר",  icon: "♂" },
                { value: "female", label: "נקבה", icon: "♀" },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => set("gender", opt.value)}
                  style={{
                    flex: 1,
                    padding: "14px",
                    borderRadius: 12,
                    border: `1.5px solid ${form.gender === opt.value ? "var(--accent)" : "var(--border)"}`,
                    background: form.gender === opt.value ? "var(--accent-soft)" : "#fff",
                    color: form.gender === opt.value ? "var(--accent)" : "var(--ink-soft)",
                    fontFamily: "'Heebo', sans-serif",
                    fontSize: "1rem",
                    fontWeight: form.gender === opt.value ? 500 : 400,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <span style={{ fontSize: "1.2rem" }}>{opt.icon}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Age */}
          <div className="field">
            <label>גיל (אופציונלי)</label>
            <input
              type="number" min="10" max="120"
              placeholder="35"
              value={form.age}
              onChange={e => set("age", e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="field">
            <label>כתובת מייל *</label>
            <textarea
              rows={3}
              placeholder="example@email.com"
              value={form.email}
              onChange={e => set("email", e.target.value)}
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

          {/* Consent — gender-aware */}
          <p style={{ fontSize: "0.82rem", color: "var(--ink-muted)", marginBottom: "1.25rem" }}>
            {isFemale
              ? "הנבדקת מאשרת השתתפות מרצון. הוידאו נשמר מוצפן ולא מועבר לצד שלישי. הנבדקת רשאית לבטל בכל עת."
              : isMale
              ? "הנבדק מאשר השתתפות מרצון. הוידאו נשמר מוצפן ולא מועבר לצד שלישי. הנבדק רשאי לבטל בכל עת."
              : "הנבדק/ת מאשר/ת השתתפות מרצון. הוידאו נשמר מוצפן ולא מועבר לצד שלישי."}
          </p>

          <button
            className="btn btn-primary btn-lg btn-full"
            onClick={start}
            disabled={loading}
          >
            {loading
              ? <><div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> מכין סשן...</>
              : isFemale ? "התחילי בדיקה →"
              : isMale   ? "התחל בדיקה →"
              : "התחל בדיקה →"}
          </button>
        </div>

        <p style={{ fontSize: "0.82rem", color: "var(--ink-muted)", textAlign: "center", marginTop: "1.25rem" }}>
          פרוטוקול HAI v1.0 &nbsp;·&nbsp; DeepFace + SpeechBrain &nbsp;·&nbsp; Firebase
        </p>

      </div>
    </div>
  );
}
