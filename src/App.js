import React, { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import IntakePage    from "./pages/IntakePage";
import ConsentPage   from "./pages/ConsentPage";
import TestPage      from "./pages/TestPage";
import ProcessingPage from "./pages/ProcessingPage";
import ResultsPage   from "./pages/ResultsPage";
import HistoryPage   from "./pages/HistoryPage";
import UploadAnalysisPage from './pages/UploadAnalysisPage';
import ImportPage    from "./pages/ImportPage";
import CameraPermissionPage from "./pages/CameraPermissionPage";
import CameraSetupPage from "./pages/CameraSetupPage";
import "./App.css";
import DevNav from "./components/DevNav";

// ── שלב 1 (תוכנית העבודה — אבטחה ופרטיות): זרימת הנבדק האמיתית ──
// עמודים חדשים — החלפה מלאה לשער הסיסמה המשותפת (AccessGate) מבחינת
// נבדקים: כל נבדק נכנס עם חשבון אישי משלו ב-Firebase Authentication,
// במקום סיסמת Kesher המשותפת לכולם. AccessGate נשאר קיים ומשמש רק לכלים
// הפנימיים של הסגל, תחת /staff (ראו למטה) — אבל גם הוא עצמו עודכן (ראו
// ההערה ליד AccessGate): הוא כבר לא בודק שלוש סיסמאות מקודדות, אלא
// מתחבר אמיתית מול Firebase ובודק role=admin.
import WelcomePage        from "./pages/WelcomePage";
import LoginPage          from "./pages/LoginPage";
import SubjectTosPage     from "./pages/SubjectTosPage";
import SubjectResetPage   from "./pages/SubjectResetPage";
import SubjectDetailsPage from "./pages/SubjectDetailsPage";
import SubjectConfirmPage from "./pages/SubjectConfirmPage";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth } from "./firebase";

// ── שער כניסה לסגל — עודכן (שלב 1, השלמה) ──
// במקום שלוש סיסמאות מקודדות (Kesher/Mainkesher/KesherReview), יש עכשיו
// חשבון Firebase אמיתי אחד בלבד (ראו create_admin_account.py) עם custom
// claim role="admin". Kesher (הגישה הציבורית הישנה) ו-KesherReview (מצב
// סוקר) הוסרו לגמרי לפי החלטה — נשאר רק Mainkesher, באותה התנהגות בדיוק
// כמו היום (skip מופעל, וידאו כן נשמר): ברגע שההתחברות מצליחה ומאומת
// role=admin, מסמנים את אותם דגלי sessionStorage שהיו קיימים קודם
// (hai_access_granted, hai_dev_mode) — כך שכל שאר הקוד שכבר קורא את
// הדגלים האלה (IntakePage, TestPage, DevNav, DevOnlyRoute למטה) ממשיך
// לעבוד בדיוק כמו שהוא, בלי שום שינוי נוסף.
// hai_reviewer_mode לא נקרא יותר משום מקום חדש, אבל לא הסרתי את הקוד שבודק
// אותו ב-TestPage.js — הוא פשוט הופך לקוד מת (אף אחד לא יכול להפעיל אותו
// יותר), כדי לא לגעת בקובץ הגדול והמורכב הזה בלי צורך אמיתי.
const ACCESS_STORAGE_KEY = "hai_access_granted";
const DEV_STORAGE_KEY    = "hai_dev_mode";

function AccessGate({ children }) {
  const [unlocked, setUnlocked] = useState(
    () => sessionStorage.getItem(ACCESS_STORAGE_KEY) === "true"
  );
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  if (unlocked) return children;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const tokenResult = await cred.user.getIdTokenResult();
      if (tokenResult.claims.role === "admin") {
        sessionStorage.setItem(ACCESS_STORAGE_KEY, "true");
        sessionStorage.setItem(DEV_STORAGE_KEY, "true");
        setUnlocked(true);
      } else {
        await signOut(auth); // לא admin — לא משאירים אותו מחובר בטעות
        setError("לחשבון הזה אין הרשאת גישה");
        setLoading(false);
      }
    } catch (err) {
      setError("אימייל או סיסמה שגויים");
      setLoading(false);
    }
  };

  return (
    <div className="page" style={{ padding: "1.5rem" }}>
      <div className="container">
        <div className="card fade-up" style={{ maxWidth: 420, margin: "4rem auto", padding: "2.5rem" }}>
          <h2 style={{ marginBottom: "1.5rem", textAlign: "center" }}>כניסה לבדיקה</h2>
          <form onSubmit={handleSubmit}>
            <input
              type="email"
              placeholder="אימייל"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              style={inputStyle}
            />
            <input
              type="password"
              placeholder="סיסמה"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
            />
            {error && (
              <p style={{ color: "var(--coral)", fontSize: "0.9rem", marginBottom: "1rem" }}>
                {error}
              </p>
            )}
            <div className="divider" />
            <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading}>
              {loading ? "מתחבר/ת..." : "כניסה"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// שלב 0 — עמודים פנימיים (כלי ניתוח/ייבוא, והיסטוריה שהוחלט לנטוש בשלב זה)
// שלא מתוחזקים/מעודכנים כרגע עם ה-API key החדש. חוסמים גישה אליהם לכל מי
// שלא נכנס עם סיסמת המפתח, כדי שנבדק/סוקר רגיל לא ייתקל בהם או בשגיאה שלהם.
function DevOnlyRoute({ children }) {
  const isDev = sessionStorage.getItem(DEV_STORAGE_KEY) === "true";
  if (!isDev) return <Navigate to="/" replace />;
  return children;
}

const inputStyle = {
  width: "100%",
  padding: "0.75rem 1rem",
  marginBottom: "1rem",
  borderRadius: 8,
  border: "1px solid rgba(0,0,0,0.15)",
  fontSize: "1rem",
  fontFamily: "Heebo, sans-serif",
  boxSizing: "border-box",
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── זרימת הנבדק האמיתית (שלב 1) — ציבורית, בלי שער סיסמה משותפת ── */}
        <Route path="/"              element={<WelcomePage />} />
        <Route path="/login"         element={<LoginPage />} />
        <Route path="/subject/tos"      element={<SubjectTosPage />} />
        <Route path="/subject/reset"    element={<SubjectResetPage />} />
        <Route path="/subject/details"  element={<SubjectDetailsPage />} />
        <Route path="/subject/confirm"  element={<SubjectConfirmPage />} />

        {/* ── זרימת הבדיקה עצמה — משותפת לנבדקים (מהזרימה החדשה למעלה) ──
            וגם לסגל (מהזרימה הישנה תחת /staff למטה). לא שונתה בכלל. */}
        <Route path="/camera-permission/:sessionId" element={<CameraPermissionPage />} />
        <Route path="/camera-setup/:sessionId"      element={<CameraSetupPage />} />
        <Route path="/test/:sessionId"              element={<TestPage />} />
        <Route path="/processing/:sessionId"        element={<ProcessingPage />} />
        <Route path="/results/:sessionId"           element={<ResultsPage />} />

        {/* ── כלי סגל — בדיוק כמו קודם (סיסמת Kesher/Mainkesher/KesherReview),
            רק שהועברו מ-"/" ל-"/staff" כדי לפנות את "/" לעמוד הבית החדש של
            הנבדקים. לא נוגעים בלוגיקה הפנימית שלהם. ── */}
        <Route
          path="/staff/*"
          element={
            <AccessGate>
              <Routes>
                <Route path=""        element={<ConsentPage />} />
                <Route path="intake"  element={<IntakePage />} />
                <Route path="history" element={<DevOnlyRoute><HistoryPage /></DevOnlyRoute>} />
                <Route path="import"  element={<DevOnlyRoute><ImportPage /></DevOnlyRoute>} />
                <Route path="upload"  element={<DevOnlyRoute><UploadAnalysisPage /></DevOnlyRoute>} />
              </Routes>
              <DevNav />
            </AccessGate>
          }
        />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
