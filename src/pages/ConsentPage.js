import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// ── מסך תנאי שימוש והסכמה מדעת ──
// ממוקם מיד לאחר הכניסה לבדיקה (אחרי שער ההתחברות ב-App.js), עוד לפני מילוי
// הפרטים האישיים (IntakePage) — כלומר לפני כל איסוף מידע אישי, לא רק לפני
// המצלמה/ההקלטה. אין עדיין session/subject בשלב הזה, ולכן אין צורך ב-sessionId.
// אי אפשר להמשיך הלאה בלי לסמן את תיבת הסימון.
// המלל כרגע גנרי (placeholder) — יוחלף בהמשך בנוסח המשפטי הסופי של מדיניות
// הפרטיות ותנאי השימוש (ראו שלב 4 בתוכנית העבודה).
//
// המסך הזה מיועד רק לנבדקים אמיתיים — מי שנכנס עם סיסמת המפתח (hai_dev_mode)
// או סיסמת הסוקרים (hai_reviewer_mode) מדלג עליו אוטומטית ועובר ישר ל-/intake,
// כי הוא לא "נבדק" במובן שההסכמה נועדה עבורו.
export default function ConsentPage() {
  const nav = useNavigate();

  const [agreed, setAgreed] = useState(false);

  const isStaff =
    sessionStorage.getItem("hai_dev_mode") === "true" ||
    sessionStorage.getItem("hai_reviewer_mode") === "true";

  useEffect(() => {
    if (isStaff) nav("/staff/intake", { replace: true });
  }, [isStaff, nav]);

  if (isStaff) return null;

  const proceed = () => {
    if (!agreed) return;
    nav("/staff/intake");
  };

  return (
    <div
      className="page"
      style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "1.5rem" }}
    >
      <div className="card fade-up" style={{ maxWidth: 620, width: "100%" }}>
        <h2 style={{ textAlign: "center", marginBottom: "1rem" }}>תנאי שימוש והסכמה מדעת</h2>

        <div
          style={{
            maxHeight: 320,
            overflowY: "auto",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "1.25rem",
            marginBottom: "1.5rem",
            lineHeight: 1.8,
            color: "var(--ink-soft)",
            fontSize: "0.95rem",
            background: "rgba(0,0,0,0.02)",
          }}
        >
          {/* טקסט זמני (placeholder) — יוחלף בנוסח הסופי */}
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
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              border: "2px solid " + (agreed ? "var(--accent)" : "var(--border)"),
              background: agreed ? "var(--accent)" : "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s",
              flexShrink: 0,
            }}
          >
            {agreed && <span style={{ color: "#fff", fontSize: 14 }}>✓</span>}
          </div>
          <span style={{ color: "var(--ink-soft)", fontSize: "0.95rem" }}>
            קראתי ואני מסכים/ה לתנאי השימוש ולמדיניות הפרטיות
          </span>
        </div>

        <div className="divider" />
        <button className="btn btn-primary btn-lg btn-full" onClick={proceed} disabled={!agreed}>
          אני מסכים/ה, המשך
        </button>
      </div>
    </div>
  );
}
