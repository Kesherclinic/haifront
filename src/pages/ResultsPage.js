import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell
} from "recharts";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000";

const DOMAIN_LABELS = {
  art:                   "אומנות",
  sport_challenge:       "ספורט ואתגר",
  nature:                "טבע",
  science_learning:      "מדע ולמידה",
  innovation_technology: "חדשנות וטכנולוגיה",
  culture_leisure:       "תרבות ופנאי",
  care_education:        "טיפול וחינוך",
  personal_growth:       "התפתחות אישית",
};

const CLASS_COLORS = {
  strong:    "#0f6e56",
  notable:   "#5b4fcf",
  mild:      "#b87c0e",
  neutral:   "#9a9ab0",
  rejection: "#c94a2a",
};

export default function ResultsPage() {
  const { sessionId } = useParams();
  const nav = useNavigate();
  const [conclusion, setConclusion] = useState(null);
  const [results,    setResults]    = useState(null);
  const [session,    setSession]    = useState(null);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/conclusions/${sessionId}`).then(r => r.ok ? r.json() : null),
      fetch(`${API}/results/${sessionId}`).then(r => r.ok ? r.json() : null),
      fetch(`${API}/sessions/${sessionId}`).then(r => r.ok ? r.json() : null),
    ]).then(([c, r, s]) => {
      setConclusion(c);
      setResults(r);
      setSession(s);
      setLoading(false);
    });
  }, [sessionId]);

  if (loading) return (
    <div className="page">
      <div className="container" style={{ textAlign: "center", paddingTop: "4rem" }}>
        <div className="spinner" style={{ margin: "0 auto" }} />
      </div>
    </div>
  );

  if (!conclusion) return (
    <div className="page">
      <div className="container">
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <p style={{ marginBottom: "1rem" }}>לא נמצאו תוצאות לסשן זה.</p>
          <Link className="btn btn-secondary" to="/">חזור להתחלה</Link>
        </div>
      </div>
    </div>
  );

  // Build chart data
  const domainScores = results?.domain_scores || [];
  const barData = Object.entries(DOMAIN_LABELS).map(([id, label]) => {
    const d = domainScores.find(x => x.domain_id === id);
    return { name: label, score: d?.hai_score || 0, classification: d?.classification || "neutral" };
  }).sort((a, b) => b.score - a.score);

  const radarData = barData.map(d => ({ subject: d.name, value: d.score }));
  const topDomains = conclusion.top_domains || [];
  const sigPeaks   = results?.signature_peaks || [];
  const rejections = results?.rejection_flags || [];

  return (
    <div className="page">
      <div className="container">

        {/* Nav */}
        <nav className="nav">
          <Link className="nav-logo" to="/">נטיית <span>הלב</span></Link>
          <div className="nav-links">
            <Link to="/history">כל הסשנים</Link>
            <button className="btn btn-secondary" style={{ padding: "6px 14px", fontSize: "0.85rem" }}
              onClick={() => window.print()}>⬇ הורד PDF</button>
          </div>
        </nav>

        {/* Header */}
        <div style={{ marginBottom: "2rem" }} className="fade-up">
          <h1 style={{ marginBottom: "0.25rem" }}>דוח נטיית הלב</h1>
          <p style={{ fontSize: "0.9rem", color: "var(--ink-muted)" }}>
            סשן <span className="mono">{sessionId?.slice(0,8)}</span>
            &nbsp;·&nbsp; פרוטוקול HAI v{conclusion.protocol_version}
          </p>
        </div>

        {/* Top 3 domains */}
        {topDomains.length > 0 && (
          <div className="card fade-up fade-up-delay-1" style={{ marginBottom: "1.25rem" }}>
            <h3 style={{ fontFamily: "'Heebo'", fontWeight: 500, marginBottom: "1rem" }}>
              Top תחומי חיים
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
              {topDomains.map((d, i) => (
                <div key={d.domain} style={{
                  padding: "1.25rem",
                  borderRadius: 12,
                  background: i === 0 ? "var(--teal-soft)" : i === 1 ? "var(--accent-soft)" : "var(--amber-soft)",
                  border: `1px solid ${i === 0 ? "rgba(15,110,86,0.15)" : i === 1 ? "rgba(91,79,207,0.15)" : "rgba(184,124,14,0.15)"}`
                }}>
                  <div style={{ fontSize: "1.8rem", fontFamily: "'DM Serif Display', serif",
                    color: i === 0 ? "var(--teal)" : i === 1 ? "var(--accent)" : "var(--amber)",
                    marginBottom: 4 }}>
                    #{i + 1}
                  </div>
                  <div style={{ fontWeight: 500, marginBottom: 4 }}>{d.label_he}</div>
                  <div style={{ fontSize: "0.82rem", color: "var(--ink-muted)" }}>
                    ציון HAI: <strong>{d.hai_score?.toFixed(0)}</strong>
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <span className={`badge badge-${d.classification}`}>{
                      { strong: "חיבור חזק", notable: "חיבור מובהק", mild: "עניין" }[d.classification] || d.classification
                    }</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Charts */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem", marginBottom: "1.25rem" }}
          className="fade-up fade-up-delay-2">

          {/* Bar chart */}
          <div className="card">
            <h3 style={{ fontFamily: "'Heebo'", fontWeight: 500, marginBottom: "1rem", fontSize: "1rem" }}>
              ציוני HAI — כל התחומים
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={barData} layout="vertical" margin={{ right: 10 }}>
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
                <Tooltip formatter={v => [`${v.toFixed(1)}`, "ציון HAI"]} />
                <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                  {barData.map((d, i) => (
                    <Cell key={i} fill={CLASS_COLORS[d.classification] || CLASS_COLORS.neutral} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Radar chart */}
          <div className="card">
            <h3 style={{ fontFamily: "'Heebo'", fontWeight: 500, marginBottom: "1rem", fontSize: "1rem" }}>
              פרופיל נטיית הלב
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                <Radar name="HAI" dataKey="value" stroke="#5b4fcf" fill="#5b4fcf" fillOpacity={0.2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

        </div>

        {/* Signature peaks */}
        {sigPeaks.length > 0 && (
          <div className="card fade-up fade-up-delay-2" style={{ marginBottom: "1.25rem" }}>
            <h3 style={{ fontFamily: "'Heebo'", fontWeight: 500, marginBottom: "0.75rem", fontSize: "1rem" }}>
              🔥 Signature Peaks — חיבור חזק במיוחד
            </h3>
            {sigPeaks.map((p, i) => (
              <div key={i} style={{
                display: "flex", gap: 12, padding: "8px 0",
                borderBottom: i < sigPeaks.length - 1 ? "1px solid var(--border)" : "none",
                fontSize: "0.9rem"
              }}>
                <span className="mono" style={{ color: "var(--ink-muted)" }}>
                  {Math.floor(p.start_sec / 60)}:{String(Math.floor(p.start_sec % 60)).padStart(2, "0")}
                </span>
                <span>Z={p.peak_z?.toFixed(2)}</span>
                <span style={{ color: "var(--ink-muted)" }}>משך: {p.duration_sec?.toFixed(1)}s</span>
                <span className="badge badge-strong">Signature</span>
              </div>
            ))}
          </div>
        )}

        {/* Narrative */}
        {conclusion.narrative && (
          <div className="card fade-up fade-up-delay-3" style={{ marginBottom: "1.25rem" }}>
            <h3 style={{ fontFamily: "'Heebo'", fontWeight: 500, marginBottom: "0.75rem", fontSize: "1rem" }}>
              מסקנה פרשנית
            </h3>
            <p style={{ whiteSpace: "pre-line", lineHeight: 1.9 }}>{conclusion.narrative}</p>
          </div>
        )}

        {/* Rejection flags */}
        {rejections.length > 0 && (
          <div className="card fade-up fade-up-delay-3" style={{ marginBottom: "1.25rem", borderColor: "var(--coral-soft)" }}>
            <h3 style={{ fontFamily: "'Heebo'", fontWeight: 500, marginBottom: "0.75rem", fontSize: "1rem", color: "var(--coral)" }}>
              ⚠️ דגלי דחייה / קונפליקט
            </h3>
            <p style={{ fontSize: "0.85rem", marginBottom: "0.75rem" }}>
              נקודות זמן עם Arousal גבוה + Valence שלילי מובהק (Z &lt; -0.5):
            </p>
            {rejections.slice(0, 5).map((r, i) => (
              <div key={i} style={{ fontSize: "0.85rem", color: "var(--ink-soft)", padding: "4px 0" }}>
                <span className="mono">{r.timestamp?.toFixed(1)}s</span>
                &nbsp;·&nbsp; {r.dominant || "unknown"} &nbsp;·&nbsp; Z={r.z_score?.toFixed(2)} &nbsp;·&nbsp; {r.channel}
              </div>
            ))}
          </div>
        )}

        {/* Stats footer */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem", marginBottom: "1.5rem" }}
          className="fade-up fade-up-delay-3">
          {[
            { label: "פריימים שנותחו", value: results?.video_stats?.n_samples || "—" },
            { label: "סגמנטי שמע",     value: results?.audio_stats?.n_samples || "—" },
            { label: "ממוצע Valence",   value: results?.video_stats?.mean_valence?.toFixed(3) || "—" },
            { label: "מקסימום Z",       value: results?.video_stats?.max_z?.toFixed(2) || "—" },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding: "1rem", textAlign: "center" }}>
              <div style={{ fontSize: "1.4rem", fontFamily: "'DM Serif Display', serif",
                color: "var(--accent)", marginBottom: 4 }}>{s.value}</div>
              <div style={{ fontSize: "0.78rem", color: "var(--ink-muted)" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginBottom: "2rem" }}>
          <Link className="btn btn-secondary" to="/">בדיקה חדשה</Link>
          <Link className="btn btn-primary" to="/history">כל הסשנים</Link>
        </div>

      </div>
    </div>
  );
}
