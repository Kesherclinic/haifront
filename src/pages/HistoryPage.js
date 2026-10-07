import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000";

const STATUS_LABELS = {
  complete:   { label: "הושלם", color: "var(--teal)",   bg: "var(--teal-soft)" },
  processing: { label: "בעיבוד", color: "var(--amber)",  bg: "var(--amber-soft)" },
  error:      { label: "שגיאה",  color: "var(--coral)",  bg: "var(--coral-soft)" },
  pending:    { label: "ממתין",  color: "var(--ink-muted)", bg: "var(--paper-warm)" },
};

export default function HistoryPage() {
  const [sessions, setSessions]   = useState([]);
  const [subjects, setSubjects]   = useState({});
  const [loading,  setLoading]    = useState(true);
  const [search,   setSearch]     = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`${API}/sessions`).then(r => r.json()),
      fetch(`${API}/subjects`).then(r => r.json()),
    ]).then(([sess, subs]) => {
      setSessions(sess || []);
      const subMap = {};
      (subs || []).forEach(s => { subMap[s.id] = s; });
      setSubjects(subMap);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = sessions.filter(s => {
    const sub = subjects[s.subject_id];
    return !search || sub?.name?.includes(search) || s.id?.includes(search);
  });

  const fmt = ts => {
    if (!ts) return "—";
    const d = ts._seconds ? new Date(ts._seconds * 1000) : new Date(ts);
    return d.toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="page">
      <div className="container">

        <nav className="nav">
          <Link className="nav-logo" to="/">נטיית <span>הלב</span></Link>
          <Link className="btn btn-primary" to="/" style={{ padding: "8px 20px", fontSize: "0.9rem" }}>
            + בדיקה חדשה
          </Link>
        </nav>

        <h2 style={{ marginBottom: "1.5rem" }} className="fade-up">היסטוריית בדיקות</h2>

        {/* Search */}
        <div className="field fade-up" style={{ marginBottom: "1.25rem" }}>
          <input
            placeholder="חיפוש לפי שם נבדק..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "3rem" }}>
            <div className="spinner" style={{ margin: "0 auto" }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
            <p style={{ marginBottom: "1rem" }}>
              {search ? "לא נמצאו תוצאות לחיפוש זה" : "אין בדיקות עדיין"}
            </p>
            <Link className="btn btn-primary" to="/">התחל בדיקה ראשונה</Link>
          </div>
        ) : (
          <div className="fade-up fade-up-delay-1">
            {filtered.map((s, i) => {
              const sub    = subjects[s.subject_id];
              const status = STATUS_LABELS[s.status] || STATUS_LABELS.pending;
              return (
                <div key={s.id} style={{
                  background: "#fff",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: "1rem 1.25rem",
                  marginBottom: "0.75rem",
                  display: "flex", alignItems: "center", gap: "1rem",
                  transition: "box-shadow var(--transition)",
                  cursor: "pointer"
                }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = "var(--shadow-md)"}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
                  onClick={() => s.status === "complete" && (window.location.href = `/results/${s.id}`)}
                >
                  {/* Index */}
                  <div style={{
                    minWidth: 36, height: 36, borderRadius: "50%",
                    background: "var(--accent-soft)", color: "var(--accent)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "'DM Serif Display', serif", fontSize: "1rem"
                  }}>
                    {filtered.length - i}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, marginBottom: 2 }}>
                      {sub?.name || "נבדק לא ידוע"}
                      {sub?.age && <span style={{ color: "var(--ink-muted)", fontWeight: 400, fontSize: "0.9rem" }}> · {sub.age}</span>}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--ink-muted)" }}>
                      {fmt(s.created_at)} &nbsp;·&nbsp; <span className="mono">{s.id?.slice(0,8)}</span>
                    </div>
                  </div>

                  {/* Status badge */}
                  <span style={{
                    padding: "3px 10px", borderRadius: 20, fontSize: "0.78rem", fontWeight: 500,
                    color: status.color, background: status.bg
                  }}>
                    {status.label}
                  </span>

                  {/* Action */}
                  {s.status === "complete" && (
                    <Link
                      to={`/results/${s.id}`}
                      className="btn btn-secondary"
                      style={{ padding: "6px 14px", fontSize: "0.85rem" }}
                      onClick={e => e.stopPropagation()}
                    >
                      צפה בדוח
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <p style={{ fontSize: "0.8rem", color: "var(--ink-muted)", textAlign: "center", marginTop: "1.5rem" }}>
          {filtered.length} בדיקות &nbsp;·&nbsp; Firebase Firestore
        </p>
      </div>
    </div>
  );
}
