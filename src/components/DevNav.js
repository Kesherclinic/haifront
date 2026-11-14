import React, { useState } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";

// ── שלב 1 (תוכנית העבודה — אבטחה ופרטיות), השלמה ──
// שני הנתיבים הראשונים (פרטי נבדק / היסטוריה) עודכנו מ-"/" ו-"/history"
// ל-"/staff/intake" ו-"/staff/history" — אחרי שכלי הסגל הועברו תחת "/staff"
// (ראו App.js). בלי העדכון הזה, הקישורים האלה נפלו לנתיב שלא קיים יותר,
// ו-App.js ניתב אותם אוטומטית לעמוד הבית של הנבדקים ("*" -> Navigate to "/").
// "/test/DEMO", "/processing/DEMO", "/results/DEMO" נשארו ללא שינוי — אלה
// עדיין נתיבים משותפים ברמה העליונה (לא עברו תחת /staff).
const PAGES = [
  { path: "/staff/intake",    label: "פרטי נבדק" },
  { path: "/test/DEMO",       label: "בדיקה" },
  { path: "/processing/DEMO", label: "עיבוד" },
  { path: "/results/DEMO",    label: "תוצאות" },
  { path: "/staff/history",   label: "היסטוריה" },
];

export default function DevNav() {
  const nav = useNavigate();
  const location = useLocation();
  const params = useParams();
  const sessionId = params.sessionId || "DEMO";
  const [hL, setHL] = useState(false);
  const [hR, setHR] = useState(false);

  const pages = PAGES.map(p => ({ ...p, path: p.path.replace("DEMO", sessionId) }));
  // זיהוי "באיזה עמוד אנחנו" חייב עכשיו שני מקטעים כשהנתיב מתחיל ב-"/staff"
  // (למשל "staff/intake" מול "staff/history") — מקטע ראשון בלבד (כמו קודם)
  // היה הופך את כל עמודי הסגל לאותו "עמוד" ומבלבל את חיצי הקודם/הבא.
  const keyOf = (path) => {
    const parts = path.split("/").filter(Boolean);
    return parts[0] === "staff" ? parts.slice(0, 2).join("/") : (parts[0] || "");
  };
  const idx = pages.findIndex(p => keyOf(p.path) === keyOf(location.pathname));

  const goNext = () => { if (idx < pages.length - 1) nav(pages[idx + 1].path); };
  const goPrev = () => { if (idx > 0) nav(pages[idx - 1].path); };

  const btn = (h, side) => ({
    position: "fixed", bottom: "50%",
    [side === "left" ? "left" : "right"]: h ? 0 : -65,
    transform: "translateY(50%)",
    transition: "all 0.25s ease",
    background: "rgba(31,78,121,0.92)", color: "#fff",
    border: "none",
    borderRadius: side === "left" ? "0 10px 10px 0" : "10px 0 0 10px",
    padding: "14px 10px", cursor: "pointer",
    fontSize: "11px", fontFamily: "Heebo,sans-serif", fontWeight: 500,
    writingMode: "vertical-rl", zIndex: 9999,
    boxShadow: "0 2px 12px rgba(0,0,0,0.2)", minHeight: 80,
  });

  const zone = (side) => ({
    position: "fixed", bottom: "calc(50% - 60px)",
    [side]: 0, width: 65, height: 120, zIndex: 9998,
  });

  return React.createElement(React.Fragment, null,
    idx < pages.length - 1 && React.createElement(React.Fragment, null,
      React.createElement("div", { style: zone("left"), onMouseEnter: () => setHL(true), onMouseLeave: () => setHL(false) }),
      React.createElement("button", { style: btn(hL, "left"), onMouseEnter: () => setHL(true), onMouseLeave: () => setHL(false), onClick: goNext },
        String.fromCharCode(8592) + " " + pages[idx + 1]?.label)
    ),
    idx > 0 && React.createElement(React.Fragment, null,
      React.createElement("div", { style: zone("right"), onMouseEnter: () => setHR(true), onMouseLeave: () => setHR(false) }),
      React.createElement("button", { style: btn(hR, "right"), onMouseEnter: () => setHR(true), onMouseLeave: () => setHR(false), onClick: goPrev },
        pages[idx - 1]?.label + " " + String.fromCharCode(8594))
    )
  );
}
