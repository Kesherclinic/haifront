import React, { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, LineChart, Line, CartesianGrid, Legend, ResponsiveContainer } from "recharts";

function parseCSV(text) {
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",").map(h => h.trim().replace(/"/g, ""));
  return lines.slice(1).map(line => {
    const vals = line.split(",");
    const obj = {};
    headers.forEach((h, i) => {
      const v = (vals[i] || "").trim().replace(/"/g, "");
      obj[h] = isNaN(v) || v === "" ? v : parseFloat(v);
    });
    return obj;
  }).filter(row => Object.keys(row).length > 1);
}

function calculateHAI(videoRows, audioRows) {
  const allRows = [...videoRows, ...audioRows].map(r => ({
    ...r, affinity_raw: (r.valence || 0) * (r.arousal || 0),
  }));
  if (allRows.length === 0) return null;
  const affinities = allRows.map(r => r.affinity_raw);
  const mean = affinities.reduce((a, b) => a + b, 0) / affinities.length;
  const std = Math.sqrt(affinities.map(x => (x - mean) ** 2).reduce((a, b) => a + b, 0) / affinities.length) || 1;
  const withZ = allRows.map(r => ({ ...r, affinity_z: (r.affinity_raw - mean) / std }));
  const maxZ = Math.max(...withZ.map(r => r.affinity_z));
  const meanVal = videoRows.length ? videoRows.reduce((a, b) => a + (b.valence || 0), 0) / videoRows.length : 0;
  const meanAro = videoRows.length ? videoRows.reduce((a, b) => a + (b.arousal || 0), 0) / videoRows.length : 0;
  const emotions = withZ.map(r => r.dominant).filter(Boolean);
  const domCount = {};
  emotions.forEach(e => { domCount[e] = (domCount[e] || 0) + 1; });
  const dominant = Object.entries(domCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "neutral";
  const peaks = [];
  let inPeak = false, peakStart = 0, peakMaxZ = 0;
  withZ.forEach((r, i) => {
    const ts = r.timestamp ?? r.start_sec ?? i;
    if (r.affinity_z >= 1.5) {
      if (!inPeak) { inPeak = true; peakStart = ts; peakMaxZ = r.affinity_z; }
      else peakMaxZ = Math.max(peakMaxZ, r.affinity_z);
    } else if (inPeak) {
      const dur = ts - peakStart;
      if (dur >= 1.5 || peakMaxZ >= 2.0) peaks.push({ start_sec: peakStart, end_sec: ts, duration_sec: dur, peak_z: peakMaxZ, is_signature: peakMaxZ >= 2.0 && dur >= 5 });
      inPeak = false;
    }
  });
  const timeline = withZ.filter((_, i) => i % 10 === 0).map(r => ({ t: Math.round(r.timestamp ?? r.start_sec ?? 0), z: parseFloat(r.affinity_z.toFixed(3)), valence: parseFloat((r.valence || 0).toFixed(3)) }));
  return { stats: { mean_valence: meanVal, mean_arousal: meanAro, max_z: maxZ, n_samples: withZ.length, dominant_emotion: dominant }, peaks, signature_peaks: peaks.filter(p => p.is_signature), timeline };
}

export default function ImportPage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pendingVideo, setPendingVideo] = useState(null);
  const [pendingAudio, setPendingAudio] = useState(null);
  const [sessionLabel, setSessionLabel] = useState("");

  const handleSubmit = async () => {
    if (!pendingVideo) { alert("נא לבחור קובץ וידאו CSV"); return; }
    setLoading(true);
    try {
      const videoText = await pendingVideo.text();
      const audioText = pendingAudio ? await pendingAudio.text() : "";
      const videoRows = parseCSV(videoText);
      const audioRows = pendingAudio ? parseCSV(audioText) : [];
      const hai = calculateHAI(videoRows, audioRows);
      setSessions(prev => [...prev, { label: sessionLabel || "ייבוא " + (prev.length + 1), hai }].slice(-2));
    } catch(e) { alert("שגיאה: " + e.message); }
    setLoading(false);
    setPendingVideo(null); setPendingAudio(null); setSessionLabel("");
  };

  const s1 = sessions[0], s2 = sessions[1];

  return (
    <div className="page">
      <div className="container">
        <nav className="nav">
          <Link className="nav-logo" to="/">נטיית <span>הלב</span></Link>
          <div className="nav-links"><Link to="/history">היסטוריה</Link><Link to="/">בדיקה חדשה</Link></div>
        </nav>
        <h2 style={{ marginBottom: "0.5rem" }}>ייבוא נתונים מחיצוני</h2>
        <p style={{ marginBottom: "1.5rem", color: "var(--ink-muted)" }}>העלה קבצי CSV מבדיקה במערכת אחרת — האפליקציה תחשב מדדי HAI ותציג תוצאות להשוואה.</p>
        {sessions.length < 2 && (
          <div className="card" style={{ marginBottom: "1.25rem" }}>
            <h3 style={{ fontFamily: "'Heebo'", fontWeight: 500, marginBottom: "1rem" }}>{sessions.length === 0 ? "בדיקה ראשונה" : "בדיקה שנייה להשוואה"}</h3>
            <div className="field"><label>שם / תווית</label><input placeholder="מערכת A..." value={sessionLabel} onChange={e => setSessionLabel(e.target.value)} /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
              {[{ key: "video", label: "קובץ וידאו CSV *", icon: "📊", state: pendingVideo, setter: setPendingVideo },
                { key: "audio", label: "קובץ שמע CSV", icon: "🎵", state: pendingAudio, setter: setPendingAudio }].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--ink-soft)", display: "block", marginBottom: 6 }}>{f.label}</label>
                  <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "1.5rem", border: `2px dashed ${f.state ? "var(--teal)" : "var(--border)"}`, borderRadius: 12, cursor: "pointer", background: f.state ? "var(--teal-soft)" : "#fff" }}>
                    <input type="file" accept=".csv" style={{ display: "none" }} onChange={e => f.setter(e.target.files[0])} />
                    <span style={{ fontSize: "1.5rem", marginBottom: 6 }}>{f.state ? "✓" : f.icon}</span>
                    <span style={{ fontSize: "0.85rem", color: f.state ? "var(--teal)" : "var(--ink-muted)" }}>{f.state ? f.state.name : "לחץ לבחירת קובץ"}</span>
                  </label>
                </div>
              ))}
            </div>
            <button className="btn btn-primary btn-full" onClick={handleSubmit} disabled={loading || !pendingVideo}>
              {loading ? "מחשב..." : "חשב HAI →"}
            </button>
          </div>
        )}
        {sessions.map((sess, idx) => (
          <div key={idx} className="card" style={{ marginBottom: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ fontFamily: "'Heebo'", fontWeight: 500 }}>{sess.label}</h3>
              <button className="btn btn-secondary" style={{ padding: "4px 12px", fontSize: "0.8rem" }} onClick={() => setSessions(prev => prev.filter((_, i) => i !== idx))}>הסר</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "0.75rem", marginBottom: "1rem" }}>
              {[{ label: "סמפלים", value: sess.hai.stats.n_samples }, { label: "Max Z", value: sess.hai.stats.max_z.toFixed(2) }, { label: "Mean Valence", value: sess.hai.stats.mean_valence.toFixed(3) }, { label: "רגש דומיננטי", value: sess.hai.stats.dominant_emotion }].map(s => (
                <div key={s.label} style={{ background: "var(--paper-warm)", borderRadius: 8, padding: "0.75rem", textAlign: "center" }}>
                  <div style={{ fontSize: "1.1rem", fontFamily: "'DM Serif Display',serif", color: "var(--accent)" }}>{s.value}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--ink-muted)" }}>{s.label}</div>
                </div>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={sess.hai.timeline}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="t" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="z" stroke="#5b4fcf" dot={false} strokeWidth={1.5} name="Affinity Z" />
                <Line type="monotone" dataKey="valence" stroke="#0f6e56" dot={false} strokeWidth={1} name="Valence" strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ))}
        {sessions.length === 2 && (
          <div className="card" style={{ marginBottom: "1.25rem" }}>
            <h3 style={{ fontFamily: "'Heebo'", fontWeight: 500, marginBottom: "1rem" }}>השוואה: {s1.label} vs {s2.label}</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={[{ name: "Max Z", s1: +s1.hai.stats.max_z.toFixed(2), s2: +s2.hai.stats.max_z.toFixed(2) }, { name: "Mean Valence", s1: +s1.hai.stats.mean_valence.toFixed(3), s2: +s2.hai.stats.mean_valence.toFixed(3) }, { name: "פיקים", s1: s1.hai.peaks.length, s2: s2.hai.peaks.length }]}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip /><Legend />
                <Bar dataKey="s1" name={s1.label} fill="#5b4fcf" radius={[4,4,0,0]} />
                <Bar dataKey="s2" name={s2.label} fill="#0f6e56" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
            <button className="btn btn-secondary btn-full" style={{ marginTop: "1rem" }} onClick={() => setSessions([])}>נקה הכל</button>
          </div>
        )}
      </div>
    </div>
  );
}
