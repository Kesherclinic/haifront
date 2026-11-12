import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey:            "AIzaSyDO7LaZL2y-yBdKuo_gloMdq_DPV7jni6Y",
  authDomain:        "hai-app-2ebc3.firebaseapp.com",
  projectId:         "hai-app-2ebc3",
  storageBucket:     "hai-app-2ebc3.firebasestorage.app",
  messagingSenderId: "592091104881",
  appId:             "1:592091104881:web:6e1dfc40f486b493757dd0",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// שלב 1 (תוכנית העבודה — אבטחה ופרטיות): חיבור ל-Firebase Authentication,
// לזרימת הזהות האמיתית של הנבדקים (WelcomePage/LoginPage/SubjectTosPage
// וכו'). משתמש באותה אפליקציית Firebase (app) שכבר מאותחלת כאן למעלה
// עבור Firestore (db) — אין צורך באף אתחול נוסף.
export const auth = getAuth(app);

// הופך שם משתמש "אנושי" (למשל hai25001, או שם שהנבדק בחר לעצמו באיפוס)
// לכתובת ה"פסבדו-אימייל" שבה משתמשים מול Firebase Authentication בפועל —
// Firebase, ב-Email/Password sign-in, מחייב כתובת בצורת אימייל, גם אם זה
// לא אימייל אמיתי של אף אחד. התחום hai-subjects.local הוא פיקטיבי בכוונה
// (הסיומת .local לא קיימת באינטרנט האמיתי) — רק כדי לספק את הפורמט שהשירות
// דורש, לא כדי לשלוח אליו שום דבר.
export function usernameToPseudoEmail(username) {
  return `${(username || "").trim().toLowerCase()}@hai-subjects.local`;
}

export default app;
