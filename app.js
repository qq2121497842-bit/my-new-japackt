/* ==================================================================
   app.js — all of the page's behaviour.

   Loaded from <head> with NO defer/async on purpose. The first three
   statements run before the first paint: they arm the entrance animation
   (html.intro paints the elements in their pre-animation state), so the
   layout never flashes its finished state and then animates. Everything
   after that waits for the DOM.
   ================================================================== */
/* Arm the entrance BEFORE first paint; the failsafe guarantees content can
   never be stranded invisible. */
document.documentElement.classList.add('intro');
setTimeout(function(){document.documentElement.classList.remove('intro');},4000);

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded', main);
}else{
  main();
}

function main(){

'use strict';

/* ==================================================================
   7. THE CAROUSEL CREATIVES — now the four films from this folder.
   Each source is a 1920x1080 cut, re-encoded to a small silent 720p loop
   (clips/, ~1.4MB each) so 24 cards can spin without choking. The card is
   16:9, so the whole frame shows with no crop. poster = first clean frame,
   so a card is never black before its video starts.
   ================================================================== */
var CLIPS=[
  {src:'clips/01-jvr.mp4',    poster:'clips/01-jvr.jpg'},
  {src:'clips/02-whale.mp4',  poster:'clips/02-whale.jpg'},
  {src:'clips/03-engine.mp4', poster:'clips/03-engine.jpg'},
  {src:'clips/04-afu.mp4',    poster:'clips/04-afu.jpg'}
];

/* ==================================================================
   STARFIELD
   ================================================================== */
function starfield(el, count, blur, a1, a2){
  var out=[], i, x, y, a;
  for(i=0;i<count;i++){
    x=(Math.random()*100).toFixed(4);
    y=(Math.random()*100).toFixed(4);
    a=(a1+Math.random()*(a2-a1)).toFixed(3);
    out.push(x+'vw '+y+'vh '+blur+'px 0 rgba(255,255,255,'+a+')');
  }
  el.style.boxShadow=out.join(',');
}
starfield(document.getElementById('stA'),150,'0',0.05,0.30);   /* 150 stars, blur 0 */
starfield(document.getElementById('stB'),18,'1.2',0.35,0.70);  /* 18 stars, blur 1.2 */

/* ==================================================================
   6. THE 3D RING
   rAF loop: dt = min((t-last)/1000, .1); phase -= 1.9 * dt (never resets).
   ================================================================== */
var R=891, N=24, STEP=360/N, CULL=42, SPEED=1.9;
var ring=document.getElementById('ring');
var cards=[], i;

for(i=0;i<N;i++){
  var d=CLIPS[i%CLIPS.length];
  var card=document.createElement('div');
  card.className='card';
  card.innerHTML='<video src="'+d.src+'" poster="'+d.poster+'" muted loop playsinline '+
    'preload="metadata" disablepictureinpicture aria-hidden="true"></video>'+
    '<div class="edge"></div>';
  (function(el){
    var v=el.querySelector('video');
    el._v=v;
    el._vis=null;        /* null = not yet classified; placeCards() then owns both edges */
    el._film=i % CLIPS.length;
    v.addEventListener('error', function(){ el.classList.add('broken'); });
    el.addEventListener('click', function(){ openFilm(el._film, el); });
  })(card);
  ring.appendChild(card);
  cards.push(card);
}

var phase=-2, last=null;
var reduceMQ=window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : null;
var reduce=!!(reduceMQ && reduceMQ.matches);

/* Only the handful of cards inside the cull arc are allowed to decode — 24 live
   720p decoders would melt the compositor. Culled cards are paused, not muted. */
function movieOn(){ return !reduce && !document.hidden; }
function playCard(el){
  if(!el._v || !movieOn()) return;
  if(modalOpen) return;                          /* the pop-up owns the screen */
  var p=el._v.play();
  if(p && p.catch) p.catch(function(){});
}
function pauseAll(){
  for(var k=0;k<cards.length;k++){ var v=cards[k]._v; if(v && !v.paused) v.pause(); }
}

function placeCards(){
  for(var j=0;j<cards.length;j++){
    var a=((j*STEP+phase)%360+540)%360-180;      /* signed angle, -180..180 */
    var el=cards[j];
    if(Math.abs(a)>CULL){                        /* cull the back half */
      if(el._vis!==false){
        el._vis=false; el.style.visibility='hidden';
        if(el._v && !el._v.paused) el._v.pause();
      }
      continue;
    }
    if(el._vis!==true){ el._vis=true; el.style.visibility='visible'; playCard(el); }
    var r=a*Math.PI/180, c=Math.cos(r);
    el.style.transform='translate3d('+(R*Math.sin(r))+'px,0,'+(R*(1-c))+'px) rotateY('+(-a)+'deg)';
    el.style.filter='brightness('+(0.84+0.5*(1/c-1))+')';             /* edges dim, front bright */
  }
}

function tick(t){
  if(last==null) last=t;                        /* also guarantees no jump on tab refocus */
  var dt=Math.min((t-last)/1000, .1);
  last=t;
  if(!reduce && !modalOpen) phase-=SPEED*dt;    /* the wheel holds still under the pop-up */
  placeCards();
  requestAnimationFrame(tick);
}
document.addEventListener('visibilitychange', function(){
  last=null;                                     /* a backgrounded tab must not jump */
  if(document.hidden) pauseAll();
  else for(var k=0;k<cards.length;k++){ if(cards[k]._vis) playCard(cards[k]); }
});

/* ==================================================================
   11. THE TYPE FITTER
   Every run is scaled so its INK WIDTH matches §1.5 and its BASELINE
   lands on the §1.5 baseline. Metrics come from a detached canvas 2D
   context, so the result is exact whatever face loads.
   ================================================================== */
var ctx=document.createElement('canvas').getContext('2d');
var CW=1172, DESIGN_H=657;                 /* the whole canvas must now fit the first screen */
var TAB_MAX=1080, TAB_MIN=701, DW_MIN=920;
var BIAS=1.1;                              /* the reference sits labels ~0.6px below true centre */
var phone=false, tablet=false, k=1, tboost=1;

var canvas=document.getElementById('canvas');
var h1a=document.getElementById('h1a'), h1b=document.getElementById('h1b');
var sub1=document.getElementById('sub1'), sub2=document.getElementById('sub2');
var badgeTxt=document.getElementById('badgeTxt'), wmName=document.getElementById('wmName');
var navBtn=document.querySelector('.nav .btn'), cta2=document.querySelector('.cta2');
var ctaLabel=document.getElementById('ctaLabel'), vpLabel=document.getElementById('vpLabel');
var links=document.getElementById('links');
var linkEls=links.querySelectorAll('a');

function fontOf(el){
  var cs=getComputedStyle(el);
  return {weight:cs.fontWeight, family:cs.fontFamily, size:parseFloat(cs.fontSize)};
}
function cssOf(f,px){ return f.weight+' '+px+' '+f.family; }
function inkWidth(el){ return el.getBoundingClientRect().width/(phone?1:k); }
function capRatio(el){
  var f=fontOf(el);
  ctx.font=cssOf(f,'100px');
  var m=ctx.measureText('H');                       /* cap height per 1px of font-size */
  return (m.actualBoundingBoxAscent||70)/100;
}
function metrics(f){
  ctx.font=cssOf(f, f.size+'px');
  var m=ctx.measureText('H');
  var A=m.fontBoundingBoxAscent, D=m.fontBoundingBoxDescent;
  if(!A) A=f.size*.8;
  if(!D) D=f.size*.2;
  return {A:A, D:D};
}
function fitW(el,target){                            /* exact ink width, CSS size kept */
  el.style.fontSize='';
  var f=fontOf(el), w=inkWidth(el);
  el.style.fontSize=(f.size*target/w)+'px';
}
function fitBox(el,tw,tc,pre){                       /* exact cap height AND exact ink width */
  pre=pre||'';
  el.style.transform=pre;
  el.style.fontSize='';
  el.style.fontSize=(tc/capRatio(el))+'px';
  var w=inkWidth(el);
  el.style.transform=pre+' scaleX('+(tw/w)+')';
}
function baseline(el,y){
  var f=fontOf(el), m=metrics(f);
  el.style.top=(y-((f.size-(m.A+m.D))/2+m.A))+'px';
}
function centreLabel(btn, el, capPx){
  var btnH=parseFloat(getComputedStyle(btn).height);
  var f=fontOf(el), m=metrics(f);
  var base=el.offsetTop+((f.size-(m.A+m.D))/2+m.A);   /* baseline offset inside the button */
  var probe=document.createElement('i');
  probe.setAttribute('aria-hidden','true');
  probe.style.cssText='position:absolute;left:0;top:'+base+'px;width:0;height:0;'+
    'pointer-events:none;visibility:hidden';
  btn.appendChild(probe);
  var read=probe.offsetTop;                          /* read the probe's top relative to the button */
  probe.parentNode.removeChild(probe);
  el.style.top=((btnH/2)-(read-capPx/2)+BIAS)+'px';
}

function layout(){
  if(phone){
    /* hand EVERY inline style the fitter wrote back — a leftover transform
       would shift the headline off-screen after a resize down from desktop. */
    [h1a,h1b,sub1,sub2,badgeTxt,wmName,ctaLabel,vpLabel].forEach(function(el){
      el.style.fontSize=''; el.style.top=''; el.style.transform='';
    });
    links.style.fontSize=''; links.style.transform='';
    Array.prototype.forEach.call(linkEls,function(a){ a.style.fontSize=''; });
    placeCards();
    return;
  }

  var T=tablet?tboost:1;
  fitBox(h1a, 563.5*T, 37.2*T, 'translateX(-50%)'); baseline(h1a, 204.5);
  fitBox(h1b, 197.5*T, 37.2*T, 'translateX(-50%)'); baseline(h1b, 258.5);
  fitBox(sub1, 389*T,   8.4*T, 'translateX(-50%)'); baseline(sub1, 300.5);
  fitBox(sub2, 311*T,   8.4*T, 'translateX(-50%)'); baseline(sub2, 316.5);
  fitBox(badgeTxt, 184*T, 9.4*T, 'translate(2px,-1px)');
  fitBox(wmName, 51*T, 11.4*T); baseline(wmName, 38.5);
  fitBox(ctaLabel, 87*T, 8.9*T); centreLabel(navBtn, ctaLabel, 8.9*T);
  fitBox(vpLabel,  76*T, 9.5*T); centreLabel(cta2, vpLabel,  9.5*T);

  links.style.transform='';
  if(tablet){
    Array.prototype.forEach.call(linkEls,function(a){ a.style.fontSize=''; });
  } else {
    var fs=7.9/capRatio(linkEls[0]);                 /* one shared size for the row */
    Array.prototype.forEach.call(linkEls,function(a){ a.style.fontSize=fs+'px'; });
    var rowW=linkEls.length?links.getBoundingClientRect().width/k:1;
    links.style.transform='scaleX('+(317/rowW)+')';  /* squeeze the whole row to 317 */
  }
  placeCards();
}

/* ==================================================================
   10. RESPONSIVE — three distinct architectures
   ================================================================== */
function resize(){
  var vw=innerWidth, vh=innerHeight;
  phone = vw<=700;
  tablet = !phone && vw<=TAB_MAX;
  var c=canvas.style;

  if(phone){
    k=1; tboost=1;
    c.removeProperty('--k'); c.removeProperty('--rs');
  } else if(tablet){
    /* the design WINDOW narrows so type stops shrinking with the viewport;
       at vw = 1080 this lands exactly on 1172, so k stays CONTINUOUS. */
    var W=DW_MIN+(vw-TAB_MIN)*(CW-DW_MIN)/(TAB_MAX-TAB_MIN);
    if(vh>vw*1.15) W=Math.min(W,900);                /* portrait tablet: tighten, read larger */
    k=Math.min(vw/W, vh/DESIGN_H);
    var ramp=Math.min(1,(TAB_MAX-vw)/120);           /* ease the architecture change over 120px */
    tboost=1+0.14*ramp;                              /* ink-target multiplier for type */
    /* with no mock to fill the surplus height, the extra room just becomes
       breathing space and the wheel alone grows (= a closer camera) */
    var fill=Math.max(0, vh/k-657);
    var rs=1+Math.min(fill/1100,0.75)*ramp;
    c.setProperty('--k',k);
    c.setProperty('--rs',rs);
  } else {
    /* k = min(vw / W, vh / 657): the whole 1172x657 canvas now fits the first
       screen, because the page scrolls to the reel instead of bleeding a mock
       off the bottom edge. */
    k=Math.min(vw/CW, vh/DESIGN_H);
    tboost=1;
    c.setProperty('--k',k);
    c.removeProperty('--rs');
  }
  layout();
}

addEventListener('resize', resize);
if(window.visualViewport) window.visualViewport.addEventListener('resize', resize);
resize();
if(document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
setTimeout(layout,400);
setTimeout(layout,1400);
requestAnimationFrame(tick);

/* ==================================================================
   13. ACCESSIBILITY — narrow-viewport menu
   ================================================================== */
var burger=document.getElementById('burger'), nav=document.getElementById('nav'),
    navmenu=document.getElementById('navmenu');

function closeMenu(){
  nav.classList.remove('open');
  burger.setAttribute('aria-expanded','false');
}
function openMenu(){
  nav.classList.add('open');
  burger.setAttribute('aria-expanded','true');
}
burger.addEventListener('click', function(e){
  e.stopPropagation();
  if(nav.classList.contains('open')){ closeMenu(); } else { openMenu(); }
});
document.addEventListener('click', function(e){
  if(nav.classList.contains('open') && !nav.contains(e.target)) closeMenu();
});
document.addEventListener('keydown', function(e){
  if(e.key==='Escape' && nav.classList.contains('open')){ closeMenu(); burger.focus(); }
});
navmenu.addEventListener('click', function(e){
  var t=e.target;
  if(t && t.closest && t.closest('a')) closeMenu();
});
var bandMQ=window.matchMedia ? matchMedia('(max-width:1080px)') : null;
if(bandMQ){
  var onBand=function(e){ if(!e.matches) closeMenu(); };   /* force-close outside the band */
  if(bandMQ.addEventListener) bandMQ.addEventListener('change', onBand);
  else if(bandMQ.addListener) bandMQ.addListener(onBand);
}

/* ==================================================================
   12. MASTER ENTRANCE TIMELINE — runs exactly once, then the page is still
   ================================================================== */
(function(){
  var root=document.documentElement;
  var n=0, maxEnd=0, lastAnim=null;

  function settle(){
    var all=document.getAnimations ? document.getAnimations() : [];
    all.forEach(function(a){ if(a.id && a.id.indexOf('intro:')===0) a.cancel(); });
    root.classList.remove('intro');
  }

  if(!root.classList.contains('intro') || reduce || !Element.prototype.animate){
    settle(); return;
  }

  var D = innerWidth<=700 ? .66 : 1;                 /* phones travel shorter distances */
  var EXPO='cubic-bezier(.16,1,.3,1)', SOFT='cubic-bezier(.22,.61,.36,1)';
  var Y=function(px){ return '0 '+(px*D)+'px'; };
  var failed=false;

  function play(el, from, dur, delay, ease){
    if(!el || failed) return;
    var to={opacity:1};
    if(from.translate!=null) to.translate='0 0';
    if(from.scale!=null) to.scale='1';
    if(from.clipPath!=null) to.clipPath='inset(-30% 0 -30% 0)';
    var a;
    try{
      a=el.animate([from,to],{duration:dur,delay:delay,easing:ease,fill:'both'});
    }catch(err){ failed=true; settle(); return; }
    a.id='intro:'+(n++);
    var end=delay+dur;
    if(end>maxEnd){ maxEnd=end; lastAnim=a; }
  }

  /* the frame settles */
  play(nav,        {opacity:0,translate:Y(-9)}, 620,   60, EXPO);
  play(document.querySelector('.mark'), {opacity:0,translate:Y(6)}, 520, 150, SOFT);
  play(document.querySelector('.wm'),   {opacity:0,translate:Y(6)}, 520, 185, SOFT);
  Array.prototype.forEach.call(linkEls,function(a,idx){
    play(a, {opacity:0,translate:Y(6)}, 460, 215+idx*45, SOFT);
  });
  play(burger,     {opacity:0,translate:Y(6)}, 460,  300, SOFT);
  play(navBtn,     {opacity:0,translate:Y(6)}, 500,  400, SOFT);

  /* context, then the message */
  play(document.querySelector('.badge'), {opacity:0,translate:Y(11),scale:.985}, 560, 270, EXPO);
  play(h1a, {opacity:0,translate:Y(15),clipPath:'inset(100% 0 -30% 0)'}, 900, 380, EXPO);
  play(h1b, {opacity:0,translate:Y(15),clipPath:'inset(100% 0 -30% 0)'}, 900, 470, EXPO);
  play(sub1, {opacity:0,translate:Y(10)}, 620, 690, EXPO);
  play(sub2, {opacity:0,translate:Y(10)}, 620, 745, EXPO);
  play(cta2, {opacity:0,translate:Y(13),scale:.985}, 620, 830, EXPO);

  /* the payoff — the wheel rises into depth */
  play(ring,    {opacity:0,translate:Y(18),scale:.99}, 950,  700, EXPO);
  play(document.querySelector('.wa'), {opacity:0,scale:.88}, 500, 1260, EXPO);

  if(lastAnim){ lastAnim.finished.then(settle).catch(settle); }
  else { settle(); }
  setTimeout(settle, 4200);        /* belt and braces on top of the head failsafe */
  void maxEnd;
})();

/* ==================================================================
   9b. THE REEL — the films below the fold.
   Muted, looped, and played only while they are actually on screen; a click
   parks a film (and scrolling it out of view releases it again). Under
   prefers-reduced-motion nothing auto-plays — the poster frame stands in.
   ================================================================== */
var reelVids=[].slice.call(document.querySelectorAll('.reel-video'));

/* ==================================================================
   9c. SOUND + THE PLAYER
   The carousel clips are silent loops, so a click doesn't un-mute them — it
   flies the card into the middle and plays the FULL film (which has its audio
   track) with the same control bar the reel films use.
   ================================================================== */
var FILMS=[
  {src:'web/杰威尔.mp4',     poster:'web/杰威尔.jpg',     at:7.5},
  {src:'web/朗朗宣传片.mp4', poster:'web/朗朗宣传片.jpg', at:28.4},
  {src:'web/音效完成版.mp4', poster:'web/音效完成版.jpg', at:27.2},
  {src:'web/AFU.mp4',        poster:'web/AFU.jpg',        at:11.7}
];

var ICO={
  play:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.2v13.6L19 12z" fill="currentColor"/></svg>',
  pause:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.4v14H7zM13.6 5H17v14h-3.4z" fill="currentColor"/></svg>',
  vol:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.2h3.2L12 5.4v13.2L7.2 14.8H4z" fill="currentColor"/><path d="M15.4 8.6a4.8 4.8 0 0 1 0 6.8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  mute:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.2h3.2L12 5.4v13.2L7.2 14.8H4z" fill="currentColor"/><path d="M15.6 9.4l4.6 5.2m0-5.2l-4.6 5.2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>'
};

function fmtTime(t){
  if(!isFinite(t) || t<0) t=0;
  t=Math.floor(t);
  var m=Math.floor(t/60), s=t%60;
  return m+':'+(s<10?'0':'')+s;
}

var players=[];                                  /* every player we build */
function focusSound(v){                          /* only one film may be audible */
  for(var i=0;i<players.length;i++){
    var o=players[i];
    if(o.video!==v && !o.video.muted){ o.video.muted=true; o.paintVol(); }
  }
}

function buildPlayer(video){
  if(video._ui) return video._ui;
  var player=document.createElement('div');
  player.className='player';
  video.parentNode.insertBefore(player, video);
  player.appendChild(video);

  var bar=document.createElement('div');
  bar.className='pctl';
  bar.innerHTML=
    '<button class="pbtn pplay" type="button" aria-label="播放 / 暂停">'+ICO.play+'</button>'+
    '<span class="ptime pcur">0:00</span>'+
    '<div class="pbar" role="slider" aria-label="播放进度" tabindex="0"><div class="pfill"></div><span class="pknob"></span></div>'+
    '<span class="ptime pdur">0:00</span>'+
    '<button class="pbtn pmute" type="button" aria-label="声音开关">'+ICO.mute+'</button>'+
    '<div class="pvol" role="slider" aria-label="音量" tabindex="0"><div class="pvolfill"></div><span class="pknob"></span></div>';
  player.appendChild(bar);

  var btnPlay=bar.querySelector('.pplay'), btnMute=bar.querySelector('.pmute');
  var cur=bar.querySelector('.pcur'), dur=bar.querySelector('.pdur');
  var pbar=bar.querySelector('.pbar'), pfill=bar.querySelector('.pfill');
  var vol=bar.querySelector('.pvol'), vfill=bar.querySelector('.pvolfill');

  function paintTime(){
    var d=video.duration||0, t=video.currentTime||0;
    pfill.style.width=(d? (t/d*100) : 0)+'%';
    cur.textContent=fmtTime(t);
    dur.textContent=fmtTime(d);
  }
  function paintVol(){
    vfill.style.width=(video.muted? 0 : video.volume*100)+'%';
    btnMute.innerHTML=(video.muted || !video.volume)? ICO.mute : ICO.vol;
  }
  function paintPlay(){ btnPlay.innerHTML=video.paused? ICO.play : ICO.pause; }

  btnPlay.addEventListener('click', function(){
    if(video.paused){ var p=video.play(); if(p&&p.catch) p.catch(function(){}); }
    else video.pause();
  });
  btnMute.addEventListener('click', function(){
    video.muted=!video.muted;
    if(!video.muted){ if(!video.volume) video.volume=.8; focusSound(video); }
    paintVol();
  });

  function ratioFrom(e, el){
    var r=el.getBoundingClientRect();
    var x=(e.touches? e.touches[0].clientX : e.clientX) - r.left;
    return Math.min(1, Math.max(0, x/r.width));
  }
  function seekAt(e){
    if(video.duration) video.currentTime=ratioFrom(e, pbar)*video.duration;
    paintTime();
  }
  function volAt(e){
    var p=ratioFrom(e, vol);
    video.volume=p;
    video.muted=(p===0);
    if(!video.muted) focusSound(video);
    paintVol();
  }
  function draggable(el, fn){
    el.addEventListener('pointerdown', function(e){
      e.preventDefault();
      try{ if(el.setPointerCapture) el.setPointerCapture(e.pointerId); }catch(err){}
      fn(e);
      var move=function(ev){ fn(ev); };
      var up=function(){ el.removeEventListener('pointermove',move); el.removeEventListener('pointerup',up); };
      el.addEventListener('pointermove',move);
      el.addEventListener('pointerup',up);
    });
    el.addEventListener('keydown', function(e){    /* arrows work too */
      if(e.key!=='ArrowLeft' && e.key!=='ArrowRight') return;
      e.preventDefault();
      var step=(e.key==='ArrowRight'? 1 : -1);
      if(el===pbar && video.duration) video.currentTime=Math.min(video.duration, Math.max(0, video.currentTime+step*5));
      else if(el===vol){ video.volume=Math.min(1, Math.max(0, video.volume+step*.1)); video.muted=(video.volume===0); if(!video.muted) focusSound(video); paintVol(); }
      paintTime();
    });
  }
  draggable(pbar, seekAt);
  draggable(vol, volAt);

  video.addEventListener('timeupdate', paintTime);
  video.addEventListener('durationchange', paintTime);
  video.addEventListener('loadedmetadata', paintTime);
  video.addEventListener('play', paintPlay);
  video.addEventListener('pause', paintPlay);
  video.addEventListener('volumechange', paintVol);

  var ui={video:video, paintVol:paintVol};
  players.push(ui);
  video._ui=ui;
  paintTime(); paintVol(); paintPlay();
  return ui;
}

/* ---------- the pop-up ---------- */
var modal=document.getElementById('modal'), mbox=document.getElementById('mbox');
var mvideo=document.getElementById('mvideo'), mclose=document.getElementById('mclose');
var modalOpen=false, modalCard=null;

function openFilm(idx, card){
  var f=FILMS[idx];
  if(!f || modalOpen) return;
  modalOpen=true; modalCard=card;
  buildPlayer(mvideo);

  /* freeze the wheel so the card we flew out of stays put, and stop the
     decorative clips from decoding behind the pop-up */
  for(var i=0;i<cards.length;i++){ var v=cards[i]._v; if(v && !v.paused) v.pause(); }
  for(var r=0;r<reelVids.length;r++){ if(!reelVids[r].paused) reelVids[r].pause(); }

  modal.classList.add('on');
  modal.setAttribute('aria-hidden','false');
  document.body.classList.add('noscroll');
  mclose.focus();

  /* FLIP: place the box on the card, then let it fly to the centre */
  mbox.style.transition='none';
  mbox.style.transform='none';
  mbox.style.opacity='1';
  var fr=mbox.getBoundingClientRect();
  if(card && !reduce){
    var cr=card.getBoundingClientRect();
    var s=cr.width/fr.width;
    var dx=(cr.left+cr.width/2)-(fr.left+fr.width/2);
    var dy=(cr.top+cr.height/2)-(fr.top+fr.height/2);
    mbox.style.transformOrigin='50% 50%';
    mbox.style.transform='translate('+dx+'px,'+dy+'px) scale('+s+')';
    mbox.style.opacity='.25';
    void mbox.offsetWidth;
    mbox.style.transition='transform .58s cubic-bezier(.16,1,.3,1),opacity .42s ease';
    mbox.style.transform='none';
    mbox.style.opacity='1';
  }

  /* The film only starts loading now that the box is on screen — a hidden
     <video> has its loading deferred, which is why it used to sit at 0:00.
     Play first (so it starts the moment data arrives) and seek on metadata. */
  mvideo.onloadedmetadata=function(){
    mvideo.onloadedmetadata=null;
    try{ mvideo.currentTime=f.at; }catch(e){}      /* land where the card was */
  };
  mvideo.muted=false;
  mvideo.volume=.6;
  mvideo._ui.paintVol();
  focusSound(mvideo);
  mvideo.src=f.src;
  mvideo.load();
  var pr=mvideo.play();
  if(pr && pr.catch) pr.catch(function(){          /* autoplay refused -> mute and retry */
    mvideo.muted=true;
    mvideo._ui.paintVol();
    var q=mvideo.play(); if(q && q.catch) q.catch(function(){});
  });
}

function closeFilm(){
  if(!modalOpen) return;
  modalOpen=false;
  if(!mvideo.paused) mvideo.pause();
  modal.setAttribute('aria-hidden','true');

  var fr=mbox.getBoundingClientRect();
  var back=modalCard && !reduce ? modalCard.getBoundingClientRect() : null;
  function done(){
    modal.classList.remove('on');
    document.body.classList.remove('noscroll');
    mvideo.removeAttribute('src'); mvideo.load();     /* free the film */
    mbox.style.transition='none'; mbox.style.transform='none'; mbox.style.opacity='1';
    modalCard=null;
    syncReel();
  }
  if(back){
    var s=back.width/fr.width;
    var dx=(back.left+back.width/2)-(fr.left+fr.width/2);
    var dy=(back.top+back.height/2)-(fr.top+fr.height/2);
    mbox.style.transition='transform .5s cubic-bezier(.4,0,.2,1),opacity .38s ease';
    mbox.style.transform='translate('+dx+'px,'+dy+'px) scale('+s+')';
    mbox.style.opacity='.2';
    setTimeout(done, 500);
  } else {
    mbox.style.transition='opacity .3s ease';
    mbox.style.opacity='0';
    setTimeout(done, 300);
  }
}

mclose.addEventListener('click', closeFilm);
modal.addEventListener('click', function(e){ if(e.target.hasAttribute('data-close')) closeFilm(); });
document.addEventListener('keydown', function(e){
  if(e.key==='Escape'){
    if(modalOpen) closeFilm();
    else if(nav.classList.contains('open')){ closeMenu(); burger.focus(); }
  }
});

/* the reel films get the very same control bar */
reelVids.forEach(function(v){ buildPlayer(v); });

/* the hero's background film: fades in once it has a frame, and obeys the same
   reduced-motion / hidden-tab rules as everything else */
var bgvid=document.getElementById('bgvid');
function bgvidSync(){
  if(!bgvid) return;
  if(reduce || document.hidden){ if(!bgvid.paused) bgvid.pause(); }
  else { var p=bgvid.play(); if(p && p.catch) p.catch(function(){}); }
}
if(bgvid){
  bgvid.addEventListener('loadeddata', function(){ bgvid.classList.add('on'); });
  if(bgvid.readyState>=2) bgvid.classList.add('on');
  bgvidSync();
}

function reelPlay(v){
  if(reduce || document.hidden) return;
  var p=v.play();
  if(p && p.catch) p.catch(function(){});
}
function syncReel(){
  for(var i=0;i<reelVids.length;i++){
    var v=reelVids[i], r=v.getBoundingClientRect();
    var inView = r.top < innerHeight*0.88 && r.bottom > innerHeight*0.12;
    if(!inView) v._held=false;               /* leaving the screen releases the hold */
    if(inView && !v._held) reelPlay(v);
    else if(!v.paused) v.pause();
  }
}
reelVids.forEach(function(v){
  v.addEventListener('click', function(){
    if(v.paused){ v._held=false; reelPlay(v); }
    else { v._held=true; v.pause(); }
  });
});

var reelTick=false;
function onScroll(){
  if(reelTick) return;
  reelTick=true;
  requestAnimationFrame(function(){ reelTick=false; syncReel(); });
}

/* An IntersectionObserver is the primary trigger: it also fires for films that
   are already on screen when the page opens (a reload that restores the scroll
   position, or a deep link), which a scroll listener alone would miss. */
if(window.IntersectionObserver){
  var reelIO=new IntersectionObserver(function(){ syncReel(); },
    {threshold:[0,.05,.25,.5,.75,1]});
  reelVids.forEach(function(v){ reelIO.observe(v); });
}
addEventListener('scroll', onScroll, {passive:true});
addEventListener('resize', function(){ syncReel(); bgvidSync(); });
addEventListener('pageshow', function(){ syncReel(); bgvidSync(); });
document.addEventListener('visibilitychange', function(){
  if(document.hidden) reelVids.forEach(function(v){ if(!v.paused) v.pause(); });
  else syncReel();
  bgvidSync();
});
syncReel();

}
