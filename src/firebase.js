import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

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
export default app;
