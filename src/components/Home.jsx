import { SALogo } from "./ui.jsx";

export default function Home({ onHost, onJoin, onSolo }) {
  return (
    <div className="hero">
      <div style={{position:"absolute",top:-80,right:-80,width:260,height:260,borderRadius:"50%",background:"var(--sun)",opacity:0.18,pointerEvents:"none"}} />
      <div style={{position:"absolute",bottom:-100,left:-60,width:300,height:300,borderRadius:"50%",background:"var(--aqua)",opacity:0.12,pointerEvents:"none"}} />
      <div style={{position:"absolute",top:160,right:80,width:60,height:60,borderRadius:"50%",background:"var(--tomato)",opacity:0.55,pointerEvents:"none"}} className="sa-anim-pulse" />

      <div style={{position:"relative",zIndex:2,display:"flex",flexDirection:"column",alignItems:"center",gap:"1.2rem",width:"100%",maxWidth:400}}>
        <div className="sa-anim-pop"><SALogo size={40} /></div>

        <div className="sa-anim-slide" style={{textAlign:"center"}}>
          <h1 style={{fontFamily:"'Fraunces',serif",fontSize:"clamp(3rem,10vw,5.5rem)",fontWeight:900,fontStyle:"italic",letterSpacing:"-0.03em",lineHeight:0.92,color:"var(--ink)"}}>
            Grammar,<br/>make it<br/><span style={{color:"var(--tomato)"}}>a game.</span>
          </h1>
          <p style={{marginTop:"1rem",fontSize:"0.9rem",color:"var(--muted)",lineHeight:1.65,maxWidth:320}}>
            Live classroom games. Ten types, thirty topics.<br/>No app — just a browser.
          </p>
        </div>

        <div style={{width:"100%",display:"flex",flexDirection:"column",gap:"0.65rem",marginTop:"0.5rem"}}>
          <button className="btn btn-gold btn-full" onClick={onHost} style={{fontSize:"1rem",color:"var(--on-light)",borderColor:"var(--on-light)"}}>
            Host a game →
          </button>
          <div style={{display:"flex",alignItems:"center",gap:"0.7rem",opacity:0.35}}>
            <div style={{flex:1,height:1,background:"var(--line)"}}/><span style={{fontSize:"0.68rem",letterSpacing:"0.1em",textTransform:"uppercase"}}>Students</span><div style={{flex:1,height:1,background:"var(--line)"}}/>
          </div>
          <button className="btn btn-ghost btn-full" onClick={onJoin}>Join a game with code</button>
          <button className="btn btn-ghost btn-full" onClick={onSolo} style={{fontSize:"0.85rem",opacity:0.7}}>Practise on my own</button>
        </div>

        <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"center",marginTop:"0.5rem"}}>
          {[{t:"Multiple Choice",c:"var(--tomato)"},{t:"Stress Battle",c:"var(--cobalt)"},{t:"Word Match",c:"var(--aqua)"},{t:"Idioms",c:"var(--sun)"},{t:"+6 more",c:"var(--muted)"}].map(g => (
            <div key={g.t} style={{padding:"5px 12px",background:"var(--paper)",border:`1.5px solid ${g.c}`,borderRadius:10,fontSize:11,fontWeight:600,color:g.c}}>{g.t}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
