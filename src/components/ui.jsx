import { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";
import { TEAMS } from "../lib/utils.js";

// ─── Team Icon ────────────────────────────────────────────────────────────────
export function TeamIcon({ icon, color = "currentColor", size = 18 }) {
  const icons = {
    wolf:  <path d="M4 8 L7 4 L9 7 L15 7 L17 4 L20 8 L20 15 Q20 20 16 21 L8 21 Q4 20 4 15 Z" fill={color} />,
    shark: <path d="M2 13 Q6 9 11 9 L18 6 L17 11 L21 12 L17 13 L18 17 L11 15 Q6 16 2 13 Z" fill={color} />,
    tiger: <><path d="M5 7 L4 4 L8 6 L16 6 L20 4 L19 7 Q21 9 21 13 Q21 19 16 21 L8 21 Q3 19 3 13 Q3 9 5 7 Z" fill={color}/><path d="M9 9 L9.5 12 M15 9 L14.5 12" stroke="white" strokeWidth="1.2" fill="none"/></>,
    eagle: <path d="M12 4 Q15 6 16 10 L20 8 L17 13 L21 14 L16 16 L18 21 L12 18 L6 21 L8 16 L3 14 L7 13 L4 8 L8 10 Q9 6 12 4 Z" fill={color} />,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round"
      style={{display:"inline-block",verticalAlign:"middle",flexShrink:0}}>
      {icons[icon] || null}
    </svg>
  );
}

// ─── SAIcon ────────────────────────────────────────────────────────────────────
function SAIconWrap({ size, color, children, fill = "none", stroke = true }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}
      stroke={stroke ? (color || "currentColor") : "none"} strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" style={{display:"block",flexShrink:0}}>
      {children}
    </svg>
  );
}

const SA_ICONS = {
  wolf:   ({s,c}) => <SAIconWrap size={s} color={c}><path d="M4 8 L7 4 L9 7 L15 7 L17 4 L20 8 L20 15 Q20 20 16 21 L8 21 Q4 20 4 15 Z" fill={c} stroke="none" /><circle cx="9.5" cy="13" r="0.9" fill="white" /><circle cx="14.5" cy="13" r="0.9" fill="white" /><path d="M11 16 Q12 17.2 13 16" stroke="white" strokeWidth="1.4" fill="none" /></SAIconWrap>,
  shark:  ({s,c}) => <SAIconWrap size={s} color={c}><path d="M2 13 Q6 9 11 9 L18 6 L17 11 L21 12 L17 13 L18 17 L11 15 Q6 16 2 13 Z" fill={c} stroke="none" /><circle cx="13.5" cy="11" r="0.9" fill="white" /><path d="M11 13 L13 13" stroke="white" strokeWidth="1" fill="none" /></SAIconWrap>,
  tiger:  ({s,c}) => <SAIconWrap size={s} color={c}><path d="M5 7 L4 4 L8 6 L16 6 L20 4 L19 7 Q21 9 21 13 Q21 19 16 21 L8 21 Q3 19 3 13 Q3 9 5 7 Z" fill={c} stroke="none" /><path d="M9 9 L9.5 12 M15 9 L14.5 12" stroke="white" strokeWidth="1.2" /><circle cx="9.5" cy="14" r="0.9" fill="white" /><circle cx="14.5" cy="14" r="0.9" fill="white" /><path d="M10.5 17 Q12 18 13.5 17" stroke="white" strokeWidth="1.3" fill="none" /></SAIconWrap>,
  eagle:  ({s,c}) => <SAIconWrap size={s} color={c}><path d="M12 4 Q15 6 16 10 L20 8 L17 13 L21 14 L16 16 L18 21 L12 18 L6 21 L8 16 L3 14 L7 13 L4 8 L8 10 Q9 6 12 4 Z" fill={c} stroke="none" /></SAIconWrap>,
  multiple_choice: ({s,c}) => <SAIconWrap size={s} color={c}><rect x="3" y="4" width="8" height="6" rx="1.5" /><rect x="13" y="4" width="8" height="6" rx="1.5" fill={c} stroke={c} /><rect x="3" y="14" width="8" height="6" rx="1.5" /><rect x="13" y="14" width="8" height="6" rx="1.5" /></SAIconWrap>,
  true_false: ({s,c}) => <SAIconWrap size={s} color={c}><path d="M4 12 L8 16 L14 8" /><path d="M16 8 L22 16 M22 8 L16 16" /></SAIconWrap>,
  error_spotter: ({s,c}) => <SAIconWrap size={s} color={c}><circle cx="11" cy="11" r="7" /><path d="M16 16 L21 21" /><path d="M9 11 L13 11" /></SAIconWrap>,
  type_answer: ({s,c}) => <SAIconWrap size={s} color={c}><path d="M4 7 L4 17 L20 17" /><path d="M4 7 L20 7" /><path d="M8 12 L16 12" /></SAIconWrap>,
  rearrange: ({s,c}) => <SAIconWrap size={s} color={c}><rect x="3" y="6" width="6" height="5" rx="1" /><rect x="11" y="6" width="6" height="5" rx="1" fill={c} stroke={c} /><rect x="7" y="13" width="6" height="5" rx="1" /><rect x="15" y="13" width="6" height="5" rx="1" /></SAIconWrap>,
  word_match: ({s,c}) => <SAIconWrap size={s} color={c}><rect x="2" y="5" width="7" height="6" rx="1.5" /><rect x="15" y="13" width="7" height="6" rx="1.5" /><path d="M9 8 Q12 8 12 12 Q12 16 15 16" strokeDasharray="2 2" /></SAIconWrap>,
  odd_one_out: ({s,c}) => <SAIconWrap size={s} color={c}><circle cx="6" cy="6" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="6" cy="18" r="2.5" /><circle cx="18" cy="18" r="2.5" fill={c} stroke={c} /><path d="M14.5 14.5 L21.5 21.5" stroke="white" strokeWidth="1.5" /></SAIconWrap>,
  stress_battle: ({s,c}) => <SAIconWrap size={s} color={c}><circle cx="6" cy="12" r="2" /><circle cx="12" cy="12" r="3.5" fill={c} stroke={c} /><circle cx="18" cy="12" r="2" /></SAIconWrap>,
  idiom:    ({s,c}) => <SAIconWrap size={s} color={c}><path d="M4 5 H17 A3 3 0 0 1 20 8 V13 A3 3 0 0 1 17 16 H10 L6 20 V16 A2 2 0 0 1 4 14 V8 A3 3 0 0 1 4 5 Z" /><path d="M8 10 L8.5 11 L9 10 M11 10 L11.5 11 L12 10 M14 10 L14.5 11 L15 10" strokeWidth="1.2" /></SAIconWrap>,
  fill_idiom: ({s,c}) => <SAIconWrap size={s} color={c}><path d="M4 5 H17 A3 3 0 0 1 20 8 V13 A3 3 0 0 1 17 16 H10 L6 20 V16 A2 2 0 0 1 4 14 V8 A3 3 0 0 1 4 5 Z" /><path d="M8 10 L8.5 11 L9 10 M11 10 L11.5 11 L12 10 M14 10 L14.5 11 L15 10" strokeWidth="1.2" /></SAIconWrap>,
  story_builder: ({s,c}) => <SAIconWrap size={s} color={c}><path d="M4 5 L4 19 Q4 21 6 21 L18 21 Q20 21 20 19 L20 7 Q20 5 18 5 Z" /><path d="M4 5 Q6 4 12 5 Q18 4 20 5" /><path d="M8 11 L16 11 M8 14 L13 14" /></SAIconWrap>,
  fire:     ({s,c}) => <SAIconWrap size={s} color={c}><path d="M12 22 Q5 19 5 13 Q5 9 8 6 Q8 9 11 9 Q11 4 14 2 Q13 7 17 9 Q19 11 19 14 Q19 19 12 22 Z" fill={c} stroke="none" /></SAIconWrap>,
  bolt:     ({s,c}) => <SAIconWrap size={s} color={c}><path d="M13 2 L4 13 L11 13 L10 22 L20 11 L13 11 Z" fill={c} stroke="none" /></SAIconWrap>,
  trophy:   ({s,c}) => <SAIconWrap size={s} color={c}><path d="M8 4 L16 4 L16 12 Q16 16 12 16 Q8 16 8 12 Z" fill={c} stroke="none" /><path d="M8 6 L4 6 L4 9 Q4 11 8 11" /><path d="M16 6 L20 6 L20 9 Q20 11 16 11" /><path d="M10 16 L10 20 L14 20 L14 16" stroke={c} fill={c} /><path d="M7 21 L17 21" strokeWidth="2.5" /></SAIconWrap>,
  medal:    ({s,c}) => <SAIconWrap size={s} color={c}><path d="M7 2 L10 9 M17 2 L14 9" /><circle cx="12" cy="15" r="6" fill={c} stroke="none" /><circle cx="12" cy="15" r="3" fill="white" stroke="none" /></SAIconWrap>,
  sparkle:  ({s,c}) => <SAIconWrap size={s} color={c}><path d="M12 3 L13.5 10 L20 12 L13.5 14 L12 21 L10.5 14 L4 12 L10.5 10 Z" fill={c} stroke="none" /></SAIconWrap>,
  party:    ({s,c}) => <SAIconWrap size={s} color={c}><path d="M3 21 L8 8 L20 17 Z" fill={c} stroke="none" /><circle cx="8" cy="6" r="1.5" fill={c} stroke="none" /><circle cx="15" cy="4" r="1.5" fill={c} stroke="none" /><circle cx="20" cy="9" r="1.5" fill={c} stroke="none" /></SAIconWrap>,
  hand_wave: ({s,c}) => <SAIconWrap size={s} color={c}><path d="M6 12 L6 8 Q6 6.5 7.5 6.5 Q9 6.5 9 8 L9 11 L10 6 Q10 4.5 11.5 4.5 Q13 4.5 13 6 L13 11 L14 5 Q14 3.5 15.5 3.5 Q17 3.5 17 5 L17 12 L18 9 Q18 7.5 19.5 7.5 Q21 7.5 21 9 L21 14 Q21 21 14 21 Q7 21 5 16 L3 12 Q2.5 10.5 4 10 Q5 9.5 6 12 Z" fill={c} stroke="none" /></SAIconWrap>,
  pause:    ({s,c}) => <SAIconWrap size={s} color={c}><rect x="6" y="5" width="4" height="14" rx="1" fill={c} stroke="none" /><rect x="14" y="5" width="4" height="14" rx="1" fill={c} stroke="none" /></SAIconWrap>,
  play:     ({s,c}) => <SAIconWrap size={s} color={c}><path d="M6 4 L20 12 L6 20 Z" fill={c} stroke="none" /></SAIconWrap>,
  skip:     ({s,c}) => <SAIconWrap size={s} color={c}><path d="M4 5 L14 12 L4 19 Z" fill={c} stroke="none" /><rect x="16" y="5" width="3" height="14" rx="0.5" fill={c} stroke="none" /></SAIconWrap>,
  repeat:   ({s,c}) => <SAIconWrap size={s} color={c}><path d="M3 8 H17 A4 4 0 0 1 21 12" /><path d="M17 4 L21 8 L17 12" /><path d="M21 16 H7 A4 4 0 0 1 3 12" /><path d="M7 20 L3 16 L7 12" /></SAIconWrap>,
  reveal:   ({s,c}) => <SAIconWrap size={s} color={c}><path d="M2 12 Q6 5 12 5 Q18 5 22 12 Q18 19 12 19 Q6 19 2 12 Z" /><circle cx="12" cy="12" r="3" fill={c} stroke="none" /></SAIconWrap>,
  arrow_right: ({s,c}) => <SAIconWrap size={s} color={c}><path d="M5 12 L19 12 M13 6 L19 12 L13 18" /></SAIconWrap>,
  qr:       ({s,c}) => <SAIconWrap size={s} color={c}><rect x="3" y="3" width="7" height="7" rx="0.5" /><rect x="14" y="3" width="7" height="7" rx="0.5" /><rect x="3" y="14" width="7" height="7" rx="0.5" /><rect x="6" y="6" width="1" height="1" fill={c} stroke="none" /><rect x="17" y="6" width="1" height="1" fill={c} stroke="none" /><rect x="6" y="17" width="1" height="1" fill={c} stroke="none" /><rect x="14" y="14" width="2" height="2" fill={c} stroke="none" /><rect x="18" y="18" width="3" height="3" fill={c} stroke="none" /><rect x="14" y="18" width="2" height="2" fill={c} stroke="none" /></SAIconWrap>,
  users:    ({s,c}) => <SAIconWrap size={s} color={c}><circle cx="9" cy="8" r="3" /><path d="M3 20 Q3 14 9 14 Q15 14 15 20" /><circle cx="17" cy="9" r="2.5" /><path d="M14 14.5 Q21 14 21 20" /></SAIconWrap>,
  solo:     ({s,c}) => <SAIconWrap size={s} color={c}><circle cx="12" cy="8" r="3.5" /><path d="M5 20 Q5 14 12 14 Q19 14 19 20" /></SAIconWrap>,
  dice:     ({s,c}) => <SAIconWrap size={s} color={c}><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8" cy="8" r="1.3" fill={c} stroke="none" /><circle cx="16" cy="8" r="1.3" fill={c} stroke="none" /><circle cx="12" cy="12" r="1.3" fill={c} stroke="none" /><circle cx="8" cy="16" r="1.3" fill={c} stroke="none" /><circle cx="16" cy="16" r="1.3" fill={c} stroke="none" /></SAIconWrap>,
  hourglass: ({s,c}) => <SAIconWrap size={s} color={c}><path d="M5 3 L19 3 M5 21 L19 21" strokeWidth="2" /><path d="M7 3 Q7 10 12 12 Q17 10 17 3" /><path d="M7 21 Q7 14 12 12 Q17 14 17 21" /></SAIconWrap>,
  target:   ({s,c}) => <SAIconWrap size={s} color={c}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" fill={c} stroke="none" /></SAIconWrap>,
};

export function SAIcon({ name, size = 18, color }) {
  const fn = SA_ICONS[name];
  if (!fn) return null;
  return fn({ s: size, c: color || "var(--ink)" });
}

// ─── SALogo ───────────────────────────────────────────────────────────────────
export function SALogo({ size = 30, mark = true, wordmark = true }) {
  return (
    <div style={{ display:"inline-flex", alignItems:"center", gap: size * 0.32 }}>
      {mark && (
        <svg width={size} height={size} viewBox="0 0 32 32" style={{display:"block"}}>
          <path d="M5 6 H27 A4 4 0 0 1 31 10 V20 A4 4 0 0 1 27 24 H16.5 L10.5 30 V24 H5 A4 4 0 0 1 1 20 V10 A4 4 0 0 1 5 6 Z" fill="var(--tomato)" />
          <rect x="8"  y="16" width="3.5" height="4" rx="0.5" fill="var(--on-dark)" />
          <rect x="14" y="12" width="3.5" height="8" rx="0.5" fill="var(--on-dark)" />
          <rect x="20" y="9"  width="3.5" height="11" rx="0.5" fill="var(--on-dark)" />
        </svg>
      )}
      {wordmark && (
        <div style={{ fontFamily:"'Fraunces',serif", fontWeight:800, fontSize: size * 0.57, color:"var(--ink)", letterSpacing:"-0.015em", lineHeight:1 }}>
          English <span style={{color:"var(--tomato)",fontStyle:"italic"}}>Arena</span>
        </div>
      )}
    </div>
  );
}

// ─── SABlob ───────────────────────────────────────────────────────────────────
const SA_BLOB_PATHS = [
  "M50 8 Q78 8 88 32 Q98 56 82 78 Q66 100 40 90 Q14 80 8 54 Q2 28 26 14 Q38 8 50 8 Z",
  "M50 6 Q82 18 90 44 Q98 70 76 88 Q54 100 30 88 Q6 76 6 50 Q6 24 26 12 Q38 6 50 6 Z",
  "M50 10 Q72 4 88 22 Q104 40 90 64 Q76 88 50 92 Q24 96 12 72 Q0 48 16 28 Q32 8 50 10 Z",
  "M50 8 Q74 14 86 36 Q98 58 84 80 Q70 102 44 92 Q18 82 10 56 Q2 30 26 16 Q40 8 50 8 Z",
];
function saHash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 16777619) >>> 0; }
  return h;
}
export function SABlob({ name = "?", size = 32, color }) {
  const palette = ["var(--tomato)","var(--cobalt)","var(--aqua)","var(--leaf)","var(--plum)","var(--sun)"];
  const h = saHash(name || "x");
  const swatch = color || palette[h % palette.length];
  const pathIdx = (h >> 4) % SA_BLOB_PATHS.length;
  const rotate = (h >> 8) % 360;
  return (
    <div style={{width:size,height:size,position:"relative",display:"inline-flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
      <svg viewBox="0 0 100 100" width={size} height={size} style={{position:"absolute",inset:0,transform:`rotate(${rotate}deg)`}}>
        <path d={SA_BLOB_PATHS[pathIdx]} fill={swatch} />
      </svg>
      <span style={{position:"relative",color:"var(--on-dark)",fontWeight:800,fontFamily:"'Fraunces',serif",fontSize:size*0.42}}>
        {(name || "?").charAt(0).toUpperCase()}
      </span>
    </div>
  );
}

// ─── SATimerRing ──────────────────────────────────────────────────────────────
export function SATimerRing({ value, max = 20, size = 110 }) {
  const warn = value <= 5;
  const radius = size / 2 - 10;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - value / max);
  return (
    <div style={{width:size,height:size,position:"relative",display:"flex",alignItems:"center",justifyContent:"center"}} className={warn ? "sa-anim-warn" : ""}>
      <svg width={size} height={size} style={{position:"absolute",inset:0,transform:"rotate(-90deg)"}}>
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="var(--line)" strokeWidth={8} />
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={warn ? "var(--tomato)" : "var(--sun)"} strokeWidth={8}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{transition:"stroke-dashoffset 1s linear"}} />
      </svg>
      <div style={{textAlign:"center"}}>
        <div style={{fontFamily:"'Fraunces',serif",fontWeight:900,fontSize:size*0.36,color:warn?"var(--tomato)":"var(--ink)",lineHeight:1}}>{value}</div>
        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,letterSpacing:"0.18em",color:"var(--muted)",marginTop:2}}>SEC</div>
      </div>
    </div>
  );
}

// ─── SAStreakMeter ────────────────────────────────────────────────────────────
export function SAStreakMeter({ count = 0, size = "md" }) {
  const tier = count >= 6 ? {label:"×5",c:"var(--tomato)",h:1.0,glow:true}
    : count >= 4 ? {label:"×3",c:"var(--sun)",h:0.78,glow:true}
    : count >= 2 ? {label:"×2",c:"var(--sun)",h:0.6,glow:false}
    : count >= 1 ? {label:"×1",c:"var(--sun)",h:0.42,glow:false}
    : {label:"—",c:"var(--muted)",h:0.2,glow:false};
  const isLg = size === "lg";
  const base = isLg ? 56 : 32;
  return (
    <div style={{display:"inline-flex",alignItems:"center",gap:isLg?12:8,padding:isLg?"10px 16px":"5px 10px",background:count>0?`${tier.c}18`:"transparent",border:`1.5px solid ${count>0?tier.c:"var(--line)"}`,borderRadius:999}}>
      <div style={{position:"relative",width:base,height:base,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
        {tier.glow && <div style={{position:"absolute",inset:0,background:`radial-gradient(${tier.c}55,transparent 65%)`,filter:"blur(4px)"}} />}
        <div style={{width:base*0.7*tier.h+base*0.3,height:base*tier.h,background:`linear-gradient(180deg,${tier.c},var(--tomato))`,borderRadius:"50% 50% 50% 50% / 75% 75% 35% 35%",transform:`rotate(${count>0?-3:0}deg) scaleX(${0.85+tier.h*0.2})`,transition:"all 0.3s cubic-bezier(0.2,0.8,0.3,1.2)",boxShadow:tier.glow?`0 -4px 14px ${tier.c}aa`:"none"}} />
      </div>
      <div>
        <div style={{fontFamily:"'Fraunces',serif",fontWeight:900,fontSize:isLg?22:14,color:count>0?tier.c:"var(--muted)",lineHeight:1}}>{count>0?tier.label:"—"}</div>
        {isLg && <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,letterSpacing:"0.15em",color:"var(--muted)",marginTop:2,textTransform:"uppercase"}}>Streak · {count}</div>}
      </div>
    </div>
  );
}

// ─── SARollingNumber ──────────────────────────────────────────────────────────
export function SARollingNumber({ value, style }) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) return;
    const duration = 600;
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const e = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (to - from) * e));
      if (t < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span style={style}>{display.toLocaleString()}</span>;
}

// ─── SARoomChip ───────────────────────────────────────────────────────────────
export function SARoomChip({ code, playerCount }) {
  return (
    <div style={{display:"inline-flex",alignItems:"center",gap:10,padding:"8px 12px 8px 8px",background:"var(--paper)",border:"1.5px solid var(--line)",borderRadius:12,boxShadow:"2px 2px 0 var(--sun)"}}>
      <div style={{width:30,height:30,background:"var(--sun)",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <SAIcon name="qr" size={16} color="var(--on-light)" />
      </div>
      <div>
        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,letterSpacing:"0.16em",color:"var(--muted)",textTransform:"uppercase",lineHeight:1}}>Room</div>
        <div style={{fontFamily:"'Fraunces',serif",fontSize:18,fontWeight:900,lineHeight:1.05,letterSpacing:"0.08em"}}>{code}</div>
      </div>
      <div style={{height:28,width:1,background:"var(--line)",margin:"0 2px"}} />
      <div style={{display:"flex",alignItems:"center",gap:5}}>
        <SAIcon name="users" size={14} color="var(--muted)" />
        <span style={{fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:13}}>{playerCount}</span>
      </div>
    </div>
  );
}

// ─── SAConfetti (CSS-based) ───────────────────────────────────────────────────
export function SAConfetti({ active, count = 50 }) {
  const colors = ["var(--sun)","var(--tomato)","var(--aqua)","var(--cobalt)","var(--plum)","var(--leaf)"];
  if (!active) return null;
  const pieces = [];
  for (let i = 0; i < count; i++) {
    pieces.push({left:Math.random()*100,delay:Math.random()*0.5,duration:1.8+Math.random()*1.4,size:6+Math.random()*10,color:colors[i%colors.length],rotate:Math.random()*360,shape:["rect","circle","stripe"][i%3]});
  }
  return (
    <div style={{position:"absolute",inset:0,pointerEvents:"none",overflow:"hidden",zIndex:50}}>
      {pieces.map((p,i) => (
        <div key={i} style={{position:"absolute",left:`${p.left}%`,top:0,width:p.shape==="stripe"?p.size*0.5:p.size,height:p.shape==="stripe"?p.size*1.8:p.size,background:p.color,borderRadius:p.shape==="circle"?"50%":2,animation:`sa-confetti-fall ${p.duration}s ${p.delay}s cubic-bezier(0.2,0.5,0.5,1) forwards`,transform:`rotate(${p.rotate}deg)`}} />
      ))}
    </div>
  );
}

// ─── Confetti (canvas-based, for leaderboard) ─────────────────────────────────
export function Confetti() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);
    const colors = ["#e8b84b","#e85d3a","#2a9d8f","#a855f7","#4db8e8","#3ab87a","#fff","#f5f0e8"];
    const particles = Array.from({length:130}, () => ({
      x: Math.random()*window.innerWidth, y: Math.random()*-window.innerHeight*0.5,
      w: Math.random()*11+5, h: Math.random()*5+3,
      color: colors[Math.floor(Math.random()*colors.length)],
      rot: Math.random()*Math.PI*2, vx:(Math.random()-0.5)*3.5,
      vy: Math.random()*3+1.5, vr:(Math.random()-0.5)*0.14,
    }));
    let raf; let t0 = null;
    const draw = (ts) => {
      if (!t0) t0 = ts;
      const elapsed = ts - t0;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.vy += 0.055;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, 1 - elapsed / 3600);
        ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
        ctx.restore();
      });
      if (elapsed < 3600) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={canvasRef} style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:100}} />;
}

// ─── StressDots ───────────────────────────────────────────────────────────────
// Equal-size dots in an even row — only the stressed syllable is filled gold.
// A clear stress marker, NOT a waveform (no size variation between dots).
// Accepts `syllables` as a number OR an array of syllable strings.
const STRESS_ORDINALS = ["1st","2nd","3rd","4th","5th","6th"];
export function StressDots({ syllables, stressAt, size = "md", label = false, color = "var(--sun)", dim = "var(--muted)", glow = true }) {
  const n = Array.isArray(syllables) ? syllables.length : (syllables || 0);
  const dot = size === "lg" ? 16 : 13;
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"0.45rem"}}>
      <div style={{display:"flex",gap:size==="lg"?"0.6rem":"0.45rem",justifyContent:"center",alignItems:"center"}}>
        {Array.from({length: n}, (_, i) => {
          const isStressed = i + 1 === stressAt;
          return (
            <div key={i} style={{
              width: isStressed ? dot + 3 : dot, height: isStressed ? dot + 3 : dot, borderRadius: "50%",
              background: isStressed ? color : "transparent",
              border: `2px solid ${isStressed ? color : dim}`,
              boxShadow: isStressed && glow ? `0 0 10px ${color}88` : "none",
              flexShrink: 0,
            }} />
          );
        })}
      </div>
      {label && (
        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"0.62rem",letterSpacing:"0.06em",color:"var(--muted)",textTransform:"uppercase"}}>
          stress on {STRESS_ORDINALS[stressAt-1] || stressAt+"th"} syllable
        </div>
      )}
    </div>
  );
}

// ─── FlameStreak ──────────────────────────────────────────────────────────────
export function FlameStreak({ count }) {
  return (
    <span style={{display:"inline-flex",alignItems:"center",gap:3,padding:"2px 8px",background:"rgba(247,181,56,0.15)",border:"1.5px solid var(--gold)",borderRadius:999,fontSize:"0.72rem",fontWeight:700,color:"var(--coral)"}}>
      <svg width="9" height="11" viewBox="0 0 9 11" style={{display:"block"}}>
        <path d="M4.5 10.5 Q0.5 8.5 0.5 5.5 Q0.5 3.5 2.5 1.5 Q2 4 4 4 Q4 1 5.5 0 Q5 3 7.5 3.5 Q8.5 4.5 8.5 6.5 Q8.5 8.5 4.5 10.5 Z" fill="var(--coral)" />
      </svg>
      ×{count}
    </span>
  );
}

// ─── QRDisplay ────────────────────────────────────────────────────────────────
export function QRDisplay({ url, compact, size = 96, light = "#ffffff" }) {
  const [dataUrl, setDataUrl] = useState("");
  useEffect(() => {
    if (!url) return;
    QRCode.toDataURL(url, { width: compact ? size * 2 : 155, margin: 1, color: { dark: "#0d0d0d", light } })
      .then(setDataUrl).catch(() => {});
  }, [url, compact, size, light]);
  if (compact) return dataUrl ? <img src={dataUrl} alt="Join QR" width={size} height={size} style={{ display: "block", borderRadius: 6, width: "100%", height: "auto", maxWidth: size }} /> : <div style={{ width: size, height: size }} />;
  return (
    <div className="qr-wrap">
      <div className="qr-label">📱 Scan to Join</div>
      {dataUrl && <img src={dataUrl} alt="QR code to join" />}
      <div className="qr-label" style={{opacity:1}}>Camera → scan → join!</div>
      <div className="qr-url">{url}</div>
    </div>
  );
}

// ─── InGameQR ─────────────────────────────────────────────────────────────────
export function InGameQR({ url }) {
  const [dataUrl, setDataUrl] = useState("");
  useEffect(() => {
    if (!url) return;
    QRCode.toDataURL(url, { width: 80, margin: 1, color: { dark: "#0d0d0d", light: "#ffffff" } })
      .then(setDataUrl).catch(() => {});
  }, [url]);
  return (
    <div style={{position:"fixed",bottom:"1rem",right:"1rem",zIndex:50,background:"#fff",padding:"0.4rem",borderRadius:8,border:"2px solid var(--ink)",boxShadow:"3px 3px 0 var(--ink)",lineHeight:dataUrl?0:1.3}}>
      {dataUrl
        ? <img src={dataUrl} alt="Join QR" width={80} height={80} />
        : <div style={{fontSize:"0.55rem",color:"#000",maxWidth:80,wordBreak:"break-all",padding:"0.1rem"}}>{url}</div>}
    </div>
  );
}

// ─── WoodenTile ───────────────────────────────────────────────────────────────
export function WoodenTile({ word, size = "md", angle = 0, placed = false, onClick, valueNum, block = false }) {
  const sizes = {
    sm: { p: "6px 11px 8px", fs: 13, vs: 8, r: 6 },
    md: { p: "9px 16px 12px", fs: 18, vs: 10, r: 8 },
    lg: { p: "12px 22px 18px", fs: 24, vs: 12, r: 10 },
  };
  const s = sizes[size] || sizes.md;
  return (
    <span onClick={onClick} className={onClick ? "sa-pressable" : ""}
      style={{
        position: "relative", display: block ? "flex" : "inline-flex", alignItems: "center", justifyContent: block ? "center" : "flex-start", width: block ? "100%" : undefined, padding: s.p, borderRadius: block ? 14 : Math.max(s.r, 10),
        background: placed ? "var(--cobalt)" : "var(--paper)",
        border: "2.5px solid var(--cobalt)",
        boxShadow: placed ? "none" : "3px 3px 0 rgba(91,139,255,0.22)",
        fontFamily: "'Fraunces',Georgia,serif", fontSize: s.fs, fontWeight: 800,
        color: placed ? "var(--on-light)" : "var(--ink)", letterSpacing: "0.01em",
        transform: block ? "none" : `rotate(${angle}deg)`, cursor: onClick ? "pointer" : "default",
        userSelect: "none", whiteSpace: "nowrap",
      }}>
      {word}
      {valueNum != null && (
        <span style={{ position: "absolute", bottom: 2, right: 4, fontSize: s.vs, fontWeight: 600, color: placed ? "rgba(13,51,40,0.55)" : "rgba(58,42,24,0.55)", fontFamily: "'JetBrains Mono',monospace" }}>{valueNum}</span>
      )}
    </span>
  );
}

// ─── Waveform ─────────────────────────────────────────────────────────────────
export function Waveform({ color = "var(--tomato)", stress = 0.3, size = 1, bars = 14 }) {
  const heights = [0.2, 0.35, 0.55, 0.75, 0.92, 1.0, 0.92, 0.78, 0.62, 0.5, 0.42, 0.35, 0.28, 0.2];
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 * size, height: 60 * size }}>
      {heights.slice(0, bars).map((h, i) => (
        <div key={i} style={{ width: 4 * size, height: `${h * 100 * stress}%`, background: color, borderRadius: 2, transition: "height 0.4s cubic-bezier(0.2,0.8,0.3,1.2)" }} />
      ))}
    </div>
  );
}

// ─── RedInkUnderline ──────────────────────────────────────────────────────────
export function RedInkUnderline({ color = "var(--tomato)" }) {
  return (
    <svg width="100%" height="10" viewBox="0 0 100 10" preserveAspectRatio="none" style={{ position: "absolute", bottom: -8, left: 0, pointerEvents: "none" }}>
      <path d="M 2 5 Q 12 1 22 5 T 42 5 T 62 5 T 82 5 T 98 5" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

// ─── MatchConnector ───────────────────────────────────────────────────────────
export function MatchConnector({ from, to, color, dashed = false }) {
  const dx = to.x - from.x;
  const mx = from.x + dx * 0.5;
  return (
    <path d={`M ${from.x} ${from.y} C ${mx} ${from.y}, ${mx} ${to.y}, ${to.x} ${to.y}`}
      fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round"
      strokeDasharray={dashed ? "4 4" : "none"}
      style={{ transition: "all 0.4s cubic-bezier(0.2,0.8,0.3,1)" }} />
  );
}

// ─── TeacherBtn ───────────────────────────────────────────────────────────────
export function TeacherBtn({ icon, label, onClick, variant = "default" }) {
  const bg = variant === "primary" ? "var(--tomato)" : variant === "active" ? "var(--muted)" : "var(--paper)";
  const fg = variant === "primary" || variant === "active" ? "var(--on-dark)" : "var(--ink)";
  return (
    <div onClick={onClick} className="sa-pressable" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", background: variant === "ghost" ? "transparent" : bg, color: variant === "ghost" ? "var(--muted)" : fg, border: `1.5px solid ${variant === "ghost" ? "var(--line)" : bg}`, borderRadius: 8, cursor: "pointer", fontSize: 11, fontWeight: 600 }}>
      {icon && <SAIcon name={icon} size={13} color={variant === "ghost" ? "var(--muted)" : fg} />}
      <span>{label}</span>
    </div>
  );
}

// ─── PlayersFooter ────────────────────────────────────────────────────────────
export function PlayersFooter({ players, mode }) {
  if (!players.length) return null;
  return (
    <div style={{marginTop:"2rem",paddingTop:"0.75rem",borderTop:"1px solid rgba(255,255,255,0.08)"}}>
      <span className="label">Players</span>
      <div className="flex wrap gap-1 mt-1">
        {players.map(([name, p]) => {
          const team = mode === "teams" ? TEAMS.find(t => t.id === p.team) : null;
          return (
            <span key={name} className="chip" style={{background:team?team.color:"rgba(255,255,255,0.1)",color:team?"#fff":"var(--ink)"}}>
              {team && <TeamIcon icon={team.icon} color="#fff" size={13}/>} {name}{p.score>0?` · ${p.score.toLocaleString()}`:""}{p.correct===true?"✓":p.correct===false?"✗":""}
            </span>
          );
        })}
      </div>
    </div>
  );
}
