import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebaseClient";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000";

// ── שלב 1: איפוס חד-פעמי לכניסה ראשונה ──
// מוצג רק לנבדק שעדיין משתמש בשם המשתמש/סיסמא ששלחנו לו מראש
// (needs_reset=True בשרת — ראו SubjectTosPage, שמנתב לכאן רק במקרה הזה).
// מבקש ממנו לבחור שם משתמש חדש משלו (לדוגמה שמו האמיתי באנגלית) וסיסמא
// חדשה, לפני שהוא ממשיך. זה *לא* משנה את השם שישמש לתיקייה בסטוראג' —
// זה נקבע רק דרך טופס הפרטים האישיים (SubjectDetailsPage), בעמוד הבא.
export default function SubjectResetPage() {
  const nav = useNavigate();
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (newUsername.trim().length < 3) {
      setError("שם המשתמש חייב להיות באורך 3 תווים לפחות"); return;
    }
    if (newPassword.length < 6) {
      setError("הסיסמא חייבת להיות באורך 6 תווים לפחות"); return;
    }
    if (newPassword !== confirmPassword) {
      setError("הסיסמאות שהוזנו לא תואמות"); return;
    }

    setLoading(true); setError("");
    try {
      const user = auth.currentUser;
      if (!user) { nav("/login?mode=signin", { replace: true }); return; }
      const idToken = await user.getIdToken();
      const res = await fetch(
        `${API}/auth/reset?new_username=${encodeURIComponent(newUsername.trim())}&new_password=${encodeURIComponent(newPassword)}`,
        { method: "POST", headers: { Authorization: `Bearer ${idToken}` } }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || "שגיאה בעדכון הפרטים");
      }
      // האיפוס שינה גם את ה-"אימייל" הפנימי של המשתמש בפיירבייס — מרעננים
      // את הטוקן המקומי כדי שהבקשה הבאה תזהה אותו נכון.
      await user.getIdToken(true);
      nav("/subject/details");
    } catch (e) {
      setError(e.message || "שגיאה בעדכון הפרטים");
      setLoading(false);
    }
  };

  return (
    <div className="page" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "1.5rem" }}>
      <div className="container" style={{ maxWidth: 440 }}>
        <div className="card fade-up" style={{ padding: "2.5rem" }}>
          <h2 style={{ marginBottom: "0.5rem", textAlign: "center" }}>בחר/י שם משתמש וסיסמא</h2>
          <p style={{ marginBottom: "1.75rem", textAlign: "center", color: "var(--ink-muted)", fontSize: "0.92rem" }}>
            זו הכניסה הראשונה שלך. כדי שתוכל/י להתחבר בעצמך בפעם הבאה, נבחר
            עכשיו שם משתמש וסיסמא משלך (לדוגמה, השם שלך באנגלית).
          </p>

          <form onSubmit={submit}>
            <div className="field">
              <label>שם משתמש חדש</label>
              <input
                type="text" autoFocus
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="dana_cohen"
              />
            </div>
            <div className="field">
              <label>סיסמא חדשה</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="field">
              <label>אימות סיסמא</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
            <button className="btn btn-primary btn-lg btn-full" type="submit" disabled={loading}>
              {loading ? "שומר/ת..." : "שמור והמשך →"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
