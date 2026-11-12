import React, { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, usernameToPseudoEmail } from "../firebaseClient";

// ── שלב 1: טופס ההתחברות בפועל, גם לכניסה ראשונה (עם השם/סיסמא ששלחנו
// מראש) וגם לכניסה חוזרת (עם השם/סיסמא שהנבדק בחר לעצמו באיפוס). שני
// המקרים משתמשים באותו מנגנון התחברות מול Firebase (Email/Password עם
// פסבדו-אימייל) — ה-mode רק קובע את הכותרת/הניסוח במסך, לא את הלוגיקה;
// מה שקובע את ההמשך בפועל (איפוס/טופס פרטים/אישור סשן) הוא מצב החשבון
// עצמו בשרת (needs_reset / profile_completed), ראו SubjectTosPage.
export default function LoginPage() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const mode = params.get("mode") === "signin" ? "signin" : "signup";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("נא להזין שם משתמש וסיסמא");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await signInWithEmailAndPassword(auth, usernameToPseudoEmail(username), password);
      nav("/subject/tos");
    } catch (err) {
      setError("שם משתמש או סיסמה שגויים. אם קיבלת פרטים מאיתנו, נסה/י להקליד אותם בדיוק כמו שנשלחו.");
      setLoading(false);
    }
  };

  return (
    <div className="page" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "1.5rem" }}>
      <div className="container" style={{ maxWidth: 440 }}>
        <div className="card fade-up" style={{ padding: "2.5rem" }}>
          <h2 style={{ marginBottom: "0.5rem", textAlign: "center" }}>
            {mode === "signin" ? "התחברות" : "הרשמה"}
          </h2>
          <p style={{ marginBottom: "1.75rem", textAlign: "center", color: "var(--ink-muted)", fontSize: "0.92rem" }}>
            {mode === "signin"
              ? "הזן/י את שם המשתמש והסיסמא שבחרת לעצמך"
              : "הזן/י את שם המשתמש והסיסמא ששלחנו לך"}
          </p>

          <form onSubmit={submit}>
            <div className="field">
              <label>שם משתמש</label>
              <input
                type="text"
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="hai25001"
              />
            </div>
            <div className="field">
              <label>סיסמא</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
              {loading ? "מתחבר/ת..." : "המשך"}
            </button>
          </form>

          <p style={{ marginTop: "1.5rem", textAlign: "center", fontSize: "0.88rem" }}>
            <Link to="/">← חזרה לעמוד הבית</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
