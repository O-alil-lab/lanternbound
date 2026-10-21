window.LB = window.LB || {};
// ============================================================
// Lanternbound — fit the game to the screen it runs on.
//  • works out the device type (phone / tablet / desktop) and orientation
//  • scales the HUD, menus and touch controls to the screen (CSS zoom)
//  • keeps everything inside the safe area (notches, rounded corners)
//  • picks a sensible render resolution for the device
//  • tells the camera how far to pull back for narrow or tall screens
//  • full-screen button + "turn your phone" hint
// Body classes: dev-phone | dev-tablet | dev-desktop, portrait | landscape, short
// ============================================================
(function () {
  const mm = q => window.matchMedia && matchMedia(q).matches;
  const S = LB.screen = { type: 'desktop', portrait: false, short: false, ui: 1, w: innerWidth, h: innerHeight };
  const coarse = () => mm('(pointer: coarse)') || (navigator.maxTouchPoints > 0 && !mm('(pointer: fine)'));
  LB.touch = coarse();

  function measure() {
    const vv = window.visualViewport;
    const w = Math.round(vv ? vv.width * (vv.scale || 1) : innerWidth) || innerWidth, h = Math.round(vv ? vv.height * (vv.scale || 1) : innerHeight) || innerHeight;
    const shortSide = Math.min(w, h), longSide = Math.max(w, h);
    S.w = w; S.h = h; S.portrait = h > w; S.short = h < 520;
    S.type = LB.touch || coarse() ? (shortSide < 600 && longSide < 1000 ? 'phone' : 'tablet') : 'desktop';
    // interface scale
    let ui;
    if (S.type === 'phone') ui = S.portrait ? Math.min(1.05, Math.max(.78, w / 410)) : Math.min(1, Math.max(.68, h / 440));
    else if (S.type === 'tablet') ui = Math.min(1.3, Math.max(.95, shortSide / 720));
    else ui = Math.min(1.4, Math.max(.8, Math.min(w / 1366, h / 800)));
    S.ui = Math.round(ui * 100) / 100;
    const b = document.body; if (!b) return;
    b.classList.remove('dev-phone', 'dev-tablet', 'dev-desktop');
    b.classList.add('dev-' + S.type);
    b.classList.toggle('portrait', S.portrait); b.classList.toggle('landscape', !S.portrait); b.classList.toggle('short', S.short);
    document.documentElement.style.setProperty('--ui', S.ui);
  }
  // render resolution: sharp on desktop, lighter on phones (battery + heat)
  S.pixelRatio = () => {
    const d = window.devicePixelRatio || 1;
    return Math.min(d, S.type === 'phone' ? 1.5 : S.type === 'tablet' ? 1.75 : 2);
  };
  // how far the camera pulls back: narrow screens need to see more to the sides
  S.camZoom = aspect => {
    let z = Math.min(2.1, Math.max(1, 1.3 / aspect));
    if (S.short && !S.portrait) z *= 1.08;           // small landscape phones: a little more room around you
    if (aspect > 2.3) z *= .94;                      // very wide screens: come a bit closer
    return z;
  };

  const CSS = `
html,body{height:100%;height:100dvh}
html #game-container{position:fixed;inset:0}
html #hud3d{top:env(safe-area-inset-top);right:env(safe-area-inset-right);bottom:env(safe-area-inset-bottom);left:env(safe-area-inset-left);zoom:var(--ui,1)}
html #lb-ui{inset:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)!important;width:auto!important;height:auto!important;zoom:var(--ui,1)}
html #lb-screen{padding:max(16px,env(safe-area-inset-top)) max(16px,env(safe-area-inset-right)) max(16px,env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left));overflow:auto;justify-content:safe center;touch-action:pan-y;-webkit-overflow-scrolling:touch}
html .sheet .card{touch-action:pan-y}
html #lb-screen > *{zoom:var(--ui,1)}
html #lb-stagecard{zoom:var(--ui,1)}
/* small landscape phones: compact HUD, smaller title cards */
html body.short:not(.dev-desktop) #hud3d .lead{top:38px}
html body.short:not(.dev-desktop) #hud3d .party{top:auto;bottom:8px;left:auto;right:50%;transform:translateX(50%)}
html body.short:not(.dev-desktop) #hud3d .info{bottom:auto;top:110px}
html body.short.dev-phone #hud3d .weapons{top:44px}
html body.short:not(.dev-desktop) #lb-screen h1{font-size:40px}
html body.short:not(.dev-desktop) #lb-screen .tcard img{height:min(90px,24vh)}
html body.short:not(.dev-desktop) #lb-screen .tcard.big{width:200px}
html body.short:not(.dev-desktop) #lb-screen .tcard.big img{height:min(100px,26vh)}
html body.short:not(.dev-desktop) #lb-screen .tcard .d{font-size:11px}
html body.short:not(.dev-desktop) #lb-screen p{margin:4px 0 8px}
html body.short:not(.dev-desktop) #lb-screen .tcard.stage .sw{height:56px}
html body.short:not(.dev-desktop) #pad .ab{width:76px;height:76px}
html body.short:not(.dev-desktop) #pad .ab.s{width:54px;height:54px;font-size:18px}
html body.short:not(.dev-desktop) #stick{width:132px;height:132px}
/* phones held upright: party strip moves up, controls stay thumb-sized */
html body.dev-phone.portrait #hud3d .info{bottom:auto;top:178px}
html body.dev-phone.portrait #pad .acts{grid-template-columns:repeat(3,auto)}
html body.dev-phone.portrait #lb-screen .tcard img{height:min(130px,16vh)}
/* tablets get the full desktop HUD, bigger touch targets */
html body.dev-tablet #pad .ab{width:96px;height:96px}
html body.dev-tablet #pad .ab.s{width:70px;height:70px}
/* the full-screen button only where it works */
html #bFull{display:none}
html body.can-full #bFull{display:flex}
`;
  function install() {
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    const vp = document.querySelector('meta[name=viewport]');
    if (vp) vp.content = 'width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover';
    const de = document.documentElement;
    if (de.requestFullscreen || de.webkitRequestFullscreen) document.body.classList.add('can-full');
    measure();
  }
  let pending = 0;
  const changed = () => { cancelAnimationFrame(pending); pending = requestAnimationFrame(() => { measure(); (S.onResize || []).forEach(f => f()); }); };
  S.onResize = [];
  addEventListener('resize', changed);
  addEventListener('orientationchange', () => setTimeout(changed, 120));
  if (window.visualViewport) visualViewport.addEventListener('resize', changed);
  // a touch on a laptop with a touchscreen switches on the touch controls
  addEventListener('pointerdown', e => {
    if (e.pointerType === 'touch' && !LB.touch) { LB.touch = true; changed(); if (LB.showHud && LB.world && LB.mode !== 'title') LB.showHud(true); }
  }, { capture: true, passive: true });

  LB.toggleFullscreen = async function () {
    const de = document.documentElement;
    try {
      if (document.fullscreenElement || document.webkitFullscreenElement) { await (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
      await (de.requestFullscreen || de.webkitRequestFullscreen).call(de, { navigationUI: 'hide' });
      if (S.type === 'phone' && screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {});
    } catch (e) {}
  };
  // one gentle hint for phones held upright
  S.hintOrientation = function () {
    if (S.type !== 'phone' || !S.portrait || S.hinted) return; S.hinted = true;
    setTimeout(() => LB.toast && LB.toast(LB.t('Turn your phone sideways for a wider view')), 2500);
  };
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', install); else install();
})();
