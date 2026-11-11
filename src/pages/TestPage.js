import React, { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000";
// שלב 0 (אבטחת הבקאנד) — מפתח המשותף עם הבקאנד, נשלח בכל קריאה דרך הדר
// X-API-Key. חייב להיות מוגדר ב-Vercel כ-REACT_APP_API_SHARED_SECRET מטיפוס
// Config (לא Secret!), אחרת ה-build לא יטמיע את הערך בקוד בפועל.
const API_KEY = process.env.REACT_APP_API_SHARED_SECRET || "";

// ── 8 life domains ──
const DOMAINS = [
  { id: "art",       label: "אומנות" },
  { id: "sport",     label: "ספורט" },
  { id: "nature",    label: "טבע" },
  { id: "tech",      label: "טכנולוגיה" },
  { id: "care",      label: "טיפול" },
  { id: "culture",   label: "תרבות ופנאי" },
  { id: "knowledge", label: "ידע ולמידה" },
  { id: "spirituality", label: "רוחניות" },
];

// 8 ניסוחים שונים לשאלת ההמשך אחרי כל תחום — משובצים באקראי, ניסוח שונה לכל תחום בכל הרצה
const QUESTION_VARIANTS = [
  "מה עבר לך בראש כשסיימת לצפות ולהאזין, ואיזה רגע היה משמעותי עבורך?",
  "אילו מחשבות עלו בך אחרי מה שראית ושמעת, ואיזו אחת מתוכן הכי בלטה לך?",
  "מה עבר לך בראש עם סיום הקטעים האחרונים ומה היה הדבר שהכי נגע בך?",
  "איזו מחשבה ליוותה אותך בסוף הקטעים, ואיזה פרט היה חזק יותר מהשאר?",
  "מה צף בך מהחוויה שראית ושמעת, ואיזה חלק ממנה הכי תפס אותך?",
  "מה נשאר איתך עם תום הצפייה וההאזנה, ומה היה הכי משמעותי עבורך?",
  "מה התעורר בך בעקבות הצפייה וההאזנה, ואיזה רגע מתוך זה הכי בולט בזיכרונך?",
  "מה חשבת לעצמך עם גמר הצפייה וההאזנה, ומה מהדברים הכי נחרט אצלך?",
];
const PRACTICE_QUESTION_TEXT = "זו שאלת תרגול — מה עבר לך בראש בזמן שצפית בתמונות והאזנת לקטע, ואיזה רגע הכי בלט לך? אין תשובה נכונה, זה רק כדי להתרגל לפורמט של הבדיקה.";

const RELAXATION_TEXT =
  "לפני שתתחיל את הבדיקה, אנחנו רוצים לאפשר לך להיכנס למצב רגיעה. " +
  "על המסך יוקרן סרטון ותתנגן מוזיקת רקע. הדקות הקרובות הן הזמן שלך לנשום, " +
  "להרפות את הגוף ולאפשר לעצמך להרגיש בנוח ככל האפשר.";

const BASELINE_SEC       = 120; // 2 דקות — סרטון מים (בייסליין נקי, לא נוגעים בו)
const BASELINE_OUTRO_SEC = 15;  // מעבר רך בסוף הרגיעה — לא חלק מהבייסליין הנמדד
const BASELINE_GAP_SEC   = 5;   // מסך מעבר (+) בין סוף הסרטון לתמונה הראשונה של התרגול

const OUTRO_TEXT =
  "בעוד מספר רגעים נעבור לשלב התרגול של הבדיקה.\nבתרגול תיחשף לתמונות, קטע אודיו ובסופם תוצג שאלה.";

// שלבים בכל תחום / בתרגול, לפי הסדר
const STEP_ORDER = ["image1", "fade", "image2", "blank1", "audio", "blank2", "question", "blank3"];
const STEP_KIND  = {
  image1: "image", fade: "blank", image2: "image", blank1: "blank",
  audio: "audio", blank2: "blank", question: "question", blank3: "blank",
};

// תוויות בעברית לטבלת הזמנים (timeline) שנשלחת לשרת בסוף הבדיקה
const STEP_LABELS_HE = {
  image1: "תמונה 1", fade: "מעבר בין תמונות", image2: "תמונה 2", blank1: "מעבר לפני האודיו",
  audio: "קטע אודיו", blank2: "מעבר לפני השאלה", question: "שאלה", blank3: "מעבר לתחום הבא",
};

const REAL_DURATIONS     = { image1: 15, fade: 3, image2: 15, blank1: 10, audio: 41, blank2: 5, question: 35, blank3: 10 };
const PRACTICE_DURATIONS = { image1: 10, fade: 2, image2: 10, blank1: 10, audio: 21, blank2: 5,  question: 30, blank3: 5  };
// blank1 בתרגול הוארך מ-5 ל-10 שניות כדי לתת זמן נוח לקרוא את ההערה שמוצגת
// שם (ראו הרינדור של blank1 בתרגול למטה) — לא משפיע על blank1 בבדיקה האמיתית.

// פיצול 10 שניות ה-blank3 (מסך אחרי שהנבדק מסיים לענות על תחום, בשלב הבדיקה
// האמיתית בלבד — לא בתרגול) ל-3 תתי-שלבים: שחור / הודעת מעבר / שחור.
// הסכום חייב להישאר שווה ל-REAL_DURATIONS.blank3 (10), כי זה עדיין אותו step
// ואותו טיימר בדיוק — רק מה שמוצג על המסך משתנה באמצע.
const BLANK3_MSG_DURATIONS = [2, 6, 2];

// שלוש מסכי מעבר בין סוף התרגול לתחילת הבדיקה האמיתית:
// "נגמר שלב התרגול" (5s) → "הבדיקה תתחיל בעוד מספר רגעים" (10s) → מסך שחור (5s)
const PRACTICE_OUTRO_DURATIONS = [5, 10, 5];
const PRACTICE_OUTRO_SEC = PRACTICE_OUTRO_DURATIONS.reduce((a, b) => a + b, 0); // 20

const DOMAIN_SEC   = Object.values(REAL_DURATIONS).reduce((a, b) => a + b, 0);     // 178
const PRACTICE_SEC = Object.values(PRACTICE_DURATIONS).reduce((a, b) => a + b, 0); // 87
const TOTAL_SEC    = BASELINE_SEC + BASELINE_OUTRO_SEC + BASELINE_GAP_SEC + PRACTICE_SEC + PRACTICE_OUTRO_SEC + DOMAIN_SEC * DOMAINS.length;

// ── תוכן — placeholder בינתיים, יוחלף כשיהיה מקור אמיתי (backend / קבצים סופיים) ──
const practiceContent = (gender) => ({
  image1: "/practice/practice_1.png",
  image2: "/practice/practice_2.png",
  audio:  `/practice/practice_${gender}.mp3`,
});
const domainContent = (domain, gender) => ({
  image1: `/stimuli/${domain.id}_1.png`,
  image2: `/stimuli/${domain.id}_2.png`,
  audio:  `/stimuli/${domain.id}_${gender}.mp3`,
});

// Gender-aware text helper
const t = (gender, male, female) => gender === "female" ? female : male;

// Fisher-Yates shuffle — used to randomize domain order per subject
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function TestPage() {
  const { sessionId }          = useParams();
  const [searchParams]         = useSearchParams();
  const gender                 = searchParams.get("gender") || "male";
  const nav                    = useNavigate();

  // phase: intro | baselineIntro | baseline | practice | domain | done
  const [phase, setPhase]           = useState("intro");
  const [domainIdx, setDomainIdx]   = useState(0);
  const [stepIdx, setStepIdx]       = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0); // internal only — never rendered to the subject
  const [recording, setRecording]   = useState(false);
  const [camReady, setCamReady]     = useState(false);
  const [camError, setCamError]     = useState("");
  const [uploading, setUploading]   = useState(false);
  const [practiceOutroIdx, setPracticeOutroIdx] = useState(0); // 0: "נגמר שלב התרגול" | 1: "הבדיקה תתחיל בעוד..." | 2: מסך שחור

  // סדר תחומים אקראי לכל נבדק — נקבע פעם אחת בכניסה לבדיקה ונשאר קבוע לאורכה
  const [domains] = useState(() => shuffleArray(DOMAINS));
  // שיבוץ אקראי ועצמאי של ניסוחי השאלה לכל תחום — נקבע פעם אחת בכניסה לבדיקה ונשאר קבוע לאורכה
  const [questionVariants] = useState(() => shuffleArray(QUESTION_VARIANTS));

  // מצב מפתח — נקבע ב-App.js (שער הכניסה) רק למי שנכנס עם סיסמת המפתח, לא לנבדקים הרגילים
  const [isDevMode] = useState(() => sessionStorage.getItem("hai_dev_mode") === "true");
  // מצב סוקר/איש מקצוע — נקבע ב-App.js רק למי שנכנס עם סיסמת הסוקרים: מקבל גם דילוג
  // על שלבים וגם כפתור עצירה/המשך, ובלי הקלטה/שמירת וידאו בכלל (ראו finishTest ואת
  // ה-useEffect של אתחול המצלמה למטה).
  const [isReviewerMode] = useState(() => sessionStorage.getItem("hai_reviewer_mode") === "true");
  // עצירה/המשך זמנית של הבדיקה — רלוונטי רק במצב סוקר (ראה togglePause למטה)
  const [paused, setPaused] = useState(false);

  const streamRef        = useRef(null); // camera MediaStream — independent of any <video> element
  const baselineVideoRef  = useRef(null);
  const baselineMusicRef  = useRef(null);
  const recorderRef      = useRef(null);
  const chunksRef        = useRef([]);
  const timerRef         = useRef(null);
  const audioRef         = useRef(null);
  const timelineRef       = useRef([]);  // לוג מלא: מה הנבדק נחשף אליו, שנייה-שנייה
  const recordingStartRef = useRef(null); // Date.now() ברגע שההקלטה בפועל התחילה
  // תמיכה בעצירה/המשך (מצב סוקר בלבד): pausedRef הוא מקור האמת שבודקים אותו בתוך
  // setInterval (ref ולא state, כדי להימנע ממרוץ מצבים מול ה-re-render), ו-
  // pauseAccumRef/pauseStartedAtRef מצטברים כמה זמן אמת חלף בזמן ההשהיה, כדי שנוכל
  // "להקפיא" טיימרים המבוססים על Date.now() בלי לפגוע בדיוק שלהם כשממשיכים.
  const pausedRef         = useRef(false);
  const pauseAccumRef     = useRef(0);
  const pauseStartedAtRef = useRef(null);

  // כמה מילישניות עברו בסך הכול בהשהיה עד כה (כולל ההשהיה הנוכחית אם היא פעילה) —
  // כל טיימר מבוסס-Date.now() מחסיר מההפרש שלו את מה שנצטבר מהרגע שהוא התחיל, כך
  // שזמן שחלף בזמן עצירה לא "נספר" בתוך משך השלב.
  const getPausedMs = () => {
    let total = pauseAccumRef.current;
    if (pausedRef.current && pauseStartedAtRef.current != null) {
      total += Date.now() - pauseStartedAtRef.current;
    }
    return total;
  };

  const activeSequence = phase === "practice" || phase === "domain";
  const stepKey  = activeSequence ? STEP_ORDER[stepIdx] : null;
  const stepKind = stepKey ? STEP_KIND[stepKey] : null;
  const content  =
    phase === "practice" ? practiceContent(gender) :
    phase === "domain"   ? domainContent(domains[domainIdx], gender) :
    null;
  // HARD OVERRIDE — forces the real (non-practice) audio step to exactly
  // REAL_DURATIONS.audio, bypassing the rest of REAL_DURATIONS lookup for
  // this one case. Kept in sync with REAL_DURATIONS.audio above (41s) so the
  // audio clip (measured ~40.05s) always finishes before the step advances,
  // instead of being cut a moment early.
  const stepDuration = stepKey
    ? (stepKey === "audio" && phase === "domain"
        ? REAL_DURATIONS.audio
        : (phase === "practice" ? PRACTICE_DURATIONS[stepKey] : REAL_DURATIONS[stepKey]))
    : 0;

  // ── Camera init (permission + recorder are ready long before recording actually starts) ──
  useEffect(() => {
    // מצב סוקר: אין צורך במצלמה/מיקרופון בכלל — אין הקלטה, אז לא מבקשים הרשאות
    // ולא יוצרים MediaRecorder. camReady מסומן true ישירות כדי שכפתור "התחל" לא יישאר נעול.
    if (isReviewerMode) {
      setCamReady(true);
      return;
    }
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        streamRef.current = stream;
        setCamReady(true);
        const mr = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9,opus" });
        mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
        recorderRef.current = mr;
      })
      .catch(() => setCamError(
        t(gender,
          "לא ניתן לגשת למצלמה. אנא אשר גישה בהגדרות הדפדפן.",
          "לא ניתן לגשת למצלמה. אנא אשרי גישה בהגדרות הדפדפן."
        )
      ));
    return () => streamRef.current?.getTracks().forEach(tr => tr.stop());
  }, [isReviewerMode]);

  // ── Finish ──
  const finishTest = useCallback(async () => {
    setPhase("done");

    // מצב סוקר: אין וידאו שהוקלט ואין מה להעלות לשרת — מסיימים מקומית בלי לפנות
    // ל-/analyze ובלי לנווט לדף העיבוד (שמחכה לסשן אמיתי בפיירבייס עם וידאו).
    if (isReviewerMode) {
      streamRef.current?.getTracks().forEach(tr => tr.stop());
      return;
    }

    setUploading(true);
    const recorder = recorderRef.current;
    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const fd   = new FormData();
      fd.append("video", blob, "session.webm");
      fd.append("timeline", JSON.stringify(timelineRef.current));
      try {
        const res = await fetch(`${API}/analyze/${sessionId}`, {
          method: "POST",
          headers: { "X-API-Key": API_KEY },
          body: fd,
        });
        if (!res.ok) throw new Error();
        nav(`/processing/${sessionId}`);
      } catch {
        setUploading(false);
        alert(t(gender, "שגיאה בהעלאת הוידאו — נסה שוב", "שגיאה בהעלאת הוידאו — נסי שוב"));
      }
    };
    recorder.stop();
    streamRef.current?.getTracks().forEach(tr => tr.stop());
  }, [sessionId, nav, gender, isReviewerMode]);

  // ── Advance to next step / phase ──
  const advanceStep = useCallback(() => {
    clearInterval(timerRef.current);
    const isLastStep = stepIdx >= STEP_ORDER.length - 1;

    if (!isLastStep) {
      setStepIdx(i => i + 1);
      return;
    }

    if (phase === "practice") {
      setPhase("practiceOutro");
      setPracticeOutroIdx(0);
    } else if (phase === "domain") {
      if (domainIdx + 1 < domains.length) {
        setDomainIdx(i => i + 1);
        setStepIdx(0);
      } else {
        finishTest();
      }
    }
  }, [phase, stepIdx, domainIdx, domains, finishTest]);

  // ── Step 1: subject clicks "התחל" on the instructions page → move to the relaxation intro page ──
  // (recording has NOT started yet at this point)
  const goToBaselineIntro = useCallback(() => {
    setPhase("baselineIntro");
  }, []);

  // ── Step 2: subject confirms on the relaxation intro page → recording starts, baseline video+music begin ──
  const confirmRelaxation = useCallback(() => {
    chunksRef.current = [];
    timelineRef.current = [];
    recordingStartRef.current = Date.now();
    // מצב סוקר: אין הקלטה בכלל, אז לא מתחילים recorder ולא מסמנים recording=true
    // (מה שגם משבית אוטומטית את לוג סרגל הזמנים ואת חיווי ה-REC על המסך).
    if (!isReviewerMode) {
      recorderRef.current?.start(1000);
      setRecording(true);
    }
    setPhase("baseline");
    setSecondsLeft(BASELINE_SEC);
  }, [isReviewerMode]);

  // ── DEV / סוקר: דילוג ידני על השלב/פאזה הנוכחית — פעיל במצב מפתח או במצב סוקר ──
  const skipCurrent = useCallback(() => {
    if (!isDevMode && !isReviewerMode) return;
    clearInterval(timerRef.current);
    if (phase === "baseline") {
      setPhase("baselineOutro");
      setSecondsLeft(BASELINE_OUTRO_SEC);
    } else if (phase === "baselineOutro") {
      setPhase("baselineGap");
      setSecondsLeft(BASELINE_GAP_SEC);
    } else if (phase === "baselineGap") {
      setPhase("practice");
      setStepIdx(0);
    } else if (phase === "practice" || phase === "domain") {
      advanceStep();
    } else if (phase === "practiceOutro") {
      if (practiceOutroIdx < PRACTICE_OUTRO_DURATIONS.length - 1) {
        setPracticeOutroIdx(i => i + 1);
      } else {
        setPhase("domain");
        setDomainIdx(0);
        setStepIdx(0);
      }
    }
  }, [phase, advanceStep, practiceOutroIdx, isDevMode, isReviewerMode]);

  // ── סוקר: עצירה/המשך של הבדיקה — פעיל רק במצב סוקר (ראה isReviewerMode) ──
  const togglePause = useCallback(() => {
    if (!isReviewerMode) return;
    setPaused(p => {
      const next = !p;
      if (next) {
        // עוצרים כרגע — מתחילים לספור כמה זמן אמת יעבור עד שההשהיה תבוטל
        pausedRef.current = true;
        pauseStartedAtRef.current = Date.now();
      } else {
        // ממשיכים — מוסיפים את משך ההשהיה הזו למצטבר הכולל ומתאפסים
        if (pauseStartedAtRef.current != null) {
          pauseAccumRef.current += Date.now() - pauseStartedAtRef.current;
        }
        pausedRef.current = false;
        pauseStartedAtRef.current = null;
      }
      return next;
    });
  }, [isReviewerMode]);

  // ── Baseline countdown (הבייסליין הנמדד — 240 שניות נקיות, לא נוגעים) ──
  useEffect(() => {
    if (phase !== "baseline") return;
    timerRef.current = setInterval(() => {
      if (pausedRef.current) return; // מצב סוקר בהשהיה — לא מתקדמים בטיימר
      setSecondsLeft(s => {
        if (s <= 1) {
          clearInterval(timerRef.current);
          setPhase("baselineOutro");
          setSecondsLeft(BASELINE_OUTRO_SEC);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase]);

  // ── Baseline outro countdown (מעבר רך, מחוץ לבייסליין הנמדד) ──
  useEffect(() => {
    if (phase !== "baselineOutro") return;
    timerRef.current = setInterval(() => {
      if (pausedRef.current) return; // מצב סוקר בהשהיה — לא מתקדמים בטיימר
      setSecondsLeft(s => {
        if (s <= 1) {
          clearInterval(timerRef.current);
          setPhase("baselineGap");
          setSecondsLeft(BASELINE_GAP_SEC);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase]);

  // ── Baseline gap (מסך מעבר קצר בין סוף הסרטון לתמונה הראשונה של התרגול) ──
  useEffect(() => {
    if (phase !== "baselineGap") return;
    timerRef.current = setInterval(() => {
      if (pausedRef.current) return; // מצב סוקר בהשהיה — לא מתקדמים בטיימר
      setSecondsLeft(s => {
        if (s <= 1) {
          clearInterval(timerRef.current);
          setPhase("practice");
          setStepIdx(0);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase]);

  // ── Practice outro countdown (שלושת מסכי המעבר בין סוף התרגול לתחילת הבדיקה) ──
  useEffect(() => {
    if (phase !== "practiceOutro") return;
    const start = Date.now();
    const pausedAtStart = getPausedMs(); // מצב סוקר: כמה זמן השהיה כבר נצבר לפני שהשלב הזה התחיל
    const duration = PRACTICE_OUTRO_DURATIONS[practiceOutroIdx];
    timerRef.current = setInterval(() => {
      const pausedDuringStep = getPausedMs() - pausedAtStart;
      const elapsed = (Date.now() - start - pausedDuringStep) / 1000;
      if (elapsed >= duration) {
        clearInterval(timerRef.current);
        if (practiceOutroIdx < PRACTICE_OUTRO_DURATIONS.length - 1) {
          setPracticeOutroIdx(i => i + 1);
        } else {
          setPhase("domain");
          setDomainIdx(0);
          setStepIdx(0);
        }
      }
    }, 200);
    return () => clearInterval(timerRef.current);
  }, [phase, practiceOutroIdx]);

  // ── Play baseline video (רץ ברצף גם דרך שלב המעבר, כדי לא ליצור קפיצה חזותית) ──
  useEffect(() => {
    if (phase !== "baseline" && phase !== "baselineOutro") return;
    const el = baselineVideoRef.current;
    if (el && phase === "baseline") { el.currentTime = 0; el.play().catch(() => {}); }
    return () => { if (phase === "baselineOutro" && el) el.pause(); };
  }, [phase]);

  // ── Play baseline background music — נוצרת פעם אחת בתחילת הרגיעה, ממשיכה ברצף,
  //     ונמוכה (לא נעצרת) בשלב המעבר כדי לתמוך במעבר הרך ──
  useEffect(() => {
    if (phase !== "baseline" && phase !== "baselineOutro") return;
    if (!baselineMusicRef.current) {
      const music = new Audio("/baseline/music.mp3");
      music.loop = true;
      music.volume = 0.6;
      music.play().catch(() => {});
      baselineMusicRef.current = music;
    }
    if (phase === "baselineOutro" && baselineMusicRef.current) {
      baselineMusicRef.current.volume = 0.08;
    }
    return () => {
      if (phase === "baselineOutro") {
        baselineMusicRef.current?.pause();
        baselineMusicRef.current = null;
      }
    };
  }, [phase]);

  // ── Practice / domain step countdown ──
  // Anchored to a real timestamp (Date.now()) instead of counting raw setInterval ticks.
  // setInterval ticks can lag under CPU load (video recording, audio decoding, animations),
  // and naively decrementing a counter per tick lets that lag accumulate into real delay.
  // Computing remaining time from actual elapsed wall-clock time keeps the step's real
  // duration accurate regardless of any individual tick's delay.
  useEffect(() => {
    if (!activeSequence) return;
    const start = Date.now();
    const pausedAtStart = getPausedMs(); // מצב סוקר: כמה זמן השהיה כבר נצבר לפני שהשלב הזה התחיל
    const duration = stepDuration;
    setSecondsLeft(duration);
    timerRef.current = setInterval(() => {
      const pausedDuringStep = getPausedMs() - pausedAtStart;
      const elapsed = (Date.now() - start - pausedDuringStep) / 1000;
      const remaining = Math.max(0, duration - elapsed);
      setSecondsLeft(Math.ceil(remaining));
      if (remaining <= 0) {
        clearInterval(timerRef.current);
        advanceStep();
      }
    }, 200);
    return () => clearInterval(timerRef.current);
  }, [phase, stepIdx, domainIdx]);

  // ── Timeline log: records exactly what the subject was exposed to, second by
  //    second, across the whole recording (baseline → practice → all 8 domains).
  //    Doesn't touch the recording or the step timers at all — it only reads the
  //    current phase/step/domain and timestamps it against Date.now(), so it stays
  //    accurate even if a step actually ran shorter/longer than planned (e.g. dev
  //    skip). Sent to the server alongside the video when the test finishes. ──
  useEffect(() => {
    if (!recording || recordingStartRef.current == null) return;
    const now = (Date.now() - recordingStartRef.current) / 1000;
    const arr = timelineRef.current;
    if (arr.length) arr[arr.length - 1].end_sec = +now.toFixed(2);

    let entry = null;
    if (phase === "baseline") {
      entry = { phase, label_he: "הרגעה — סרטון מים" };
    } else if (phase === "baselineOutro") {
      entry = { phase, label_he: "מעבר רך בסוף ההרגעה" };
    } else if (phase === "baselineGap") {
      entry = { phase, label_he: "מסך מעבר לתרגול" };
    } else if (phase === "practice" || phase === "domain") {
      const stepKey = STEP_ORDER[stepIdx];
      const dom = phase === "domain" ? domains[domainIdx] : null;
      entry = {
        phase,
        domain: dom ? dom.id : null,
        domain_label_he: dom ? dom.label : null,
        step: stepKey,
        step_label_he: STEP_LABELS_HE[stepKey] || stepKey,
      };
    } else if (phase === "practiceOutro") {
      entry = { phase, sub_phase: practiceOutroIdx, label_he: "מעבר מהתרגול לבדיקה" };
    }

    if (entry) arr.push({ start_sec: +now.toFixed(2), end_sec: null, ...entry });
  }, [phase, stepIdx, domainIdx, practiceOutroIdx, recording, domains]);

  // ── Play stimulus audio ──
  useEffect(() => {
    if (!activeSequence || stepKind !== "audio") return;
    const a = new Audio(content.audio);
    a.play().catch(() => {});
    audioRef.current = a;
    return () => {
      // Fade the volume out instead of cutting playback instantly — an abrupt
      // pause() lands wherever the waveform happens to be and can sound like
      // a hard "click"/cutoff. The step right after audio is always a silent
      // blank screen, so a short fade-out here has nowhere to clash.
      const FADE_MS = 600;
      const startVolume = a.volume;
      const startTime = performance.now();
      const fadeStep = () => {
        const progress = Math.min(1, (performance.now() - startTime) / FADE_MS);
        a.volume = startVolume * (1 - progress);
        if (progress < 1) requestAnimationFrame(fadeStep);
        else a.pause();
      };
      requestAnimationFrame(fadeStep);
      audioRef.current = null;
    };
  }, [phase, stepIdx, domainIdx]);

  // ── סוקר: עצירה/המשך בפועל של מדיה שמתנגנת (וידאו/מוזיקת בייסליין, אודיו גירוי) ──
  // כדי שההשהיה תהיה אמיתית ולא רק "תקפיא" את הטיימר בזמן שהוידאו/אודיו ממשיכים
  // להתנגן ברקע. פעיל רק כשמשתמש במצב סוקר בפועל לוחץ על כפתור העצירה.
  useEffect(() => {
    if (!isReviewerMode) return;
    if (paused) {
      baselineVideoRef.current?.pause();
      baselineMusicRef.current?.pause();
      audioRef.current?.pause();
    } else {
      if (phase === "baseline") baselineVideoRef.current?.play().catch(() => {});
      if (phase === "baseline" || phase === "baselineOutro") baselineMusicRef.current?.play().catch(() => {});
      if (activeSequence && stepKind === "audio") audioRef.current?.play().catch(() => {});
    }
  }, [paused]);

  if (camError) return (
    <div className="page">
      <div className="container">
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <p style={{ color: "var(--coral)", fontSize: "1.1rem", marginBottom: "1rem" }}>{camError}</p>
          <button className="btn btn-secondary" onClick={() => window.location.reload()}>נסה שוב</button>
        </div>
      </div>
    </div>
  );

  // ── Full-screen presentation mode: baseline / baselineOutro / practice / domain ──
  // No timers, no percentages, no phase/domain labels — the subject only ever sees the step itself.
  if (phase === "baseline" || phase === "baselineOutro" || phase === "baselineGap" || phase === "practiceOutro" || activeSequence) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "#000", overflow: "hidden" }}>

        {(phase === "baseline" || phase === "baselineOutro") && (
          <video
            ref={baselineVideoRef}
            src="https://firebasestorage.googleapis.com/v0/b/hai-app-2ebc3.firebasestorage.app/o/water.mp4?alt=media&token=816d676e-ae93-4c60-8cf9-7c535650cb6d"
            muted
            loop
            playsInline
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        )}

        {phase === "baselineOutro" && (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "flex-start", justifyContent: "center",
            background: "rgba(0,0,0,0.25)", padding: "4rem 2rem"
          }}>
            <p style={{
              color: "#fff", fontSize: "2.1rem", textAlign: "center",
              maxWidth: 720, lineHeight: 1.7, textShadow: "0 1px 6px rgba(0,0,0,0.6)",
              whiteSpace: "pre-line"
            }}>
              {OUTRO_TEXT}
            </p>
          </div>
        )}

        {phase === "baselineGap" && (
          <div style={{ width: "100%", height: "100%", background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: "2.5rem", color: "rgba(255,255,255,0.5)" }}>+</span>
          </div>
        )}

        {activeSequence && stepKind === "image" && (
          <img
            src={stepKey === "image1" ? content.image1 : content.image2}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        )}

        {activeSequence && stepKind === "blank" &&
          !(phase === "domain" && stepKey === "blank3") &&
          !(phase === "practice" && stepKey === "blank1") && (
          <div style={{ width: "100%", height: "100%", background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: "2.5rem", color: "rgba(255,255,255,0.5)" }}>+</span>
          </div>
        )}

        {/* blank1 בתרגול בלבד (לא בבדיקה האמיתית): במקום מסך "+" ריק, מוצגת כאן
            הערה שקטע האודיו שעומד להתנגן לא בהכרח מתאר/קשור לתמונות — ממש לפני
            שהנבדק שומע את זה בפעם הראשונה, כדי שלא ינסה לחפש קשר באמצע הבדיקה
            האמיתית. מופיע פעם אחת בלבד, לא חוזר שוב בבדיקה. */}
        {activeSequence && phase === "practice" && stepKey === "blank1" && (
          <div style={{ width: "100%", height: "100%", background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center", padding: "3rem" }}>
            <p style={{ fontSize: "1.3rem", textAlign: "center", lineHeight: 1.7, maxWidth: 600, color: "rgba(255,255,255,0.85)", whiteSpace: "pre-line" }}>
              {"מיד יופעל קטע אודיו.\nקטע זה לא בהכרח מתאר או קשור לתמונות שתראה באותו שלב.\nאין צורך לחפש קשר ביניהם."}
            </p>
          </div>
        )}

        {/* blank3 בשלב הבדיקה האמיתית (לא בתרגול): במקום 10 שניות מסך שחור אחיד,
            מתחלק ל-2 שניות שחור / 6 שניות הודעת מעבר / 2 שניות שחור — כדי שהנבדק
            יישאר קצת יותר דרוך בין תחום לתחום, בלי להוסיף שום דבר למדידה בפועל
            (עדיין אותם 10 שניות בסך הכל, אותו stepKey/timer). */}
        {activeSequence && phase === "domain" && stepKey === "blank3" && (() => {
          const elapsed = Math.max(0, stepDuration - secondsLeft); // ~0 → 10, מבוסס על אותו secondsLeft הקיים
          const inMessageWindow =
            elapsed >= BLANK3_MSG_DURATIONS[0] &&
            elapsed < (BLANK3_MSG_DURATIONS[0] + BLANK3_MSG_DURATIONS[1]);
          const isLastDomain = domainIdx + 1 >= domains.length;
          return (
            <div style={{ width: "100%", height: "100%", background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center", padding: "3rem" }}>
              {inMessageWindow && (
                <p style={{ fontSize: "1.7rem", textAlign: "center", lineHeight: 1.6, maxWidth: 720, color: "#fff" }}>
                  {isLastDomain ? "הבדיקה עומדת להסתיים" : "עוברים לחלק הבא"}
                </p>
              )}
            </div>
          );
        })()}

        {activeSequence && stepKind === "audio" && (
          <div style={{ width: "100%", height: "100%", background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end", height: 90 }}>
              {[1, 2, 3, 4, 5, 6, 7].map(i => (
                <div key={i} style={{
                  width: 10, borderRadius: 5, background: "#4f9d8a",
                  height: `${30 + Math.sin(i * 0.9) * 30}px`,
                  animation: `waveBar ${0.6 + i * 0.1}s ease-in-out infinite alternate`,
                  animationDelay: `${i * 0.08}s`
                }} />
              ))}
            </div>
          </div>
        )}

        {activeSequence && stepKind === "question" && (
          <div style={{
            width: "100%", height: "100%", background: "#1a1a1a",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 24, padding: "3rem"
          }}>
            <p style={{ fontSize: "1.7rem", textAlign: "center", lineHeight: 1.6, maxWidth: 720, color: "#fff" }}>
              {phase === "practice" ? PRACTICE_QUESTION_TEXT : questionVariants[domainIdx]}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div className="rec-dot" />
              <span style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.7)" }}>
                {t(gender, "ענה בקול רם", "עני בקול רם")}
              </span>
            </div>

            {/* כפתור "סיום תשובה" — מופיע בכל מסך שאלה (גם בתרגול, סה"כ 9 מסכים: תרגול + 8
                תחומים). לחיצה עליו קוראת ל-advanceStep ישירות, כמו שהטיימר עושה כשהזמן נגמר,
                כדי שנבדק שסיים לענות מוקדם לא יצטרך להמתין לסוף הזמן המוקצב לשלב השאלה. */}
            <button
              onClick={advanceStep}
              style={{
                marginTop: 4,
                background: "rgba(79,157,138,0.92)", color: "#fff",
                border: "none", borderRadius: 10,
                padding: "12px 30px", fontSize: "1rem", fontWeight: 600,
                cursor: "pointer", fontFamily: "Heebo, sans-serif"
              }}
            >
              סיום תשובה
            </button>
          </div>
        )}

        {phase === "practiceOutro" && (
          <div style={{
            width: "100%", height: "100%",
            background: practiceOutroIdx === 2 ? "#000" : "#1a1a1a",
            display: "flex", alignItems: "center", justifyContent: "center", padding: "3rem"
          }}>
            {practiceOutroIdx !== 2 && (
              <p style={{ fontSize: "1.7rem", textAlign: "center", lineHeight: 1.6, maxWidth: 720, color: "#fff" }}>
                {practiceOutroIdx === 0 ? "נגמר שלב התרגול" : "הבדיקה תתחיל בעוד מספר רגעים"}
              </p>
            )}
          </div>
        )}

        {recording && (
          <div style={{
            position: "fixed", top: 16, right: 16, zIndex: 20,
            display: "flex", alignItems: "center", gap: 6,
            background: "rgba(0,0,0,0.55)", padding: "4px 10px", borderRadius: 20
          }}>
            <div className="rec-dot" />
            <span style={{ color: "#fff", fontSize: "0.75rem", fontWeight: 500 }}>REC</span>
          </div>
        )}

        {/* DEV / סוקר: דילוג על השלב/פאזה הנוכחית, בלי להמתין לטיימר האמיתי — מוצג במצב מפתח או סוקר */}
        {(isDevMode || isReviewerMode) && (
        <div style={{ position: "fixed", bottom: 16, left: 16, zIndex: 20, display: "flex", gap: 10 }}>
          <button
            onClick={skipCurrent}
            style={{
              background: "rgba(31,78,121,0.92)", color: "#fff",
              border: "1px dashed rgba(255,255,255,0.5)", borderRadius: 8,
              padding: "8px 14px", fontSize: "0.8rem", fontWeight: 600,
              cursor: "pointer", fontFamily: "Heebo, sans-serif"
            }}
          >
            ⏭ דלג לשלב הבא
          </button>

          {/* סוקר בלבד: עצירה/המשך של הבדיקה — עוצר את כל הטיימרים (וגם את הוידאו/אודיו
              שמתנגנים) כדי לאפשר לאיש המקצוע להתעכב על פרט מסוים; לחיצה נוספת ממשיכה. */}
          {isReviewerMode && (
          <button
            onClick={togglePause}
            style={{
              background: paused ? "rgba(63,185,80,0.92)" : "rgba(196,69,54,0.92)", color: "#fff",
              border: "1px dashed rgba(255,255,255,0.5)", borderRadius: 8,
              padding: "8px 14px", fontSize: "0.8rem", fontWeight: 600,
              cursor: "pointer", fontFamily: "Heebo, sans-serif"
            }}
          >
            {paused ? "▶ הפעל בדיקה" : "⏸ עצור בדיקה"}
          </button>
          )}
        </div>
        )}

        {/* סוקר בלבד: תג ברור במרכז המסך כשהבדיקה בהשהיה, כדי שלא יישאר ספק אם היא פעילה */}
        {isReviewerMode && paused && (
        <div style={{
          position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 20,
          background: "rgba(196,69,54,0.92)", color: "#fff",
          padding: "6px 16px", borderRadius: 20, fontSize: "0.85rem", fontWeight: 600,
          fontFamily: "Heebo, sans-serif"
        }}>
          ⏸ הבדיקה מושהתה
        </div>
        )}

        <style>{`
          @keyframes waveBar {
            from { transform: scaleY(0.4); }
            to   { transform: scaleY(1.2); }
          }
        `}</style>
      </div>
    );
  }

  // ── intro / baselineIntro / done ──
  return (
    <div className="page" style={{ padding: "1.5rem" }}>
      <div className="container">

        {phase === "intro" && (
          <div className="card fade-up">
            <h2 style={{ marginBottom: "1rem" }}>הוראות לבדיקה</h2>
            <ul style={{ paddingRight: "1.25rem", lineHeight: 2, color: "var(--ink-soft)", marginBottom: "1.5rem" }}>
              <li>{t(gender,
                  "שב בנוחות מול המצלמה, השתדל במשך כל הבדיקה להסתכל למסך ולא להביא את הידיים לאזור הפנים",
                  "שבי בנוחות מול המצלמה, השתדלי במשך כל הבדיקה להסתכל למסך ולא להביא את הידיים לאזור הפנים"
                )}</li>
              <li>הבדיקה כוללת שלב הרפיה קצר שמטרתו להביא את הגוף למצב ניטרלי, תרגול קצר שידגים לך את הבדיקה ואז מעבר לבדיקה עצמה</li>
              <li>{t(gender, "בבדיקה תיחשף לתמונות וקטעי אודיו ולאחר החשיפות תתבקש לענות על שאלה", "בבדיקה תיחשפי לתמונות וקטעי אודיו ולאחר החשיפות תתבקשי לענות על שאלה")}</li>
              <li>{t(gender, "הגב בטבעיות", "הגיבי בטבעיות")} — אין תשובות נכונות או שגויות</li>
              <li>{t(gender, "אל תנסה לנחש", "אל תנסי לנחש")} מה בודקים בכל שלב</li>
              <li>משך הבדיקה: כ-{Math.round(TOTAL_SEC / 60)} דקות</li>
              {!isReviewerMode && <li>הבדיקה מצולמת ומוקלטת</li>}
            </ul>
            <div className="divider" />
            <button
              className="btn btn-primary btn-lg btn-full"
              onClick={goToBaselineIntro}
              disabled={!camReady}
            >
              {camReady
                ? t(gender, "התחל →", "התחילי →")
                : <><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> מאתחל מצלמה...</>}
            </button>
          </div>
        )}

        {phase === "baselineIntro" && (
          <div className="card fade-up" style={{ textAlign: "center" }}>
            <h2 style={{ marginBottom: "1rem" }}>מצב רגיעה</h2>
            <p style={{ color: "var(--ink-soft)", lineHeight: 1.9, marginBottom: "1.75rem", fontSize: "1rem" }}>
              {RELAXATION_TEXT}
            </p>
            <div className="divider" />
            <button
              className="btn btn-primary btn-lg btn-full"
              onClick={confirmRelaxation}
            >
              {t(gender, "אני מוכן להתחיל", "אני מוכנה להתחיל")}
            </button>
          </div>
        )}

        {phase === "done" && (
          <div className="card" style={{ textAlign: "center", padding: "3rem 2rem" }}>
            {uploading ? (
              <>
                <div className="spinner" style={{ margin: "0 auto 1rem" }} />
                <h3 style={{ fontFamily: "'Heebo'", fontWeight: 500 }}>מעלה וידאו לניתוח...</h3>
                <p>אנא המתן</p>
              </>
            ) : (
              <h3 style={{ fontFamily: "'Heebo'", fontWeight: 500 }}>הבדיקה הסתיימה ✓</h3>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
