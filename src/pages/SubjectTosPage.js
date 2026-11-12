import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000";

// ── שלב 1: תנאי שימוש והסכמה מדעת — זרימת הנבדק האמיתית ──
// מופיע מיד אחרי ההתחברות (LoginPage), גם בכניסה ראשונה וגם בכניסה חוזרת
// ("בשני המקרים", כפי שהוגדר). זהו עמוד נפרד מ-ConsentPage הישן (שממשיך
// לשרת את זרימת הסגל ב-/staff ולא נוגעים בו) — אותו טקסט placeholder,
// עד שינוסח הטקסט המשפטי הסופי (שלב 4 בתוכנית העבודה).
//
// אחרי האישור, פונים ל-GET /auth/me כדי לדעת לאן לנתב את הנבדק:
//   needs_reset           → מסך איפוס שם משתמש+סיסמא (זהו תמיד נבדק חדש)
//   needs_reset=False
//     + profile_completed=False → טופס פרטים אישיים (נבדק חדש, במקרה הקצה שהאיפוס כבר בוצע)
//     + profile_completed=True  → מסך אישור "סשן שני/שלישי" (נבדק חוזר)
export default function SubjectTosPage() {
  const nav = useNavigate();
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const proceed = async () => {
    if (!agreed) return;
    setLoading(true);
    setError("");
    try {
      const user = auth.currentUser;
      if (!user) { nav("/login?mode=signin", { replace: true }); return; }
      const idToken = await user.getIdToken();
      const res = await fetch(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) throw new Error("שגיאה בבדיקת מצב החשבון");
      const data = await res.json();

      if (data.needs_reset) {
        nav("/subject/reset");
      } else if (!data.profile_completed) {
        nav("/subject/details");
      } else {
        nav("/subject/confirm");
      }
    } catch (e) {
      setError("משהו השתבש. נסה/י לרענן את העמוד ולהתחבר מחדש.");
      setLoading(false);
    }
  };

  return (
    <div className="page" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "1.5rem" }}>
      <div className="card fade-up" style={{ maxWidth: 620, width: "100%" }}>
        <h2 style={{ textAlign: "center", marginBottom: "1rem" }}>תנאי שימוש והסכמה מדעת</h2>

        <div style={{
          maxHeight: 320, overflowY: "auto", border: "1px solid var(--border)",
          borderRadius: 12, padding: "1.25rem", marginBottom: "1.5rem",
          lineHeight: 1.8, color: "var(--ink-soft)", fontSize: "0.95rem",
          background: "rgba(0,0,0,0.02)",
        }}>
          <p style={{ marginBottom: "1rem" }}>
            זהו טקסט זמני. כאן יופיעו בהמשך תנאי השימוש ומדיניות הפרטיות המלאים של הבדיקה, כולל
            פירוט לגבי סוג המידע הנאסף (בין היתר הקלטת וידאו ואודיו ותוצרים מבוססי ניתוח שלהם),
            מטרת האיסוף, משך השמירה, ומי רשאי לגשת למידע.
          </p>
          <p style={{ marginBottom: "1rem" }}>
            בהמשך יתווסף כאן גם מידע על זכויותיך ביחס למידע שנאסף (לרבות בקשה לעיון או מחיקה),
            ופרטי יצירת קשר לבירורים בנושא.
          </p>
          <p>
            לחיצה על &quot;אני מסכים/ה, המשך&quot; מהווה אישור שקראת את התנאים (בנוסחם הסופי, כפי
            שיפורסם) ואת מדיניות הפרטיות, ושאתה/את מסכים/ה להם.
          </p>
        </div>

        <div
          style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1.5rem", cursor: "pointer" }}
          onClick={() => setAgreed((a) => !a)}
        >
          <div style={{
            width: 22, height: 22, borderRadius: 6,
            border: "2px solid " + (agreed ? "var(--accent)" : "var(--border)"),
            background: agreed ? "var(--accent)" : "transparent",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.15s", flexShrink: 0,
          }}>
            {agreed && <span style={{ color: "#fff", fontSize: 14 }}>✓</span>}
          </div>
          <span style={{ color: "var(--ink-soft)", fontSize: "0.95rem" }}>
            קראתי ואני מסכים/ה לתנאי השימוש ולמדיניות הפרטיות
          </span>
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
        <button className="btn btn-primary btn-lg btn-full" onClick={proceed} disabled={!agreed || loading}>
          {loading ? "בודק/ת..." : "אני מסכים/ה, המשך"}
        </button>
      </div>
    </div>
  );
}
