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
import {
  signInWithEmailAndPassword,
  signOut,
  multiFactor,
  TotpMultiFactorGenerator,
  getMultiFactorResolver,
} from "firebase/auth";
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

// ── שלב 5 (MFA לאדמין בלבד) ──
// בנוסף לאימייל+סיסמה, לחשבון ה-admin (ורק לו — לא לנבדקים, לפי ההחלטה)
// יש כעת גם גורם שני: קוד חד-פעמי מאפליקציית אימות (TOTP — Google
// Authenticator / Authy / 1Password וכו'). בכניסה הראשונה אחרי שההפעלה
// הזו עולה (ואין עדיין גורם שני רשום לחשבון), המערכת מציגה מסך רישום
// חד-פעמי עם מפתח סודי להקלדה ידנית לתוך אפליקציית האימות — בכוונה לא
// קוד QR, כדי לא לשלוח את הסוד לשום שירות חיצוני שמייצר תמונות QR.
// מהכניסה השנייה ואילך (כשיש כבר גורם שני רשום), Firebase עוצר את
// ההתחברות באמצע וזורק שגיאת auth/multi-factor-auth-required — ואז
// מוצג מסך בקשת קוד בלבד (ללא רישום חדש).
function AccessGate({ children }) {
  const [unlocked, setUnlocked] = useState(
    () => sessionStorage.getItem(ACCESS_STORAGE_KEY) === "true"
  );

  // "credentials" → מסך אימייל/סיסמה הרגיל
  // "enrollSetup" → רישום חד-פעמי לאפליקציית אימות (פעם אחת בחיי החשבון)
  // "challenge"   → בקשת קוד מאפליקציית האימות (מכניסה שנייה ואילך)
  const [step, setStep] = useState("credentials");

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  // מצב-ביניים בין השלבים
  const [pendingUser, setPendingUser]     = useState(null); // המשתמש, בזמן רישום ל-MFA
  const [totpSecret, setTotpSecret]       = useState(null); // הסוד שנוצר לרישום
  const [enrollCode, setEnrollCode]       = useState("");   // קוד אימות לאישור הרישום
  const [mfaResolver, setMfaResolver]     = useState(null); // resolver לכניסה עם MFA קיים
  const [challengeCode, setChallengeCode] = useState("");   // קוד אימות לכניסה רגילה

  if (unlocked) return children;

  const finishLogin = () => {
    sessionStorage.setItem(ACCESS_STORAGE_KEY, "true");
    sessionStorage.setItem(DEV_STORAGE_KEY, "true");
    setUnlocked(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);

      const tokenResult = await cred.user.getIdTokenResult();
      if (tokenResult.claims.role !== "admin") {
        await signOut(auth); // לא admin — לא משאירים אותו מחובר בטעות
        setError("לחשבון הזה אין הרשאת גישה");
        setLoading(false);
        return;
      }

      // יש role=admin. בודקים אם לחשבון הזה יש כבר גורם שני רשום.
      const mfaUser = multiFactor(cred.user);
      if (mfaUser.enrolledFactors.length === 0) {
        // אין עדיין — מתחילים רישום חד-פעמי לפני שנותנים גישה בפועל.
        const session = await mfaUser.getSession();
        const secret = await TotpMultiFactorGenerator.generateSecret(session);
        setTotpSecret(secret);
        setPendingUser(cred.user);
        setStep("enrollSetup");
        setLoading(false);
        return;
      }

      // מצב קצה בלבד: בפועל כשיש גורם שני רשום, Firebase עוצר את ההתחברות
      // לפני השלב הזה וזורק את השגיאה שמטופלת ב-catch למטה.
      finishLogin();
    } catch (err) {
      if (err?.code === "auth/multi-factor-auth-required") {
        // יש כבר גורם שני רשום לחשבון — מציגים מסך בקשת קוד.
        const resolver = getMultiFactorResolver(auth, err);
        setMfaResolver(resolver);
        setStep("challenge");
        setLoading(false);
        return;
      }
      setError("אימייל או סיסמה שגויים");
      setLoading(false);
    }
  };

  const handleEnrollConfirm = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const assertion = TotpMultiFactorGenerator.assertionForEnrollment(
        totpSecret,
        enrollCode.trim()
      );
      await multiFactor(pendingUser).enroll(assertion, "אפליקציית אימות");
      finishLogin();
    } catch (err) {
      setError("קוד שגוי. נסה/י שוב מהאפליקציה.");
      setLoading(false);
    }
  };

  const handleChallengeConfirm = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const hint = mfaResolver.hints[0];
      const assertion = TotpMultiFactorGenerator.assertionForSignIn(
        hint.uid,
        challengeCode.trim()
      );
      const userCredential = await mfaResolver.resolveSignIn(assertion);
      const tokenResult = await userCredential.user.getIdTokenResult();
      if (tokenResult.claims.role !== "admin") {
        await signOut(auth);
        setError("לחשבון הזה אין הרשאת גישה");
        setLoading(false);
        return;
      }
      finishLogin();
    } catch (err) {
      setError("קוד שגוי. נסה/י שוב מהאפליקציה.");
      setLoading(false);
    }
  };

  if (step === "enrollSetup") {
    return (
      <div className="page" style={{ padding: "1.5rem" }}>
        <div className="container">
          <div className="card fade-up" style={{ maxWidth: 460, margin: "4rem auto", padding: "2.5rem" }}>
            <h2 style={{ marginBottom: "1rem", textAlign: "center" }}>הפעלת אימות דו-שלבי</h2>
            <p style={{ color: "var(--ink-soft)", fontSize: "0.92rem", lineHeight: 1.7, marginBottom: "1.25rem" }}>
              זו כניסה ראשונה לאחר הפעלת אימות דו-שלבי לחשבון ה-admin. פתח/י אפליקציית אימות
              (לדוגמה Google Authenticator, Authy או 1Password), בחר/י &quot;הוספת חשבון&quot; ←
              &quot;הקלדת מפתח ידנית&quot;, והקלד/י את המפתח הבא:
            </p>
            <div style={{
              fontFamily: "monospace", fontSize: "1.1rem", letterSpacing: "0.05em",
              background: "rgba(0,0,0,0.04)", borderRadius: 8, padding: "0.9rem 1rem",
              textAlign: "center", marginBottom: "1.25rem", wordBreak: "break-all",
            }}>
              {totpSecret?.secretKey}
            </div>
            <p style={{ color: "var(--ink-soft)", fontSize: "0.92rem", marginBottom: "1rem" }}>
              לאחר שהוספת את המפתח, הקלד/י כאן את הקוד בן 6 הספרות שמוצג כרגע באפליקציה:
            </p>
            <form onSubmit={handleEnrollConfirm}>
              <input
                type="text"
                inputMode="numeric"
                placeholder="קוד מהאפליקציה"
                value={enrollCode}
                onChange={(e) => setEnrollCode(e.target.value)}
                autoFocus
                style={inputStyle}
              />
              {error && (
                <p style={{ color: "var(--coral)", fontSize: "0.9rem", marginBottom: "1rem" }}>
                  {error}
                </p>
              )}
              <div className="divider" />
              <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading || !enrollCode.trim()}>
                {loading ? "מאשר/ת..." : "אישור והפעלה"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (step === "challenge") {
    return (
      <div className="page" style={{ padding: "1.5rem" }}>
        <div className="container">
          <div className="card fade-up" style={{ maxWidth: 420, margin: "4rem auto", padding: "2.5rem" }}>
            <h2 style={{ marginBottom: "1.5rem", textAlign: "center" }}>קוד אימות</h2>
            <p style={{ color: "var(--ink-soft)", fontSize: "0.92rem", marginBottom: "1rem", textAlign: "center" }}>
              הקלד/י את הקוד הנוכחי מאפליקציית האימות
            </p>
            <form onSubmit={handleChallengeConfirm}>
              <input
                type="text"
                inputMode="numeric"
                placeholder="קוד בן 6 ספרות"
                value={challengeCode}
                onChange={(e) => setChallengeCode(e.target.value)}
                autoFocus
                style={inputStyle}
              />
              {error && (
                <p style={{ color: "var(--coral)", fontSize: "0.9rem", marginBottom: "1rem" }}>
                  {error}
                </p>
              )}
              <div className="divider" />
              <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading || !challengeCode.trim()}>
                {loading ? "בודק/ת..." : "אישור"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

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
