const css = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,300;0,400;0,700;0,900;1,700;1,900&family=JetBrains+Mono:wght@400;700&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{
    --cream:#0f1226;--paper:#181d3a;
    --ink:#fdf3dd;--ink-soft:rgba(253,243,221,0.72);--muted:rgba(253,243,221,0.45);
    --line:rgba(253,243,221,0.14);--dot:rgba(253,243,221,0.05);
    --on-light:#0f1226;--on-dark:#fdf3dd;
    --sun:#ffce47;--tomato:#ff5c42;--aqua:#42dac3;--cobalt:#5b8bff;--plum:#c87aff;--leaf:#7adc5a;
    --gold:var(--sun);--coral:var(--tomato);--teal:var(--aqua);--green:var(--leaf);--red:var(--tomato);
  }
  body{background:var(--cream);color:var(--ink);font-family:'DM Sans',sans-serif}
  h1,h2,h3{font-family:'Fraunces',Georgia,serif;font-weight:900}

  .hero{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2rem;position:relative;overflow:hidden;background:var(--cream)}
  .hero::before{content:'';position:absolute;inset:0;pointer-events:none;background-image:radial-gradient(var(--dot) 1px,transparent 1px);background-size:14px 14px}
  .hero-title{font-family:'Fraunces',Georgia,serif;font-size:clamp(2.8rem,9vw,6.5rem);font-weight:900;font-style:italic;letter-spacing:-0.03em;text-align:center;line-height:0.95;position:relative;color:var(--ink)}
  .hero-title span{color:var(--coral)}
  .hero-sub{margin-top:1.2rem;font-size:1rem;opacity:0.55;text-align:center;max-width:400px;line-height:1.7}
  .hero-btns{display:flex;gap:1rem;margin-top:2.5rem;flex-wrap:wrap;justify-content:center}

  .btn{font-family:'DM Sans',sans-serif;font-size:0.85rem;font-weight:700;padding:0.9rem 1.8rem;border:2px solid var(--ink);cursor:pointer;transition:transform 0.1s,box-shadow 0.1s;background:var(--ink);color:var(--paper);border-radius:14px;box-shadow:4px 4px 0 rgba(30,26,20,0.35)}
  .btn:hover:not(:disabled){transform:translate(-2px,-2px);box-shadow:6px 6px 0 rgba(30,26,20,0.35)}
  .btn:active:not(:disabled){transform:translate(2px,2px);box-shadow:2px 2px 0 rgba(30,26,20,0.35);transition-duration:0.06s}
  .btn:disabled{opacity:0.35;cursor:not-allowed}
  .btn-gold{background:var(--gold);color:var(--ink);border-color:var(--ink);box-shadow:4px 4px 0 var(--ink)}
  .btn-gold:hover:not(:disabled){box-shadow:6px 6px 0 var(--ink)}
  .btn-teal{background:var(--teal);color:#fff;border-color:var(--ink);box-shadow:4px 4px 0 var(--ink)}
  .btn-teal:hover:not(:disabled){box-shadow:6px 6px 0 var(--ink)}
  .btn-coral{background:var(--coral);color:#fff;border-color:var(--ink);box-shadow:4px 4px 0 var(--ink)}
  .btn-coral:hover:not(:disabled){box-shadow:6px 6px 0 var(--ink)}
  .btn-green{background:var(--green);color:#fff;border-color:var(--ink);box-shadow:4px 4px 0 var(--ink)}
  .btn-green:hover:not(:disabled){box-shadow:6px 6px 0 var(--ink)}
  .btn-ghost{background:transparent;border-color:var(--line);color:var(--muted);box-shadow:none}
  .btn-ghost:hover:not(:disabled){border-color:var(--muted);color:var(--ink);box-shadow:none;transform:translate(-1px,-1px)}
  .btn-sm{padding:0.45rem 0.9rem;font-size:0.75rem}
  .btn-full{width:100%}

  .panel{min-height:100vh;padding:1.5rem;max-width:860px;margin:0 auto;background:var(--cream)}
  .card{background:var(--paper);border:1.5px solid var(--line);padding:1.1rem;margin-bottom:0.65rem;border-radius:14px}
  .card-gold{border-color:var(--sun);background:rgba(255,206,71,0.07)}

  .label{font-family:'JetBrains Mono',monospace;font-size:0.57rem;letter-spacing:0.14em;text-transform:uppercase;opacity:0.5;margin-bottom:0.3rem;display:block}
  .badge{display:inline-block;padding:0.18rem 0.65rem;font-family:'JetBrains Mono',monospace;font-size:0.54rem;letter-spacing:0.1em;text-transform:uppercase;background:var(--sun);color:var(--on-light);border-radius:999px}

  .input{width:100%;padding:0.8rem 1rem;font-family:'DM Sans',sans-serif;font-size:1rem;border:2px solid var(--line);background:var(--paper);color:var(--ink);outline:none;transition:border-color 0.15s;border-radius:10px}
  .input:focus{border-color:var(--muted)}
  .input::placeholder{opacity:0.35;color:var(--ink)}
  .input-xl{font-size:2rem;text-align:center;font-family:'Fraunces',serif;letter-spacing:0.15em;font-weight:900}
  .select{width:100%;padding:0.8rem 1rem;font-family:'DM Sans',sans-serif;font-size:0.9rem;border:2px solid var(--line);background:var(--paper);color:var(--ink);outline:none;cursor:pointer;border-radius:10px}

  .code-badge{font-family:'Fraunces',Georgia,serif;font-size:clamp(2.5rem,8vw,4.5rem);font-weight:900;letter-spacing:0.12em;color:var(--on-light);text-align:center;padding:1rem 1.5rem;border:3px solid var(--on-light);display:inline-block;border-radius:12px;background:var(--sun)}

  .mode-toggle{display:flex;border:1.5px solid var(--line);overflow:hidden;margin-bottom:1rem;border-radius:12px}
  .mode-btn{flex:1;padding:0.7rem;font-family:'DM Sans',sans-serif;font-size:0.75rem;font-weight:700;border:none;cursor:pointer;transition:all 0.15s;background:transparent;color:var(--muted)}
  .mode-btn.active{background:var(--paper);color:var(--ink)}

  .team-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:0.6rem;margin:0.6rem 0}
  .team-card{padding:0.9rem;border:2px solid var(--ink);text-align:center;border-radius:12px;background:var(--paper);box-shadow:3px 3px 0 rgba(30,26,20,0.12)}
  .team-card-name{font-family:'Fraunces',serif;font-size:0.85rem;font-weight:700;margin-top:0.35rem;color:var(--ink)}
  .team-card-count{font-size:0.75rem;opacity:0.55;margin-top:0.15rem}
  .team-members{font-size:0.72rem;margin-top:0.4rem;opacity:0.6;line-height:1.7}

  .opt-grid{display:grid;grid-template-columns:1fr 1fr;gap:0.65rem;margin-top:0.9rem}
  .opt-btn{padding:1.1rem 1rem;font-family:'DM Sans',sans-serif;font-size:1rem;font-weight:600;border:2.5px solid transparent;cursor:pointer;transition:all 0.13s;text-align:left;display:flex;align-items:flex-start;gap:0.55rem;min-height:76px;line-height:1.45;color:var(--ink);border-radius:14px}
  .opt-btn:hover:not(:disabled){transform:translate(-2px,-2px);box-shadow:4px 4px 0 rgba(0,0,0,0.25)}
  .opt-btn:disabled{cursor:not-allowed}
  .opt-0{background:rgba(255,92,66,0.12);border-color:var(--tomato)}
  .opt-1{background:rgba(91,139,255,0.12);border-color:var(--cobalt)}
  .opt-2{background:rgba(122,220,90,0.12);border-color:var(--leaf)}
  .opt-3{background:rgba(200,122,255,0.12);border-color:var(--plum)}
  .opt-selected{box-shadow:inset 0 0 0 3px rgba(253,243,221,0.2)}
  .opt-icon{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:8px;font-family:'Fraunces',serif;font-size:14px;font-weight:900;color:#fff;flex-shrink:0;line-height:1}
  .opt-0 .opt-icon{background:var(--tomato)}
  .opt-1 .opt-icon{background:var(--cobalt)}
  .opt-2 .opt-icon{background:var(--leaf)}
  .opt-3 .opt-icon{background:var(--plum)}

  .tiles{display:flex;flex-wrap:wrap;gap:0.4rem;padding:0.65rem;border:2px dashed var(--line);min-height:50px;border-radius:10px}
  .tile{padding:0.38rem 0.85rem;background:var(--gold);color:var(--ink);font-family:'DM Sans',sans-serif;font-size:0.85rem;font-weight:700;cursor:pointer;transition:all 0.11s;user-select:none;border-radius:8px;border:2px solid var(--ink)}
  .tile:hover{transform:translateY(-2px);box-shadow:2px 2px 0 var(--ink)}
  .tile.used{background:rgba(253,243,221,0.06);color:rgba(253,243,221,0.2);cursor:default;transform:none;border-color:transparent}
  .tile.placed{background:var(--aqua);color:var(--on-light);border-color:var(--ink)}

  .story-card{padding:0.8rem 1rem;border:2px solid var(--line);margin-bottom:0.4rem;cursor:pointer;transition:all 0.13s;display:flex;align-items:flex-start;gap:0.65rem;font-size:1.05rem;line-height:1.55;border-radius:10px;background:var(--paper)}
  .story-card:hover:not(.placed){border-color:var(--sun);background:rgba(255,206,71,0.08)}
  .story-card.placed{border-color:var(--aqua);background:rgba(66,218,195,0.08)}
  .story-num{font-family:'Fraunces',serif;font-size:0.85rem;font-weight:700;color:var(--aqua);width:1.4rem;flex-shrink:0;margin-top:0.1rem}

  .match-word{padding:0.95rem 1rem;border:2px solid var(--line);font-size:1rem;font-weight:600;cursor:pointer;transition:transform 0.14s cubic-bezier(0.2,0.8,0.3,1.3),box-shadow 0.14s,border-color 0.14s,background 0.14s;text-align:center;margin-bottom:0.5rem;border-radius:16px;background:var(--paper);color:var(--ink);box-shadow:0 3px 0 -1px rgba(0,0,0,0.28)}
  .match-word:hover{transform:translateY(-2px);border-color:var(--muted);box-shadow:0 6px 0 -1px rgba(0,0,0,0.32)}
  .match-word:active{transform:translateY(1px);box-shadow:0 2px 0 -1px rgba(0,0,0,0.25)}
  .match-word.selected{border-color:var(--sun);background:rgba(255,206,71,0.18);box-shadow:0 0 0 3px rgba(255,206,71,0.3),0 6px 0 -1px rgba(0,0,0,0.3);transform:translateY(-2px)}
  .match-word.matched-correct{border-color:var(--leaf);background:rgba(122,220,90,0.18);box-shadow:0 0 0 3px rgba(122,220,90,0.28);cursor:default;transform:none}
  .match-word.matched-wrong{border-color:var(--tomato);background:rgba(255,92,66,0.18);box-shadow:0 0 0 3px rgba(255,92,66,0.28);cursor:default;transform:none}

  .timer-num{font-family:'Fraunces',Georgia,serif;font-size:3rem;font-weight:900;color:var(--gold);line-height:1}
  .timer-num.urgent{color:var(--coral);animation:timerPulse 0.5s ease-in-out infinite}
  @keyframes timerPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.22)}}
  @keyframes pulse{from{transform:scale(1)}to{transform:scale(1.1)}}
  @keyframes lockIn{0%{transform:scale(1)}35%{transform:scale(1.09);filter:brightness(1.2)}70%{transform:scale(0.97)}100%{transform:scale(1);filter:brightness(1)}}
  @keyframes streakPop{0%{transform:scale(0.4) translateY(16px);opacity:0}60%{transform:scale(1.18) translateY(-4px);opacity:1}100%{transform:scale(1) translateY(0);opacity:1}}
  @keyframes podiumDrop{0%{transform:translateY(-30px) scale(0.9);opacity:0}70%{transform:translateY(4px) scale(1.02)}100%{transform:translateY(0) scale(1);opacity:1}}
  @keyframes sa-pop-in{0%{transform:scale(0.6) rotate(-4deg);opacity:0}60%{transform:scale(1.06) rotate(1deg);opacity:1}100%{transform:scale(1) rotate(0);opacity:1}}
  @keyframes sa-slide-up{0%{transform:translateY(32px);opacity:0}100%{transform:translateY(0);opacity:1}}
  @keyframes sa-shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}
  @keyframes sa-confetti-fall{0%{transform:translateY(-20vh) rotate(0deg);opacity:1}100%{transform:translateY(120vh) rotate(720deg);opacity:0}}

  .lb-row{display:flex;align-items:center;gap:0.8rem;padding:0.75rem 0.9rem;margin-bottom:0.35rem;border-left:4px solid transparent;animation:slideIn 0.35s ease forwards;opacity:0;border-radius:10px;background:var(--paper);border:1.5px solid var(--line)}
  @keyframes slideIn{from{transform:translateX(-22px);opacity:0}to{transform:translateX(0);opacity:1}}
  .lb-rank{font-family:'Fraunces',serif;font-size:1.1rem;font-weight:900;width:1.9rem;opacity:0.45}
  .lb-name{flex:1;font-weight:600;font-size:0.95rem}
  .lb-score{font-family:'Fraunces',serif;font-size:1rem;font-weight:900;color:var(--coral)}

  .prog{height:5px;background:rgba(30,26,20,0.1);margin-bottom:1.2rem;border-radius:99px}
  .prog-fill{height:100%;background:var(--gold);transition:width 0.5s;border-radius:99px}

  .result-overlay{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(30,26,20,0.85);z-index:200;animation:fadeIn 0.2s}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  .result-box{text-align:center;padding:2.5rem;background:var(--paper);border:2px solid var(--line);border-radius:20px;box-shadow:0 24px 60px rgba(0,0,0,0.5)}
  .result-emoji{font-size:5rem;display:block;animation:boing 0.45s cubic-bezier(0.175,0.885,0.32,1.275)}
  @keyframes boing{0%{transform:scale(0)}70%{transform:scale(1.15)}100%{transform:scale(1)}}

  .qr-wrap{display:flex;flex-direction:column;align-items:center;gap:0.55rem;padding:1.1rem;background:#fff;border:3px solid var(--on-light);max-width:210px;margin:0.9rem auto 0;border-radius:14px;box-shadow:4px 4px 0 var(--sun)}
  .qr-wrap img{width:155px;height:155px;display:block}
  .qr-label{font-family:'JetBrains Mono',monospace;font-size:0.55rem;letter-spacing:0.12em;text-transform:uppercase;color:var(--on-light);text-align:center}
  .qr-url{font-size:0.57rem;color:var(--on-light);opacity:0.45;text-align:center;word-break:break-all;max-width:175px}

  .chip{display:inline-flex;align-items:center;gap:0.3rem;padding:0.28rem 0.65rem;font-family:'JetBrains Mono',monospace;font-size:0.56rem;font-weight:700;margin:0.18rem;animation:popIn 0.3s cubic-bezier(0.175,0.885,0.32,1.275);border-radius:999px;border:1.5px solid var(--line);background:var(--paper)}
  @keyframes popIn{from{transform:scale(0)}to{transform:scale(1)}}

  .dots span{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--gold);margin:0 3px;animation:dotP 1.2s ease-in-out infinite}
  .dots span:nth-child(2){animation-delay:0.2s}.dots span:nth-child(3){animation-delay:0.4s}
  @keyframes dotP{0%,80%,100%{transform:scale(0.6);opacity:0.35}40%{transform:scale(1);opacity:1}}

  .flex{display:flex}.flex-col{flex-direction:column}.items-center{align-items:center}.justify-between{justify-content:space-between}.justify-center{justify-content:center}.wrap{flex-wrap:wrap}
  .gap-1{gap:0.5rem}.gap-2{gap:1rem}
  .mt-1{margin-top:0.5rem}.mt-2{margin-top:1rem}.mt-3{margin-top:1.5rem}.mt-4{margin-top:2rem}
  .mb-1{margin-bottom:0.5rem}.mb-2{margin-bottom:1rem}
  .text-center{text-align:center}.text-gold{color:var(--gold)}.text-teal{color:var(--teal)}.text-green{color:var(--green)}.text-coral{color:var(--coral)}
  .op50{opacity:0.5}.op30{opacity:0.3}.w100{width:100%}

  .solo-grid{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:1.6rem;align-items:start}
  @media(max-width:600px){
    .opt-grid{grid-template-columns:1fr}
    .opt-btn{min-height:72px;font-size:1.05rem;padding:1.1rem 1.1rem}
    .hero-btns{flex-direction:column;align-items:stretch}
    .solo-grid{grid-template-columns:1fr}
  }
  /* Larger, roomier controls on desktop so activities fill the wider column */
  @media(min-width:700px){
    .opt-grid{gap:0.9rem}
    .opt-btn{min-height:112px;font-size:1.25rem;padding:1.5rem 1.4rem;gap:0.85rem}
    .story-card{font-size:1.3rem;padding:1.2rem 1.35rem;gap:0.9rem;margin-bottom:0.65rem}
    .story-num{font-size:1.05rem;width:1.7rem}
    .match-word{font-size:1.2rem;padding:0.95rem 1.15rem}
  }

  .sa-pressable{transition:transform 0.12s,box-shadow 0.12s;cursor:pointer;user-select:none}
  .sa-pressable:hover{transform:translate(-2px,-2px)}
  .sa-pressable:active{transform:translate(2px,2px);transition-duration:0.06s}
  .sa-anim-pop{animation:sa-pop-in 0.5s cubic-bezier(0.2,0.8,0.3,1.2) both}
  .sa-anim-slide{animation:sa-slide-up 0.5s cubic-bezier(0.2,0.8,0.3,1) both}
  .sa-anim-fade{animation:sa-fade-in 0.4s ease both}
  .sa-anim-shake{animation:sa-shake 0.5s both}
  .sa-anim-pulse{animation:sa-pulse 1.4s ease-in-out infinite}
  .sa-anim-float{animation:sa-float 2.6s ease-in-out infinite}
  @keyframes sa-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}
  .sa-anim-letter{animation:sa-letter-pop 0.7s cubic-bezier(0.2,0.8,0.3,1.3) both}
  .sa-anim-warn{animation:sa-timer-warn 0.5s ease-in-out infinite}
  .sa-stagger>*{animation-fill-mode:both}
  .sa-stagger>*:nth-child(1){animation-delay:0.05s}
  .sa-stagger>*:nth-child(2){animation-delay:0.15s}
  .sa-stagger>*:nth-child(3){animation-delay:0.25s}
  .sa-stagger>*:nth-child(4){animation-delay:0.35s}
  .sa-stagger>*:nth-child(5){animation-delay:0.45s}
  .sa-stagger>*:nth-child(6){animation-delay:0.55s}
  .sa-card{transition:transform 0.15s cubic-bezier(0.2,0.8,0.3,1)}
  .sa-card-interactive:hover{transform:translate(-2px,-2px) rotate(-0.4deg)}
  .sa-card-interactive:active{transform:translate(1px,1px)}
  @keyframes sa-fade-in{from{opacity:0}to{opacity:1}}
  @keyframes sa-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}
  @keyframes sa-letter-pop{0%{transform:scale(0) rotate(-15deg);opacity:0}60%{transform:scale(1.15) rotate(3deg);opacity:1}100%{transform:scale(1) rotate(0);opacity:1}}
  @keyframes sa-timer-warn{0%,100%{color:var(--coral);transform:scale(1)}50%{color:#ff6341;transform:scale(1.12)}}
  @keyframes sa-score-pop{0%{transform:translate(-50%,20px) scale(0.4);opacity:0}20%{transform:translate(-50%,0) scale(1.15);opacity:1}100%{transform:translate(-50%,-70px) scale(1);opacity:0}}
  @keyframes sa-spotlight-sweep{0%{transform:translateX(-100%) skewX(-20deg)}100%{transform:translateX(200%) skewX(-20deg)}}
  @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}

  /* Solo setup — colourful topic cards (accent from inline --acc) */
  .solo-topic{position:relative;display:flex;align-items:center;gap:0.55rem;width:100%;padding:0.5rem 1.6rem 0.5rem 0.5rem;border:2px solid var(--line);border-radius:12px;background:color-mix(in srgb, var(--paper) 90%, var(--acc));color:var(--ink);font-size:0.84rem;font-weight:600;cursor:pointer;text-align:left;transition:transform 0.14s cubic-bezier(0.2,0.8,0.3,1.2),box-shadow 0.14s,border-color 0.14s,background 0.14s}
  .solo-topic:hover{transform:translateY(-3px);border-color:var(--acc);box-shadow:0 7px 0 -2px color-mix(in srgb, var(--acc) 60%, transparent)}
  .solo-topic:active{transform:translateY(-1px)}
  .solo-topic.sel{border-color:var(--acc);background:color-mix(in srgb, var(--paper) 74%, var(--acc));color:var(--acc);font-weight:700}
  .solo-topic-ico{width:32px;height:32px;flex-shrink:0;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:1.05rem;line-height:1;background:var(--acc);box-shadow:2px 2px 0 color-mix(in srgb, var(--acc) 45%, transparent)}
  /* Solo setup — question-type chips (accent from inline --acc) */
  .qchip{display:inline-flex;align-items:center;gap:0.4rem;border:2px solid var(--line);background:var(--paper);color:var(--ink-soft);font-family:'DM Sans',sans-serif;font-weight:700;font-size:0.82rem;padding:0.45rem 0.9rem;border-radius:999px;cursor:pointer;transition:transform 0.13s cubic-bezier(0.2,0.8,0.3,1.2),box-shadow 0.13s,border-color 0.13s,background 0.13s,color 0.13s}
  .qchip:hover{transform:translateY(-2px);border-color:var(--acc);color:var(--ink);box-shadow:0 4px 0 -1px color-mix(in srgb, var(--acc) 55%, transparent)}
  .qchip .qchip-dot{width:9px;height:9px;border-radius:50%;background:var(--acc);flex-shrink:0}
  .qchip.sel{background:color-mix(in srgb, var(--paper) 68%, var(--acc));border-color:var(--acc);color:var(--acc);box-shadow:0 4px 0 -1px color-mix(in srgb, var(--acc) 55%, transparent);transform:translateY(-1px)}
  .qchip.sel .qchip-dot{box-shadow:0 0 0 3px color-mix(in srgb, var(--acc) 35%, transparent)}
  /* Solo setup — number-of-questions pills */
  .qpill{width:2.7rem;height:2.7rem;display:flex;align-items:center;justify-content:center;border:2px solid var(--line);background:var(--paper);color:var(--ink-soft);font-family:'Fraunces',serif;font-weight:900;font-size:1.1rem;border-radius:50%;cursor:pointer;transition:transform 0.13s cubic-bezier(0.2,0.8,0.3,1.3),box-shadow 0.13s,border-color 0.13s,background 0.13s,color 0.13s}
  .qpill:hover{transform:translateY(-2px);border-color:var(--sun);color:var(--ink)}
  .qpill.sel{background:var(--sun);border-color:var(--sun);color:var(--on-light);box-shadow:0 5px 0 -1px rgba(255,206,71,0.5);transform:translateY(-2px) scale(1.06)}
  /* Solo setup — ambient drifting glows */
  .sa-ambient{position:fixed;inset:0;overflow:hidden;pointer-events:none;z-index:0}
  .sa-ambient-blob{position:absolute;border-radius:50%;filter:blur(60px);opacity:0.16;animation:sa-drift 22s ease-in-out infinite}
  @keyframes sa-drift{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(26px,-30px) scale(1.12)}}
  @media(prefers-reduced-motion:reduce){.sa-ambient-blob{animation:none}}
`;
export default css;
