import React, { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import IntakePage    from "./pages/IntakePage";
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

// ── שער כניסה משותף לבדיקה הפומבית ──
// שתי סיסמאות שונות:
// - סיסמת הנבדקים (ACCESS_*): זו שמשותפת ונשלחת בלינק הציבורי. לא מקבלת אופציית skip.
// - סיסמת המפתח (DEV_*): פותחת גם את אופציית ה-skip (ב-TestPage) דרך דגל ב-sessionStorage.
// נשמר ב-sessionStorage: מי שכבר נכנס פעם אחת בטאב הזה לא יתבקש שוב, אבל טאב/מכשיר חדש כן.
const ACCESS_USERNAME = "Kesher";
const ACCESS_PASSWORD = "kesherclinic!1234";
const DEV_USERNAME    = "Mainkesher";
const DEV_PASSWORD    = "Mainkesher!1234";
const ACCESS_STORAGE_KEY = "hai_access_granted";
const DEV_STORAGE_KEY    = "hai_dev_mode";

function AccessGate({ children }) {
  const [unlocked, setUnlocked] = useState(
    () => sessionStorage.getItem(ACCESS_STORAGE_KEY) === "true"
  );
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");

  if (unlocked) return children;

  const handleSubmit = (e) => {
    e.preventDefault();
    const name = username.trim();
    if (name === ACCESS_USERNAME && password === ACCESS_PASSWORD) {
      sessionStorage.setItem(ACCESS_STORAGE_KEY, "true");
      sessionStorage.removeItem(DEV_STORAGE_KEY);
      setUnlocked(true);
    } else if (name === DEV_USERNAME && password === DEV_PASSWORD) {
      sessionStorage.setItem(ACCESS_STORAGE_KEY, "true");
      sessionStorage.setItem(DEV_STORAGE_KEY, "true");
      setUnlocked(true);
    } else {
      setError("שם משתמש או סיסמה שגויים");
    }
  };

  return (
    <div className="page" style={{ padding: "1.5rem" }}>
      <div className="container">
        <div className="card fade-up" style={{ maxWidth: 420, margin: "4rem auto", padding: "2.5rem" }}>
          <h2 style={{ marginBottom: "1.5rem", textAlign: "center" }}>כניסה לבדיקה</h2>
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="שם משתמש"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
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
            <button type="submit" className="btn btn-primary btn-lg btn-full">
              כניסה
            </button>
          </form>
        </div>
      </div>
    </div>
  );
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
      <AccessGate>
        <Routes>
          <Route path="/"                      element={<IntakePage />} />
          <Route path="/camera-permission/:sessionId" element={<CameraPermissionPage />} />
          <Route path="/camera-setup/:sessionId"    element={<CameraSetupPage />} />
          <Route path="/test/:sessionId"       element={<TestPage />} />
          <Route path="/processing/:sessionId" element={<ProcessingPage />} />
          <Route path="/results/:sessionId"    element={<ResultsPage />} />
          <Route path="/history"               element={<HistoryPage />} />
          <Route path="/import" element={<ImportPage />} />
          <Route path="/upload" element={<UploadAnalysisPage />} />
          <Route path="*"                      element={<Navigate to="/" />} />
        </Routes>
        <DevNav />
      </AccessGate>
    </BrowserRouter>
  );
}
