import React, { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000";

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

const BASELINE_SEC       = 240; // 4 דקות — סרטון מים (בייסליין נקי, לא נוגעים בו)
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

const REAL_DURATIONS     = { image1: 15, fade: 3, image2: 15, blank1: 10, audio: 40, blank2: 10, question: 60, blank3: 10 };
const PRACTICE_DURATIONS = { image1: 10, fade: 2, image2: 10, blank1: 5,  audio: 20, blank2: 5,  question: 30, blank3: 5  };

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

  const streamRef        = useRef(null); // camera MediaStream — independent of any <video> element
  const baselineVideoRef  = useRef(null);
  const baselineMusicRef  = useRef(null);
  const recorderRef      = useRef(null);
  const chunksRef        = useRef([]);
  const timerRef         = useRef(null);
  const audioRef         = useRef(null);

  const activeSequence = phase === "practice" || phase === "domain";
  const stepKey  = activeSequence ? STEP_ORDER[stepIdx] : null;
  const stepKind = stepKey ? STEP_KIND[stepKey] : null;
  const content  =
    phase === "practice" ? practiceContent(gender) :
    phase === "domain"   ? domainContent(domains[domainIdx], gender) :
    null;
  // HARD OVERRIDE — forces the real (non-practice) audio step to exactly 40s,
  // bypassing REAL_DURATIONS entirely for this case. Temporary, to rule out
  // any lookup issue: if this still doesn't show 40, the running bundle isn't
  // this file at all.
  const stepDuration = stepKey
    ? (stepKey === "audio" && phase === "domain"
        ? 40
        : (phase === "practice" ? PRACTICE_DURATIONS[stepKey] : REAL_DURATIONS[stepKey]))
    : 0;

  // ── Camera init (permission + recorder are ready long before recording actually starts) ──
  useEffect(() => {
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
  }, []);

  // ── Finish ──
  const finishTest = useCallback(async () => {
    setPhase("done");
    setUploading(true);
    const recorder = recorderRef.current;
    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const fd   = new FormData();
      fd.append("video", blob, "session.webm");
      try {
        const res = await fetch(`${API}/analyze/${sessionId}`, { method: "POST", body: fd });
        if (!res.ok) throw new Error();
        nav(`/processing/${sessionId}`);
      } catch {
        setUploading(false);
        alert(t(gender, "שגיאה בהעלאת הוידאו — נסה שוב", "שגיאה בהעלאת הוידאו — נסי שוב"));
      }
    };
    recorder.stop();
    streamRef.current?.getTracks().forEach(tr => tr.stop());
  }, [sessionId, nav, gender]);

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
    recorderRef.current?.start(1000);
    setRecording(true);
    setPhase("baseline");
    setSecondsLeft(BASELINE_SEC);
  }, []);

  // ── DEV: skip current step/phase manually — פעיל רק במצב מפתח (ראה isDevMode) ──
  const skipCurrent = useCallback(() => {
    if (!isDevMode) return;
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
  }, [phase, advanceStep, practiceOutroIdx, isDevMode]);

  // ── Baseline countdown (הבייסליין הנמדד — 240 שניות נקיות, לא נוגעים) ──
  useEffect(() => {
    if (phase !== "baseline") return;
    timerRef.current = setInterval(() => {
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
    const duration = PRACTICE_OUTRO_DURATIONS[practiceOutroIdx];
    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
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
    const duration = stepDuration;
    setSecondsLeft(duration);
    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      const remaining = Math.max(0, duration - elapsed);
      setSecondsLeft(Math.ceil(remaining));
      if (remaining <= 0) {
        clearInterval(timerRef.current);
        advanceStep();
      }
    }, 200);
    return () => clearInterval(timerRef.current);
  }, [phase, stepIdx, domainIdx]);

  // ── Play stimulus audio ──
  useEffect(() => {
    if (!activeSequence || stepKind !== "audio") return;
    const a = new Audio(content.audio);
    a.play().catch(() => {});
    audioRef.current = a;
    return () => { a.pause(); audioRef.current = null; };
  }, [phase, stepIdx, domainIdx]);

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
            src="/baseline/water.mp4"
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

        {activeSequence && stepKind === "blank" && (
          <div style={{ width: "100%", height: "100%", background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: "2.5rem", color: "rgba(255,255,255,0.5)" }}>+</span>
          </div>
        )}

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

        {/* DEV: skip current step/phase, for testing without waiting for real timers — מוצג רק במצב מפתח */}
        {isDevMode && (
        <button
          onClick={skipCurrent}
          style={{
            position: "fixed", bottom: 16, left: 16, zIndex: 20,
            background: "rgba(31,78,121,0.92)", color: "#fff",
            border: "1px dashed rgba(255,255,255,0.5)", borderRadius: 8,
            padding: "8px 14px", fontSize: "0.8rem", fontWeight: 600,
            cursor: "pointer", fontFamily: "Heebo, sans-serif"
          }}
        >
          ⏭ דלג לשלב הבא (DEV)
        </button>
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
              <li>הבדיקה מצולמת ומוקלטת</li>
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