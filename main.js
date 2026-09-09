const { app, BrowserWindow, dialog, shell } = require('electron');
const fs = require('fs');
const path = require('path');

// ============================================================
// EZI CLIENT V1.0.0
// Performance-focused Kirka client UI.
// ============================================================
app.setName('Ezi Client');
app.setAppUserModelId('com.ezi.client');
// Aggressive but still GPU-backed rendering profile for low-end systems.
// Stability-first Chromium profile. Let Electron choose the GPU path automatically.

function settingsPath() {
    try { return path.join(app.getPath('userData'), 'ezi-v5-settings.json'); }
    catch (_) {
        const base = process.env.APPDATA || process.env.LOCALAPPDATA || process.cwd();
        return path.join(base, 'Ezi Client', 'ezi-v5-settings.json');
    }
}
function readSettings() {
    try { return JSON.parse(fs.readFileSync(settingsPath(), 'utf8')) || {}; }
    catch (_) { return {}; }
}
function writeSettings(data) {
    try {
        fs.mkdirSync(path.dirname(settingsPath()), { recursive: true });
        fs.writeFileSync(settingsPath(), JSON.stringify(data, null, 2), 'utf8');
    } catch (e) { console.log('Ezi settings write error:', e.message); }
}

// Chromium frame limiter is startup-only. Read the same file used after restart.
const STARTUP = readSettings();
if (!Object.prototype.hasOwnProperty.call(STARTUP, 'v521Initialized')) {
    // Older builds accidentally forced uncapped FPS on. v1.0.0 never does that.
    // Keep performance mode enabled, but make frame limiting an explicit user choice.
    STARTUP.performanceMode = true;
    STARTUP.uncappedFPS = false;
    STARTUP.v521Initialized = true;
    writeSettings(STARTUP);
}
// Conservative performance flags only.
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-component-update');
if (STARTUP.uncappedFPS === true) {
    app.commandLine.appendSwitch('disable-frame-rate-limit');
    app.commandLine.appendSwitch('disable-gpu-vsync');
}

let mainWindow = null;
process.on('uncaughtException', e => console.log('Ezi main error:', e && e.stack ? e.stack : e));
process.on('unhandledRejection', e => console.log('Ezi rejection:', e));

function defaultUserscriptFolder() {
    const folder = path.join(app.getPath('userData'), 'userscripts');
    try { fs.mkdirSync(folder, { recursive: true }); } catch (_) {}
    return folder;
}
function userscriptFolder() {
    const s = readSettings();
    const folder = s.userscriptFolder || defaultUserscriptFolder();
    try { fs.mkdirSync(folder, { recursive: true }); } catch (_) {}
    return folder;
}
function listUserscripts() {
    const folder = userscriptFolder();
    let files = [];
    try {
        files = fs.readdirSync(folder, { withFileTypes: true })
            .filter(x => x.isFile() && x.name.toLowerCase().endsWith('.js'))
            .map(x => x.name).sort((a,b) => a.localeCompare(b));
    } catch (e) { console.log('Userscript scan error:', e.message); }
    return { folder, files };
}
function pageMatches(url, rule) {
    if (!rule || rule === '*') return true;
    try {
        const escaped = rule.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
        return new RegExp('^' + escaped + '$', 'i').test(url);
    } catch (_) { return true; }
}

const LOGO_DATA = (() => {
    try { return 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, 'logo.png')).toString('base64'); }
    catch (_) { return ''; }
})();

const CSS = String.raw`
html, body { overscroll-behavior:none !important; }
canvas { animation:none !important; transition:none !important; }
body.ezi-perf * { animation-duration:0s !important; transition-duration:0s !important; caret-color:transparent !important; }
body.ezi-perf video { animation:none !important; transition:none !important; }
body.ezi-perf #ezi-settings-panel, body.ezi-perf #ezi-settings-panel * { animation:none !important; transition:none !important; }
body.ezi-hide-chat #chat, body.ezi-hide-chat [id*="chat" i], body.ezi-hide-chat [class*="chat" i] { display:none !important; }

#ezi-settings-panel {
 position:fixed !important; left:50vw !important; top:50vh !important; transform:translate(-50%,-50%) !important;
 width:455px !important; max-width:calc(100vw - 24px) !important; max-height:calc(100vh - 24px) !important;
 overflow:hidden !important; z-index:2147483647 !important; box-sizing:border-box !important;
 padding:12px !important; background:#0b0b0b !important; color:#fff !important;
 border:2px solid #f39c12 !important; border-radius:9px !important; box-shadow:0 18px 70px rgba(0,0,0,.88) !important;
 font:13px Arial,sans-serif !important; pointer-events:auto !important; user-select:none !important;
}

.ezi-staticbar { height:30px !important; display:flex !important; align-items:center !important; justify-content:space-between !important;
 padding:0 9px !important; margin:-5px -5px 9px !important; box-sizing:border-box !important; cursor:default !important;
 touch-action:auto !important; background:rgba(243,156,18,.10) !important; border:1px solid rgba(243,156,18,.3) !important; border-radius:5px !important; }
.ezi-dragbar:active { cursor:grabbing !important; }
.ezi-dragbar span { color:#f39c12 !important; font:900 9px Arial !important; letter-spacing:1px !important; pointer-events:none !important; }
.ezi-dragbar small { color:#777 !important; font:900 8px Arial !important; pointer-events:none !important; }
.ezi-title { color:#f39c12 !important; font-size:22px !important; font-weight:900 !important; letter-spacing:1px !important; }
.ezi-version { color:#777 !important; font-size:9px !important; margin:2px 0 10px !important; }
.ezi-tabs { display:flex !important; gap:4px !important; padding:4px !important; margin-bottom:10px !important; background:#151515 !important; border:1px solid #292929 !important; border-radius:6px !important; }
.ezi-tab { all:unset !important; flex:1 !important; height:31px !important; text-align:center !important; border-radius:4px !important; background:#111 !important; color:#888 !important; cursor:pointer !important; font:900 8px Arial !important; }
.ezi-tab:hover { color:#fff !important; background:#222 !important; }
.ezi-tab.active { color:#111 !important; background:#f39c12 !important; }
.ezi-pages { overflow:auto !important; max-height:calc(100vh - 180px) !important; padding-right:2px !important; }
.ezi-tab-page { display:none !important; }
.ezi-tab-page.active { display:block !important; }
.ezi-section { color:#f39c12 !important; font-size:9px !important; font-weight:900 !important; letter-spacing:1px !important; border-bottom:1px solid rgba(243,156,18,.3) !important; padding:7px 0 4px !important; }
.ezi-row { display:flex !important; align-items:center !important; justify-content:space-between !important; gap:12px !important; padding:9px 0 !important; border-bottom:1px solid rgba(255,255,255,.07) !important; }
.ezi-row b { display:block !important; font-size:11px !important; }
.ezi-row small { display:block !important; margin-top:2px !important; color:#777 !important; font-size:9px !important; line-height:1.35 !important; }
.ezi-switch { position:relative !important; width:42px !important; height:22px !important; flex:none !important; }
.ezi-switch input { opacity:0 !important; width:0 !important; height:0 !important; }
.ezi-switch span { position:absolute !important; inset:0 !important; background:#333 !important; border-radius:20px !important; cursor:pointer !important; }
.ezi-switch span:before { content:"" !important; position:absolute !important; width:16px !important; height:16px !important; left:3px !important; top:3px !important; background:#fff !important; border-radius:50% !important; transition:.1s !important; }
.ezi-switch input:checked + span { background:#f39c12 !important; }
.ezi-switch input:checked + span:before { transform:translateX(20px) !important; }
.ezi-button { width:100% !important; height:34px !important; margin-top:7px !important; border:1px solid #111 !important; border-radius:5px !important; background:#f39c12 !important; color:#111 !important; cursor:pointer !important; font:900 10px Arial !important; }
.ezi-button:hover { background:#ffad24 !important; }
.ezi-choice-grid { display:grid !important; grid-template-columns:1fr 1fr !important; gap:6px !important; margin-top:7px !important; }
.ezi-choice { all:unset !important; min-height:32px !important; text-align:center !important; border:1px solid #333 !important; border-radius:5px !important; background:#171717 !important; color:#aaa !important; cursor:pointer !important; font:900 9px Arial !important; }
.ezi-choice.active { background:#f39c12 !important; color:#111 !important; }
.ezi-folder { margin-top:7px !important; padding:7px !important; border:1px solid #292929 !important; background:#151515 !important; color:#999 !important; font:9px Consolas,monospace !important; overflow:hidden !important; text-overflow:ellipsis !important; white-space:nowrap !important; }
.ezi-script-list { max-height:170px !important; overflow:auto !important; margin-top:7px !important; }
.ezi-script-item { padding:6px 7px !important; margin:3px 0 !important; border-left:2px solid #f39c12 !important; background:#151515 !important; color:#ccc !important; font:10px Consolas,monospace !important; }
.ezi-status { margin-top:7px !important; padding:7px !important; border:1px solid #292929 !important; background:#111 !important; color:#f39c12 !important; font:900 9px Arial !important; }
.ezi-about { text-align:center !important; padding:8px 0 !important; }
.ezi-about img { width:110px !important; height:110px !important; object-fit:contain !important; display:block !important; margin:0 auto 7px !important; }
.ezi-about h2 { margin:2px 0 !important; color:#f39c12 !important; font:900 20px Arial !important; }
.ezi-about p { color:#999 !important; font-size:9px !important; line-height:1.55 !important; margin:6px 0 !important; }
.ezi-shortcuts { text-align:left !important; padding:8px !important; margin-top:8px !important; background:#111 !important; border:1px solid #292929 !important; border-radius:5px !important; color:#aaa !important; font:9px Consolas,monospace !important; line-height:1.8 !important; }
.ezi-note { color:#777 !important; font-size:9px !important; line-height:1.5 !important; margin-top:7px !important; }
#ezi-performance-monitor { position:fixed !important; top:8px !important; left:50% !important; transform:translateX(-50%) !important; z-index:2147483646 !important; padding:5px 9px !important; background:rgba(0,0,0,.8) !important; border:1px solid #f39c12 !important; border-radius:4px !important; color:#f39c12 !important; font:900 12px Arial !important; pointer-events:none !important; }
#ezi-profiler-panel { position:fixed !important; top:36px !important; left:50% !important; transform:translateX(-50%) !important; z-index:2147483646 !important; padding:5px 8px !important; background:rgba(0,0,0,.85) !important; border:1px solid #f39c12 !important; color:#fff !important; font:10px Consolas,monospace !important; pointer-events:none !important; }
#ezi-settings-panel[data-theme=light] { background:#f4f4f4 !important; color:#111 !important; border-color:#777 !important; }
#ezi-settings-panel[data-theme=glass] { background:rgba(18,18,18,.72) !important; backdrop-filter:blur(12px) !important; border-color:rgba(255,255,255,.45) !important; }
#ezi-settings-panel[data-theme=dark] { background:#080808 !important; border-color:#555 !important; }
`;

const RENDERER = String.raw`
(() => {
'use strict';
try {
 if (window.__EZI_V100__) return 'already-loaded';
 window.__EZI_V100__ = true;
 const DEFAULTS = { performanceMode:true, fpsMonitor:false, profiler:false, uncappedFPS:false, hideChat:false, hideInterface:false, userscripts:true, menuTheme:'ezi', menuX:null, menuY:null, playerHeadColor:'#f2c29b', playerBodyColor:'#3b82f6' };
 let settings = {};
 try { settings = Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem('ezi-client-v5-settings') || '{}')); } catch (_) { settings = Object.assign({}, DEFAULTS); }
 const save = () => { try { localStorage.setItem('ezi-client-v5-settings', JSON.stringify(settings)); } catch (_) {} };
 const $ = id => document.getElementById(id);
 const safeClass = (name, on) => { try { document.body.classList.toggle(name, !!on); } catch (_) {} };

 const panel = document.createElement('div'); panel.id='ezi-settings-panel'; panel.style.display='none';
 const eziTrustedPolicy = (() => { try { return window.trustedTypes ? window.trustedTypes.createPolicy('ezi-client-policy', { createHTML: input => input }) : null; } catch (_) { return null; } })();
 const eziMarkup = [
  '<div class="ezi-staticbar"><span>EZI CLIENT</span><small>IAM EZI • v1.0.0</small></div>',
  '<div class="ezi-title">EZI CLIENT</div><div class="ezi-version">V1.0.0 • MAX FPS EDITION</div>',
  '<div class="ezi-tabs">',
   '<button class="ezi-tab active" data-tab="general">GENERAL</button>',
   '<button class="ezi-tab" data-tab="performance">PERFORMANCE</button>',
   '<button class="ezi-tab" data-tab="interface">INTERFACE</button>',
   '<button class="ezi-tab" data-tab="userscripts">USERSCRIPTS</button>',
   '<button class="ezi-tab" data-tab="about">ABOUT</button>',
  '</div>',
  '<div class="ezi-pages">',
   '<div class="ezi-tab-page active" data-page="general">',
    '<div class="ezi-section">GENERAL</div>',
    '<div class="ezi-row"><div><b>MAX FPS Performance Mode</b><small>Aggressive renderer/UI cleanup for the highest practical FPS and steadier frame pacing.</small></div><label class="ezi-switch"><input id="ezi-perf" type="checkbox"><span></span></label></div>',
    '<div class="ezi-row"><div><b>FPS Monitor</b><small>Off by default. Only use when checking FPS.</small></div><label class="ezi-switch"><input id="ezi-fps" type="checkbox"><span></span></label></div>',
    '<div class="ezi-section">PLAYER COLOR CHANGER</div>',
    '<div class="ezi-row"><div><b>Head Color</b><small>Local player head color.</small></div><input id="ezi-player-head-color" type="color" value="#f2c29b" style="width:42px;height:25px;border:0;background:none;cursor:pointer"></div>',
    '<div class="ezi-row"><div><b>Body Color</b><small>Local player body color.</small></div><input id="ezi-player-body-color" type="color" value="#3b82f6" style="width:42px;height:25px;border:0;background:none;cursor:pointer"></div>',
    '<button id="ezi-apply-color" class="ezi-button">APPLY PLAYER COLOR</button><div class="ezi-note">Uses Kirka 64×64 skin atlas and the same head/body mask as Custom Skin Link.</div>',
    '<div class="ezi-row"><div><b>Profiler</b><small>Off by default. Diagnostic only.</small></div><label class="ezi-switch"><input id="ezi-prof" type="checkbox"><span></span></label></div>',
    '<button id="ezi-fullscreen" class="ezi-button">TOGGLE FULLSCREEN</button><button id="ezi-reload" class="ezi-button">RELOAD KIRKA</button><button id="ezi-devtools" class="ezi-button">DEVTOOLS</button>',
   '</div>',
   '<div class="ezi-tab-page" data-page="performance">',
    '<div class="ezi-section">PERFORMANCE</div>',
    '<div class="ezi-row"><div><b>Uncapped FPS</b><small>Uses Chromium startup flags. Changing this restarts the client.</small></div><label class="ezi-switch"><input id="ezi-uncap" type="checkbox"><span></span></label></div>',
    '<div class="ezi-note">If the game remains at 60 FPS, the display/compositor or game itself may still be limiting the presentation rate. The client flag is applied before Kirka starts.</div>',
   '</div>',
   '<div class="ezi-tab-page" data-page="interface">',
    '<div class="ezi-section">INTERFACE</div>',
    '<div class="ezi-row"><div><b>Hide Chat</b><small>Hides chat-related DOM elements.</small></div><label class="ezi-switch"><input id="ezi-chat" type="checkbox"><span></span></label></div>',
    '<div class="ezi-row"><div><b>Hide Interface</b><small>Hides optional Ezi-marked interface only.</small></div><label class="ezi-switch"><input id="ezi-interface" type="checkbox"><span></span></label></div>',
    '<div class="ezi-section">MENU THEME</div><div class="ezi-choice-grid">',
     '<button class="ezi-choice" data-theme="dark">DARK</button><button class="ezi-choice" data-theme="light">LIGHT</button><button class="ezi-choice" data-theme="ezi">EZI ORANGE</button><button class="ezi-choice" data-theme="glass">GLASS</button>',
    '</div>',
   '</div>',
   '<div class="ezi-tab-page" data-page="userscripts">',
    '<div class="ezi-section">USERSCRIPTS</div>',
    '<div class="ezi-row"><div><b>Run custom JS scripts</b><small>Loads .js files from your selected folder after Kirka loads.</small></div><label class="ezi-switch"><input id="ezi-userscripts" type="checkbox"><span></span></label></div>',
    '<button id="ezi-choose-folder" class="ezi-button">CHOOSE SCRIPT FOLDER</button><button id="ezi-open-folder" class="ezi-button">OPEN SCRIPT FOLDER</button><button id="ezi-reload-scripts" class="ezi-button">RELOAD SCRIPTS</button>',
    '<div id="ezi-folder" class="ezi-folder">Folder: loading...</div><div id="ezi-script-status" class="ezi-status">Scripts: loading...</div><div id="ezi-script-list" class="ezi-script-list"></div>',
    '<div class="ezi-note">Put your Dawn-style .js userscripts in this folder. Scripts with @match are only loaded on matching pages.</div>',
   '</div>',
   '<div class="ezi-tab-page" data-page="about">',
    '<div class="ezi-about"><img src="' + ${JSON.stringify(LOGO_DATA)} + '" alt="Ezi Client"><h2>EZI CLIENT V1.0.0</h2><p>Performance-focused Kirka client with lightweight UI, userscripts, themes and client shortcuts.</p><div class="ezi-note">Owner: IamEzi • Version: v1.0.0</div>',
    '<button id="ezi-discord" class="ezi-button">JOIN EZI DISCORD</button>',
    '<div class="ezi-shortcuts"><b>SHORTCUTS</b><br>Right Shift — Open / close menu<br>F5 — Reload Kirka<br>F12 — DevTools<br>Alt + P — FPS monitor<br>Alt + O — Profiler<br>Menu — Fixed position (not movable)</div>',
    '<div class="ezi-note">Badge note: V5 can add an Ezi badge to your own local profile UI, but it cannot reliably know which remote players run this client without a server-side protocol. No remote-player identification is faked.</div>',
    '</div>',
   '</div>',
  '</div>'
 ].join('');
 if (eziTrustedPolicy) {
    panel.innerHTML = eziTrustedPolicy.createHTML(eziMarkup);
} else {
    panel.innerHTML = eziMarkup;
}
 document.documentElement.appendChild(panel);

 const perf=$('ezi-perf'), fps=$('ezi-fps'), prof=$('ezi-prof'), uncap=$('ezi-uncap'), chat=$('ezi-chat'), inter=$('ezi-interface'), scripts=$('ezi-userscripts'), playerHeadColor=$('ezi-player-head-color'), playerBodyColor=$('ezi-player-body-color'), applyColorBtn=$('ezi-apply-color');
 if(perf) perf.checked=!!settings.performanceMode; if(fps) fps.checked=!!settings.fpsMonitor; if(playerHeadColor) playerHeadColor.value=/^#[0-9a-f]{6}$/i.test(settings.playerHeadColor)?settings.playerHeadColor:'#f2c29b'; if(playerBodyColor) playerBodyColor.value=/^#[0-9a-f]{6}$/i.test(settings.playerBodyColor)?settings.playerBodyColor:'#3b82f6'; if(prof) prof.checked=!!settings.profiler; if(uncap) uncap.checked=!!settings.uncappedFPS; if(chat) chat.checked=!!settings.hideChat; if(inter) inter.checked=!!settings.hideInterface; if(scripts) scripts.checked=settings.userscripts!==false;

 function apply(){
   safeClass('ezi-perf',settings.performanceMode); safeClass('ezi-hide-chat',settings.hideChat);
   const theme=['dark','light','ezi','glass'].includes(settings.menuTheme)?settings.menuTheme:'ezi'; panel.dataset.theme=theme;
   document.querySelectorAll('.ezi-choice').forEach(b=>b.classList.toggle('active',b.dataset.theme===theme));
   if(perf)perf.checked=!!settings.performanceMode;if(fps)fps.checked=!!settings.fpsMonitor;if(playerHeadColor)playerHeadColor.value=/^#[0-9a-f]{6}$/i.test(settings.playerHeadColor)?settings.playerHeadColor:'#f2c29b';if(playerBodyColor)playerBodyColor.value=/^#[0-9a-f]{6}$/i.test(settings.playerBodyColor)?settings.playerBodyColor:'#3b82f6';if(prof)prof.checked=!!settings.profiler;if(uncap)uncap.checked=!!settings.uncappedFPS;if(chat)chat.checked=!!settings.hideChat;if(inter)inter.checked=!!settings.hideInterface;if(scripts)scripts.checked=settings.userscripts!==false;
 }
 apply();

 document.querySelectorAll('.ezi-tab').forEach(t=>t.addEventListener('click',()=>{const n=t.dataset.tab;document.querySelectorAll('.ezi-tab').forEach(x=>x.classList.toggle('active',x===t));document.querySelectorAll('.ezi-tab-page').forEach(p=>p.classList.toggle('active',p.dataset.page===n));}));
 if(perf) perf.addEventListener('change',e=>{settings.performanceMode=e.target.checked;save();apply();});
 if(fps) fps.addEventListener('change',e=>{settings.fpsMonitor=e.target.checked;save();applyFPS();});
 if(prof) prof.addEventListener('change',e=>{settings.profiler=e.target.checked;save();applyProfiler();});
 if(playerHeadColor) playerHeadColor.addEventListener('input',e=>{const v=e.target.value;if(/^#[0-9a-f]{6}$/i.test(v)){settings.playerHeadColor=v.toLowerCase();save();}});
 if(playerBodyColor) playerBodyColor.addEventListener('input',e=>{const v=e.target.value;if(/^#[0-9a-f]{6}$/i.test(v)){settings.playerBodyColor=v.toLowerCase();save();}});
 if(applyColorBtn) applyColorBtn.addEventListener('click',()=>{if(applyPlayerColors(settings.playerHeadColor,settings.playerBodyColor)){window.setTimeout(()=>location.reload(),120);}});
 if(chat) chat.addEventListener('change',e=>{settings.hideChat=e.target.checked;save();apply();});
 if(inter) inter.addEventListener('change',e=>{settings.hideInterface=e.target.checked;save();});
 if(scripts) scripts.addEventListener('change',e=>{settings.userscripts=e.target.checked;save();window.open('https://ezi-client.local/reload-userscripts','_self');});
 if(uncap) uncap.addEventListener('change',e=>{settings.uncappedFPS=e.target.checked;save();window.open('https://ezi-client.local/set-uncapped?enabled='+(settings.uncappedFPS?'1':'0'),'_self');});
 document.querySelectorAll('.ezi-choice').forEach(b=>b.addEventListener('click',()=>{settings.menuTheme=b.dataset.theme;save();apply();}));
 const nav=id=>window.open('https://ezi-client.local/'+id,'_self');
 if($('ezi-fullscreen')) $('ezi-fullscreen').onclick=()=>nav('fullscreen'); if($('ezi-reload')) $('ezi-reload').onclick=()=>nav('reload'); if($('ezi-devtools')) $('ezi-devtools').onclick=()=>nav('devtools');
 if($('ezi-choose-folder')) $('ezi-choose-folder').onclick=()=>nav('set-userscript-folder'); if($('ezi-open-folder')) $('ezi-open-folder').onclick=()=>nav('open-userscript-folder'); if($('ezi-reload-scripts')) $('ezi-reload-scripts').onclick=()=>nav('reload-userscripts'); if($('ezi-discord')) $('ezi-discord').onclick=()=>nav('discord');

 // Menu is intentionally fixed and not movable.
 function hexToRgbLocal(hex){
   const n=parseInt(String(hex).slice(1),16);
   return {r:(n>>16)&255,g:(n>>8)&255,b:n&255};
 }
 const EZI_BASE_SKIN = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAAXNSR0IArs4c6QAAANJJREFUeF7t2EEKBDEIBdF4/0M7MAeIi0HmQ15v022LaJWkTp8+l6frenz79HtWXeM7//x/KYAOMAIY8E8ITYTchjAIPm+BPv2b6KceDj8vBdABRgADwjm1mh4IPm+BaRFa7b+A4OMqHJDjagoKYASGG6HV/gsIbgSMgBG4X4oGjOlqChiAARiAAW9fiGAABmAABqyuWuHBbYIswAIswALhoF5NjwVYgAVYgAVWMRsenAVYgAVYgAXCQb2aHguwAAuwAAusYjY8OAuwAAuwwNMW+AByY7e5Jy8jiwAAAABJRU5ErkJggg==";

 // Player colors use the same working mechanism as Custom Skin Link.
 // The game exposes the actual skin texture through an object containing
 // map.image; replacing that image is more reliable than watching DOM <img>.
 let eziPlayerColorUrl = '';
 let eziPlayerColorHookInstalled = false;

 function installPlayerColorHook(){
   if(eziPlayerColorHookInstalled) return;
   const originalArrayIsArray = Array.isArray;

   Array.isArray = function(...args){
     try{
       const value = args[0];
       const image = value && value.map && value.map.image;
       if(
         eziPlayerColorUrl &&
         image &&
         image.width === 64 &&
         image.height === 64 &&
         image.src !== eziPlayerColorUrl &&
         !String(image.src || '').includes('shooting-fire')
       ){
         image.src = eziPlayerColorUrl;
       }
     }catch(_){
     }
     return originalArrayIsArray(...args);
   };

   eziPlayerColorHookInstalled = true;
   window.__EZI_PLAYER_COLOR_ARRAY_HOOK__ = true;
 }

 function buildPlayerSkinData(head, body, done){
   try{
     const img = new Image();
     img.onload = () => {
       try{
         if(img.naturalWidth !== 64 || img.naturalHeight !== 64){
           done(null);
           return;
         }

         const canvas = document.createElement('canvas');
         canvas.width = 64;
         canvas.height = 64;
         const ctx = canvas.getContext('2d', {willReadFrequently:true});
         if(!ctx){ done(null); return; }

         ctx.clearRect(0,0,64,64);
         ctx.drawImage(img,0,0,64,64);

         const imageData = ctx.getImageData(0,0,64,64);
         const pixels = imageData.data;
         const headRgb = hexToRgbLocal(head);
         const bodyRgb = hexToRgbLocal(body);

         // Exact Custom Skin Link mask:
         // green channel == 255 => BODY, otherwise => HEAD.
         for(let i=0;i<pixels.length;i+=4){
           if(pixels[i+3] === 0) continue;
           if(pixels[i+1] === 255){
             pixels[i]=bodyRgb.r;
             pixels[i+1]=bodyRgb.g;
             pixels[i+2]=bodyRgb.b;
           }else{
             pixels[i]=headRgb.r;
             pixels[i+1]=headRgb.g;
             pixels[i+2]=headRgb.b;
           }
         }

         ctx.putImageData(imageData,0,0);
         done(canvas.toDataURL('image/png'));
       }catch(e){
         console.warn('[Ezi] player color texture build failed:',e);
         done(null);
       }
     };
     img.onerror = () => done(null);
     img.src = EZI_BASE_SKIN;
   }catch(e){
     console.warn('[Ezi] player color setup failed:',e);
     done(null);
   }
 }

 function applyPlayerColors(head, body){
   if(!/^#[0-9a-f]{6}$/i.test(head)||!/^#[0-9a-f]{6}$/i.test(body)) return false;

   settings.playerHeadColor=head.toLowerCase();
   settings.playerBodyColor=body.toLowerCase();
   save();

   try{
     localStorage.setItem('ezi-player-head-color',settings.playerHeadColor);
     localStorage.setItem('ezi-player-body-color',settings.playerBodyColor);
   }catch(_){
   }

   // Hook the actual Kirka skin-loader path, not DOM image elements.
   installPlayerColorHook();

   buildPlayerSkinData(
     settings.playerHeadColor,
     settings.playerBodyColor,
     dataUrl => {
       if(dataUrl){
         eziPlayerColorUrl=dataUrl;
         window.__EZI_PLAYER_COLOR_URL__=dataUrl;
         window.__EZI_PLAYER_HEAD_COLOR__=settings.playerHeadColor;
         window.__EZI_PLAYER_BODY_COLOR__=settings.playerBodyColor;
       }
     }
   );

   return true;
 }

 applyPlayerColors(settings.playerHeadColor,settings.playerBodyColor);


 let hud=null, raf=0, last=0, frames=0;
 function applyFPS(){
   if(settings.fpsMonitor){ if(!hud){hud=document.createElement('div');hud.id='ezi-performance-monitor';document.documentElement.appendChild(hud);} if(!raf){last=window.performance.now();frames=0;raf=requestAnimationFrame(tick);} }
   else {if(raf){cancelAnimationFrame(raf);raf=0;} if(hud){hud.remove();hud=null;}}
 }
 function tick(now){if(!settings.fpsMonitor){raf=0;return;}frames++;if(now-last>=500){hud.textContent='FPS '+Math.round(frames*1000/(now-last));frames=0;last=now;}raf=requestAnimationFrame(tick);}
 let profiler=null, profilerTimer=0, profLast=0, profFrames=0, profWorst=0;
 function updateProfiler(){
   if(!profiler)return;
   const now=window.performance.now(); const dt=profLast?now-profLast:0; profLast=now;
   if(dt>0&&dt<1000){profFrames++;if(dt>profWorst)profWorst=dt;}
   const mem=(window.performance.memory&&window.performance.memory.usedJSHeapSize)?(' • JS '+(window.performance.memory.usedJSHeapSize/1048576).toFixed(1)+' MB'):'';
   profiler.textContent='PROFILER • frame '+(dt?dt.toFixed(1):'--')+' ms • worst '+(profWorst?profWorst.toFixed(1):'--')+' ms • samples '+profFrames+mem;
 }
 function applyProfiler(){
   if(settings.profiler){
     if(!profiler){profiler=document.createElement('div');profiler.id='ezi-profiler-panel';document.documentElement.appendChild(profiler);}
     updateProfiler();
     if(!profilerTimer) profilerTimer=window.setInterval(updateProfiler,500);
   } else {
     if(profilerTimer){clearInterval(profilerTimer);profilerTimer=0;}
     if(profiler){profiler.remove();profiler=null;}
   }
 }
 applyFPS(); applyProfiler();

 function toggle(){panel.style.display=panel.style.display==='none'?'block':'none';}
 document.addEventListener('keydown',e=>{if(e.key==='F5'||e.key==='F12')return;if(e.key==='Shift'&&e.location===2){e.preventDefault();toggle();}else if(e.altKey&&e.key.toLowerCase()==='p'){e.preventDefault();settings.fpsMonitor=!settings.fpsMonitor;save();applyFPS();if(fps)fps.checked=settings.fpsMonitor;}else if(e.altKey&&e.key.toLowerCase()==='o'){e.preventDefault();settings.profiler=!settings.profiler;save();applyProfiler();if(prof)prof.checked=settings.profiler;}} ,true);

 window.__EZI_BADGE_LOCAL__=true;
 console.log('[Ezi] V1.0.0 renderer ready');
 return 'ok';
} catch(e){console.error('[Ezi] V1.0.0 renderer fatal:',e);return 'fatal:'+(e&&e.message?e.message:e);}
})()
`;

function safeExecute(win, code) {
    if (!win || win.isDestroyed()) return Promise.resolve(null);
    return win.webContents.executeJavaScript(code, true).catch(e => { console.log('Ezi renderer error:', e.message); return null; });
}

async function injectUserscript(win, file) {
    const full = path.join(userscriptFolder(), file);
    let source;
    try { source = fs.readFileSync(full, 'utf8'); } catch (e) { console.log('Userscript read error:', file, e.message); return false; }
    const header = (source.match(/==UserScript==([\s\S]*?)==\/UserScript==/i) || [,''])[1];
    const name = ((header.match(/@name\s+(.+)/i)||[])[1] || file).trim();
    const matches = Array.from(header.matchAll(/@match\s+(.+)/gi)).map(m=>m[1].trim());
    const url = win.webContents.getURL();
    if(matches.length && !matches.some(m=>pageMatches(url,m))) return false;
    const src=JSON.stringify(source), nm=JSON.stringify(name);
    const code=`(()=>{try{window.__EZI_LOADED_USERSCRIPTS__=window.__EZI_LOADED_USERSCRIPTS__||{};if(window.__EZI_LOADED_USERSCRIPTS__[${nm}])return'already';window.__EZI_LOADED_USERSCRIPTS__[${nm}]=true;window.GM_addStyle=window.GM_addStyle||function(c){const s=document.createElement('style');s.textContent=String(c||'');(document.head||document.documentElement).appendChild(s);return s};window.GM_getValue=window.GM_getValue||function(k,d){try{const x=JSON.parse(localStorage.getItem('ezi-gm-storage')||'{}');return Object.prototype.hasOwnProperty.call(x,k)?x[k]:d}catch(_){return d}};window.GM_setValue=window.GM_setValue||function(k,v){try{const x=JSON.parse(localStorage.getItem('ezi-gm-storage')||'{}');x[k]=v;localStorage.setItem('ezi-gm-storage',JSON.stringify(x))}catch(_){}};window.GM_deleteValue=window.GM_deleteValue||function(k){try{const x=JSON.parse(localStorage.getItem('ezi-gm-storage')||'{}');delete x[k];localStorage.setItem('ezi-gm-storage',JSON.stringify(x))}catch(_){}};window.unsafeWindow=window.unsafeWindow||window;new Function(${src}).call(window);return'loaded'}catch(e){console.error('[Ezi Userscript] '+${nm}+' failed:',e);return'error:'+(e&&e.message?e.message:e)}})()`;
    const result=await safeExecute(win,code);
    if(result==='loaded') console.log('Userscript loaded:',name); else if(result && result!=='already') console.log('Userscript error:',file,result);
    return result==='loaded'||result==='already';
}
async function loadUserscripts(win) {
    const s=readSettings(); const enabled=s.userscripts!==false; const info=listUserscripts();
    const folderLiteral=JSON.stringify(info.folder), names=JSON.stringify(info.files);
    const listLiteral = JSON.stringify(info.files.map(x => String(x)));
    await safeExecute(win,`(()=>{try{const f=document.getElementById('ezi-folder'),s=document.getElementById('ezi-script-status'),l=document.getElementById('ezi-script-list');if(f)f.textContent='Folder: '+${folderLiteral};if(s)s.textContent='Scripts: '+${info.files.length}+' file(s)'+(${enabled}?'':' • DISABLED');if(l){while(l.firstChild)l.removeChild(l.firstChild);for(const name of ${listLiteral}){const item=document.createElement('div');item.className='ezi-script-item';item.textContent=name;l.appendChild(item);}}return'ok';}catch(e){console.error('[Ezi] userscript list UI error:',e);return'error';}})()`);
    if(!enabled)return;
    for(const file of info.files) await injectUserscript(win,file);
}

async function handleInternal(win,url){
    if(!url.startsWith('https://ezi-client.local/')) return false;
    const u=new URL(url), cmd=u.pathname;
    if(cmd==='/fullscreen'){win.setFullScreen(!win.isFullScreen());return true;}
    if(cmd==='/reload'){win.webContents.reload();return true;}
    if(cmd==='/devtools'){win.webContents.toggleDevTools();return true;}
    if(cmd==='/discord'){shell.openExternal('https://discord.gg/BSkXMsK2aZ');return true;}
    if(cmd==='/open-userscript-folder'){await shell.openPath(userscriptFolder());return true;}
    if(cmd==='/reload-userscripts'){await loadUserscripts(win);return true;}
    if(cmd==='/set-userscript-folder'){
        const r=await dialog.showOpenDialog(win,{title:'Choose Ezi Client Userscript Folder',properties:['openDirectory','createDirectory']});
        if(!r.canceled&&r.filePaths&&r.filePaths[0]){const s=readSettings();s.userscriptFolder=r.filePaths[0];writeSettings(s);await loadUserscripts(win);}return true;
    }
    if(cmd==='/set-uncapped'){
        const enabled=u.searchParams.get('enabled')==='1'; const s=readSettings();s.uncappedFPS=enabled;writeSettings(s);app.relaunch();app.exit(0);return true;
    }
    return true;
}
app.on('render-process-gone',(event,webContents,details)=>{
    console.log('Ezi render-process-gone:', JSON.stringify(details));
});
app.on('child-process-gone',(event,details)=>{
    console.log('Ezi child-process-gone:', JSON.stringify(details));
});

let authWindow=null;
let authClosing=false;

function createAuthWindow(startUrl){
    if(!mainWindow || mainWindow.isDestroyed()) return;
    if(authWindow && !authWindow.isDestroyed()){
        try{authWindow.focus();}catch(_){}
        try{authWindow.loadURL(startUrl);}catch(_){}
        return;
    }

    console.log('[Ezi] opening dedicated auth window:', startUrl);
    authWindow=new BrowserWindow({
        width:520,height:760,minWidth:420,minHeight:600,
        parent:mainWindow,modal:false,show:false,autoHideMenuBar:true,
        backgroundColor:'#ffffff',
        webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:false,devTools:false,backgroundThrottling:false}
    });

    const isAuthHost=(url)=>{
        try{
            const u=new URL(url);
            const h=u.hostname.toLowerCase();
            return h==='accounts.google.com'||h.endsWith('.google.com')||h.endsWith('.googleusercontent.com')||
                   h.endsWith('.firebaseapp.com')||h.endsWith('.web.app')||h==='login.xsolla.com'||
                   h==='kirka.io'||h.endsWith('.kirka.io');
        }catch(_){return false;}
    };
    const isKirkaCallback=(url)=>{
        try{ const u=new URL(url); return (u.hostname==='kirka.io'||u.hostname.endsWith('.kirka.io')) && u.pathname.toLowerCase().startsWith('/auth'); }
        catch(_){ return false; }
    };

    authWindow.webContents.on('will-navigate',(event,url)=>{
        console.log('[Ezi][AUTH] will-navigate:',url);
        if(!isAuthHost(url)){
            event.preventDefault();
            shell.openExternal(url).catch(()=>{});
        }
    });
    authWindow.webContents.on('did-navigate',(event,url)=>{
        console.log('[Ezi][AUTH] did-navigate:',url);
    });
    authWindow.webContents.on('did-finish-load',()=>{
        const url=authWindow && !authWindow.isDestroyed() ? authWindow.webContents.getURL() : '';
        console.log('[Ezi][AUTH] did-finish-load:',url);
        if(isKirkaCallback(url)){
            console.log('[Ezi][AUTH] callback reached, closing auth window and refreshing main Kirka page');
            setTimeout(()=>{
                if(!authWindow || authWindow.isDestroyed()) return;
                authClosing=true;
                try{authWindow.close();}catch(_){}
            },300);
            setTimeout(()=>{
                if(mainWindow && !mainWindow.isDestroyed()){
                    try{mainWindow.loadURL('https://kirka.io/').catch(()=>{});}catch(_){}
                }
            },500);
        }
    });
    authWindow.webContents.setWindowOpenHandler(({url})=>{
        console.log('[Ezi][AUTH] window.open:',url);
        if(isAuthHost(url)){
            createAuthWindow(url);
            return {action:'deny'};
        }
        shell.openExternal(url).catch(()=>{});
        return {action:'deny'};
    });
    authWindow.on('closed',()=>{
        console.log('[Ezi][AUTH] auth window closed');
        authWindow=null;
        authClosing=false;
    });
    authWindow.once('ready-to-show',()=>{
        console.log('[Ezi][AUTH] ready-to-show');
        try{authWindow.show();authWindow.focus();}catch(_){}
    });
    authWindow.loadURL(startUrl).catch(e=>console.log('[Ezi][AUTH] load error:',e.message));
}

function isAuthenticationURL(url){
    try{
        const u=new URL(url);
        const h=u.hostname.toLowerCase();
        const p=u.pathname.toLowerCase();
        if(h==='accounts.google.com'||h.endsWith('.google.com')) return true;
        if(h==='login.xsolla.com') return true;
        if(h.endsWith('.firebaseapp.com')||h.endsWith('.web.app')) return true;
        if((h==='kirka.io'||h.endsWith('.kirka.io')) && p.startsWith('/auth')) return true;
        return false;
    }catch(_){return false;}
}

function createWindow(){
    console.log('[Ezi] createWindow');
    const win=new BrowserWindow({width:1360,height:768,minWidth:800,minHeight:600,backgroundColor:'#000000',show:false,fullscreen:true,autoHideMenuBar:true,icon:path.join(__dirname,'logo.ico'),
        webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,backgroundThrottling:false,spellcheck:false,devTools:true}});
    mainWindow=win;
    try { win.webContents.setBackgroundThrottling(false); } catch (_) {}
    try{
        const ua=win.webContents.getUserAgent()
            .replace(/\sElectron\/[^\s]+/i,'')
            .replace(/\sHeadlessChrome\/[^\s]+/i,'');
        win.webContents.setUserAgent(ua);
    }catch(_){ }
    win.webContents.setWindowOpenHandler(({url})=>{
        if(url.startsWith('https://ezi-client.local/')){handleInternal(win,url).catch(e=>console.log('Internal:',e.message));return{action:'deny'}}

        // Google/Firebase authentication needs a real browser-style popup.
        // The old sandboxed override could crash/close during OAuth on some
        // Chromium/Electron builds. Keep auth isolated but remove the renderer
        // sandbox only for this short-lived login window.
        if(isAuthenticationURL(url)){
            createAuthWindow(url);
            return {action:'deny'};
        }

        shell.openExternal(url).catch(()=>{}); return {action:'deny'};
    });
    const isKirkaPage=(url)=>{
        try{
            const u=new URL(url);
            return (u.protocol==='https:' && (u.hostname==='kirka.io' || u.hostname.endsWith('.kirka.io')));
        }catch(_){return false;}
    };
    const isKirkaAuthCallback=(url)=>{
        try{
            const u=new URL(url);
            return isKirkaPage(url) && u.pathname.toLowerCase().startsWith('/auth');
        }catch(_){return false;}
    };

    win.webContents.on('will-navigate',(event,url)=>{
        console.log('[Ezi] will-navigate:',url);
        if(url.startsWith('https://ezi-client.local/')){
            event.preventDefault();
            handleInternal(win,url).catch(e=>console.log('Internal:',e.message));
            return;
        }
        // IMPORTANT: Google/Xsolla/Firebase OAuth sometimes navigates the MAIN
        // Kirka window instead of using window.open(). Never let that happen.
        // Route the whole auth flow into a dedicated child window so the main
        // Ezi window cannot be closed by the callback page.
        if(isAuthenticationURL(url)){
            event.preventDefault();
            createAuthWindow(url);
            return;
        }
    });
    win.webContents.on('did-navigate',(event,url)=>{
        console.log('[Ezi] did-navigate:',url);
    });
    console.log('[Ezi] loading Kirka');
    win.loadURL('https://kirka.io/').catch(e=>console.log('Kirka load error:',e.message));
    win.webContents.on('did-finish-load',async()=>{
        const url=win.webContents.getURL();
        console.log('[Ezi] did-finish-load:',url);

        // IMPORTANT: Never inject Ezi UI, player hooks, or userscripts into
        // Google/Xsolla/Firebase authentication pages. Those pages belong to
        // the auth flow and modifying their JavaScript can break OAuth or cause
        // the auth page to close the main window after the callback.
        if(!isKirkaPage(url) || isKirkaAuthCallback(url)){
            console.log('[Ezi] auth/non-Kirka page: no Ezi renderer/userscript injection');
            return;
        }

        try{await win.webContents.insertCSS(CSS,{cssOrigin:'user'});}catch(e){console.log('Ezi CSS error:',e.message)}
        const result=await safeExecute(win,RENDERER); if(result)console.log('Ezi renderer result:',result);
        await loadUserscripts(win);
    });
    win.webContents.on('before-input-event',(event,input)=>{if(input.type==='keyDown'&&input.key==='F12'){win.webContents.toggleDevTools();event.preventDefault();}else if(input.type==='keyDown'&&input.key==='F5'){win.webContents.reload();event.preventDefault();}});
    win.webContents.on('render-process-gone',(event,details)=>console.log('Ezi window render-process-gone:',JSON.stringify(details)));
    win.webContents.on('gpu-crashed',()=>console.log('Ezi GPU crashed'));
    win.webContents.on('unresponsive',()=>console.log('Ezi renderer became unresponsive'));
    win.webContents.on('responsive',()=>console.log('Ezi renderer responsive again'));
    win.on('close',(event)=>{
        console.log('[Ezi] MAIN WINDOW CLOSE REQUESTED. quitting=',app.isQuiting===true,'url=',win.webContents.getURL());
    });
    win.on('closed',()=>{
        console.log('[Ezi] MAIN WINDOW CLOSED');
        if(authWindow && !authWindow.isDestroyed()){ try{authWindow.close();}catch(_){} }
        authWindow=null;
    });
    win.once('ready-to-show',()=>{console.log('[Ezi] ready-to-show');win.show();});
    return win;
}
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-component-update');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');

app.whenReady().then(()=>{console.log('[Ezi] app ready');defaultUserscriptFolder();createWindow();app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createWindow();});});
app.on('before-quit',()=>{app.isQuiting=true;});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
