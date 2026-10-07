import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000";

const DEFAULT_STIMULUS_MAP = [
  { domain: "art", label: "אומנות", start: "00:10", end: "00:40", type: "image" },
  { domain: "sport_challenge", label: "ספורט ואתגר", start: "00:41", end: "01:10", type: "image" },
  { domain: "nature", label: "טבע", start: "01:11", end: "01:40", type: "image" },
  { domain: "innovation_technology", label: "טכנולוגיה", start: "01:41", end: "02:10", type: "image" },
  { domain: "science_learning", label: "מדע וחקר", start: "02:11", end: "02:40", type: "image" },
  { domain: "culture_leisure", label: "תרבות", start: "02:41", end: "03:10", type: "image" },
  { domain: "care_education", label: "חינוך וטיפול", start: "03:11", end: "03:40", type: "image" },
  { domain: "personal_growth", label: "מיינדפולנס", start: "03:41", end: "04:10", type: "image" },
  { domain: "art", label: "אומנות", start: "04:20", end: "05:40", type: "audio" },
  { domain: "sport_challenge", label: "ספורט ואתגר", start: "05:41", end: "07:00", type: "audio" },
  { domain: "nature", label: "טבע", start: "07:01", end: "08:20", type: "audio" },
  { domain: "innovation_technology", label: "טכנולוגיה", start: "08:21", end: "09:40", type: "audio" },
  { domain: "science_learning", label: "מדע וחקר", start: "09:41", end: "11:00", type: "audio" },
  { domain: "culture_leisure", label: "תרבות", start: "11:01", end: "12:20", type: "audio" },
  { domain: "care_education", label: "חינוך וטיפול", start: "12:21", end: "13:40", type: "audio" },
  { domain: "personal_growth", label: "מיינדפולנס", start: "13:41", end: "15:00", type: "audio" },
];

function timeToSec(t) {
  const parts = t.split(":").map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

function secToTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return String(m).padStart(2,"0") + ":" + String(sec).padStart(2,"0");
}

const DOMAIN_COLORS = ["#5b4fcf","#0f6e56","#c94a2a","#b87c0e","#185FA5","#639922","#D85A30","#534AB7"];
const TYPE_COLORS = { image: { bg: "#E1F5EE", color: "#085041" }, audio: { bg: "#EEEDFE", color: "#26215C" } };

export default function UploadAnalysisPage() {
  const nav = useNavigate();
  const [subjectName, setSubjectName] = useState("");
  const [subjectGender, setSubjectGender] = useState("male");
  const [videoFile, setVideoFile] = useState(null);
  const [stimuli, setStimuli] = useState(DEFAULT_STIMULUS_MAP);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [editIdx, setEditIdx] = useState(null);

  const updateStim = (idx, field, val) =>
    setStimuli(prev => prev.map((s, i) => i === idx ? { ...s, [field]: val } : s));

  const totalDuration = Math.max(...stimuli.map(s => timeToSec(s.end)));
  const uniqueDomains = [...new Set(stimuli.map(s => s.domain))];

  const handleUpload = async () => {
    if (!videoFile) { setError("נא לבחור קובץ וידאו"); return; }
    if (!subjectName.trim()) { setError("נא להזין שם נבדק"); return; }
    setError(""); setUploading(true); setProgress(10);
    try {
      const sRes = await fetch(API + "/subjects?name=" + encodeURIComponent(subjectName) + "&gender=" + subjectGender, { method: "POST" });
      if (!sRes.ok) throw new Error("שגיאה ביצירת נבדק");
      const { subject_id } = await sRes.json();
      setProgress(25);
      const sessRes = await fetch(API + "/sessions?subject_id=" + subject_id + "&protocol_version=1.0", { method: "POST" });
      if (!sessRes.ok) throw new Error("שגיאה ביצירת סשן");
      const { session_id } = await sessRes.json();
      setProgress(40);
      const stimulus_map = {};
      stimuli.forEach(s => {
        if (!stimulus_map[s.domain]) stimulus_map[s.domain] = [];
        stimulus_map[s.domain].push([timeToSec(s.start), timeToSec(s.end)]);
      });
      const fd = new FormData();
      fd.append("video", videoFile);
      fd.append("stimulus_map", JSON.stringify(stimulus_map));
      const res = await fetch(API + "/analyze/" + session_id, { method: "POST", body: fd });
      if (!res.ok) throw new Error("שגיאה בהעלאת הוידאו");
      setProgress(70);
      nav("/processing/" + session_id);
    } catch(e) {
      setError(e.message);
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="page">
      <div className="container">
        <nav className="nav">
          <Link className="nav-logo" to="/">נטיית <span>הלב</span></Link>
          <div className="nav-links">
            <Link to="/history">היסטוריה</Link>
            <Link to="/import">ייבוא נתונים</Link>
          </div>
        </nav>
        <h2 style={{ marginBottom: "0.5rem" }}>ניתוח סרטון קיים</h2>
        <p style={{ marginBottom: "1.5rem", color: "var(--ink-muted)" }}>העלה הקלטת וובקאם קיימת — האפליקציה תנתח אותה לפי מפת הגירויים ותייצר דוח HAI מלא.</p>
        <div className="card" style={{ marginBottom: "1.25rem" }}>
          <h3 style={{ fontFamily:"'Heebo'", fontWeight:500, marginBottom:"1rem" }}>פרטי נבדק</h3>
          <div className="field">
            <label>שם מלא *</label>
            <input placeholder="ישראל ישראלי" value={subjectName} onChange={e => setSubjectName(e.target.value)} />
          </div>
          <div className="field">
            <label>מגדר</label>
            <div style={{ display:"flex", gap:"0.75rem" }}>
              {[{value:"male",label:"זכר",icon:"♂"},{value:"female",label:"נקבה",icon:"♀"}].map(opt => (
                <button key={opt.value} type="button" onClick={() => setSubjectGender(opt.value)} style={{
                  flex:1, padding:"12px", borderRadius:12, cursor:"pointer", fontFamily:"'Heebo'",
                  fontSize:"1rem", display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                  border:"1.5px solid " + (subjectGender===opt.value ? "var(--accent)" : "var(--border)"),
                  background:subjectGender===opt.value ? "var(--accent-soft)" : "#fff",
                  color:subjectGender===opt.value ? "var(--accent)" : "var(--ink-soft)",
                  fontWeight:subjectGender===opt.value ? 500 : 400, transition:"all 0.15s"
                }}>
                  <span style={{fontSize:"1.2rem"}}>{opt.icon}</span>{opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="card" style={{ marginBottom:"1.25rem" }}>
          <h3 style={{ fontFamily:"'Heebo'", fontWeight:500, marginBottom:"1rem" }}>קובץ וידאו</h3>
          <label style={{
            display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
            padding:"2rem", border:"2px dashed " + (videoFile ? "var(--teal)" : "var(--border)"),
            borderRadius:12, cursor:"pointer", background:videoFile ? "var(--teal-soft)" : "#fff", transition:"all 0.15s"
          }}>
            <input type="file" accept="video/*" style={{display:"none"}} onChange={e => setVideoFile(e.target.files[0])} />
            <span style={{fontSize:"2rem", marginBottom:8}}>{videoFile ? "✓" : "🎥"}</span>
            <span style={{fontWeight:500, color:videoFile ? "var(--teal)" : "var(--ink)"}}>
              {videoFile ? videoFile.name : "לחץ לבחירת קובץ וידאו"}
            </span>
            {videoFile && <span style={{fontSize:"0.82rem", color:"var(--ink-muted)", marginTop:4}}>{(videoFile.size/1024/1024).toFixed(1)} MB</span>}
          </label>
        </div>
        <div className="card" style={{ marginBottom:"1.25rem" }}>
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1rem"}}>
            <h3 style={{fontFamily:"'Heebo'", fontWeight:500}}>מפת גירויים</h3>
            <span style={{fontSize:"0.82rem", color:"var(--ink-muted)"}}>{stimuli.length} גירויים · {secToTime(totalDuration)}</span>
          </div>
          <div style={{height:36, background:"var(--paper-warm)", borderRadius:8, position:"relative", overflow:"hidden", marginBottom:12}}>
            {stimuli.map((s,i) => {
              const start = timeToSec(s.start);
              const end = timeToSec(s.end);
              const left = (start/totalDuration)*100;
              const width = ((end-start)/totalDuration)*100;
              const dIdx = uniqueDomains.indexOf(s.domain);
              return <div key={i} title={s.label + " " + s.start + "-" + s.end} style={{
                position:"absolute", top:s.type==="image"?2:20,
                left:left+"%", width:width+"%", height:14,
                background:DOMAIN_COLORS[dIdx%DOMAIN_COLORS.length],
                opacity:s.type==="audio"?0.6:1, borderRadius:2
              }}/>;
            })}
          </div>
          {stimuli.map((s,i) => (
            <div key={i} style={{display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom:i<stimuli.length-1?"0.5px solid var(--border)":"none"}}>
              <span style={{padding:"2px 8px", borderRadius:20, fontSize:"0.75rem", fontWeight:500, background:TYPE_COLORS[s.type].bg, color:TYPE_COLORS[s.type].color, minWidth:44, textAlign:"center"}}>
                {s.type==="image"?"תמונה":"שמע"}
              </span>
              <span style={{flex:1, fontSize:"0.9rem", fontWeight:500}}>{s.label}</span>
              {editIdx===i ? (
                <>
                  <input value={s.start} onChange={e=>updateStim(i,"start",e.target.value)} style={{width:68,fontSize:"0.85rem",padding:"4px 8px",border:"1px solid var(--border)",borderRadius:6,direction:"ltr"}}/>
                  <span style={{color:"var(--ink-muted)"}}>—</span>
                  <input value={s.end} onChange={e=>updateStim(i,"end",e.target.value)} style={{width:68,fontSize:"0.85rem",padding:"4px 8px",border:"1px solid var(--border)",borderRadius:6,direction:"ltr"}}/>
                  <button className="btn btn-secondary" style={{padding:"4px 10px",fontSize:"0.8rem"}} onClick={()=>setEditIdx(null)}>שמור</button>
                </>
              ) : (
                <>
                  <span className="mono" style={{fontSize:"0.82rem",color:"var(--ink-muted)",direction:"ltr"}}>{s.start} – {s.end}</span>
                  <button className="btn btn-secondary" style={{padding:"4px 10px",fontSize:"0.78rem"}} onClick={()=>setEditIdx(i)}>עריכה</button>
                </>
              )}
            </div>
          ))}
        </div>
        {error && <div style={{padding:"10px 14px",borderRadius:8,background:"var(--coral-soft)",color:"var(--coral)",fontSize:"0.9rem",marginBottom:"1rem"}}>{error}</div>}
        {uploading ? (
          <div className="card" style={{textAlign:"center",padding:"2rem"}}>
            <div className="spinner" style={{margin:"0 auto 1rem"}}/>
            <p style={{marginBottom:"1rem"}}>מעלה ומנתח את הסרטון...</p>
            <div className="progress-bar"><div className="progress-bar-fill" style={{width:progress+"%"}}/></div>
            <p style={{fontSize:"0.82rem",color:"var(--ink-muted)",marginTop:"0.5rem"}}>{progress}%</p>
          </div>
        ) : (
          <button className="btn btn-primary btn-lg btn-full" onClick={handleUpload} disabled={!videoFile||!subjectName.trim()}>
            העלה וצור דוח HAI →
          </button>
        )}
        <p style={{fontSize:"0.82rem",color:"var(--ink-muted)",textAlign:"center",marginTop:"1rem"}}>הפיקים ישויכו אוטומטית לתחומי החיים לפי מפת הגירויים</p>
      </div>
    </div>
  );
}
