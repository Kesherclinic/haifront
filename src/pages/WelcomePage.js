import React from "react";
import { useNavigate } from "react-router-dom";

// ── שלב 1 (תוכנית העבודה — אבטחה ופרטיות): עמוד הכניסה החדש לנבדקים ──
// מחליף את הגישה הישנה של סיסמה משותפת אחת לכולם (AccessGate) — כל נבדק
// מקבל ממך (מראש, בוואטסאפ/מייל) שם משתמש וסיסמא אישיים משלו, ונכנס איתם
// כאן. "הרשמה" = כניסה ראשונה עם הפרטים ששלחת (ואז מתבקש לבחור שם משתמש
// וסיסמא משלו); "התחברות" = חזרה לבדיקה שנייה/שלישית עם הפרטים שהוא בחר
// לעצמו באותו איפוס ראשוני.
//
// עמוד זה נמצא כעת ב-"/", והוא הציבורי — לא דורש שום סיסמה משותפת כדי
// להגיע אליו (בניגוד לעמודי הסגל הישנים ב-/staff, שעדיין דורשים את סיסמת
// Kesher/Mainkesher/KesherReview, בלי שינוי).
export default function WelcomePage() {
  const nav = useNavigate();

  return (
    <div className="page" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "1.5rem" }}>
      <div className="container" style={{ maxWidth: 480 }}>
        <div className="card fade-up" style={{ textAlign: "center", padding: "3rem 2.5rem" }}>
          <h1 style={{ marginBottom: "1rem", fontSize: "1.9rem" }}>
            ברוכים הבאים<br />
            ל<span style={{ color: "var(--accent)" }}>נטיית הלב</span>
          </h1>
          <p style={{ marginBottom: "2.5rem", color: "var(--ink-soft)", fontSize: "1.05rem", lineHeight: 1.7 }}>
            תודה שהסכמתם לקחת חלק בפיילוט המחקרי של המרפאה.
          </p>

          <button
            className="btn btn-primary btn-lg btn-full"
            style={{ marginBottom: "0.9rem" }}
            onClick={() => nav("/login?mode=signup")}
          >
            הרשמה — נכנס/ת בפעם הראשונה
          </button>

          <button
            className="btn btn-secondary btn-lg btn-full"
            onClick={() => nav("/login?mode=signin")}
          >
            התחברות — נבדק/ת רשום/ה
          </button>

          <p style={{ marginTop: "2rem", fontSize: "0.82rem", color: "var(--ink-muted)" }}>
            אם קיבלת/ת מאיתנו שם משתמש וסיסמא — לחץ/י על &quot;הרשמה&quot; בכניסה הראשונה שלך.
          </p>
        </div>
      </div>
    </div>
  );
}
