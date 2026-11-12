/**
 * bot-workbench — Client half.
 *
 * Registers a "监控室" entry in the Bot mode Channel sidebar. The panel is a
 * read-only 2.5D desk view over the Host snapshot plus Tobs' own live
 * botPresentation service. No model calls, no writes.
 */
window.__ModuleLoader__.load({
  id: 'bot-workbench',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    let ReactDOM = null;
    try {
      ReactDOM = require('react-dom');
    } catch {
      ReactDOM = null;
    }

    const CSS = `
.bw-panel { position: relative; height: 100%; overflow: auto; padding: 14px; box-sizing: border-box;
  color: var(--dsw-alias-label-primary, #e8edf5); font-size: 12px; line-height: 1.45;
  background:
    radial-gradient(120% 60% at 20% 0%, rgba(94,231,196,.07), transparent 55%),
    radial-gradient(100% 55% at 100% 0%, rgba(96,165,250,.06), transparent 55%);
}
.bw-panel * { box-sizing: border-box; }
.bw-top { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; row-gap: 6px; margin: 0 2px 10px; padding: 4px 0 8px;
  position: sticky; top: 0; z-index: 3;
  background: linear-gradient(180deg, rgba(10,15,22,.96), rgba(10,15,22,.72) 72%, transparent);
  backdrop-filter: blur(8px);
}
.bw-title { font-size: 15px; font-weight: 700; letter-spacing: .4px; }
.bw-live { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; color: var(--dsw-alias-label-tertiary, #8793a5); }
.bw-live i { width: 6px; height: 6px; border-radius: 50%; background: #46d6a8; box-shadow: 0 0 0 3px rgba(70,214,168,.12);
  animation: bw-dot 2s ease-in-out infinite; }
@keyframes bw-dot { 50% { box-shadow: 0 0 0 6px rgba(70,214,168,.04); opacity: .6; } }
.bw-spacer { flex: 1; }
.bw-refresh { font: inherit; font-size: 10.5px; color: var(--dsw-alias-label-tertiary, #8793a5); background: none; border: 0; cursor: pointer; padding: 2px 4px; }
.bw-refresh:hover { color: var(--dsw-alias-label-primary, #e8edf5); }

.bw-stats { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 2px 10px; }
.bw-chip { display: inline-flex; align-items: center; gap: 5px; padding: 3px 8px; border-radius: 999px;
  border: 1px solid var(--dsw-alias-border-l1, rgba(255,255,255,.09));
  background: color-mix(in srgb, var(--dsw-alias-bg-layer-1, #141c26) 70%, transparent);
  color: var(--dsw-alias-label-secondary, #b6c1d1); font-size: 10.5px; }
.bw-chip b { color: var(--dsw-alias-label-primary, #e8edf5); font-weight: 650; }

.bw-stage { position: relative; padding: 16px 12px 20px; border-radius: 18px; overflow: hidden;
  border: 1px solid var(--dsw-alias-border-l1, rgba(255,255,255,.08));
  background:
    radial-gradient(80% 60% at 50% 0%, rgba(255,255,255,.05), transparent 60%),
    linear-gradient(180deg, rgba(255,255,255,.03), transparent 45%);
}
.bw-stage::after { content: ''; position: absolute; left: -18%; right: -18%; bottom: -46%; height: 82%;
  background-image:
    linear-gradient(rgba(94,231,196,.10) 1px, transparent 1px),
    linear-gradient(90deg, rgba(94,231,196,.10) 1px, transparent 1px);
  background-size: 26px 26px;
  transform: perspective(240px) rotateX(60deg); transform-origin: top center;
  opacity: .55; pointer-events: none;
}
.bw-grid { position: relative; z-index: 1; display: grid; gap: 10px; grid-template-columns: repeat(auto-fill, minmax(162px, 1fr)); }

.bw-card { position: relative; z-index: 1; display: flex; flex-direction: column; gap: 8px; min-width: 0;
  padding: 14px 13px 11px; border-radius: 18px; text-align: left; font: inherit; color: inherit; cursor: pointer;
  border: 1px solid color-mix(in srgb, var(--st, #5ee7c4) 22%, var(--dsw-alias-border-l1, rgba(255,255,255,.08)));
  background:
    radial-gradient(120% 80% at 12% 0%, color-mix(in srgb, var(--st, #5ee7c4) 16%, transparent), transparent 58%),
    linear-gradient(158deg, #18222f 0%, #101923 55%, #0c131b 100%);
  box-shadow: 0 18px 38px -28px rgba(0,0,0,.95), inset 0 1px 0 rgba(255,255,255,.06);
  transition: transform .2s ease, border-color .2s ease, box-shadow .2s ease;
  overflow: hidden;
}
.bw-card::before { content: ''; position: absolute; left: 0; top: 16px; bottom: 16px; width: 3px;
  border-radius: 3px; background: var(--st, #5ee7c4); opacity: .8; box-shadow: 0 0 14px var(--st, #5ee7c4); }
.bw-card:hover { transform: translateY(-3px); border-color: color-mix(in srgb, var(--st, #5ee7c4) 55%, transparent);
  box-shadow: 0 24px 44px -26px rgba(0,0,0,.95), 0 0 0 1px color-mix(in srgb, var(--st, #5ee7c4) 22%, transparent),
    0 0 30px -12px color-mix(in srgb, var(--st, #5ee7c4) 45%, transparent);
}
.bw-card:focus-visible { outline: 2px solid var(--st, #5ee7c4); outline-offset: 2px; }
.bw-card[data-open="1"] { grid-column: 1 / -1; cursor: default; }
.bw-card-expand { display: flex; flex-direction: column; gap: 8px; margin-top: 2px; padding-top: 10px;
  border-top: 1px solid color-mix(in srgb, var(--st, #5ee7c4) 20%, rgba(255,255,255,.08));
  animation: bw-expand 220ms ease both; }
@keyframes bw-expand { from { opacity: 0; transform: translateY(-5px); } }
.bw-expand-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }
.bw-expand-grid > div { padding: 7px 8px; border-radius: 9px; background: rgba(255,255,255,.03);
  border: 1px solid rgba(255,255,255,.06); min-width: 0; }
.bw-expand-grid b { display: block; font: 650 11px/1.3 ui-monospace, monospace; color: var(--dsw-alias-label-primary, #e8edf5);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bw-expand-grid span { font-size: 8.5px; color: var(--dsw-alias-label-tertiary, #8793a5); }
.bw-expand-task { padding: 9px 10px; border-radius: 10px; background: rgba(255,255,255,.03);
  border: 1px solid rgba(255,255,255,.06); }
.bw-expand-task-title { font-size: 11px; line-height: 1.5; color: var(--dsw-alias-label-primary, #e8edf5); margin-bottom: 5px; }
.bw-expand-actions { display: flex; flex-wrap: wrap; gap: 6px; }
@media (max-width: 620px) { .bw-expand-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.bw-card[data-state="working"] .bw-avatar { animation: bw-bob 2.6s ease-in-out infinite; }
.bw-card[data-state="thinking"] .bw-avatar { animation: bw-pulse 1.9s ease-in-out infinite; }
.bw-card[data-state="waiting"] .bw-avatar { animation: bw-wait 2.2s ease-in-out infinite; }
@keyframes bw-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
@keyframes bw-pulse { 0%,100% { filter: drop-shadow(0 0 0 rgba(167,139,250,0)); } 50% { filter: drop-shadow(0 0 9px rgba(167,139,250,.6)); } }
@keyframes bw-wait { 0%,100% { transform: rotate(0); } 30% { transform: rotate(-2deg); } 60% { transform: rotate(2deg); } }

.bw-row { display: flex; align-items: center; gap: 10px; min-width: 0; }
.bw-avatar { position: relative; width: 56px; height: 56px; flex: 0 0 56px; border-radius: 50%; padding: 2.5px;
  background: conic-gradient(var(--st, #5ee7c4) 0 74%, rgba(255,255,255,.10) 74% 100%);
  box-shadow: 0 0 22px -6px color-mix(in srgb, var(--st, #5ee7c4) 65%, transparent), inset 0 0 0 1px rgba(0,0,0,.4);
}
.bw-avatar img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; display: block; background: #0c121a; }
.bw-initial { position: absolute; inset: 2.5px; display: none; align-items: center; justify-content: center;
  border-radius: 50%; background: #0c121a; font-size: 20px; font-weight: 700; color: var(--st, #5ee7c4); }
.bw-avatar[data-empty="1"] .bw-initial { display: flex; }
.bw-dot { position: absolute; right: -1px; bottom: -1px; width: 13px; height: 13px; border-radius: 50%;
  background: var(--st, #5ee7c4); border: 2.5px solid #0d1219; box-shadow: 0 0 10px var(--st, #5ee7c4); }
.bw-id { min-width: 0; flex: 1; padding-right: 42px; }
.bw-name { font-size: 14px; font-weight: 700; letter-spacing: .2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bw-sub { font-size: 10.5px; color: color-mix(in srgb, var(--st, #5ee7c4) 42%, #8793a5); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }
.bw-state { position: absolute; top: 10px; right: 10px; font-size: 9px; padding: 2px 7px; border-radius: 999px;
  color: var(--st, #5ee7c4); border: 1px solid color-mix(in srgb, var(--st, #5ee7c4) 38%, transparent);
  background: color-mix(in srgb, var(--st, #5ee7c4) 12%, rgba(8,13,20,.5)); backdrop-filter: blur(8px); }
.bw-act { font-size: 11px; line-height: 1.5; color: var(--dsw-alias-label-secondary, #b6c1d1);
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; min-height: 33px; }
.bw-foot { display: flex; align-items: center; gap: 6px; font-size: 9.5px; color: var(--dsw-alias-label-tertiary, #8793a5);
  padding-top: 2px; border-top: 1px solid rgba(255,255,255,.05); margin-top: 1px; }
.bw-att { margin-left: auto; padding: 0 6px; border-radius: 999px; background: rgba(251,191,36,.14);
  color: #f6c453; border: 1px solid rgba(251,191,36,.28); }

.bw-section { margin: 14px 2px 6px; display: flex; align-items: baseline; gap: 8px; }
.bw-section h3 { margin: 0; font-size: 11px; font-weight: 650; letter-spacing: .6px; text-transform: uppercase;
  color: var(--dsw-alias-label-tertiary, #8793a5); }
.bw-feed { display: flex; flex-direction: column; gap: 2px; }
.bw-item { display: flex; gap: 8px; padding: 7px 6px; border-radius: 9px; align-items: flex-start; }
.bw-item:hover { background: rgba(255,255,255,.035); }
.bw-mini { width: 22px; height: 22px; flex: 0 0 22px; border-radius: 50%; object-fit: cover; background: #0c121a; margin-top: 1px; }
.bw-mini-fallback { width: 22px; height: 22px; flex: 0 0 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  background: rgba(255,255,255,.06); color: var(--dsw-alias-label-secondary, #b6c1d1); font-size: 10px; font-weight: 700; margin-top: 1px; }
.bw-item-main { min-width: 0; flex: 1; }
.bw-item-top { display: flex; align-items: baseline; gap: 6px; }
.bw-item-name { font-size: 10.5px; font-weight: 600; white-space: nowrap; }
.bw-item-time { margin-left: auto; font-size: 9px; color: var(--dsw-alias-label-tertiary, #8793a5); white-space: nowrap; }
.bw-item-text { font-size: 10.5px; color: var(--dsw-alias-label-secondary, #b6c1d1);
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

.bw-empty { padding: 26px 14px; text-align: center; color: var(--dsw-alias-label-tertiary, #8793a5);
  border: 1px dashed var(--dsw-alias-border-l1, rgba(255,255,255,.12)); border-radius: 14px; }
.bw-error { padding: 10px 12px; margin-bottom: 10px; border-radius: 10px; font-size: 10.5px;
  color: #fca5a5; background: rgba(239,68,68,.10); border: 1px solid rgba(239,68,68,.22); }
.bw-skel { height: 90px; border-radius: 14px; background: linear-gradient(100deg, rgba(255,255,255,.04) 20%, rgba(255,255,255,.08) 40%, rgba(255,255,255,.04) 60%);
  background-size: 220% 100%; animation: bw-shimmer 1.6s linear infinite; }
@keyframes bw-shimmer { to { background-position: -220% 0; } }

.bw-drawer { position: absolute; inset: 0; z-index: 10; overflow: auto; padding: 14px;
  background: color-mix(in srgb, var(--dsw-alias-bg-overlay, #10161f) 96%, transparent);
  backdrop-filter: blur(10px); }
.bw-detail { padding: 16px; background:
  radial-gradient(120% 50% at 50% 0%, color-mix(in srgb, var(--st, #5ee7c4) 12%, transparent), transparent 55%),
  linear-gradient(180deg, #0b1119, #0a0f16); }
.bw-detail-hero { display: flex; align-items: center; gap: 12px; padding: 13px; margin-bottom: 12px;
  border-radius: 16px; border: 1px solid color-mix(in srgb, var(--st, #5ee7c4) 28%, rgba(255,255,255,.08));
  background: linear-gradient(130deg, color-mix(in srgb, var(--st, #5ee7c4) 12%, #121b26), #0d141d);
  box-shadow: 0 18px 40px -30px rgba(0,0,0,.95); position: relative; overflow: hidden; }
.bw-detail-hero::after { content: ''; position: absolute; right: -30px; top: -40px; width: 140px; height: 140px;
  border-radius: 50%; background: var(--st, #5ee7c4); opacity: .10; filter: blur(18px); pointer-events: none; }
.bw-detail-avatar { flex: 0 0 68px; }
.bw-detail-id { min-width: 0; flex: 1; }
.bw-detail-name { font-size: 18px; font-weight: 750; letter-spacing: .3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bw-detail-role { font-size: 10.5px; color: color-mix(in srgb, var(--st, #5ee7c4) 55%, #8793a5); margin-top: 2px; }
.bw-detail-badges { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 6px; }
.bw-detail-actions { display: flex; align-items: flex-start; gap: 6px; margin-left: auto; }
.bw-detail-stats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-bottom: 12px; }
.bw-stat { padding: 10px 12px; border-radius: 13px; border: 1px solid var(--dsw-alias-border-l1, rgba(255,255,255,.08));
  background: linear-gradient(150deg, rgba(255,255,255,.045), rgba(255,255,255,.015)); }
.bw-stat-label { font-size: 9px; letter-spacing: .5px; text-transform: uppercase; color: var(--dsw-alias-label-tertiary, #8793a5); }
.bw-stat-value { font-size: 20px; font-weight: 750; margin-top: 2px; color: #eef4fb; }
.bw-stat-value small { font-size: 9px; color: var(--dsw-alias-label-tertiary, #8793a5); margin-left: 3px; font-weight: 500; }
.bw-detail-card { padding: 12px; margin-bottom: 10px; border-radius: 14px;
  border: 1px solid var(--dsw-alias-border-l1, rgba(255,255,255,.08));
  background: linear-gradient(150deg, rgba(255,255,255,.035), rgba(255,255,255,.012)); }
.bw-detail-card-head { display: flex; align-items: center; gap: 7px; margin-bottom: 8px; font-size: 11px;
  font-weight: 650; letter-spacing: .3px; color: var(--dsw-alias-label-secondary, #b6c1d1); }
.bw-detail-card-head .bw-item-time { margin-left: auto; }
.bw-detail-task-title { font-size: 12px; line-height: 1.5; color: #e9f0f8; margin-bottom: 8px; }
.bw-detail-meta { display: flex; flex-wrap: wrap; gap: 5px; }
.bw-detail-chip { font-size: 9.5px; padding: 3px 7px; border-radius: 7px; color: var(--dsw-alias-label-secondary, #b6c1d1);
  background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.07); }
.bw-detail-context { font-size: 9.5px; color: var(--dsw-alias-label-tertiary, #8793a5); margin-top: 4px; }
.bw-detail-line { font-size: 10.5px; color: var(--dsw-alias-label-secondary, #b6c1d1);
  padding: 5px 0; border-bottom: 1px solid rgba(255,255,255,.04); overflow-wrap: anywhere; }
.bw-detail-line:last-child { border-bottom: 0; }
.bw-detail-message { display: flex; gap: 8px; align-items: baseline; }
.bw-detail-message .bw-item-time { flex: 0 0 auto; }
.bw-detail .bw-desc { margin: 0; font-size: 10.8px; line-height: 1.65; }
.bw-detail .bw-bar { height: 58px; margin: 2px 0 0; }
.bw-drawer-top { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.bw-close { margin-left: auto; width: 26px; height: 26px; border-radius: 8px; border: 1px solid var(--dsw-alias-border-l1, rgba(255,255,255,.12));
  background: transparent; color: var(--dsw-alias-label-secondary, #b6c1d1); cursor: pointer; font-size: 14px; line-height: 1; }
.bw-close:hover { color: var(--dsw-alias-label-primary, #e8edf5); background: rgba(255,255,255,.05); }
.bw-desc { font-size: 11px; color: var(--dsw-alias-label-secondary, #b6c1d1); margin: 0 0 12px; white-space: pre-wrap; }
.bw-kv { display: grid; grid-template-columns: 76px 1fr; gap: 5px 8px; font-size: 10.5px; margin-bottom: 12px; }
.bw-kv dt { color: var(--dsw-alias-label-tertiary, #8793a5); }
.bw-kv dd { margin: 0; color: var(--dsw-alias-label-primary, #e8edf5); overflow-wrap: anywhere; }
.bw-bar { display: flex; align-items: flex-end; gap: 3px; height: 46px; margin: 6px 0 12px; }
.bw-bar i { flex: 1; min-width: 2px; border-radius: 3px 3px 0 0; background: color-mix(in srgb, #5ee7c4 55%, transparent); }
.bw-tags { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 10px; }
.bw-tag { font-size: 10px; padding: 2px 7px; border-radius: 999px; background: rgba(255,255,255,.05);
  border: 1px solid var(--dsw-alias-border-l1, rgba(255,255,255,.1)); color: var(--dsw-alias-label-secondary, #b6c1d1); }
.bw-note { font-size: 9.5px; color: var(--dsw-alias-label-tertiary, #8793a5); text-align: center; padding: 12px 0 4px; }
.bw-ctx { height: 4px; border-radius: 999px; background: rgba(255,255,255,.06); overflow: hidden; margin: 6px 0 2px; }
.bw-ctx i { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg, #46d6a8, #5ee7c4); transition: width .4s ease; }
.bw-ctx.warn i { background: linear-gradient(90deg, #f6c453, #fbbf24); }
.bw-ctx.bad i { background: linear-gradient(90deg, #f87171, #ef4444); }

.bw-tasks { display: flex; flex-direction: column; gap: 6px; }
.bw-task { padding: 8px 9px; border-radius: 10px; border: 1px solid var(--dsw-alias-border-l1, rgba(255,255,255,.09));
  background: color-mix(in srgb, var(--dsw-alias-bg-layer-1, #141c26) 72%, transparent); cursor: pointer; }
.bw-task:hover { border-color: color-mix(in srgb, var(--st, #5ee7c4) 40%, transparent); }
.bw-task-top { display: flex; align-items: center; gap: 6px; }
.bw-task-avatar { width: 18px; height: 18px; flex: 0 0 18px; border-radius: 50%; object-fit: cover;
  background: #0c121a; border: 1px solid color-mix(in srgb, var(--st, #5ee7c4) 40%, transparent); }
.bw-task-name { font-size: 11px; font-weight: 650; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bw-task-state { font-size: 9px; padding: 1px 6px; border-radius: 999px; color: var(--st, #46d6a8);
  border: 1px solid color-mix(in srgb, var(--st, #46d6a8) 35%, transparent); background: color-mix(in srgb, var(--st, #46d6a8) 10%, transparent); }
.bw-task-time { margin-left: auto; font-size: 9px; color: var(--dsw-alias-label-tertiary, #8793a5); }
.bw-task-title { font-size: 10.5px; color: var(--dsw-alias-label-secondary, #b6c1d1); margin: 3px 0 5px;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.bw-task-meta { display: flex; flex-wrap: wrap; gap: 4px 8px; font-size: 9px; color: var(--dsw-alias-label-tertiary, #8793a5); }
.bw-task-tool { font-size: 9.5px; color: var(--dsw-alias-label-primary, #e8edf5); margin-top: 4px; }
.bw-task-tool b { color: #5ee7c4; font-weight: 600; }
.bw-task-channel { font-size: 9px; color: var(--dsw-alias-label-tertiary, #8793a5); margin-top: -2px; }
.bw-task-foot { display: flex; justify-content: flex-end; margin-top: 5px; }
.bw-task-detail { font: inherit; font-size: 9.5px; padding: 2px 7px; border-radius: 6px; cursor: pointer;
  color: var(--dsw-alias-label-secondary, #b6c1d1); border: 1px solid var(--dsw-alias-border-l1, rgba(255,255,255,.12));
  background: rgba(255,255,255,.03); }
.bw-task-detail:hover { color: var(--dsw-alias-label-primary, #e8edf5); background: rgba(255,255,255,.07); }
.bw-task { border-left: 2px solid var(--st, #5ee7c4); background: linear-gradient(100deg,
  color-mix(in srgb, var(--st, #5ee7c4) 5%, transparent), transparent 40%),
  color-mix(in srgb, var(--dsw-alias-bg-layer-1, #141c26) 72%, transparent); }
.bw-filters { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 7px; }
.bw-filter { font: inherit; font-size: 9.5px; padding: 3px 8px; border-radius: 999px; cursor: pointer;
  color: var(--dsw-alias-label-secondary, #b6c1d1); border: 1px solid var(--dsw-alias-border-l1, rgba(255,255,255,.12));
  background: rgba(255,255,255,.02); }
.bw-filter[data-on="1"] { color: #0b151b; background: #5ee7c4; border-color: #5ee7c4; font-weight: 650; }
.bw-alert { margin: 0 2px 8px; padding: 8px 10px; border-radius: 10px; font-size: 10.5px; line-height: 1.45;
  color: #fecaca; background: rgba(239,68,68,.10); border: 1px solid rgba(239,68,68,.28); }
.bw-empty-small { padding: 14px; text-align: center; font-size: 10.5px; color: var(--dsw-alias-label-tertiary, #8793a5);
  border: 1px dashed var(--dsw-alias-border-l1, rgba(255,255,255,.12)); border-radius: 10px; }
.bw-notice { margin: 0 2px 8px; padding: 8px 10px; border-radius: 10px; font-size: 10.5px;
  color: #bbf7d0; background: rgba(34,197,94,.10); border: 1px solid rgba(34,197,94,.25); }
.bw-assignments { display: flex; flex-direction: column; gap: 6px; }
.bw-assignment { padding: 10px 11px; border-radius: 12px; cursor: pointer;
  border: 1px solid color-mix(in srgb, var(--st, #5ee7c4) 24%, rgba(255,255,255,.08));
  background: linear-gradient(120deg, color-mix(in srgb, var(--st, #5ee7c4) 6%, transparent), transparent 45%),
    rgba(17,25,35,.7); }
.bw-assignment:hover { border-color: color-mix(in srgb, var(--st, #5ee7c4) 52%, transparent); }
.bw-assignment-top { display: flex; align-items: center; gap: 6px; }
.bw-assignment-route { font-size: 10.5px; color: var(--dsw-alias-label-secondary, #b6c1d1); }
.bw-assignment-route b { color: #eaf2fb; font-weight: 650; }
.bw-assignment-arrow { margin: 0 5px; color: var(--st, #5ee7c4); }
.bw-assignment-state { margin-left: auto; font-size: 9px; padding: 1px 7px; border-radius: 999px;
  color: var(--st, #5ee7c4); border: 1px solid color-mix(in srgb, var(--st, #5ee7c4) 38%, transparent); }
.bw-assignment-title { margin-top: 5px; font-size: 11px; line-height: 1.45; color: #e9f0f8; }
.bw-assignment-report { margin-top: 4px; font-size: 10px; line-height: 1.45; color: var(--dsw-alias-label-tertiary, #8793a5);
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.bw-assignment-meta { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 5px; font-size: 9px; color: var(--dsw-alias-label-tertiary, #8793a5); }
.bw-schedules { display: flex; flex-direction: column; gap: 5px; }
.bw-schedule { position: relative; padding: 9px 10px; border-radius: 10px; border: 1px solid rgba(255,255,255,.08);
  background: rgba(17,25,35,.6); }
.bw-schedule[data-enabled="0"] { opacity: .65; }
.bw-schedule-top { display: flex; align-items: center; gap: 6px; }
.bw-schedule-title { font-size: 10.5px; font-weight: 600; color: #e9f0f8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bw-schedule-state { margin-left: auto; font-size: 9px; padding: 1px 6px; border-radius: 999px;
  color: #f6c453; border: 1px solid rgba(246,196,83,.28); background: rgba(246,196,83,.08); }
.bw-schedule-once { font-size: 8.5px; padding: 1px 5px; border-radius: 999px; color: #93c5fd;
  border: 1px solid rgba(147,197,253,.25); background: rgba(147,197,253,.08); }
.bw-schedule-hint { margin-top: 4px; font-size: 9px; color: #fca5a5; }
.bw-schedule-note { font-size: 9px; line-height: 1.5; color: var(--dsw-alias-label-tertiary, #8793a5); margin: 0 2px 6px; }
.bw-schedule-meta { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 3px; padding-right: 44px;
  font-size: 9px; color: var(--dsw-alias-label-tertiary, #8793a5); }
.bw-schedule-skip { color: #f6c453; }
.bw-schedule-del { position: absolute; right: 8px; bottom: 8px; font: inherit; font-size: 9px; padding: 2px 6px;
  border-radius: 6px; cursor: pointer; color: #fca5a5; border: 1px solid rgba(248,113,113,.28);
  background: rgba(248,113,113,.08); }
.bw-schedule-del:hover { background: rgba(248,113,113,.16); }
.bw-schedule-del:disabled { opacity: .5; cursor: default; }
.bw-schedule-history { margin-top: 4px; }
.bw-schedule-history summary { font-size: 9.5px; color: var(--dsw-alias-label-tertiary, #8793a5); cursor: pointer; padding: 3px 0; }
.bw-schedule-history .bw-schedule { margin-top: 5px; }
.bw-minutes-list { display: flex; flex-direction: column; gap: 6px; }
.bw-minutes-card { padding: 10px 11px; border-radius: 12px; cursor: pointer; border: 1px solid rgba(147,197,253,.16);
  background: linear-gradient(120deg, rgba(147,197,253,.06), transparent 45%), rgba(17,25,35,.65); }
.bw-minutes-card:hover { border-color: rgba(147,197,253,.4); }
.bw-minutes-top { display: flex; align-items: baseline; gap: 6px; }
.bw-minutes-title { font-size: 11px; font-weight: 650; color: #e9f0f8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bw-minutes-summary { margin-top: 4px; font-size: 10px; line-height: 1.5; color: #b6c1d1;
  display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.bw-minutes-meta { display: flex; gap: 8px; margin-top: 4px; font-size: 8.5px; color: #8793a5; }
.bw-office-tool { font: inherit; font-size: 10.5px; padding: 2px 7px; border-radius: 6px; cursor: pointer;
  color: #c9d4e2; border: 1px solid rgba(255,255,255,.14); background: rgba(255,255,255,.04); }
.bw-office-tool:hover { background: rgba(255,255,255,.09); color: #fff; }

.bw-office { position: relative; display: flex; flex-direction: column; height: 100%; min-height: 420px;
  color: var(--dsw-alias-label-primary, #e8edf5); font-size: 12px; background: #0a0f16; overflow: hidden; user-select: none; }
.bw-office-fallback { padding: 22px; color: #fca5a5; font-size: 12px; line-height: 1.6; background: #0a0f16; }
.bw-office-backdrop { position: fixed; inset: 0; z-index: 2147483000; background: rgba(3, 7, 12, .55);
  backdrop-filter: blur(3px); }
.bw-office-modal { position: absolute; top: 56px; left: 16px; right: 16px; bottom: 16px; border-radius: 16px; overflow: hidden;
  border: 1px solid rgba(255,255,255,.14); box-shadow: 0 30px 80px -20px rgba(0,0,0,.9); background: #0a0f16; }
.bw-office-close { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); width: 26px; height: 26px; border-radius: 8px; cursor: pointer;
  border: 1px solid rgba(255,255,255,.14); background: rgba(255,255,255,.04); color: #c9d4e2; font-size: 15px; line-height: 1; }
.bw-office-close:hover { background: rgba(255,255,255,.09); color: #fff; }
.bw-office-modal-3d { padding: 0 !important; overflow: hidden; background: #ebebec; }
.bw-office-iframe-wrap { position: absolute; inset: 0; border-radius: inherit; overflow: hidden; background: #ebebec; }
.bw-office-iframe { width: 100%; height: 100%; border: 0; display: block; background: #ebebec; }
.bw-office-3d-tools { position: absolute; right: 12px; top: 10px; z-index: 5; display: flex; gap: 6px; align-items: center; }
.bw-office-3d-tools .bw-office-close { position: static; transform: none; }
.bw-office-3d-close { position: absolute; left: 50%; right: auto; top: auto; bottom: 14px; z-index: 10;
  transform: translateX(-50%); width: auto; height: 30px; padding: 0 14px; border-radius: 999px;
  font-size: 11px; background: rgba(8, 14, 22, .92); border-color: rgba(127, 231, 255, .24); }
.bw-minutes-backdrop { position: fixed; inset: 0; z-index: 2147483002; background: rgba(3,7,12,.6);
  backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; padding: 40px 20px; }
.bw-minutes-modal { width: min(920px, 100%); max-height: 88vh; overflow: auto; padding: 18px 20px;
  border-radius: 16px; border: 1px solid rgba(147,197,253,.26); background: #0b1119;
  box-shadow: 0 30px 80px -20px rgba(0,0,0,.9); }
.bw-minutes-head { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 12px; }
.bw-minutes-modal-title { font-size: 16px; font-weight: 700; color: #eaf2fb; }
.bw-minutes-modal-sub { font-size: 10px; color: #8793a5; margin-top: 3px; }
.bw-minutes-head .bw-close { margin-left: auto; }
.bw-minutes-markdown { margin: 0 0 12px; padding: 12px; border-radius: 12px; background: rgba(255,255,255,.03);
  border: 1px solid rgba(255,255,255,.07); color: #dbe6f2; font: inherit; font-size: 11px; line-height: 1.7;
  white-space: pre-wrap; overflow-wrap: anywhere; }
.bw-minutes-actions { display: flex; flex-wrap: wrap; gap: 6px; margin: 10px 0; }
.bw-minutes-raw { margin-top: 10px; border-top: 1px solid rgba(255,255,255,.07); padding-top: 8px; }
.bw-minutes-raw summary { cursor: pointer; font-size: 10px; color: #8793a5; }
.bw-minutes-line { font-size: 10.5px; line-height: 1.55; color: #b6c1d1; padding: 5px 0;
  border-bottom: 1px solid rgba(255,255,255,.04); }
.bw-minutes-line b { color: #5ee7c4; margin-right: 6px; }
.bw-quota-modal { width: min(520px, 100%); padding: 18px 20px; border-radius: 16px;
  border: 1px solid rgba(246,196,83,.3); background: #0b1119; box-shadow: 0 30px 80px -20px rgba(0,0,0,.9); }
.bw-quota-text { font-size: 11px; line-height: 1.65; color: #b6c1d1; margin: 10px 0; }
.bw-project-modal { width: min(980px, 100%); max-height: 88vh; overflow: auto; padding: 18px 20px; border-radius: 16px;
  border: 1px solid rgba(94,231,196,.24); background: #0b1119; box-shadow: 0 30px 80px -20px rgba(0,0,0,.9); }
.bw-project-toolbar, .bw-project-add { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin: 8px 0; }
.bw-project-goal { font-size: 11px; line-height: 1.65; color: #b6c1d1; padding: 10px 12px; border-radius: 10px;
  background: rgba(255,255,255,.025); border: 1px solid rgba(255,255,255,.06); margin: 8px 0 12px; }
.bw-project-section { border-top: 1px solid rgba(255,255,255,.07); padding-top: 10px; margin-top: 12px; }
.bw-project-section-title { font-size: 11px; font-weight: 650; color: #eaf2fb; margin-bottom: 7px; }
.bw-project-member, .bw-project-task { display: flex; align-items: center; gap: 7px; padding: 6px 8px; border-radius: 8px;
  background: rgba(255,255,255,.02); border: 1px solid rgba(255,255,255,.05); margin-bottom: 5px; }
.bw-project-member-name, .bw-project-task-title { font-size: 10.5px; color: #dbe6f2; }
.bw-project-task-title { flex: 1; }
.bw-project-pick { display: flex; flex-wrap: wrap; gap: 6px; max-height: 150px; overflow: auto; margin: 8px 0; }
.bw-project-check { font-size: 10px; color: #b6c1d1; border: 1px solid rgba(255,255,255,.08); border-radius: 999px;
  padding: 3px 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; }
.bw-project-check input { accent-color: #5ee7c4; }
.bw-project-create { display: flex; flex-direction: column; gap: 7px; margin-bottom: 14px; }
.bw-project-create textarea { resize: vertical; min-height: 64px; }
.bw-project-card { padding: 10px; border-radius: 10px; border: 1px solid rgba(147,197,253,.14);
  background: rgba(17,25,35,.6); cursor: pointer; margin-bottom: 6px; }
.bw-project-card:hover { border-color: rgba(94,231,196,.35); }
.bw-model-modal { width: min(560px, 100%); padding: 18px 20px; border-radius: 16px;
  border: 1px solid rgba(94,231,196,.28); background: #0b1119; box-shadow: 0 30px 80px -20px rgba(0,0,0,.9); }
.bw-model-row { display: grid; grid-template-columns: 84px minmax(0, 1fr); gap: 10px; align-items: center; margin: 9px 0; }
.bw-model-row label { font-size: 10.5px; color: #8793a5; }
.bw-model-input { width: 100%; font: inherit; font-size: 11px; color: #eaf2fb; padding: 7px 9px; border-radius: 8px;
  border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.04); outline: none; }
.bw-model-input:focus { border-color: rgba(94,231,196,.55); }
.bw-meeting { position: absolute; left: 12px; right: 12px; bottom: 12px; z-index: 4; display: flex; flex-direction: column; gap: 7px;
  max-height: 52%; padding: 10px 11px; border-radius: 14px; border: 1px solid rgba(94,231,196,.26);
  background: rgba(9,15,22,.92); backdrop-filter: blur(14px); box-shadow: 0 22px 50px -20px rgba(0,0,0,.9); }
.bw-meeting-head { display: flex; align-items: center; gap: 8px; }
.bw-meeting-title { font-size: 12px; font-weight: 700; color: #eaf2fb; }
.bw-meeting-sub { font-size: 9px; color: var(--dsw-alias-label-tertiary, #8793a5); margin-top: 2px; }
.bw-meeting-tools { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.bw-meeting-toggle { display: inline-flex; align-items: center; gap: 4px; font-size: 9.5px; color: #b6c1d1; cursor: pointer; }
.bw-meeting-toggle input { accent-color: #5ee7c4; }
.bw-meeting-model { width: auto; max-width: 190px; padding: 3px 6px; font-size: 9.5px; }
.bw-meeting-head > button { margin-left: auto; }
.bw-meeting-people { display: flex; flex-wrap: wrap; gap: 4px; }
.bw-meeting-person { display: inline-flex; align-items: center; gap: 4px; padding: 2px 5px 2px 2px; border-radius: 999px;
  background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.08); font-size: 9.5px; color: #dbe6f2; }
.bw-meeting-person img { width: 18px; height: 18px; border-radius: 50%; object-fit: cover; }
.bw-meeting-remove { border: 0; background: none; color: #8793a5; cursor: pointer; font-size: 12px; line-height: 1; padding: 0 1px; }
.bw-meeting-remove:hover { color: #fca5a5; }
.bw-meeting-log { overflow: auto; max-height: 120px; min-height: 32px; display: flex; flex-direction: column; gap: 3px; padding-right: 4px; }
.bw-meeting-empty { font-size: 10px; color: var(--dsw-alias-label-tertiary, #8793a5); padding: 6px 2px; }
.bw-meeting-msg { display: flex; gap: 6px; font-size: 10.5px; line-height: 1.45; }
.bw-meeting-author { flex: 0 0 auto; color: #5ee7c4; font-weight: 600; }
.bw-meeting-text { color: #dbe6f2; white-space: pre-wrap; overflow-wrap: anywhere; }
.bw-meeting-error { font-size: 9.5px; color: #fca5a5; }
.bw-meeting-compose { display: flex; gap: 6px; }
.bw-meeting-panel { width: min(640px, 100%); }
.bw-meeting-thread { display: flex; flex-direction: column; gap: 6px; max-height: 280px; overflow: auto; margin: 10px 0; }
.bw-meeting-message { padding: 7px 9px; border-radius: 9px; background: rgba(255,255,255,.035); border: 1px solid rgba(255,255,255,.06); }
.bw-meeting-message b { font-size: 9.5px; color: #8fe7d0; }
.bw-meeting-message p { margin: 3px 0 0; font-size: 11px; line-height: 1.55; color: #dbe6f2; white-space: pre-wrap; }
.bw-meeting-pick { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 8px; }
.bw-meeting-input { flex: 1; min-width: 0; font: inherit; font-size: 11px; color: #eaf2fb; padding: 7px 9px;
  border-radius: 9px; border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.04); outline: none; }
.bw-meeting-input:focus { border-color: rgba(94,231,196,.55); }
.bw-meeting-input::placeholder { color: #6f8299; }
.bw-meeting-send { font: inherit; font-size: 10.5px; padding: 0 12px; border-radius: 9px; border: 1px solid rgba(94,231,196,.4);
  color: #06201a; background: #5ee7c4; cursor: pointer; font-weight: 700; }
.bw-meeting-send:disabled { opacity: .45; cursor: default; }
.bw-meeting-hint { position: absolute; left: 50%; bottom: 14px; transform: translateX(-50%); z-index: 3;
  font-size: 10px; color: #b6c1d1; background: rgba(9,15,22,.82); border: 1px dashed rgba(94,231,196,.3);
  border-radius: 999px; padding: 6px 12px; white-space: nowrap; }
.bw-office-head { position: relative; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 9px 48px 9px 12px; flex: 0 0 auto;
  border-bottom: 1px solid var(--dsw-alias-border-l1, rgba(255,255,255,.09)); background: rgba(9,14,20,.86); }
.bw-office-title { font-weight: 650; letter-spacing: .3px; }
.bw-office-hint { font-size: 10px; color: var(--dsw-alias-label-tertiary, #8793a5); }
.bw-office-body { flex: 1; display: flex; min-height: 0; }
.bw-canvas-wrap { position: relative; flex: 1; min-width: 0; min-height: 300px; overflow: hidden;
  background: radial-gradient(70% 60% at 50% 30%, rgba(94,231,196,.05), transparent 70%); }
.bw-canvas-wrap canvas { width: 100%; height: 100%; display: block; }
.bw-canvas-wrap svg.bw-svg-room { width: 100%; height: 100%; display: block; }
.bw-desk { cursor: pointer; outline: none; }
.bw-desk:hover .bw-desk-top { filter: brightness(1.2); }
.bw-desk .bw-avatar { transform-box: fill-box; transform-origin: center; }
.bw-desk[data-state="working"] .bw-avatar { animation: bw-svg-bob 2.4s ease-in-out infinite; }
.bw-desk[data-state="waiting"] .bw-avatar { animation: bw-svg-wait 2s ease-in-out infinite; }
@keyframes bw-svg-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }
@keyframes bw-svg-wait { 0%,100% { opacity: 1; } 50% { opacity: .65; } }
.bw-rail { width: 300px; flex: 0 0 300px; border-left: 1px solid var(--dsw-alias-border-l1, rgba(255,255,255,.09));
  overflow: auto; padding: 10px; background: rgba(10,15,22,.72); }
.bw-office-body[data-rail="0"] .bw-rail { display: none; }
.bw-desk[data-state="waiting"] .bw-ring { animation: bw-ring-pulse 1.6s ease-in-out infinite; }
@keyframes bw-ring-pulse { 0%,100% { opacity: .65; r: 20; } 50% { opacity: .15; r: 24; } }
.bw-rail-title { font-size: 10px; font-weight: 650; letter-spacing: .6px; text-transform: uppercase;
  color: var(--dsw-alias-label-tertiary, #8793a5); margin: 2px 0 8px; display: flex; align-items: center; gap: 6px; }
.bw-rail-title b { color: var(--dsw-alias-label-primary, #e8edf5); font-weight: 650; }
.bw-rail-tabs { display: flex; gap: 5px; margin-bottom: 8px; }
.bw-rail-tab { flex: 1; font: inherit; font-size: 9.5px; padding: 4px 6px; border-radius: 7px; cursor: pointer;
  color: #b6c1d1; background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.08); }
.bw-rail-tab[data-on="1"] { color: #06201a; background: #5ee7c4; border-color: #5ee7c4; font-weight: 700; }
.bw-minute-list { display: flex; flex-direction: column; gap: 6px; }
.bw-minute { padding: 9px; border-radius: 10px; cursor: pointer; border: 1px solid rgba(255,255,255,.08);
  background: rgba(17,25,35,.65); }
.bw-minute:hover { border-color: rgba(94,231,196,.35); }
.bw-minute-top { display: flex; align-items: baseline; gap: 6px; }
.bw-minute-title { font-size: 10.5px; font-weight: 650; color: #e9f0f8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bw-minute-date { margin-left: auto; font-size: 8.5px; color: #8793a5; white-space: nowrap; }
.bw-minute-summary { margin-top: 4px; font-size: 9.5px; line-height: 1.5; color: #b6c1d1;
  display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.bw-minute-meta { display: flex; gap: 8px; margin-top: 4px; font-size: 8.5px; color: #8793a5; }
.bw-rail-close { margin-left: auto; background: none; border: 0; color: var(--dsw-alias-label-tertiary, #8793a5); cursor: pointer; font-size: 15px; }
.bw-rail-close:hover { color: var(--dsw-alias-label-primary, #e8edf5); }
.bw-office-detail { display: flex; flex-direction: column; gap: 8px; }
.bw-office-detail .bw-name { font-size: 14px; }
.bw-office-detail .bw-desc { margin: 0; }
.bw-office-empty { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  color: var(--dsw-alias-label-tertiary, #8793a5); font-size: 11px; }
@media (max-width: 980px) {
  .bw-office-head .bw-chip-optional, .bw-office-hint { display: none; }
  .bw-rail { width: 260px; flex-basis: 260px; }
}
@media (max-width: 760px) {
  .bw-office-body { flex-direction: column; }
  .bw-rail { width: auto; flex: 0 0 178px; border-left: 0; border-top: 1px solid var(--dsw-alias-border-l1, rgba(255,255,255,.09)); }
}
@media (prefers-reduced-motion: reduce) {
  .bw-card[data-state] .bw-avatar, .bw-skel { animation: none !important; }
}
`;

    const COLORS = {
      idle: '#6f8299',
      thinking: '#a78bfa',
      working: '#46d6a8',
      waiting: '#f6c453',
      blocked: '#f87171',
      done: '#46d6a8',
    };
    const LABELS = {
      idle: '空闲',
      thinking: '思考中',
      working: '工作中',
      waiting: '等你',
      blocked: '受阻',
      done: '已完成',
    };
    const TASK_LABELS = {
      running: '进行中',
      waiting: '等你',
      done: '已完成',
      error: '失败',
      aborted: '中断',
      stale: '停滞',
      idle: '空闲',
    };
    const TASK_COLORS = {
      running: '#46d6a8',
      waiting: '#f6c453',
      done: '#7f8ea3',
      error: '#f87171',
      aborted: '#f6c453',
      stale: '#6f8299',
      idle: '#6f8299',
    };
    const ASSIGN_LABELS = {
      open: '进行中',
      running: '进行中',
      processing: '处理中',
      waiting: '等你',
      reported: '已汇报',
      completed: '已完成',
      done: '已完成',
      failed: '失败',
      error: '失败',
      archived: '已归档',
    };
    const ASSIGN_COLORS = {
      open: '#46d6a8',
      running: '#46d6a8',
      processing: '#5ee7c4',
      waiting: '#f6c453',
      reported: '#7dd3fc',
      completed: '#7f8ea3',
      done: '#7f8ea3',
      failed: '#f87171',
      error: '#f87171',
      archived: '#6f8299',
    };
    function onceOf(schedule) {
      return Boolean(schedule && (schedule.once || schedule.kind === 'at'));
    }

    function cssVar(color) {
      return { '--st': color };
    }

    function fmtTokens(n) {
      if (!n) return '0';
      if (n < 1000) return String(n);
      if (n < 1000000) return (n / 1000).toFixed(n < 10000 ? 1 : 0) + 'k';
      return (n / 1000000).toFixed(1) + 'M';
    }

    function rel(iso) {
      if (!iso) return '';
      const t = new Date(iso).getTime();
      if (!Number.isFinite(t)) return '';
      const d = Date.now() - t;
      if (d < 0) return '刚刚';
      if (d < 60000) return '刚刚';
      if (d < 3600000) return Math.floor(d / 60000) + ' 分钟前';
      if (d < 86400000) return Math.floor(d / 3600000) + ' 小时前';
      if (d < 604800000) return Math.floor(d / 86400000) + ' 天前';
      return new Date(t).toLocaleDateString();
    }

    function initialOf(name) {
      const text = String(name || '?').trim();
      const m = /[\u4e00-\u9fa5]/.exec(text);
      return (m ? m[0] : text.slice(0, 1)).toUpperCase();
    }

    function avatarUrl(slug) {
      return '/bot-workbench/avatar/' + encodeURIComponent(slug);
    }

    function isoPoint(gx, gy, tw, th, ox, oy) {
      return { x: ox + (gx - gy) * tw / 2, y: oy + (gx + gy) * th / 2 };
    }

    function diamond(cx, cy, w, h) {
      return [
        { x: cx, y: cy - h / 2 },
        { x: cx + w / 2, y: cy },
        { x: cx, y: cy + h / 2 },
        { x: cx - w / 2, y: cy },
      ];
    }

    function poly(ctx, points, fill, stroke, width) {
      if (!points.length) return;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i].x, points[i].y);
      ctx.closePath();
      if (fill) {
        ctx.fillStyle = fill;
        ctx.fill();
      }
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = width || 1;
        ctx.stroke();
      }
    }

    function roundRectPath(ctx, x, y, w, h, r) {
      const radius = Math.min(r, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.arcTo(x + w, y, x + w, y + h, radius);
      ctx.arcTo(x + w, y + h, x, y + h, radius);
      ctx.arcTo(x, y + h, x, y, radius);
      ctx.arcTo(x, y, x + w, y, radius);
      ctx.closePath();
    }

    const officeImages = new Map();
    const DESK_CELLS = [
      [1, 1], [2, 1], [3, 1], [4, 1],
      [1, 2], [2, 2], [3, 2], [4, 2],
      [1, 3], [2, 3], [3, 3], [4, 3],
      [1, 4], [2, 4], [3, 4], [4, 4],
    ];

    function Avatar({ bot, state, size }) {
      const [failed, setFailed] = React.useState(false);
      const s = size || 46;
      const empty = !bot.avatar || failed;
      return h('span', {
        className: 'bw-avatar',
        style: { width: s, height: s, flexBasis: s + 'px', ...cssVar(COLORS[state] || COLORS.idle) },
        'data-empty': empty ? '1' : '0',
      },
        h('img', {
          src: avatarUrl(bot.slug),
          alt: '',
          onError: () => setFailed(true),
          style: empty ? { display: 'none' } : undefined,
        }),
        h('span', { className: 'bw-initial' }, initialOf(bot.name)),
        h('span', { className: 'bw-dot' })
      );
    }

    function openBotChat(slug) {
      try {
        // Tobs reads its #botharness-open locator only on a fresh page load.
        // Setting the hash alone does nothing after boot, so land it and reload;
        // the Bot mode view and this workbench reopen from their saved layout.
        const hash = '#botharness-open=dm:' + encodeURIComponent(slug);
        window.location.hash = hash;
        window.setTimeout(() => window.location.reload(), 30);
      } catch {
        // ignore
      }
    }

    window.addEventListener('message', (event) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data || {};
      if (data.type === 'bot-workbench-open-chat' && typeof data.slug === 'string' && data.slug) {
        openBotChat(data.slug);
      }
    });

    function TaskList({ tasks, onSelect, onOpenChat }) {
      if (!tasks || !tasks.length) return null;
      return h('div', { className: 'bw-tasks' }, tasks.map((task) => {
        const pct = task.context ? task.context.pct : 0;
        const color = TASK_COLORS[task.state] || TASK_COLORS.idle;
        const title = String(task.title || '当前回合').slice(0, 90);
        const primary = onOpenChat
          ? () => onOpenChat(task.botSlug)
          : onSelect
            ? () => onSelect(task.botSlug)
            : undefined;
        return h('div', {
          key: task.botSlug,
          className: 'bw-task',
          style: { '--st': color },
          onClick: primary,
          role: primary ? 'button' : undefined,
          tabIndex: primary ? 0 : undefined,
          onKeyDown: primary
            ? (event) => { if (event.key === 'Enter' || event.key === ' ') primary(); }
            : undefined,
        },
          h('div', { className: 'bw-task-top' },
            h('img', {
              className: 'bw-task-avatar',
              src: avatarUrl(task.botSlug),
              alt: '',
              onError: (event) => { event.currentTarget.style.display = 'none'; },
            }),
            h('span', { className: 'bw-task-name' }, task.botName),
            h('span', { className: 'bw-task-state' }, TASK_LABELS[task.state] || task.state),
            h('span', { className: 'bw-task-time' }, rel(task.lastAt))
          ),
          h('div', { className: 'bw-task-title' }, title),
          task.channelName
            ? h('div', { className: 'bw-task-channel' }, task.channelName)
            : null,
          h('div', { className: 'bw-task-meta' },
            h('span', null, '第 ' + (task.turn || 0) + ' 轮 · 第 ' + (task.step || 0) + ' 步'),
            h('span', null, '工具 ' + (task.toolCalls || 0)),
            h('span', null, '输出 ' + fmtTokens(task.usage && task.usage.output)),
            task.context
              ? h('span', null, '上下文 ' + fmtTokens(task.context.used) + ' / ' + fmtTokens(task.context.window))
              : null
          ),
          h('div', { className: 'bw-ctx' + (pct >= 80 ? ' bad' : pct >= 50 ? ' warn' : '') },
            h('i', { style: { width: Math.max(1, pct) + '%' } })
          ),
          task.currentTool
            ? h('div', { className: 'bw-task-tool' }, '正在 ', h('b', null, String(task.currentTool)))
            : null,
          onSelect
            ? h('div', { className: 'bw-task-foot' },
                h('button', {
                  className: 'bw-task-detail',
                  type: 'button',
                  onClick: (event) => { event.stopPropagation(); onSelect(task.botSlug); },
                }, '详情')
              )
            : null
        );
      }));
    }

    function AssignmentList({ assignments, onSelect }) {
      if (!assignments || !assignments.length) {
        return h('div', { className: 'bw-empty-small' },
          '还没有正式任务。等「秘书」或「大肥鱼」派活后，会出现在这里。');
      }
      return h('div', { className: 'bw-assignments' }, assignments.map((a) => {
        const state = a.state || 'open';
        const color = ASSIGN_COLORS[state] || ASSIGN_COLORS.open;
        const select = onSelect ? () => onSelect(a.botSlug) : undefined;
        return h('div', {
          key: a.sessionId || a.sourceEventId,
          className: 'bw-assignment',
          style: { '--st': color },
          onClick: select,
          role: select ? 'button' : undefined,
          tabIndex: select ? 0 : undefined,
        },
          h('div', { className: 'bw-assignment-top' },
            h('span', { className: 'bw-assignment-route' },
              h('b', null, a.dispatcherName || '你'),
              h('span', { className: 'bw-assignment-arrow' }, '→'),
              h('b', null, a.botName)
            ),
            h('span', { className: 'bw-assignment-state' }, ASSIGN_LABELS[state] || state)
          ),
          h('div', { className: 'bw-assignment-title' }, a.title || '正式任务'),
          a.report ? h('div', { className: 'bw-assignment-report' }, a.report) : null,
          h('div', { className: 'bw-assignment-meta' },
            h('span', null, rel(a.updatedAt || a.createdAt)),
            a.channelId ? h('span', null, a.channelId) : null,
            a.reportAt ? h('span', null, '汇报 ' + rel(a.reportAt)) : null
          )
        );
      }));
    }

    function ScheduleList({ schedules, onDelete, deletingId }) {
      if (!schedules || !schedules.length) return null;
      const enabled = schedules.filter((s) => s.enabled);
      const disabled = schedules.filter((s) => !s.enabled);
      const card = (s) => h('div', { key: s.id, className: 'bw-schedule', 'data-enabled': s.enabled ? '1' : '0' },
        h('div', { className: 'bw-schedule-top' },
          h('span', { className: 'bw-schedule-title' }, s.title || '定时任务'),
          onceOf(s) ? h('span', { className: 'bw-schedule-once' }, '一次性') : null,
          h('span', { className: 'bw-schedule-state' }, s.enabled ? '启用' : '停用')
        ),
        h('div', { className: 'bw-schedule-meta' },
          h('span', null, s.botName),
          s.lastFired ? h('span', null, '上次 ' + rel(s.lastFired)) : s.lastOccurrence ? h('span', null, '计划 ' + rel(s.lastOccurrence)) : h('span', null, '未触发'),
          s.lastSkipped ? h('span', { className: 'bw-schedule-skip' }, '已跳过') : null
        ),
        onceOf(s) && !s.enabled
          ? h('div', { className: 'bw-schedule-hint' }, '一次性任务已经跑过，留着没用，可以删掉')
          : null,
        onDelete
          ? h('button', {
              className: 'bw-schedule-del',
              type: 'button',
              disabled: deletingId === s.id,
              onClick: (event) => { event.stopPropagation(); onDelete(s); },
            }, deletingId === s.id ? '删除中…' : '删除')
          : null
      );
      return h('div', { className: 'bw-schedules' },
        enabled.map(card),
        disabled.length
          ? h('details', { className: 'bw-schedule-history' },
              h('summary', null, '历史 / 停用 ' + disabled.length),
              disabled.map(card)
            )
          : null
      );
    }

    class OfficeBoundary extends React.Component {
      constructor(props) {
        super(props);
        this.state = { error: null };
      }
      static getDerivedStateFromError(error) {
        return { error };
      }
      componentDidCatch(error, info) {
        if (typeof console !== 'undefined') console.error('[bot-workbench] office crashed', error, info);
      }
      render() {
        if (this.state.error) {
          return h('div', { className: 'bw-office-fallback' },
            '办公室渲染失败：',
            String(this.state.error && this.state.error.message ? this.state.error.message : this.state.error)
          );
        }
        return this.props.children;
      }
    }

    function useOfficeData(presentation) {
      const [snap, setSnap] = React.useState(null);
      const [live, setLive] = React.useState({});
      React.useEffect(() => {
        const controller = new AbortController();
        const load = async () => {
          try {
            const response = await fetch('/bot-workbench/api/live', { signal: controller.signal, cache: 'no-store' });
            const body = await response.json();
            if (body.ok) setSnap(body);
          } catch {
            // keep the last snapshot
          }
        };
        void load();
        const timer = setInterval(load, 5000);
        return () => {
          controller.abort();
          clearInterval(timer);
        };
      }, []);
      React.useEffect(() => {
        if (!presentation) return undefined;
        let views = new Map();
        let offs = [];
        const read = () => {
          const out = {};
          for (const [id, view] of views) {
            try {
              out[id] = view.getSnapshot();
            } catch {
              // disposed bot
            }
          }
          setLive(out);
        };
        const rebuild = () => {
          let list = [];
          try {
            list = presentation.bots();
          } catch {
            list = [];
          }
          const keep = new Map();
          for (const bot of list) {
            const id = String(bot.id);
            if (!views.has(id)) views.set(id, presentation.acquire(id));
            keep.set(id, views.get(id));
          }
          for (const [id, view] of views) {
            if (keep.has(id)) continue;
            try { view.dispose(); } catch { /* ignore */ }
            views.delete(id);
          }
          offs.forEach((off) => { try { off(); } catch { /* ignore */ } });
          offs = [...views.values()].map((view) => {
            try { return view.subscribe(read); } catch { return () => {}; }
          });
          read();
        };
        rebuild();
        const timer = setInterval(rebuild, 5000);
        return () => {
          clearInterval(timer);
          offs.forEach((off) => { try { off(); } catch { /* ignore */ } });
          for (const view of views.values()) {
            try { view.dispose(); } catch { /* ignore */ }
          }
          views = new Map();
        };
      }, [presentation]);
      return { snap, live };
    }

    function OfficeScene({ bots, live, taskByBot, selected, onSelect, zoom, meetingParticipants, onDropParticipant, onRemoveParticipant }) {
      const TW = 100;
      const TH = 50;
      const OX = 500;
      const OY = 160;
      const WALL = 110;
      const z = Math.max(1, Math.min(2.6, Number(zoom) || 1));
      const vw = 1000 / z;
      const vh = 640 / z;
      const vx = 500 - vw / 2;
      const vy = 320 - vh / 2;
      const zoneRef = React.useRef(null);
      const [drag, setDrag] = React.useState(null);
      const [overZone, setOverZone] = React.useState(false);
      const participants = Array.isArray(meetingParticipants) ? meetingParticipants : [];
      React.useEffect(() => {
        if (!drag) return undefined;
        const inside = (event) => {
          const rect = zoneRef.current ? zoneRef.current.getBoundingClientRect() : null;
          return Boolean(rect
            && event.clientX >= rect.left && event.clientX <= rect.right
            && event.clientY >= rect.top && event.clientY <= rect.bottom);
        };
        const move = (event) => setOverZone(inside(event));
        const up = (event) => {
          const insideZone = inside(event);
          if (drag) {
            if (insideZone) {
              if (!drag.fromMeeting && onDropParticipant) onDropParticipant(drag.slug);
            } else if (drag.fromMeeting && onRemoveParticipant) {
              onRemoveParticipant(drag.slug);
            }
          }
          setDrag(null);
          setOverZone(false);
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
        return () => {
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', up);
        };
      }, [drag, onDropParticipant, onRemoveParticipant]);
      const iso = (x, y) => ({ x: OX + (x - y) * TW / 2, y: OY + (x + y) * TH / 2 });
      const points = (list) => list.map((p) => p.x + ',' + p.y).join(' ');
      const diamond = (cx, cy, w, h) => [
        { x: cx, y: cy - h / 2 },
        { x: cx + w / 2, y: cy },
        { x: cx, y: cy + h / 2 },
        { x: cx - w / 2, y: cy },
      ];
      const stateOf = (bot) => {
        const l = live[bot.slug];
        if (l && l.activity) return l.activity;
        const task = taskByBot[bot.slug];
        if (task && task.state === 'running') return 'working';
        if (task && task.state === 'waiting') return 'waiting';
        return 'idle';
      };
      const items = bots.slice(0, DESK_CELLS.length).map((bot, i) => ({
        bot,
        cell: DESK_CELLS[i],
        index: i,
      })).sort((a, b) => (a.cell[0] + a.cell[1]) - (b.cell[0] + b.cell[1]) || a.cell[0] - b.cell[0]);
      const A = iso(0, 0);
      const B = iso(8, 0);
      const C = iso(0, 6);
      const meetingCenter = iso(6.2, 2.0);
      const win = (x1, y1, x2, y2) => {
        const p1 = iso(x1, y1);
        const p2 = iso(x2, y2);
        return points([
          { x: p1.x, y: p1.y - WALL * 0.72 },
          { x: p2.x, y: p2.y - WALL * 0.72 },
          { x: p2.x, y: p2.y - WALL * 0.32 },
          { x: p1.x, y: p1.y - WALL * 0.32 },
        ]);
      };

      return h('svg', {
        className: 'bw-svg-room',
        viewBox: vx + ' ' + vy + ' ' + vw + ' ' + vh,
        preserveAspectRatio: 'xMidYMid meet',
        role: 'img',
        'aria-label': 'Bot 办公室',
      },
        h('defs', null,
          h('linearGradient', { id: 'bw-bg', x1: 0, y1: 0, x2: 0, y2: 1 },
            h('stop', { offset: 0, stopColor: '#070c12' }),
            h('stop', { offset: 0.6, stopColor: '#0b121a' }),
            h('stop', { offset: 1, stopColor: '#0a1017' })
          ),
          h('linearGradient', { id: 'bw-wallL', x1: 0, y1: 0, x2: 0, y2: 1 },
            h('stop', { offset: 0, stopColor: '#0d1822' }),
            h('stop', { offset: 1, stopColor: '#132330' })
          ),
          h('linearGradient', { id: 'bw-wallR', x1: 0, y1: 0, x2: 0, y2: 1 },
            h('stop', { offset: 0, stopColor: '#111c26' }),
            h('stop', { offset: 1, stopColor: '#182935' })
          ),
          h('linearGradient', { id: 'bw-sky', x1: 0, y1: 0, x2: 0, y2: 1 },
            h('stop', { offset: 0, stopColor: 'rgba(96,165,250,.30)' }),
            h('stop', { offset: 0.55, stopColor: 'rgba(167,139,250,.16)' }),
            h('stop', { offset: 1, stopColor: 'rgba(94,231,196,.10)' })
          ),
          h('linearGradient', { id: 'bw-wood', x1: 0, y1: 0, x2: 1, y2: 1 },
            h('stop', { offset: 0, stopColor: '#9a744f' }),
            h('stop', { offset: 1, stopColor: '#6b4a2f' })
          )
        ),
        h('rect', { x: 0, y: 0, width: 1000, height: 640, fill: 'url(#bw-bg)' }),

        // Walls
        h('polygon', {
          points: points([A, C, { x: C.x, y: C.y - WALL }, { x: A.x, y: A.y - WALL }]),
          fill: 'url(#bw-wallR)', stroke: 'rgba(255,255,255,.06)',
        }),
        h('polygon', {
          points: points([A, B, { x: B.x, y: B.y - WALL }, { x: A.x, y: A.y - WALL }]),
          fill: 'url(#bw-wallL)', stroke: 'rgba(255,255,255,.06)',
        }),
        h('polygon', { points: win(1.2, 0, 4.2, 0), fill: 'url(#bw-sky)', stroke: 'rgba(255,255,255,.14)' }),
        h('polygon', { points: win(0, 1.2, 0, 4.2), fill: 'url(#bw-sky)', stroke: 'rgba(255,255,255,.14)' }),
        h('text', {
          x: iso(4, 0).x, y: iso(4, 0).y - WALL * 0.90,
          textAnchor: 'middle', fill: 'rgba(232,237,245,.55)', fontSize: 10, letterSpacing: 2,
        }, 'BOT MONITOR ROOM'),

        // Floor
        ...Array.from({ length: 48 }, (_, i) => {
          const gx = i % 8;
          const gy = Math.floor(i / 8);
          const c = iso(gx + 0.5, gy + 0.5);
          return h('polygon', {
            key: 'tile-' + gx + '-' + gy,
            points: points(diamond(c.x, c.y, TW, TH)),
            fill: (gx + gy) % 2 === 0 ? '#17212c' : '#1b2834',
            stroke: 'rgba(255,255,255,.025)',
          });
        }),
        h('polygon', {
          points: points([iso(0.6, 0.6), iso(4.4, 0.6), iso(4.4, 4.4), iso(0.6, 4.4)]),
          fill: 'rgba(70,214,168,.055)', stroke: 'rgba(94,231,196,.20)',
        }),

        // Desks
        ...items.map(({ bot, cell }) => {
          const slug = bot.slug;
          const status = stateOf(bot);
          const color = COLORS[status] || COLORS.idle;
          const l = live[slug];
          const task = taskByBot[slug];
          const c = iso(cell[0] + 0.5, cell[1] + 0.5);
          const topY = c.y - TH * 0.08;
          const dw = TW * 0.62;
          const dh = TH * 0.62;
          const side = TW * 0.10;
          const top = diamond(c.x, topY, dw, dh);
          const isSelected = selected === slug;
          const name = String(bot.name || '').slice(0, 8);
          const r = 15;
          const avY = topY - 50;
          const clipId = 'bwclip-' + String(slug).replace(/[^a-zA-Z0-9_-]/g, '');
          let bubble = '';
          if (status === 'working' || status === 'thinking') {
            bubble = (l && l.text ? String(l.text) : task && task.title ? String(task.title) : '处理中')
              .replace(/\s+/g, ' ').slice(0, 14);
          } else if (status === 'waiting') {
            bubble = '等你回复';
          } else if (status === 'blocked') {
            bubble = '卡住了';
          } else if (isSelected) {
            bubble = task && task.title ? String(task.title).slice(0, 14) : '空闲';
          }
          return h('g', {
            key: slug,
            className: 'bw-desk',
            'data-state': status,
            style: { '--st': color },
            onPointerDown: () => {
              setDrag({ slug });
            },
            onClick: () => onSelect(slug),
            role: 'button',
            tabIndex: 0,
            onKeyDown: (event) => {
              if (event.key === 'Enter' || event.key === ' ') onSelect(slug);
            },
          },
            h('title', null, bot.name + ' · ' + (task && task.title ? task.title : '空闲')),
            isSelected ? h('ellipse', {
              cx: c.x, cy: c.y + 8, rx: TW * 0.36, ry: TH * 0.36,
              fill: color, opacity: 0.35,
            }) : null,
            h('ellipse', { cx: c.x, cy: topY - 36, rx: 13, ry: 7, fill: 'rgba(32,44,57,.9)' }),
            h('ellipse', { cx: c.x + 4, cy: c.y + 18, rx: TW * 0.42, ry: TH * 0.34, fill: 'rgba(0,0,0,.22)' }),
            h('polygon', {
              points: points([top[3], top[2], { x: top[2].x, y: top[2].y + side }, { x: top[3].x, y: top[3].y + side }]),
              fill: '#5b3f28', stroke: 'rgba(0,0,0,.2)',
            }),
            h('polygon', {
              points: points([top[2], top[1], { x: top[1].x, y: top[1].y + side }, { x: top[2].x, y: top[2].y + side }]),
              fill: '#4c3421', stroke: 'rgba(0,0,0,.2)',
            }),
            h('polygon', {
              className: 'bw-desk-top',
              points: points(top),
              fill: 'url(#bw-wood)', stroke: 'rgba(255,255,255,.12)',
            }),
            // Monitor
            h('rect', { x: c.x - 12, y: topY - 34, width: 24, height: 16, rx: 2, fill: '#0a0f15', stroke: 'rgba(255,255,255,.14)' }),
            h('rect', {
              className: 'bw-screen',
              x: c.x - 10, y: topY - 32, width: 20, height: 12, rx: 1,
              fill: color, opacity: status === 'idle' ? 0.18 : status === 'working' ? 0.75 : 0.4,
            }),
            h('rect', { x: c.x - 1, y: topY - 18, width: 2, height: 4, fill: '#0a0f15' }),
            h('polygon', {
              points: points(diamond(c.x, topY + dh * 0.16, TW * 0.19, TH * 0.19)),
              fill: 'rgba(30,42,54,.9)',
            }),
            h('circle', { cx: c.x + 20, cy: topY + 7, r: 2.4, fill: 'rgba(232,237,245,.3)' }),

            // Avatar
            h('g', { className: 'bw-avatar', opacity: participants.includes(slug) ? 0.2 : 1 },
              l && l.activity === 'working'
                ? h('circle', { cx: c.x, cy: avY, r: r * 1.35, fill: color, opacity: 0.18 })
                : null,
              h('circle', { cx: c.x, cy: avY, r: r + 2, fill: color }),
              h('clipPath', { id: clipId }, h('circle', { cx: c.x, cy: avY, r })),
              h('circle', { cx: c.x, cy: avY, r, fill: '#0c121a' }),
              h('text', {
                x: c.x, y: avY + 5, textAnchor: 'middle', fill: color,
                fontSize: 13, fontWeight: 700,
              }, initialOf(bot.name)),
              h('image', {
                href: avatarUrl(slug), x: c.x - r, y: avY - r, width: r * 2, height: r * 2,
                clipPath: 'url(#' + clipId + ')', preserveAspectRatio: 'xMidYMid slice',
              }),
              h('circle', {
                cx: c.x, cy: avY, r: r + 1.5, fill: 'none', stroke: 'rgba(10,15,22,.9)', strokeWidth: 2,
              }),
              status === 'waiting'
                ? h('circle', {
                    className: 'bw-ring', cx: c.x, cy: avY, r: r + 5,
                    fill: 'none', stroke: color, strokeWidth: 1.5, opacity: 0.65,
                  })
                : null
            ),
            h('circle', { cx: c.x + r * 0.8, cy: avY - r * 0.8, r: 3.2, fill: color }),
            h('text', {
              x: c.x, y: topY + 16, textAnchor: 'middle', fill: '#e8edf5',
              fontSize: 9, fontWeight: 600, stroke: 'rgba(8,13,20,.8)', strokeWidth: 3, paintOrder: 'stroke',
            }, name),
            bubble && !participants.includes(slug)
              ? h('g', null,
                  h('rect', {
                    x: c.x - 46, y: avY - r - 26, width: 92, height: 18, rx: 7,
                    fill: 'rgba(8,13,20,.92)', stroke: color, strokeWidth: 1,
                  }),
                  h('text', {
                    x: c.x, y: avY - r - 14, textAnchor: 'middle', fill: '#dfe8f4', fontSize: 8.5,
                  }, bubble)
                )
              : null
          );
        }),

        // Meeting room (right-back) and rest area (right-front)
        (() => {
          const m = iso(6.2, 2.0);
          const r = iso(6.4, 4.55);
          const chair = (gx, gy) => {
            const p = iso(gx, gy);
            return h('ellipse', { key: 'chair-' + gx + '-' + gy, cx: p.x, cy: p.y - 4, rx: 9, ry: 5, fill: '#2e3d4c', stroke: 'rgba(255,255,255,.08)' });
          };
          return h('g', { key: 'zones' },
            h('polygon', {
              points: points([iso(5.0, 0.5), iso(7.8, 0.5), iso(7.8, 3.6), iso(5.0, 3.6)]),
              fill: 'rgba(96,165,250,.035)', stroke: 'rgba(96,165,250,.16)',
            }),
            h('line', {
              x1: iso(4.95, 0.4).x, y1: iso(4.95, 0.4).y,
              x2: iso(4.95, 5.8).x, y2: iso(4.95, 5.8).y,
              stroke: 'rgba(96,165,250,.22)', strokeWidth: 1.2, strokeDasharray: '5 5',
            }),
            h('text', { x: iso(6.4, 0.55).x, y: iso(6.4, 0.55).y - 4, textAnchor: 'middle', fill: 'rgba(147,197,253,.65)', fontSize: 10, letterSpacing: 2 }, '会议室'),
            h('rect', { x: m.x - 48, y: iso(6.2, 0.7).y - 62, width: 96, height: 30, rx: 4, fill: '#0b121a', stroke: 'rgba(147,197,253,.25)' }),
            h('rect', { x: m.x - 44, y: iso(6.2, 0.7).y - 58, width: 88, height: 22, rx: 2, fill: 'rgba(96,165,250,.18)' }),
            h('polygon', { points: points(diamond(m.x, m.y, 150, 75)), fill: '#6d5238', stroke: 'rgba(255,255,255,.10)' }),
            h('polygon', {
              points: points([
                { x: m.x - 75, y: m.y }, { x: m.x, y: m.y + 37 },
                { x: m.x, y: m.y + 46 }, { x: m.x - 75, y: m.y + 9 },
              ]),
              fill: '#4e3927',
            }),
            chair(5.5, 1.4), chair(6.9, 1.4), chair(5.5, 2.6), chair(6.9, 2.6), chair(6.2, 1.0), chair(6.2, 3.0),
            h('polygon', {
              points: points([iso(5.1, 3.7), iso(7.9, 3.7), iso(7.9, 5.7), iso(5.1, 5.7)]),
              fill: 'rgba(246,196,83,.04)', stroke: 'rgba(246,196,83,.14)',
            }),
            h('text', { x: iso(6.5, 3.85).x, y: iso(6.5, 3.85).y, textAnchor: 'middle', fill: 'rgba(246,196,83,.6)', fontSize: 10, letterSpacing: 2 }, '休息区'),
            h('ellipse', { cx: r.x, cy: r.y, rx: 58, ry: 23, fill: '#394b5f', stroke: 'rgba(255,255,255,.10)' }),
            h('polygon', {
              points: points([
                { x: r.x - 54, y: r.y - 12 }, { x: r.x + 54, y: r.y - 12 },
                { x: r.x + 54, y: r.y - 32 }, { x: r.x - 54, y: r.y - 32 },
              ]),
              fill: '#4b6077',
            }),
            h('ellipse', { cx: r.x, cy: r.y + 20, rx: 30, ry: 13, fill: '#2a3642', stroke: 'rgba(255,255,255,.08)' }),
            h('text', { x: r.x, y: r.y - 44, textAnchor: 'middle', fontSize: 16 }, '☕')
          );
        })(),

        // Meeting drop zone + seated participants
        h('g', { key: 'meeting-zone' },
          h('rect', {
            ref: zoneRef,
            x: meetingCenter.x - 122,
            y: meetingCenter.y - 104,
            width: 244,
            height: 176,
            rx: 12,
            fill: overZone ? 'rgba(94,231,196,.10)' : 'rgba(94,231,196,.025)',
            stroke: overZone ? 'rgba(94,231,196,.75)' : 'rgba(94,231,196,.28)',
            strokeWidth: 1.3,
            strokeDasharray: '6 6',
            pointerEvents: 'none',
          }),
          h('text', {
            x: meetingCenter.x, y: meetingCenter.y - 116, textAnchor: 'middle',
            fill: overZone ? '#5ee7c4' : 'rgba(94,231,196,.55)', fontSize: 9,
          }, overZone ? '松手，邀请进会议室' : '会议室 · 把 Bot 拖进来')
        ),
        ...participants.slice(0, 8).map((slug, index) => {
          const bot = bots.find((item) => item.slug === slug);
          if (!bot) return null;
          const seat = [
            { dx: -58, dy: -34 }, { dx: 0, dy: -50 }, { dx: 58, dy: -34 },
            { dx: -72, dy: 8 }, { dx: 72, dy: 8 },
            { dx: -58, dy: 44 }, { dx: 0, dy: 56 }, { dx: 58, dy: 44 },
          ][index % 8];
          const p = { x: meetingCenter.x + seat.dx, y: meetingCenter.y + seat.dy };
          const l = live[slug];
          const state = (l && l.activity) || 'idle';
          const color = COLORS[state] || COLORS.idle;
          const clipId = 'bwmeet-' + String(slug).replace(/[^a-zA-Z0-9_-]/g, '');
          return h('g', {
            key: 'seat-' + slug,
            className: 'bw-seat',
            onPointerDown: () => setDrag({ slug, fromMeeting: true }),
          },
            h('circle', { cx: p.x, cy: p.y, r: 15, fill: color, opacity: 0.35 }),
            h('clipPath', { id: clipId }, h('circle', { cx: p.x, cy: p.y, r: 13 })),
            h('text', {
              x: p.x, y: p.y + 5, textAnchor: 'middle', fill: color, fontSize: 12, fontWeight: 700,
            }, initialOf(bot.name)),
            h('image', {
              href: avatarUrl(slug), x: p.x - 13, y: p.y - 13, width: 26, height: 26,
              clipPath: 'url(#' + clipId + ')', preserveAspectRatio: 'xMidYMid slice',
            }),
            h('circle', { cx: p.x, cy: p.y, r: 14, fill: 'none', stroke: color, strokeWidth: 1.5 }),
            h('text', {
              x: p.x, y: p.y + 25, textAnchor: 'middle', fill: '#e8edf5', fontSize: 8.5,
              stroke: 'rgba(8,13,20,.8)', strokeWidth: 3, paintOrder: 'stroke',
            }, String(bot.name).slice(0, 6))
          );
        }),

        // Empty desks: coffee corner / plants
        ...DESK_CELLS.slice(bots.length).map((cell, index) => {
          const c = iso(cell[0] + 0.5, cell[1] + 0.5);
          return h('g', { key: 'empty-' + index, opacity: 0.75 },
            h('ellipse', { cx: c.x, cy: c.y + 4, rx: 24, ry: 10, fill: 'rgba(70,214,168,.05)', stroke: 'rgba(94,231,196,.12)' }),
            h('text', {
              x: c.x, y: c.y - 4, textAnchor: 'middle', fontSize: 18,
            }, index === 0 ? '☕' : '🪴')
          );
        }),

        // Plants
        h('g', { opacity: 0.7 },
          h('ellipse', { cx: iso(0.6, 5.4).x, cy: iso(0.6, 5.4).y - 4, rx: 10, ry: 5, fill: 'rgba(70,214,168,.22)' }),
          h('ellipse', { cx: iso(7.4, 5.4).x, cy: iso(7.4, 5.4).y - 4, rx: 10, ry: 5, fill: 'rgba(70,214,168,.22)' }),
          h('text', { x: iso(0.6, 5.4).x, y: iso(0.6, 5.4).y - 16, textAnchor: 'middle', fontSize: 16 }, '🌿'),
          h('text', { x: iso(7.4, 5.4).x, y: iso(7.4, 5.4).y - 16, textAnchor: 'middle', fontSize: 16 }, '🌿')
        )
      );
    }

    function OfficePanel({
      presentation,
      meeting,
      meetingMessages,
      meetingInput,
      meetingBusy,
      meetingError,
      onMeetingInput,
      onAddParticipant,
      onRemoveParticipant,
      onSendMeeting,
      onEndMeeting,
      onClose,
      autoSummary,
      onAutoSummary,
      onSummarizeMeeting,
      summaryBusy,
      meetings,
      onOpenMinutes,
      minutesSearch,
      onMinutesSearch,
      meetingModelKey,
      meetingModelOptions,
      onMeetingModelKey,
      onCreateProject,
      projectBusy,
      onToggle3d,
    }) {
      const { snap, live } = useOfficeData(presentation);
      const [selected, setSelected] = React.useState(null);
      const [zoom, setZoom] = React.useState(1);
      const [railOpen, setRailOpen] = React.useState(true);
      const [railTab, setRailTab] = React.useState('tasks');
      const wrapRef = React.useRef(null);
      const canvasRef = React.useRef(null);
      const dataRef = React.useRef({});
      const regionsRef = React.useRef([]);
      const hoverRef = React.useRef(null);
      const sizeRef = React.useRef({ w: 1, h: 1, dpr: 1 });

      const bots = snap ? snap.bots : [];
      const tasks = snap ? (snap.tasks || []) : [];
      const taskByBot = React.useMemo(() => {
        const map = {};
        for (const task of tasks) map[task.botSlug] = task;
        return map;
      }, [tasks]);
      const stateOf = (slug) => {
        const l = live[slug];
        if (l && l.activity) return l.activity;
        const task = taskByBot[slug];
        if (task && task.state === 'running') return 'working';
        if (task && task.state === 'waiting') return 'waiting';
        return 'idle';
      };

      dataRef.current = { bots, live, tasks, taskByBot, selected };

      React.useEffect(() => {
        for (const bot of bots) {
          const key = bot.slug;
          if (officeImages.has(key)) continue;
          const img = new Image();
          const entry = { img, ok: false, failed: false };
          officeImages.set(key, entry);
          img.onload = () => { entry.ok = true; };
          img.onerror = () => { entry.failed = true; };
          img.src = avatarUrl(key);
        }
      }, [bots.map((bot) => bot.slug).join('|')]);

      React.useEffect(() => {
        const wrap = wrapRef.current;
        const canvas = canvasRef.current;
        if (!wrap || !canvas) return undefined;
        const ctx = canvas.getContext('2d');
        let raf = 0;
        let stopped = false;

        const resize = () => {
          const rect = wrap.getBoundingClientRect();
          const w = Math.max(1, rect.width);
          const h = Math.max(1, rect.height);
          const dpr = Math.min(2, window.devicePixelRatio || 1);
          canvas.width = Math.round(w * dpr);
          canvas.height = Math.round(h * dpr);
          sizeRef.current = { w, h, dpr };
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };

        const draw = (time) => {
          const W = sizeRef.current.w;
          const H = sizeRef.current.h;
          if (W < 20 || H < 20) return;
          const current = dataRef.current;
          const tw = Math.max(38, Math.min(W / 6.3, H / 4.5));
          const th = tw / 2;
          const ox = W / 2;
          const oy = Math.max(tw * 1.05, H * 0.15) + tw * 0.18;
          const iso = (x, y) => isoPoint(x, y, tw, th, ox, oy);
          const wh = tw * 1.12;
          const regions = [];

          ctx.clearRect(0, 0, W, H);
          const bg = ctx.createLinearGradient(0, 0, 0, H);
          bg.addColorStop(0, '#070c12');
          bg.addColorStop(0.55, '#0b121a');
          bg.addColorStop(1, '#0a1017');
          ctx.fillStyle = bg;
          ctx.fillRect(0, 0, W, H);

          // Room walls
          const A = iso(0, 0);
          const B = iso(6, 0);
          const C = iso(0, 6);
          poly(ctx, [A, C, { x: C.x, y: C.y - wh }, { x: A.x, y: A.y - wh }], '#0f1a24', 'rgba(255,255,255,.06)');
          poly(ctx, [A, B, { x: B.x, y: B.y - wh }, { x: A.x, y: A.y - wh }], '#13212c', 'rgba(255,255,255,.06)');

          // Windows: dusk sky on both back walls
          const sky = ctx.createLinearGradient(0, A.y - wh, 0, A.y);
          sky.addColorStop(0, 'rgba(96,165,250,.28)');
          sky.addColorStop(0.55, 'rgba(167,139,250,.16)');
          sky.addColorStop(1, 'rgba(94,231,196,.10)');
          const win = (x1, y1, x2, y2) => {
            const p1 = iso(x1, y1);
            const p2 = iso(x2, y2);
            poly(ctx, [
              { x: p1.x, y: p1.y - wh * 0.72 },
              { x: p2.x, y: p2.y - wh * 0.72 },
              { x: p2.x, y: p2.y - wh * 0.32 },
              { x: p1.x, y: p1.y - wh * 0.32 },
            ], sky, 'rgba(255,255,255,.14)', 1);
          };
          win(1.2, 0, 4.2, 0);
          win(0, 1.2, 0, 4.2);

          // Wall sign
          ctx.save();
          ctx.font = '600 ' + Math.max(9, Math.round(tw * 0.10)) + 'px "Microsoft YaHei", system-ui, sans-serif';
          ctx.fillStyle = 'rgba(232,237,245,.55)';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const sign = iso(3, 0);
          ctx.fillText('BOT MONITOR ROOM', sign.x, sign.y - wh * 0.90);
          ctx.restore();

          // Floor tiles
          for (let gy = 0; gy < 6; gy += 1) {
            for (let gx = 0; gx < 6; gx += 1) {
              const c = iso(gx + 0.5, gy + 0.5);
              const tile = diamond(c.x, c.y, tw, th);
              poly(ctx, tile, (gx + gy) % 2 === 0 ? '#17212c' : '#1b2834', 'rgba(255,255,255,.025)', 1);
            }
          }

          // Rug under desks
          poly(ctx, [
            iso(0.6, 0.6), iso(4.4, 0.6), iso(4.4, 4.4), iso(0.6, 4.4),
          ], 'rgba(70,214,168,.055)', 'rgba(94,231,196,.20)', 1.2);

          // Plants in the unused corners
          const plant = (gx, gy) => {
            const p = iso(gx, gy);
            ctx.fillStyle = 'rgba(70,214,168,.22)';
            ctx.beginPath();
            ctx.ellipse(p.x, p.y - 4, tw * 0.10, tw * 0.05, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(94,231,196,.45)';
            ctx.lineWidth = 1.2;
            for (let k = -2; k <= 2; k += 1) {
              ctx.beginPath();
              ctx.moveTo(p.x, p.y - 4);
              ctx.quadraticCurveTo(p.x + k * tw * 0.035, p.y - tw * 0.18, p.x + k * tw * 0.06, p.y - tw * 0.28);
              ctx.stroke();
            }
          };
          plant(0.6, 5.4);
          plant(5.4, 5.4);

          // Desks, back to front
          const items = current.bots.slice(0, DESK_CELLS.length).map((bot, i) => ({
            bot,
            cell: DESK_CELLS[i],
            index: i,
          })).sort((a, b) => (a.cell[0] + a.cell[1]) - (b.cell[0] + b.cell[1]) || a.cell[0] - b.cell[0]);

          for (const item of items) {
            const slug = item.bot.slug;
            const c = iso(item.cell[0] + 0.5, item.cell[1] + 0.5);
            const liveState = current.live[slug];
            const taskState = current.taskByBot[slug];
            let status = liveState && liveState.activity;
            if (!status) {
              status = taskState && taskState.state === 'running'
                ? 'working'
                : taskState && taskState.state === 'waiting'
                  ? 'waiting'
                  : 'idle';
            }
            const color = COLORS[status] || COLORS.idle;
            const isSelected = current.selected === slug;
            const isHover = hoverRef.current === slug;
            const bob = Math.sin(time / 850 + item.index * 1.7) * 1.4;
            const topY = c.y - th * 0.08;
            const dw = tw * 0.62;
            const dh = th * 0.62;
            const side = tw * 0.10;
            const top = diamond(c.x, topY, dw, dh);

            if (isSelected || isHover) {
              ctx.save();
              ctx.globalAlpha = isSelected ? 0.42 : 0.22;
              ctx.fillStyle = color;
              ctx.beginPath();
              ctx.ellipse(c.x, c.y + th * 0.12, tw * 0.34, th * 0.34, 0, 0, Math.PI * 2);
              ctx.fill();
              ctx.restore();
            }

            // Chair behind the desk
            ctx.fillStyle = '#202c39';
            ctx.beginPath();
            ctx.ellipse(c.x, topY - th * 0.64, tw * 0.13, tw * 0.075, 0, 0, Math.PI * 2);
            ctx.fill();

            // Desk sides and top
            poly(ctx, [
              top[3], top[2],
              { x: top[2].x, y: top[2].y + side },
              { x: top[3].x, y: top[3].y + side },
            ], '#5b3f28', 'rgba(0,0,0,.18)', 1);
            poly(ctx, [
              top[2], top[1],
              { x: top[1].x, y: top[1].y + side },
              { x: top[2].x, y: top[2].y + side },
            ], '#4c3421', 'rgba(0,0,0,.18)', 1);
            poly(ctx, top, '#8a6544', 'rgba(255,255,255,.10)', 1);

            // Monitor
            const mx = c.x;
            const my = topY - dh * 0.30;
            const mw = tw * 0.23;
            const mh = tw * 0.15;
            ctx.fillStyle = '#0a0f15';
            roundRectPath(ctx, mx - mw / 2, my - mh, mw, mh, Math.max(2, tw * 0.02));
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,.12)';
            ctx.lineWidth = 1;
            ctx.stroke();
            const glow = status === 'working' ? 0.72 : status === 'thinking' ? 0.38 : status === 'blocked' ? 0.55 : 0.20;
            ctx.save();
            ctx.shadowColor = color;
            ctx.shadowBlur = status === 'working' ? tw * 0.12 : tw * 0.04;
            ctx.fillStyle = color;
            ctx.globalAlpha = glow;
            roundRectPath(ctx, mx - mw / 2 + 2, my - mh + 2, mw - 4, mh - 4, Math.max(1, tw * 0.015));
            ctx.fill();
            ctx.restore();
            ctx.fillStyle = '#0a0f15';
            ctx.fillRect(mx - 1, my, 2, tw * 0.05);

            // Keyboard + mug
            ctx.fillStyle = 'rgba(30,42,54,.9)';
            const kb = diamond(c.x, topY + dh * 0.16, tw * 0.19, th * 0.19);
            poly(ctx, kb, 'rgba(30,42,54,.9)', null);
            ctx.fillStyle = 'rgba(232,237,245,.28)';
            ctx.beginPath();
            ctx.arc(c.x + tw * 0.20, topY + dh * 0.10, Math.max(1.5, tw * 0.024), 0, Math.PI * 2);
            ctx.fill();

            // Avatar
            const r = Math.max(10, tw * 0.145);
            const avY = topY - tw * 0.46 + bob;
            const ring = status === 'waiting' ? 1 : 0;
            if (status === 'working') {
              ctx.save();
              ctx.globalAlpha = 0.28 + Math.sin(time / 420) * 0.08;
              ctx.fillStyle = color;
              ctx.beginPath();
              ctx.arc(c.x, avY, r * 1.35, 0, Math.PI * 2);
              ctx.fill();
              ctx.restore();
            }
            ctx.save();
            ctx.beginPath();
            ctx.arc(c.x, avY, r + 2, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
            ctx.restore();
            ctx.save();
            ctx.beginPath();
            ctx.arc(c.x, avY, r, 0, Math.PI * 2);
            ctx.clip();
            const entry = officeImages.get(slug);
            if (entry && entry.ok && entry.img && entry.img.naturalWidth) {
              ctx.drawImage(entry.img, c.x - r, avY - r, r * 2, r * 2);
            } else {
              ctx.fillStyle = '#0c121a';
              ctx.fillRect(c.x - r, avY - r, r * 2, r * 2);
              ctx.fillStyle = color;
              ctx.font = '700 ' + Math.round(r * 0.9) + 'px "Microsoft YaHei", system-ui, sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(initialOf(item.bot.name), c.x, avY + 1);
            }
            ctx.restore();
            ctx.strokeStyle = '#0a0f15';
            ctx.lineWidth = Math.max(1.5, tw * 0.02);
            ctx.beginPath();
            ctx.arc(c.x, avY, r + 2, 0, Math.PI * 2);
            ctx.stroke();

            // Name plate
            ctx.font = '600 ' + Math.max(8, Math.round(tw * 0.075)) + 'px "Microsoft YaHei", system-ui, sans-serif';
            const name = String(item.bot.name || '').slice(0, 8);
            const nameW = Math.max(tw * 0.26, ctx.measureText(name).width + 10);
            const nameY = c.y + th * 0.38;
            ctx.fillStyle = 'rgba(8,13,20,.72)';
            roundRectPath(ctx, c.x - nameW / 2, nameY - 7, nameW, 14, 7);
            ctx.fill();
            ctx.fillStyle = '#e8edf5';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(name, c.x, nameY + 0.5);

            // Speech / status bubble
            const l = current.live[slug];
            const task = current.taskByBot[slug];
            let bubble = '';
            if (status === 'working' || status === 'thinking') {
              bubble = (l && l.text ? String(l.text) : task && task.title ? String(task.title) : '处理中')
                .replace(/\s+/g, ' ').slice(0, 16);
            } else if (status === 'waiting') {
              bubble = '等你回复';
            } else if (status === 'blocked') {
              bubble = '卡住了';
            } else if (isHover || isSelected) {
              bubble = task && task.title ? String(task.title).slice(0, 16) : '空闲';
            }
            if (bubble) {
              ctx.font = '500 ' + Math.max(8, Math.round(tw * 0.075)) + 'px "Microsoft YaHei", system-ui, sans-serif';
              const bw = Math.min(tw * 1.5, ctx.measureText(bubble).width + 14);
              const bh = 18;
              const bx = c.x - bw / 2;
              const by = avY - r - bh - 8;
              ctx.fillStyle = 'rgba(8,13,20,.92)';
              ctx.strokeStyle = color;
              ctx.lineWidth = 1;
              roundRectPath(ctx, bx, by, bw, bh, 7);
              ctx.fill();
              ctx.stroke();
              ctx.beginPath();
              ctx.moveTo(c.x - 3, by + bh);
              ctx.lineTo(c.x + 3, by + bh);
              ctx.lineTo(c.x, by + bh + 4);
              ctx.closePath();
              ctx.fillStyle = 'rgba(8,13,20,.92)';
              ctx.fill();
              ctx.fillStyle = '#dfe8f4';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(bubble, c.x, by + bh / 2 + 0.5);
            }

            // Status dot
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(c.x + r * 0.82, avY - r * 0.82, Math.max(2, r * 0.22), 0, Math.PI * 2);
            ctx.fill();
            if (status === 'waiting') {
              ctx.save();
              ctx.globalAlpha = 0.35 + (Math.sin(time / 320) + 1) * 0.2;
              ctx.strokeStyle = color;
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.arc(c.x, avY, r + 5, 0, Math.PI * 2);
              ctx.stroke();
              ctx.restore();
            }

            regions.push({
              slug,
              x: c.x - tw * 0.42,
              y: avY - r - 16,
              w: tw * 0.84,
              h: (c.y + th * 0.5) - (avY - r - 16),
            });
          }

          // Ambient dust
          for (let i = 0; i < 12; i += 1) {
            const px = (W * ((i * 0.618) % 1) + Math.sin(time / 4200 + i) * 16) % W;
            const py = H * (0.18 + ((i * 0.37) % 1) * 0.62) + Math.cos(time / 3800 + i * 1.3) * 10;
            ctx.globalAlpha = 0.05 + (Math.sin(time / 2600 + i) + 1) * 0.035;
            ctx.fillStyle = '#9fe8d5';
            ctx.beginPath();
            ctx.arc(px, py, 1.1, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
          regionsRef.current = regions;
        };

        const loop = (time) => {
          if (stopped) return;
          try {
            draw(time);
          } catch (error) {
            if (typeof console !== 'undefined') console.warn('[bot-workbench] office draw failed', error);
          }
          raf = requestAnimationFrame(loop);
        };
        const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
        if (observer) observer.observe(wrap);
        const kick = [0, 80, 300, 900].map((ms) => setTimeout(resize, ms));
        window.addEventListener('resize', resize);
        resize();
        raf = requestAnimationFrame(loop);
        return () => {
          stopped = true;
          cancelAnimationFrame(raf);
          kick.forEach(clearTimeout);
          window.removeEventListener('resize', resize);
          if (observer) observer.disconnect();
        };
      }, []);

      const hit = (event) => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        for (let i = regionsRef.current.length - 1; i >= 0; i -= 1) {
          const region = regionsRef.current[i];
          if (x >= region.x && x <= region.x + region.w && y >= region.y && y <= region.y + region.h) return region;
        }
        return null;
      };

      const onMove = (event) => {
        const region = hit(event);
        hoverRef.current = region ? region.slug : null;
        if (canvasRef.current) canvasRef.current.style.cursor = region ? 'pointer' : 'default';
      };
      const onLeave = () => {
        hoverRef.current = null;
      };
      const onClick = (event) => {
        const region = hit(event);
        if (region) setSelected(region.slug);
      };

      const selectedBot = selected ? bots.find((bot) => bot.slug === selected) : null;
      const selectedTask = selected ? taskByBot[selected] : null;
      const selectedState = selected ? stateOf(selected) : 'idle';
      const assignments = snap ? (snap.assignments || []) : [];
      const runningAssignments = assignments.filter((a) => ['open', 'running', 'processing'].includes(a.state)).length;
      const avgContext = snap && snap.taskStats ? snap.taskStats.avgContextPct : 0;

      return h('div', { className: 'bw-office' },
        h('div', { className: 'bw-office-head' },
          h('span', { className: 'bw-office-title' }, '监控室 · 办公室'),
          h('span', { className: 'bw-office-hint' }, '点击工位查看回合与上下文'),
          h('span', { className: 'bw-spacer' }),
          h('span', { className: 'bw-chip' }, '在岗 ', h('b', null, String(bots.length))),
          h('span', { className: 'bw-chip' }, '正式任务 ', h('b', null, String(assignments.length))),
          h('span', { className: 'bw-chip' }, '进行中 ', h('b', null, String(runningAssignments))),
          h('span', { className: 'bw-chip bw-chip-optional' }, '平均上下文 ', h('b', null, String(avgContext) + '%')),
          h('button', { className: 'bw-office-tool', type: 'button', onClick: () => setZoom((value) => Math.max(1, value - 0.3)) }, '−'),
          h('button', { className: 'bw-office-tool', type: 'button', onClick: () => setZoom((value) => Math.min(2.6, value + 0.3)) }, '+'),
          h('button', { className: 'bw-office-tool', type: 'button', onClick: () => setZoom(1) }, '1×'),
          h('button', { className: 'bw-office-tool', type: 'button', onClick: () => setRailOpen((value) => !value) }, railOpen ? '收起任务' : '显示任务'),
          onToggle3d ? h('button', { className: 'bw-office-tool', type: 'button', onClick: onToggle3d }, '3D 办公室') : null,
          onClose ? h('button', { className: 'bw-office-close', type: 'button', onClick: onClose, 'aria-label': '关闭办公室' }, '×') : null
        ),
        h('div', { className: 'bw-office-body', 'data-rail': railOpen ? '1' : '0' },
          h('div', { className: 'bw-canvas-wrap' },
            snap && bots.length
              ? h(OfficeScene, {
                  bots,
                  live,
                  taskByBot,
                  selected,
                  onSelect: setSelected,
                  zoom,
                  meetingParticipants: meeting ? meeting.participants : [],
                  onDropParticipant: onAddParticipant,
                  onRemoveParticipant,
                })
              : null,
            !snap ? h('div', { className: 'bw-office-empty' }, '正在读取 Bot…') : null,
            snap && bots.length === 0 ? h('div', { className: 'bw-office-empty' }, '还没有 Bot') : null,
            meeting && meeting.participants.length
              ? h('div', { className: 'bw-meeting' },
                  h('div', { className: 'bw-meeting-head' },
                    h('div', null,
                      h('div', { className: 'bw-meeting-title' }, '会议室 · ' + (meeting.groupName || '准备中')),
                      h('div', { className: 'bw-meeting-sub' },
                        '临时会议群，结束自动解散；如果立项，会另建项目群',
                        ' · ' + String(meeting.participants.length) + ' 位 Bot'
                      )
                    ),
                    h('div', { style: { display: 'flex', gap: '6px', alignItems: 'center' } },
                      h('button', { className: 'bw-office-tool', type: 'button', onClick: onCreateProject, disabled: projectBusy }, projectBusy ? '立项中…' : '立项'),
                      h('button', { className: 'bw-office-tool', type: 'button', onClick: onEndMeeting, disabled: meetingBusy }, '结束会议')
                    )
                  ),
                  h('div', { className: 'bw-meeting-tools' },
                    h('label', { className: 'bw-meeting-toggle' },
                      h('input', {
                        type: 'checkbox',
                        checked: Boolean(autoSummary),
                        onChange: (event) => onAutoSummary(event.target.checked),
                      }),
                      '自动纪要'
                    ),
                    h('select', {
                      className: 'bw-model-input bw-meeting-model',
                      value: meetingModelKey || 'default',
                      onChange: (event) => onMeetingModelKey(event.target.value),
                    }, (meetingModelOptions || [{ key: 'default', label: '默认模型' }]).map((item) => h('option', {
                      key: item.key,
                      value: item.key,
                    }, item.label))),
                    h('button', {
                      className: 'bw-office-tool',
                      type: 'button',
                      onClick: () => onSummarizeMeeting(meeting.id),
                      disabled: summaryBusy === meeting.id,
                    }, summaryBusy === meeting.id ? '生成中…' : '生成纪要')
                  ),
                  h('div', { className: 'bw-meeting-people' },
                    meeting.participants.map((slug) => {
                      const bot = bots.find((b) => b.slug === slug);
                      return h('span', { className: 'bw-meeting-person', key: slug },
                        bot ? h('img', { src: avatarUrl(slug), alt: '', onError: (e) => { e.currentTarget.style.display = 'none'; } }) : null,
                        h('span', null, bot ? bot.name : slug),
                        h('button', {
                          className: 'bw-meeting-remove',
                          type: 'button',
                          title: '移出会议',
                          onClick: () => onRemoveParticipant(slug),
                        }, '×')
                      );
                    })
                  ),
                  h('div', { className: 'bw-meeting-log' },
                    meetingMessages.length
                      ? meetingMessages.slice(-18).map((message) => h('div', { className: 'bw-meeting-msg', key: message.id },
                          h('span', { className: 'bw-meeting-author' }, message.authorName || message.authorSlug || '系统'),
                          h('span', { className: 'bw-meeting-text' }, message.text)
                        ))
                      : h('div', { className: 'bw-meeting-empty' }, '还没有发言，发一条议题开始讨论。')
                  ),
                  meetingError ? h('div', { className: 'bw-meeting-error' }, meetingError) : null,
                  h('div', { className: 'bw-meeting-compose' },
                    h('input', {
                      className: 'bw-meeting-input',
                      value: meetingInput,
                      placeholder: '你想让他们讨论什么？也可以直接插话…',
                      onChange: (event) => onMeetingInput(event.target.value),
                      onKeyDown: (event) => { if (event.key === 'Enter') onSendMeeting(); },
                      disabled: meetingBusy,
                    }),
                    h('button', {
                      className: 'bw-meeting-send',
                      type: 'button',
                      onClick: onSendMeeting,
                      disabled: meetingBusy || !meetingInput.trim(),
                    }, meetingBusy ? '…' : '发言')
                  )
                )
              : h('div', { className: 'bw-meeting-hint' }, '把工位上的 Bot 拖进会议室，就能开始讨论')
          ),
          h('div', { className: 'bw-rail' },
            selectedBot
              ? h('div', { className: 'bw-office-detail' },
                  h('div', { className: 'bw-rail-title' },
                    h('b', null, selectedBot.name),
                    h('button', { className: 'bw-rail-close', type: 'button', onClick: () => setSelected(null), 'aria-label': '返回' }, '×')
                  ),
                  h('div', { className: 'bw-row' },
                    h(Avatar, { bot: selectedBot, state: selectedState, size: 48 }),
                    h('div', { style: { minWidth: 0 } },
                      h('div', { className: 'bw-name' }, selectedBot.name),
                      h('div', { className: 'bw-sub' }, (selectedBot.roles || []).join(' · ') || 'PersonaBot')
                    )
                  ),
                  h('button', { className: 'bw-office-tool', type: 'button', onClick: () => openBotChat(selectedBot.slug) }, '打开私聊'),
                  meeting && meeting.participants.includes(selectedBot.slug)
                    ? h('span', { className: 'bw-tag' }, '已在会议室')
                    : h('button', { className: 'bw-office-tool', type: 'button', onClick: () => onAddParticipant(selectedBot.slug) }, '邀请到会议室'),
                  selectedBot.description ? h('p', { className: 'bw-desc' }, selectedBot.description) : null,
                  selectedTask
                    ? h('div', null,
                        h('div', { className: 'bw-rail-title' }, '当前回合'),
                        h('div', { className: 'bw-task', style: { '--st': TASK_COLORS[selectedTask.state] || TASK_COLORS.idle, cursor: 'default' } },
                          h('div', { className: 'bw-task-top' },
                            h('span', { className: 'bw-task-name' }, '第 ' + (selectedTask.turn || 0) + ' 轮 · 第 ' + (selectedTask.step || 0) + ' 步'),
                            h('span', { className: 'bw-task-state' }, TASK_LABELS[selectedTask.state] || selectedTask.state),
                            h('span', { className: 'bw-task-time' }, rel(selectedTask.lastAt))
                          ),
                          h('div', { className: 'bw-task-title' }, String(selectedTask.title || '当前回合')),
                          h('div', { className: 'bw-task-meta' },
                            h('span', null, '工具 ' + (selectedTask.toolCalls || 0)),
                            h('span', null, '输出 ' + fmtTokens(selectedTask.usage && selectedTask.usage.output)),
                            h('span', null, '耗时 ' + Math.round((selectedTask.durationMs || 0) / 1000) + 's')
                          ),
                          h('div', { className: 'bw-task-meta' },
                            h('span', null, '上下文 ' + (selectedTask.context ? selectedTask.context.used : 0) + ' / ' + (selectedTask.context ? selectedTask.context.window : 0)),
                            h('span', null, (selectedTask.context ? selectedTask.context.pct : 0) + '%')
                          ),
                          h('div', { className: 'bw-ctx' + ((selectedTask.context && selectedTask.context.pct >= 80) ? ' bad' : (selectedTask.context && selectedTask.context.pct >= 50) ? ' warn' : '') },
                            h('i', { style: { width: Math.max(1, selectedTask.context ? selectedTask.context.pct : 0) + '%' } })
                          ),
                          selectedTask.currentTool ? h('div', { className: 'bw-task-tool' }, '正在 ', h('b', null, String(selectedTask.currentTool))) : null
                        )
                      )
                    : null,
                  h('dl', { className: 'bw-kv' },
                    h('dt', null, '今日输出'), h('dd', null, fmtTokens(selectedBot.usage && selectedBot.usage.outToday) + ' tok'),
                    h('dt', null, '近 7 天'), h('dd', null, fmtTokens(selectedBot.usage && selectedBot.usage.totalWeek) + ' tok'),
                    h('dt', null, '最近活跃'), h('dd', null, rel(selectedBot.lastActive) || '无记录'),
                    h('dt', null, '记忆'), h('dd', null, selectedBot.memory ? selectedBot.memory.head : '无')
                  )
                )
              : h('div', null,
                  h('div', { className: 'bw-rail-tabs' },
                    h('button', {
                      type: 'button',
                      className: 'bw-rail-tab',
                      'data-on': railTab === 'tasks' ? '1' : '0',
                      onClick: () => setRailTab('tasks'),
                    }, '正式任务 ' + String(assignments.length)),
                    h('button', {
                      type: 'button',
                      className: 'bw-rail-tab',
                      'data-on': railTab === 'minutes' ? '1' : '0',
                      onClick: () => setRailTab('minutes'),
                    }, '会议纪要 ' + String((meetings || []).length))
                  ),
                  railTab === 'minutes'
                    ? h('div', null,
                        h('input', {
                          className: 'bw-model-input',
                          placeholder: '搜索会议纪要…',
                          value: minutesSearch || '',
                          onChange: (event) => onMinutesSearch(event.target.value),
                          style: { marginBottom: '7px' },
                        }),
                        (meetings || []).length
                        ? h('div', { className: 'bw-minute-list' }, meetings.map((item) => h('div', {
                            key: item.id,
                            className: 'bw-minute',
                            onClick: () => onOpenMinutes(item.id),
                          },
                            h('div', { className: 'bw-minute-top' },
                              h('span', { className: 'bw-minute-title' }, item.title),
                              h('span', { className: 'bw-minute-date' }, rel(item.startedAt))
                            ),
                            h('div', { className: 'bw-minute-summary' },
                              item.summary ? String(item.summary).replace(/[#*>`]/g, '').replace(/\s+/g, ' ').slice(0, 140) : '未生成纪要'),
                            h('div', { className: 'bw-minute-meta' },
                              h('span', null, String(item.messageCount) + ' 条发言'),
                              h('span', null, item.rawDropped ? '原文已归档' : '原文保留')
                            )
                          )))
                        : h('div', { className: 'bw-empty-small' }, '还没有会议纪要')
                      )
                    : h(AssignmentList, { assignments, onSelect: setSelected })
                )
          )
        )
      );
    }

    function Workbench({ presentation, onDeleteSchedule, getRpc }) {
      const [snap, setSnap] = React.useState(null);
      const [officeOpen, setOfficeOpen] = React.useState(false);
      const [deletingId, setDeletingId] = React.useState('');
      const [notice, setNotice] = React.useState('');
      const [meeting, setMeeting] = React.useState(null);
      const [meetingPanelOpen, setMeetingPanelOpen] = React.useState(false);
      const [meetingInput, setMeetingInput] = React.useState('');
      const [meetingMessages, setMeetingMessages] = React.useState([]);
      const [meetingBusy, setMeetingBusy] = React.useState(false);
      const [meetingError, setMeetingError] = React.useState('');
      const [meetings, setMeetings] = React.useState([]);
      const [meetingsLoaded, setMeetingsLoaded] = React.useState(false);
      const [recoverable, setRecoverable] = React.useState(null);
      const [autoSummary, setAutoSummary] = React.useState(false);
      const [summaryBusy, setSummaryBusy] = React.useState('');
      const [quota, setQuota] = React.useState(null);
      const [minutesOpen, setMinutesOpen] = React.useState(null);
      const [minutesSearch, setMinutesSearch] = React.useState('');
      const [minutesModelKey, setMinutesModelKey] = React.useState('default');
      const [projects, setProjects] = React.useState([]);
      const [projectOpen, setProjectOpen] = React.useState(false);
      const [projectSelected, setProjectSelected] = React.useState(null);
      const [projectBusy, setProjectBusy] = React.useState(false);
      const [projectError, setProjectError] = React.useState('');
      const [projectDraft, setProjectDraft] = React.useState({ title: '', goal: '', members: [], leadSlug: '' });
      const [projectTaskDraft, setProjectTaskDraft] = React.useState({ title: '', ownerSlug: '' });
      const [projectAddSlug, setProjectAddSlug] = React.useState('');
      const [modelCatalog, setModelCatalog] = React.useState({ models: [], defaultModel: null });
      const [summarySettings, setSummarySettings] = React.useState({ mode: 'default', hasApiKey: false });
      const [modelSettingsOpen, setModelSettingsOpen] = React.useState(false);
      const [modelDraft, setModelDraft] = React.useState({ mode: 'default', provider: '', model: '', modelName: '', baseURL: '' });
      const [apiKeyDraft, setApiKeyDraft] = React.useState('');
      const [error, setError] = React.useState('');
      const [live, setLive] = React.useState({});
      const [selected, setSelected] = React.useState(null);
      const [detail, setDetail] = React.useState(null);
      const [detailError, setDetailError] = React.useState('');
      const [tick, setTick] = React.useState(0);

      const load = React.useCallback(async (signal) => {
        try {
          const response = await fetch('/bot-workbench/api/live', { signal, cache: 'no-store' });
          const body = await response.json();
          if (!body.ok) throw new Error(body.error || '读取失败');
          setSnap(body);
          setError('');
        } catch (err) {
          if (err && err.name === 'AbortError') return;
          setError(String(err && err.message ? err.message : err));
        }
      }, []);

      React.useEffect(() => {
        const controller = new AbortController();
        void load(controller.signal);
        const timer = setInterval(() => {
          void load(controller.signal);
          setTick((n) => n + 1);
        }, 5000);
        return () => {
          controller.abort();
          clearInterval(timer);
        };
      }, [load]);

      const loadMeetings = React.useCallback(async () => {
        try {
          const response = await fetch('/bot-workbench/api/meetings', { cache: 'no-store' });
          const body = await response.json();
          if (body.ok) {
            setMeetings(body.meetings || []);
            setMeetingsLoaded(true);
            if (body.quota && body.quota.over && body.quota.over.length) {
              const pending = body.quota.over.filter((item) => !suppressedQuota.current.has(item.id));
              if (pending.length) setQuota({ ...body.quota, over: pending });
            }
          }
        } catch {
          // keep the last list
        }
      }, []);
      const loadProjects = React.useCallback(async () => {
        try {
          const response = await fetch('/bot-workbench/api/projects', { cache: 'no-store' });
          const body = await response.json();
          if (body.ok) setProjects(body.projects || []);
        } catch {
          // keep the last list
        }
      }, []);
      const loadModelSettings = React.useCallback(async () => {
        try {
          const [modelsResponse, settingsResponse] = await Promise.all([
            fetch('/bot-workbench/api/models', { cache: 'no-store' }),
            fetch('/bot-workbench/api/settings', { cache: 'no-store' }),
          ]);
          const models = await modelsResponse.json();
          const settings = await settingsResponse.json();
          if (models.ok) setModelCatalog({ models: models.models || [], defaultModel: models.defaultModel || null });
          if (settings.ok && settings.settings && settings.settings.summaryModel) {
            const model = { ...settings.settings.summaryModel, hasApiKey: Boolean(settings.settings.hasApiKey) };
            setSummarySettings(model);
            setModelDraft({
              mode: model.mode || 'default',
              provider: model.provider || '',
              model: model.model || '',
              modelName: model.modelName || '',
              baseURL: model.baseURL || '',
            });
          }
        } catch {
          // keep defaults
        }
      }, []);
      React.useEffect(() => {
        try {
          setAutoSummary(window.localStorage.getItem('bw-auto-summary') === '1');
        } catch {
          setAutoSummary(false);
        }
        void loadMeetings();
        void loadProjects();
        void loadModelSettings();
      }, [loadMeetings, loadProjects, loadModelSettings]);
      const cleanupRef = React.useRef(false);
      const suppressedQuota = React.useRef(new Set());
      React.useEffect(() => {
        if (cleanupRef.current || !meetingsLoaded) return;
        cleanupRef.current = true;
        const active = meetings.filter((item) => item.active && item.channelId);
        if (active.length) setRecoverable(active[0]);
      }, [meetings, meetingsLoaded]);

      React.useEffect(() => {
        if (!presentation) return undefined;
        let views = new Map();
        let offs = [];
        let timer = null;
        const read = () => {
          const out = {};
          for (const [id, view] of views) {
            try {
              out[id] = view.getSnapshot();
            } catch {
              // A bot may be disposed between rebuilds.
            }
          }
          setLive(out);
        };
        const rebuild = () => {
          let list = [];
          try {
            list = presentation.bots();
          } catch {
            list = [];
          }
          const keep = new Map();
          for (const bot of list) {
            const id = String(bot.id);
            if (!views.has(id)) views.set(id, presentation.acquire(id));
            keep.set(id, views.get(id));
          }
          for (const [id, view] of views) {
            if (keep.has(id)) continue;
            try { view.dispose(); } catch { /* ignore */ }
            views.delete(id);
          }
          offs.forEach((off) => { try { off(); } catch { /* ignore */ } });
          offs = [...views.values()].map((view) => {
            try { return view.subscribe(read); } catch { return () => {}; }
          });
          read();
        };
        rebuild();
        timer = setInterval(rebuild, 5000);
        return () => {
          clearInterval(timer);
          offs.forEach((off) => { try { off(); } catch { /* ignore */ } });
          for (const view of views.values()) {
            try { view.dispose(); } catch { /* ignore */ }
          }
          views = new Map();
        };
      }, [presentation]);

      React.useEffect(() => {
        if (!selected) {
          setDetail(null);
          setDetailError('');
          return undefined;
        }
        const controller = new AbortController();
        setDetail(null);
        setDetailError('');
        fetch('/bot-workbench/api/bot/' + encodeURIComponent(selected), { signal: controller.signal, cache: 'no-store' })
          .then((response) => response.json())
          .then((body) => {
            if (body.ok) setDetail(body);
            else setDetailError(body.error || '读取失败');
          })
          .catch((err) => {
            if (err && err.name === 'AbortError') return;
            setDetailError(String(err && err.message ? err.message : err));
          });
        return () => controller.abort();
      }, [selected]);

      const bots = snap ? snap.bots : [];
      const taskByBot = React.useMemo(() => {
        const map = {};
        for (const task of (snap && snap.tasks) || []) map[task.botSlug] = task;
        return map;
      }, [snap]);
      const bySlug = React.useMemo(() => {
        const map = {};
        for (const [id, state] of Object.entries(live)) {
          const match = bots.find((bot) => bot.slug === id || bot.name === state.name);
          if (match) map[match.slug] = state;
        }
        return map;
      }, [live, bots]);

      const statusOf = React.useCallback((bot) => {
        const state = bySlug[bot.slug];
        return (state && state.activity) || 'idle';
      }, [bySlug]);

      const sorted = React.useMemo(() => {
        const rank = (bot) => {
          const s = statusOf(bot);
          return s === 'working' || s === 'thinking' ? 0 : s === 'waiting' || s === 'blocked' ? 1 : 2;
        };
        return [...bots].sort((a, b) => rank(a) - rank(b) || String(a.name).localeCompare(String(b.name)));
      }, [bots, statusOf]);

      const working = bots.filter((bot) => ['working', 'thinking'].includes(statusOf(bot))).length;
      const waiting = bots.filter((bot) => ['waiting', 'blocked'].includes(statusOf(bot))).length;
      const attention = bots.reduce((sum, bot) => {
        const a = bySlug[bot.slug] && bySlug[bot.slug].attention;
        if (!a) return sum + (bot.attention || 0);
        return sum + Object.values(a).reduce((n, v) => n + (Number(v) || 0), 0);
      }, 0);

      const feed = snap ? snap.feed.slice(0, 18) : [];
      const allTasks = snap ? (snap.tasks || []) : [];
      const hotTasks = allTasks.filter((task) => task.context && task.context.pct >= 90);
      const assignments = snap ? (snap.assignments || []) : [];
      const schedules = snap ? (snap.schedules || []) : [];
      const enabledSchedules = schedules.filter((schedule) => schedule.enabled).length;
      const filteredMeetings = meetings.filter((item) => {
        const query = minutesSearch.trim().toLowerCase();
        if (!query) return true;
        return String(item.title || '').toLowerCase().includes(query)
          || String(item.summary || '').toLowerCase().includes(query);
      });
      const selectedBot = selected ? bots.find((bot) => bot.slug === selected) : null;
      const selectedLive = selected ? bySlug[selected] : null;
      const selectedTask = selected ? taskByBot[selected] : null;
      const selectedState = selectedLive ? selectedLive.activity : selectedBot ? statusOf(selectedBot) : 'idle';

      const close = () => setSelected(null);
      const handleDeleteSchedule = async (schedule) => {
        if (!onDeleteSchedule) return;
        setDeletingId(schedule.id);
        setNotice('');
        try {
          const ok = await onDeleteSchedule(schedule);
          if (ok) {
            setNotice('已删除定时任务：' + (schedule.title || schedule.id));
            await load();
          }
        } catch (error) {
          setNotice('删除失败：' + String(error && error.message ? error.message : error));
        } finally {
          setDeletingId('');
        }
      };
      React.useEffect(() => {
        if (!officeOpen) return undefined;
        const onKey = (event) => {
          if (event.key === 'Escape') setOfficeOpen(false);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
      }, [officeOpen]);

      const groups = snap ? (snap.groups || []) : [];
      const botNameOf = (slug) => {
        const bot = bots.find((b) => b.slug === slug);
        return bot ? bot.name : slug;
      };
      const rpcCall = async (endpoint, args) => {
        const rpc = getRpc ? getRpc() : null;
        if (!rpc) throw new Error('Tobs 连接不可用');
        const result = await rpc.call('/api', 'botharness/' + endpoint, { args });
        if (!result || !result.ok) throw new Error((result && result.error && result.error.message) || 'Tobs 调用失败');
        return result.value;
      };
      const makeMeeting = (participants) => {
        const startedAt = new Date().toISOString();
        return {
          id: 'meeting-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
          title: '会议 · ' + new Date().toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
          startedAt,
          endedAt: null,
          active: true,
          mode: null,
          groupName: '',
          channelId: null,
          originalMembers: [],
          tempAdded: [],
          participants,
        };
      };
      const persistMeeting = async (next, messagesOverride) => {
        if (!next || !next.id) return null;
        const messages = (messagesOverride || meetingMessages || []).map((message) => ({
          at: message.at || '',
          author: message.authorName || message.author || '系统',
          text: String(message.text || ''),
        }));
        try {
          const response = await fetch('/bot-workbench/api/meetings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...next,
              participants: (next.participants || []).map((slug) => ({ slug, name: botNameOf(slug) })),
              messages,
              autoSummary,
            }),
          });
          const body = await response.json();
          if (body && body.ok) {
            setMeetings(body.meetings || []);
            if (body.quota && body.quota.over && body.quota.over.length) {
              const pending = body.quota.over.filter((item) => !suppressedQuota.current.has(item.id));
              if (pending.length) setQuota({ ...body.quota, over: pending });
            }
            return body.meeting;
          }
        } catch {
          // keep the meeting usable even when the record file cannot be written
        }
        return null;
      };
      const summarizeMeeting = async (id, modelOverride) => {
        if (!id) return false;
        setSummaryBusy(id);
        setNotice('');
        try {
          const response = await fetch('/bot-workbench/api/meetings/' + encodeURIComponent(id) + '/summarize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(modelOverride ? { model: modelOverride } : {}),
          });
          const body = await response.json();
          if (!body.ok) throw new Error(body.error || '生成纪要失败');
          setNotice('会议纪要已生成');
          await loadMeetings();
          if (minutesOpen && minutesOpen.id === id) {
            const detail = await fetch('/bot-workbench/api/meetings/' + encodeURIComponent(id), { cache: 'no-store' }).then((r) => r.json());
            if (detail.ok) setMinutesOpen(detail.meeting);
          }
          return true;
        } catch (error) {
          setNotice('生成纪要失败：' + String(error && error.message ? error.message : error));
          return false;
        } finally {
          setSummaryBusy('');
        }
      };
      const archiveMeetingRaw = async (id) => {
        setSummaryBusy(id);
        try {
          const response = await fetch('/bot-workbench/api/meetings/' + encodeURIComponent(id) + '/archive-raw', { method: 'POST' });
          const body = await response.json();
          if (!body.ok) throw new Error(body.error || '归档失败');
          await loadMeetings();
          setQuota((current) => {
            if (!current) return null;
            const over = current.over.filter((item) => item.id !== id);
            return over.length ? { ...current, over, rawCount: current.rawCount - 1 } : null;
          });
        } catch (error) {
          setNotice('归档失败：' + String(error && error.message ? error.message : error));
        } finally {
          setSummaryBusy('');
        }
      };
      const exportMeeting = async (id) => {
        setSummaryBusy(id);
        try {
          const response = await fetch('/bot-workbench/api/meetings/' + encodeURIComponent(id) + '/export', { method: 'POST' });
          const body = await response.json();
          if (!body.ok) throw new Error(body.error || '导出失败');
          setNotice('已导出 Markdown：' + body.markdownPath);
          await loadMeetings();
        } catch (error) {
          setNotice('导出失败：' + String(error && error.message ? error.message : error));
        } finally {
          setSummaryBusy('');
        }
      };
      const openMinutes = async (id) => {
        try {
          const response = await fetch('/bot-workbench/api/meetings/' + encodeURIComponent(id), { cache: 'no-store' });
          const body = await response.json();
          if (body.ok) {
            setMinutesOpen(body.meeting);
            setMinutesModelKey(modelKeyOf(body.meeting.summaryModel || summarySettings));
          }
        } catch {
          // ignore
        }
      };
      const renameMeeting = async (id, currentTitle) => {
        const title = window.prompt('会议标题', currentTitle || '');
        if (!title || !title.trim()) return;
        try {
          const response = await fetch('/bot-workbench/api/meetings/' + encodeURIComponent(id) + '/rename', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: title.trim() }),
          });
          const body = await response.json();
          if (!body.ok) throw new Error(body.error || '重命名失败');
          await loadMeetings();
          if (minutesOpen && minutesOpen.id === id) setMinutesOpen({ ...minutesOpen, title: title.trim() });
        } catch (error) {
          setNotice('重命名失败：' + String(error && error.message ? error.message : error));
        }
      };
      const deleteMeeting = async (id) => {
        if (!window.confirm('删除这条会议纪要？Markdown 文件也会一起删除。')) return;
        try {
          const response = await fetch('/bot-workbench/api/meetings/' + encodeURIComponent(id) + '/delete', { method: 'POST' });
          const body = await response.json();
          if (!body.ok) throw new Error(body.error || '删除失败');
          setMinutesOpen(null);
          await loadMeetings();
        } catch (error) {
          setNotice('删除会议失败：' + String(error && error.message ? error.message : error));
        }
      };
      const projectNameOf = (slug) => {
        const bot = (snap && snap.bots ? snap.bots : []).find((item) => item.slug === slug);
        return bot ? bot.name : slug;
      };
      const saveProjectRecord = async (project) => {
        const response = await fetch('/bot-workbench/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(project),
        });
        const body = await response.json();
        if (!body.ok) throw new Error(body.error || '保存项目失败');
        setProjects(body.projects || []);
        return body.project;
      };
      const createProject = async ({ title, goal, memberSlugs, leadSlug, meetingId }) => {
        const cleanTitle = String(title || '').trim();
        if (!cleanTitle) throw new Error('项目名不能为空');
        if (!memberSlugs.length) throw new Error('项目至少要有一个成员');
        const now = new Date().toISOString();
        const project = await saveProjectRecord({
          title: cleanTitle,
          goal: String(goal || ''),
          status: 'active',
          leadSlug: leadSlug || memberSlugs[0],
          members: memberSlugs.map((slug) => ({
            slug,
            name: projectNameOf(slug),
            kind: 'permanent',
            source: meetingId ? 'meeting' : 'initial',
            joinedAt: now,
          })),
          tasks: [],
          meetingIds: meetingId ? [meetingId] : [],
          createdAt: now,
        });
        try {
          const created = await rpcCall('channelCreate', { name: '项目 · ' + cleanTitle, members: [] });
          const channelId = created && created.channel ? created.channel.id : '';
          if (!channelId) throw new Error('创建项目群失败');
          for (const slug of memberSlugs) await rpcCall('channelGroupInvite', { channelId, botSlug: slug });
          const saved = await saveProjectRecord({ ...project, groupId: channelId, groupName: '项目 · ' + cleanTitle });
          setProjectSelected(saved);
          return saved;
        } catch (error) {
          setProjectError('项目已创建，但项目群创建失败：' + String(error && error.message ? error.message : error));
          setProjectSelected(project);
          return project;
        }
      };
      const addProjectMember = async (project, slug, kind = 'temporary') => {
        if (!project || !slug) return;
        if (project.members.some((item) => item.slug === slug)) return;
        if (project.groupId) await rpcCall('channelGroupInvite', { channelId: project.groupId, botSlug: slug });
        const next = {
          ...project,
          members: [...project.members, {
            slug,
            name: projectNameOf(slug),
            kind,
            source: 'invited',
            joinedAt: new Date().toISOString(),
          }],
        };
        const saved = await saveProjectRecord(next);
        setProjectSelected(saved);
        return saved;
      };
      const setProjectMemberKind = async (project, slug, kind) => {
        if (!project) return;
        const next = {
          ...project,
          members: project.members.map((item) => item.slug === slug ? { ...item, kind } : item),
        };
        const saved = await saveProjectRecord(next);
        setProjectSelected(saved);
        return saved;
      };
      const removeProjectMember = async (project, slug) => {
        if (!project) return;
        if (project.groupId) {
          try { await rpcCall('channelGroupMemberRemove', { channelId: project.groupId, botSlug: slug }); } catch { /* already gone */ }
        }
        const next = { ...project, members: project.members.filter((item) => item.slug !== slug) };
        const saved = await saveProjectRecord(next);
        setProjectSelected(saved);
        return saved;
      };
      const addProjectTask = async (project, title, ownerSlug) => {
        if (!project) return;
        const clean = String(title || '').trim();
        if (!clean) throw new Error('任务名不能为空');
        if (!ownerSlug) throw new Error('任务必须有负责人');
        const next = {
          ...project,
          tasks: [...(project.tasks || []), {
            id: 'task-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5),
            title: clean,
            ownerSlug,
            status: 'todo',
            assignmentSessionId: '',
            ownerHistory: [],
            createdAt: new Date().toISOString(),
          }],
        };
        const saved = await saveProjectRecord(next);
        setProjectSelected(saved);
        return saved;
      };
      const endProject = async (project) => {
        if (!project) return;
        const temps = (project.members || []).filter((item) => item.kind === 'temporary');
        for (const member of temps) {
          if (!project.groupId) continue;
          try { await rpcCall('channelGroupMemberRemove', { channelId: project.groupId, botSlug: member.slug }); } catch { /* already gone */ }
        }
        const saved = await saveProjectRecord({
          ...project,
          status: 'ended',
          endedAt: new Date().toISOString(),
          members: (project.members || []).filter((item) => item.kind !== 'temporary'),
        });
        setProjectSelected(saved);
        return saved;
      };
      const createProjectFromMeeting = async () => {
        const current = meeting;
        if (!current || !current.participants || !current.participants.length) return;
        const title = window.prompt('项目名', current.title || '新项目');
        if (!title || !title.trim()) return;
        setProjectBusy(true);
        setProjectError('');
        try {
          const project = await createProject({
            title: title.trim(),
            goal: current.title || '',
            memberSlugs: current.participants.slice(),
            leadSlug: current.participants[0],
            meetingId: current.id,
          });
          setProjectSelected(project);
          setProjectOpen(true);
          await endMeeting();
        } catch (error) {
          setProjectError(String(error && error.message ? error.message : error));
        } finally {
          setProjectBusy(false);
        }
      };
      const restoreRecoveredMeeting = async (record) => {
        try {
          const response = await fetch('/bot-workbench/api/meetings/' + encodeURIComponent(record.id), { cache: 'no-store' });
          const body = await response.json();
          if (!body.ok) throw new Error('读取会议失败');
          const full = body.meeting;
          const participants = (full.participants || []).map((item) => (typeof item === 'string' ? item : item.slug)).filter(Boolean);
          setMeeting({
            id: full.id,
            title: full.title,
            startedAt: full.startedAt,
            active: true,
            mode: full.mode,
            groupName: full.groupName,
            channelId: full.channelId,
            originalMembers: full.originalMembers || [],
            tempAdded: full.tempAdded || [],
            participants,
            summaryModel: full.summaryModel || null,
          });
          setMeetingMessages((full.messages || []).map((message) => ({
            at: message.at,
            authorName: message.author,
            text: message.text,
          })));
          setRecoverable(null);
          setNotice('已恢复上次会议');
        } catch (error) {
          setNotice('恢复会议失败：' + String(error && error.message ? error.message : error));
        }
      };
      const discardRecoveredMeeting = async (record) => {
        const rpc = getRpc ? getRpc() : null;
        try {
          if (rpc && record.channelId) {
            if (record.mode === 'temporary') {
              await rpc.call('/api', 'botharness/channelGroupDelete', { args: { channelId: record.channelId } });
            } else {
              for (const slug of record.tempAdded || []) {
                try {
                  await rpc.call('/api', 'botharness/channelGroupMemberRemove', { args: { channelId: record.channelId, botSlug: slug } });
                } catch {
                  // already removed
                }
              }
            }
          }
          await fetch('/bot-workbench/api/meetings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: record.id, active: false, endedAt: new Date().toISOString() }),
          });
          setRecoverable(null);
          await loadMeetings();
        } catch (error) {
          setNotice('结束上次会议失败：' + String(error && error.message ? error.message : error));
        }
      };
      const modelKeyOf = (model) => {
        if (!model || model.mode === 'default' || !model.mode) return 'default';
        if (model.mode === 'custom') return 'custom';
        return String(model.provider || '') + '|' + String(model.model || '');
      };
      const selectionFromKey = (key) => {
        if (key === 'custom') {
          return {
            mode: 'custom',
            baseURL: summarySettings.baseURL || '',
            model: summarySettings.model || '',
            modelName: summarySettings.modelName || summarySettings.model || '自定义 API',
          };
        }
        if (key === 'default' || !key) return { mode: 'default' };
        const [provider, model] = key.split('|');
        const found = (modelCatalog.models || []).find((item) => item.provider === provider && item.model === model);
        return {
          mode: 'dsh',
          provider,
          model,
          modelName: found ? found.name : model,
        };
      };
      const setMeetingModel = (key) => {
        if (!meeting) return;
        setMeeting({ ...meeting, summaryModel: selectionFromKey(key) });
      };
      const saveModelSettings = async () => {
        try {
          const model = {
            mode: modelDraft.mode,
            provider: modelDraft.provider,
            model: modelDraft.model,
            modelName: modelDraft.modelName,
            baseURL: modelDraft.baseURL,
          };
          const response = await fetch('/bot-workbench/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ summaryModel: model, ...(apiKeyDraft.trim() ? { apiKey: apiKeyDraft.trim() } : {}) }),
          });
          const body = await response.json();
          if (!body.ok) throw new Error(body.error || '保存失败');
          const saved = { ...body.settings.summaryModel, hasApiKey: body.settings.hasApiKey };
          setSummarySettings(saved);
          setModelDraft({
            mode: saved.mode || 'default',
            provider: saved.provider || '',
            model: saved.model || '',
            modelName: saved.modelName || '',
            baseURL: saved.baseURL || '',
          });
          setApiKeyDraft('');
          setModelSettingsOpen(false);
          setNotice('纪要模型设置已保存');
        } catch (error) {
          setNotice('保存纪要模型失败：' + String(error && error.message ? error.message : error));
        }
      };
      const testModelConnection = async () => {
        setSummaryBusy('test');
        setNotice('正在测试纪要模型连接…');
        try {
          if (apiKeyDraft.trim()) {
            await fetch('/bot-workbench/api/settings', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                summaryModel: {
                  mode: modelDraft.mode,
                  provider: modelDraft.provider,
                  model: modelDraft.model,
                  modelName: modelDraft.modelName,
                  baseURL: modelDraft.baseURL,
                },
                apiKey: apiKeyDraft.trim(),
              }),
            });
            setApiKeyDraft('');
          }
          const response = await fetch('/bot-workbench/api/settings/test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: modelDraft }),
          });
          const body = await response.json();
          if (!body.ok) throw new Error(body.error || '连接失败');
          setNotice('连接成功：' + (body.reply || 'OK'));
        } catch (error) {
          setNotice('连接测试失败：' + String(error && error.message ? error.message : error));
        } finally {
          setSummaryBusy('');
        }
      };
      const chooseGroup = (participantSlugs) => {
        let best = null;
        let bestScore = 0;
        for (const group of groups) {
          const score = participantSlugs.filter((slug) => group.members.includes(slug)).length;
          if (score > bestScore || (score === bestScore && best && String(group.updatedAt) > String(best.updatedAt))) {
            best = group;
            bestScore = score;
          }
        }
        return bestScore >= 2 ? { group: best, score: bestScore } : null;
      };
      const ensureMeetingChannel = async (participantSlugs) => {
        if (!participantSlugs.length) throw new Error('会议室里还没有 Bot');
        const stamp = new Date().toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
        const created = await rpcCall('channelCreate', { name: '会议室 · ' + stamp, members: [] });
        const channelId = created && created.channel ? created.channel.id : '';
        if (!channelId) throw new Error('创建临时会议群失败');
        for (const slug of participantSlugs) await rpcCall('channelGroupInvite', { channelId, botSlug: slug });
        const next = {
          ...(meeting || makeMeeting(participantSlugs)),
          channelId,
          mode: 'temporary',
          groupName: '临时会议室',
          title: '临时会议室 · ' + new Date().toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
          originalMembers: [],
          tempAdded: participantSlugs.slice(),
          participants: participantSlugs,
        };
        setMeeting(next);
        return next;
      };
      const addToMeeting = async (slug) => {
        if (!slug) return;
        const current = meeting;
        if (current && current.participants.includes(slug)) return;
        const participants = [...(current ? current.participants : []), slug];
        if (participants.length > 8) {
          setMeetingError('会议室最多 8 位 Bot');
          return;
        }
        if (!current || !current.channelId) {
          const next = { ...(current || makeMeeting(participants)), participants };
          setMeeting(next);
          void persistMeeting(next, current ? meetingMessages : []);
          return;
        }
        setMeetingBusy(true);
        setMeetingError('');
        try {
          if (current.mode === 'temporary') {
            await rpcCall('channelGroupInvite', { channelId: current.channelId, botSlug: slug });
            setMeeting({ ...current, participants, tempAdded: [...new Set([...(current.tempAdded || []), slug])] });
          } else if (!current.originalMembers.includes(slug)) {
            await rpcCall('channelGroupInvite', { channelId: current.channelId, botSlug: slug });
            setMeeting({ ...current, participants, tempAdded: [...new Set([...(current.tempAdded || []), slug])] });
          } else {
            setMeeting({ ...current, participants });
          }
        } catch (error) {
          setMeetingError(String(error && error.message ? error.message : error));
        } finally {
          setMeetingBusy(false);
        }
      };
      const removeFromMeeting = async (slug) => {
        const current = meeting;
        if (!current) return;
        const participants = current.participants.filter((item) => item !== slug);
        setMeetingBusy(true);
        setMeetingError('');
        try {
          if (current.channelId) {
            if (current.mode === 'temporary' || (current.tempAdded || []).includes(slug)) {
              await rpcCall('channelGroupMemberRemove', { channelId: current.channelId, botSlug: slug });
            }
          }
          if (!participants.length) {
            if (current.channelId && current.mode === 'temporary') {
              await rpcCall('channelGroupDelete', { channelId: current.channelId });
            }
            setMeeting(null);
            setMeetingMessages([]);
          } else {
            setMeeting({
              ...current,
              participants,
              tempAdded: (current.tempAdded || []).filter((item) => item !== slug),
            });
          }
        } catch (error) {
          setMeetingError(String(error && error.message ? error.message : error));
        } finally {
          setMeetingBusy(false);
        }
      };
      const endMeeting = async () => {
        const current = meeting;
        if (!current) return;
        setMeetingBusy(true);
        setMeetingError('');
        try {
          const ended = { ...current, active: false, endedAt: new Date().toISOString() };
          await persistMeeting(ended, meetingMessages);
          if (autoSummary && meetingMessages.length) {
            await summarizeMeeting(ended.id, ended.summaryModel || summarySettings);
          }
          if (current.channelId) {
            if (current.mode === 'temporary') {
              await rpcCall('channelGroupDelete', { channelId: current.channelId });
            } else {
              for (const slug of current.tempAdded || []) {
                try {
                  await rpcCall('channelGroupMemberRemove', { channelId: current.channelId, botSlug: slug });
                } catch {
                  // a temporary member may already have left
                }
              }
            }
          }
          setMeeting(null);
          setMeetingMessages([]);
          setMeetingInput('');
          setMeetingPanelOpen(false);
        } catch (error) {
          setMeetingError(String(error && error.message ? error.message : error));
        } finally {
          setMeetingBusy(false);
        }
      };
      const loadMeetingMessages = async (channelId) => {
        if (!channelId) return;
        try {
          const response = await fetch('/bot-workbench/api/channel-messages/' + encodeURIComponent(channelId), { cache: 'no-store' });
          const body = await response.json();
          if (body.ok) setMeetingMessages(body.messages || []);
        } catch {
          // keep the last transcript
        }
      };
      const sendMeeting = async () => {
        const text = meetingInput.trim();
        if (!text || meetingBusy) return;
        let current = meeting;
        if (!current || !current.channelId) {
          const participants = current ? current.participants : [];
          const detail = '将新建一个临时会议群。\n参与：' + participants.map(botNameOf).join('、')
            + '\n会议结束后临时群会自动删除；如果立项，会另建项目群。';
          if (!window.confirm(detail + '\n\n确认开始这场会议？')) return;
        }
        setMeetingBusy(true);
        setMeetingError('');
        try {
          if (!current || !current.channelId) current = await ensureMeetingChannel(current ? current.participants : []);
          const parts = [];
          const mentions = [];
          let offset = 0;
          for (const slug of current.participants) {
            const label = botNameOf(slug);
            const token = '@' + label;
            mentions.push({ botSlug: slug, label, start: offset, end: offset + token.length });
            parts.push(token + ' ');
            offset += token.length + 1;
          }
          const body = parts.join('') + text;
          await rpcCall('channelSend', { channelId: current.channelId, body, mentions });
          setMeetingInput('');
          await loadMeetingMessages(current.channelId);
        } catch (error) {
          setMeetingError(String(error && error.message ? error.message : error));
        } finally {
          setMeetingBusy(false);
        }
      };
      React.useEffect(() => {
        const onMessage = (event) => {
          if (event.origin !== window.location.origin) return;
          const data = event.data || {};
          if (data.type === 'bot-workbench-open-meeting') {
            setMeetingPanelOpen(true);
          } else if (data.type === 'bot-workbench-invite-meeting' && typeof data.slug === 'string' && data.slug) {
            setMeetingPanelOpen(true);
            void addToMeeting(data.slug);
          }
        };
        window.addEventListener('message', onMessage);
        return () => window.removeEventListener('message', onMessage);
      }, [meeting]);
      React.useEffect(() => {
        if (!meeting || !meeting.channelId) return undefined;
        void loadMeetingMessages(meeting.channelId);
        const timer = setInterval(() => void loadMeetingMessages(meeting.channelId), 3000);
        return () => clearInterval(timer);
      }, [meeting && meeting.channelId]);
      React.useEffect(() => {
        if (!meeting || !meeting.id) return undefined;
        const timer = setTimeout(() => void persistMeeting(meeting, meetingMessages), 900);
        return () => clearTimeout(timer);
      }, [meeting, meetingMessages]);

      const meetingModelKey = modelKeyOf(meeting && meeting.summaryModel ? meeting.summaryModel : summarySettings);
      const meetingModelOptions = [
        { key: 'default', label: '默认模型' },
        ...(modelCatalog.models || []).map((item) => ({
          key: item.provider + '|' + item.model,
          label: item.providerName + ' · ' + item.name,
        })),
        { key: 'custom', label: '自定义 API' },
      ];

      const officeModal = officeOpen
        ? h('div', { className: 'bw-office-backdrop', onClick: () => setOfficeOpen(false) },
            h('div', { className: 'bw-office-modal bw-office-modal-3d', onClick: (event) => event.stopPropagation() },
              h('div', { className: 'bw-office-iframe-wrap' },
                h('iframe', {
                  className: 'bw-office-iframe',
                  src: '/bot-workbench/office/?v=20261112-3',
                  title: 'Live 3D 办公室',
                  allow: 'fullscreen',
                }),
                h('button', { className: 'bw-office-close bw-office-3d-close', type: 'button', onClick: () => setOfficeOpen(false), 'aria-label': '关闭办公室' }, '关闭办公室 ×')
              )
            )
          )
        : null;


      const portal = (node) => (ReactDOM && typeof ReactDOM.createPortal === 'function' ? ReactDOM.createPortal(node, document.body) : node);
      const meetingPanel = meetingPanelOpen
        ? portal(h('div', { className: 'bw-minutes-backdrop', onClick: () => setMeetingPanelOpen(false) },
            h('div', { className: 'bw-minutes-modal bw-meeting-panel', onClick: (event) => event.stopPropagation() },
              h('div', { className: 'bw-minutes-head' },
                h('div', null,
                  h('div', { className: 'bw-minutes-modal-title' }, '会议室'),
                  h('div', { className: 'bw-minutes-modal-sub' }, meeting
                    ? (meeting.channelId ? '临时会议群已建立 · ' + meeting.participants.length + ' 位 Bot' : '还没有开会，发送第一条议题时建临时群')
                    : '选择 Bot 后发送议题，自动创建临时会议群')
                ),
                h('button', { className: 'bw-close', type: 'button', onClick: () => setMeetingPanelOpen(false), 'aria-label': '关闭' }, '×')
              ),
              meeting && meeting.participants && meeting.participants.length
                ? h('div', null,
                    h('div', { className: 'bw-meeting-people' },
                      meeting.participants.map((slug) => h('span', { className: 'bw-meeting-person', key: slug },
                        botNameOf(slug),
                        h('button', {
                          className: 'bw-meeting-remove',
                          type: 'button',
                          onClick: () => removeFromMeeting(slug),
                          'aria-label': '移出会议室',
                        }, '×')
                      ))
                    ),
                    h('div', { className: 'bw-meeting-thread' },
                      (meetingMessages || []).map((message, index) => h('div', { className: 'bw-meeting-message', key: message.id || index },
                        h('b', null, message.author || 'Bot'),
                        h('p', null, message.text || '')
                      )),
                      !meetingMessages.length ? h('div', { className: 'bw-empty-small' }, '还没有发言。发送第一条议题后自动建临时群。') : null
                    ),
                    meetingError ? h('div', { className: 'bw-error' }, meetingError) : null,
                    h('div', { className: 'bw-meeting-compose' },
                      h('input', {
                        className: 'bw-model-input',
                        placeholder: meeting.channelId ? '说点什么…' : '输入第一条议题…',
                        value: meetingInput,
                        onChange: (event) => setMeetingInput(event.target.value),
                        onKeyDown: (event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void sendMeeting(); } },
                      }),
                      h('button', { className: 'bw-meeting-send', type: 'button', disabled: meetingBusy || !meetingInput.trim(), onClick: () => void sendMeeting() }, meetingBusy ? '发送中…' : '发送'),
                      h('button', { className: 'bw-office-tool', type: 'button', disabled: meetingBusy, onClick: () => void endMeeting() }, '结束会议')
                    )
                  )
                : h('div', null,
                    h('div', { className: 'bw-empty-small' }, '把 Bot 加进会议室：'),
                    h('div', { className: 'bw-meeting-pick' },
                      (bots || []).map((bot) => h('button', {
                        className: 'bw-office-tool',
                        type: 'button',
                        key: bot.slug,
                        onClick: () => void addToMeeting(bot.slug),
                      }, bot.name))
                    )
                  )
            )
          ))
        : null;
      const minutesModal = minutesOpen
        ? portal(h('div', { className: 'bw-minutes-backdrop', onClick: () => setMinutesOpen(null) },
            h('div', { className: 'bw-minutes-modal', onClick: (event) => event.stopPropagation() },
              h('div', { className: 'bw-minutes-head' },
                h('div', null,
                  h('div', { className: 'bw-minutes-modal-title' }, minutesOpen.title || '会议纪要'),
                  h('div', { className: 'bw-minutes-modal-sub' },
                    (minutesOpen.participants || []).map((p) => (typeof p === 'string' ? p : p.name)).join('、')
                      + ' · ' + rel(minutesOpen.startedAt))
                ),
                h('button', { className: 'bw-close', type: 'button', onClick: () => setMinutesOpen(null), 'aria-label': '关闭' }, '×')
              ),
              minutesOpen.summary
                ? h('pre', { className: 'bw-minutes-markdown' }, minutesOpen.summary)
                : h('div', { className: 'bw-empty-small' }, '还没有生成纪要。点下方「生成纪要」会调用一次模型。'),
              h('div', { className: 'bw-minutes-actions' },
                h('button', { className: 'bw-office-tool', type: 'button', onClick: () => renameMeeting(minutesOpen.id, minutesOpen.title) }, '重命名'),
                h('button', { className: 'bw-office-tool', type: 'button', onClick: () => deleteMeeting(minutesOpen.id) }, '删除'),
                h('select', {
                  className: 'bw-model-input',
                  style: { maxWidth: '220px' },
                  value: minutesModelKey,
                  onChange: (event) => setMinutesModelKey(event.target.value),
                }, [
                  { key: 'default', label: '默认模型' },
                  ...(modelCatalog.models || []).map((item) => ({ key: item.provider + '|' + item.model, label: item.providerName + ' · ' + item.name })),
                  { key: 'custom', label: '自定义 API' },
                ].map((item) => h('option', { key: item.key, value: item.key }, item.label))),
                h('button', {
                  className: 'bw-office-tool',
                  type: 'button',
                  disabled: summaryBusy === minutesOpen.id || !(minutesOpen.messages && minutesOpen.messages.length),
                  onClick: () => summarizeMeeting(minutesOpen.id, selectionFromKey(minutesModelKey)),
                }, summaryBusy === minutesOpen.id ? '生成中…' : '生成纪要'),
                h('button', {
                  className: 'bw-office-tool',
                  type: 'button',
                  disabled: summaryBusy === minutesOpen.id,
                  onClick: () => exportMeeting(minutesOpen.id),
                }, '导出 Markdown'),
                minutesOpen.messages && minutesOpen.messages.length
                  ? h('button', {
                      className: 'bw-office-tool',
                      type: 'button',
                      disabled: summaryBusy === minutesOpen.id,
                      onClick: async () => {
                        if (!window.confirm('归档后只保留纪要和 Markdown，原文会从这个面板移除。确定？')) return;
                        await archiveMeetingRaw(minutesOpen.id);
                        setMinutesOpen(null);
                      },
                    }, '归档原文')
                  : null
              ),
              minutesOpen.messages && minutesOpen.messages.length
                ? h('details', { className: 'bw-minutes-raw' },
                    h('summary', null, '查看原文（' + minutesOpen.messages.length + ' 条）'),
                    ...minutesOpen.messages.map((message, index) => h('div', { className: 'bw-minutes-line', key: index },
                      h('b', null, message.author || '系统'),
                      h('span', { className: 'bw-item-time' }, message.at || ''),
                      h('div', null, message.text || '')
                    ))
                  )
                : null
            )
          ))
        : null;

      const modelSettingsModal = modelSettingsOpen
        ? portal(h('div', { className: 'bw-minutes-backdrop', onClick: () => setModelSettingsOpen(false) },
            h('div', { className: 'bw-model-modal', onClick: (event) => event.stopPropagation() },
              h('div', { className: 'bw-minutes-head' },
                h('div', null,
                  h('div', { className: 'bw-minutes-modal-title' }, '会议纪要模型'),
                  h('div', { className: 'bw-minutes-modal-sub' }, '只影响纪要生成；会议对话仍按各 Bot 自己的模型计费')
                ),
                h('button', { className: 'bw-close', type: 'button', onClick: () => setModelSettingsOpen(false), 'aria-label': '关闭' }, '×')
              ),
              h('div', { className: 'bw-model-row' },
                h('label', null, '方式'),
                h('select', {
                  className: 'bw-model-input',
                  value: modelDraft.mode,
                  onChange: (event) => setModelDraft({ ...modelDraft, mode: event.target.value }),
                },
                  h('option', { value: 'default' }, '跟随 DSH 默认模型'),
                  h('option', { value: 'dsh' }, '选 DSH 已配置模型'),
                  h('option', { value: 'custom' }, '自定义 OpenAI 兼容 API')
                )
              ),
              modelDraft.mode === 'dsh'
                ? h('div', { className: 'bw-model-row' },
                    h('label', null, '模型'),
                    h('select', {
                      className: 'bw-model-input',
                      value: modelDraft.provider + '|' + modelDraft.model,
                      onChange: (event) => {
                        const [provider, model] = event.target.value.split('|');
                        const found = (modelCatalog.models || []).find((item) => item.provider === provider && item.model === model);
                        setModelDraft({ ...modelDraft, provider, model, modelName: found ? found.name : model });
                      },
                    },
                      h('option', { value: '|' }, modelCatalog.models && modelCatalog.models.length ? '选择模型…' : '没有可用模型'),
                      ...(modelCatalog.models || []).map((item) => h('option', {
                        key: item.provider + '|' + item.model,
                        value: item.provider + '|' + item.model,
                      }, item.providerName + ' · ' + item.name))
                    )
                  )
                : null,
              modelDraft.mode === 'custom'
                ? h('div', null,
                    h('div', { className: 'bw-model-row' },
                      h('label', null, 'Base URL'),
                      h('input', {
                        className: 'bw-model-input',
                        value: modelDraft.baseURL,
                        placeholder: 'https://api.example.com/v1',
                        onChange: (event) => setModelDraft({ ...modelDraft, baseURL: event.target.value }),
                      })
                    ),
                    h('div', { className: 'bw-model-row' },
                      h('label', null, '模型名'),
                      h('input', {
                        className: 'bw-model-input',
                        value: modelDraft.model,
                        placeholder: '例如 gpt-4o-mini / deepseek-chat',
                        onChange: (event) => setModelDraft({ ...modelDraft, model: event.target.value }),
                      })
                    ),
                    h('div', { className: 'bw-model-row' },
                      h('label', null, 'API Key'),
                      h('input', {
                        className: 'bw-model-input',
                        type: 'password',
                        value: apiKeyDraft,
                        placeholder: summarySettings.hasApiKey ? '已保存，留空保持不变' : '输入 API Key（只存本机）',
                        onChange: (event) => setApiKeyDraft(event.target.value),
                      })
                    )
                  )
                : null,
              h('div', { className: 'bw-minutes-actions' },
                h('button', { className: 'bw-office-tool', type: 'button', disabled: summaryBusy === 'test', onClick: testModelConnection }, summaryBusy === 'test' ? '测试中…' : '测试连接'),
                h('button', { className: 'bw-meeting-send', type: 'button', onClick: saveModelSettings }, '保存'),
                h('button', { className: 'bw-office-tool', type: 'button', onClick: () => setModelSettingsOpen(false) }, '取消')
              )
            )
          ))
        : null;
      const projectModal = projectOpen
        ? portal(h('div', { className: 'bw-minutes-backdrop', onClick: () => setProjectOpen(false) },
            h('div', { className: 'bw-project-modal', onClick: (event) => event.stopPropagation() },
              h('div', { className: 'bw-minutes-head' },
                h('div', null,
                  h('div', { className: 'bw-minutes-modal-title' }, projectSelected ? projectSelected.title : '项目'),
                  h('div', { className: 'bw-minutes-modal-sub' }, projectSelected
                    ? (projectSelected.status === 'ended' ? '已结束 · 项目群保留归档' : '进行中 · 项目群已建立')
                    : '复杂任务才立项；普通任务直接在群里或私聊派发')
                ),
                h('button', { className: 'bw-close', type: 'button', onClick: () => setProjectOpen(false), 'aria-label': '关闭' }, '×')
              ),
              projectError ? h('div', { className: 'bw-error' }, projectError) : null,
              projectSelected
                ? h('div', null,
                    h('div', { className: 'bw-project-toolbar' },
                      h('button', { className: 'bw-office-tool', type: 'button', onClick: () => { setProjectSelected(null); setProjectError(''); } }, '返回项目列表'),
                      h('span', { className: 'bw-tag' }, projectSelected.groupName || '未建群'),
                      h('span', { className: 'bw-tag' }, (projectSelected.members || []).length + ' 位成员')
                    ),
                    h('div', { className: 'bw-project-goal' }, projectSelected.goal || '没有填写项目目标'),
                    h('div', { className: 'bw-project-section' },
                      h('div', { className: 'bw-project-section-title' }, '项目组'),
                      ...(projectSelected.members || []).map((member) => h('div', { className: 'bw-project-member', key: member.slug },
                        h('span', { className: 'bw-project-member-name' }, member.name || projectNameOf(member.slug)),
                        h('span', { className: 'bw-tag' }, member.kind === 'permanent' ? '永久' : '临时'),
                        h('button', {
                          className: 'bw-office-tool',
                          type: 'button',
                          disabled: projectBusy,
                          onClick: async () => {
                            setProjectBusy(true);
                            try { await setProjectMemberKind(projectSelected, member.slug, member.kind === 'permanent' ? 'temporary' : 'permanent'); } catch (error) { setProjectError(String(error && error.message ? error.message : error)); } finally { setProjectBusy(false); }
                          },
                        }, member.kind === 'permanent' ? '改临时' : '改永久'),
                        h('button', {
                          className: 'bw-office-tool',
                          type: 'button',
                          disabled: projectBusy || projectSelected.status === 'ended',
                          onClick: async () => {
                            setProjectBusy(true);
                            try { await removeProjectMember(projectSelected, member.slug); } catch (error) { setProjectError(String(error && error.message ? error.message : error)); } finally { setProjectBusy(false); }
                          },
                        }, '移出')
                      )),
                      h('div', { className: 'bw-project-add' },
                        h('select', {
                          className: 'bw-model-input',
                          value: projectAddSlug,
                          onChange: (event) => setProjectAddSlug(event.target.value),
                        }, h('option', { value: '' }, '选择 Bot'),
                          ...(bots || []).filter((bot) => !(projectSelected.members || []).some((member) => member.slug === bot.slug)).map((bot) => h('option', { key: bot.slug, value: bot.slug }, bot.name))),
                        h('button', {
                          className: 'bw-office-tool',
                          type: 'button',
                          disabled: projectBusy || !projectAddSlug || projectSelected.status === 'ended',
                          onClick: async () => {
                            if (!projectAddSlug) return;
                            setProjectBusy(true);
                            try { await addProjectMember(projectSelected, projectAddSlug, 'temporary'); setProjectAddSlug(''); } catch (error) { setProjectError(String(error && error.message ? error.message : error)); } finally { setProjectBusy(false); }
                          },
                        }, '拉入（默认临时）')
                      )
                    ),
                    h('div', { className: 'bw-project-section' },
                      h('div', { className: 'bw-project-section-title' }, '项目任务'),
                      ...(projectSelected.tasks || []).map((task) => h('div', { className: 'bw-project-task', key: task.id },
                        h('span', { className: 'bw-project-task-title' }, task.title),
                        h('span', { className: 'bw-tag' }, projectNameOf(task.ownerSlug)),
                        h('span', { className: 'bw-tag' }, task.status === 'todo' ? '待派发' : task.status)
                      )),
                      h('div', { className: 'bw-project-add' },
                        h('input', {
                          className: 'bw-model-input',
                          placeholder: '任务名',
                          value: projectTaskDraft.title,
                          onChange: (event) => setProjectTaskDraft({ ...projectTaskDraft, title: event.target.value }),
                        }),
                        h('select', {
                          className: 'bw-model-input',
                          value: projectTaskDraft.ownerSlug,
                          onChange: (event) => setProjectTaskDraft({ ...projectTaskDraft, ownerSlug: event.target.value }),
                        }, h('option', { value: '' }, '负责人'),
                          ...(projectSelected.members || []).map((member) => h('option', { key: member.slug, value: member.slug }, member.name || member.slug))),
                        h('button', {
                          className: 'bw-office-tool',
                          type: 'button',
                          disabled: projectBusy || projectSelected.status === 'ended',
                          onClick: async () => {
                            setProjectBusy(true);
                            try { await addProjectTask(projectSelected, projectTaskDraft.title, projectTaskDraft.ownerSlug); setProjectTaskDraft({ title: '', ownerSlug: '' }); } catch (error) { setProjectError(String(error && error.message ? error.message : error)); } finally { setProjectBusy(false); }
                          },
                        }, '添加任务')
                      )
                    ),
                    projectSelected.status !== 'ended'
                      ? h('div', { className: 'bw-minutes-actions' },
                          h('button', {
                            className: 'bw-office-tool',
                            type: 'button',
                            disabled: projectBusy,
                            onClick: async () => {
                              if (!window.confirm('结束项目后，临时成员会自动移出项目群；永久成员保留。确定？')) return;
                              setProjectBusy(true);
                              try { await endProject(projectSelected); } catch (error) { setProjectError(String(error && error.message ? error.message : error)); } finally { setProjectBusy(false); }
                            },
                          }, '结束项目并移出临时成员')
                        )
                      : null
                  )
                : h('div', null,
                    h('div', { className: 'bw-project-create' },
                      h('input', { className: 'bw-model-input', placeholder: '项目名', value: projectDraft.title, onChange: (event) => setProjectDraft({ ...projectDraft, title: event.target.value }) }),
                      h('textarea', { className: 'bw-model-input', placeholder: '项目目标 / 背景', rows: 3, value: projectDraft.goal, onChange: (event) => setProjectDraft({ ...projectDraft, goal: event.target.value }) }),
                      h('div', { className: 'bw-project-pick' },
                        ...(bots || []).map((bot) => h('label', { key: bot.slug, className: 'bw-project-check' },
                          h('input', {
                            type: 'checkbox',
                            checked: projectDraft.members.includes(bot.slug),
                            onChange: (event) => setProjectDraft({
                              ...projectDraft,
                              members: event.target.checked
                                ? [...projectDraft.members, bot.slug]
                                : projectDraft.members.filter((slug) => slug !== bot.slug),
                            }),
                          }),
                          bot.name
                        ))
                      ),
                      h('div', { className: 'bw-project-add' },
                        h('select', {
                          className: 'bw-model-input',
                          value: projectDraft.leadSlug,
                          onChange: (event) => setProjectDraft({ ...projectDraft, leadSlug: event.target.value }),
                        }, h('option', { value: '' }, '项目负责人（默认第一位）'),
                          ...projectDraft.members.map((slug) => h('option', { key: slug, value: slug }, projectNameOf(slug)))),
                        h('button', {
                          className: 'bw-meeting-send',
                          type: 'button',
                          disabled: projectBusy,
                          onClick: async () => {
                            setProjectBusy(true);
                            setProjectError('');
                            try {
                              const project = await createProject({
                                title: projectDraft.title,
                                goal: projectDraft.goal,
                                memberSlugs: projectDraft.members,
                                leadSlug: projectDraft.leadSlug || projectDraft.members[0],
                              });
                              setProjectSelected(project);
                              setProjectDraft({ title: '', goal: '', members: [], leadSlug: '' });
                            } catch (error) {
                              setProjectError(String(error && error.message ? error.message : error));
                            } finally {
                              setProjectBusy(false);
                            }
                          },
                        }, projectBusy ? '立项中…' : '立项并建项目群')
                      )
                    ),
                    h('div', { className: 'bw-project-section-title' }, '已有项目'),
                    ...(projects || []).map((project) => h('div', {
                      key: project.id,
                      className: 'bw-project-card',
                      onClick: () => setProjectSelected(project),
                    },
                      h('div', { className: 'bw-minute-top' },
                        h('span', { className: 'bw-minute-title' }, project.title),
                        h('span', { className: 'bw-minute-date' }, project.status === 'ended' ? '已结束' : '进行中')
                      ),
                      h('div', { className: 'bw-minute-summary' }, project.goal || '没有目标'),
                      h('div', { className: 'bw-minute-meta' },
                        h('span', null, (project.members || []).length + ' 位成员'),
                        h('span', null, (project.tasks || []).length + ' 个任务')
                      )
                    ))
                  )
            )
          ))
        : null;
      const recoveryModal = recoverable
        ? portal(h('div', { className: 'bw-minutes-backdrop' },
            h('div', { className: 'bw-quota-modal' },
              h('div', { className: 'bw-minutes-modal-title' }, '发现未结束的会议'),
              h('p', { className: 'bw-quota-text' },
                '「' + (recoverable.title || '会议') + '」上次没有正常结束。'
                  + '可以恢复会议继续聊，也可以结束并清理临时群。会议记录和原文都会保留。'
              ),
              h('div', { className: 'bw-minutes-actions' },
                h('button', { className: 'bw-meeting-send', type: 'button', onClick: () => restoreRecoveredMeeting(recoverable) }, '恢复会议'),
                h('button', { className: 'bw-office-tool', type: 'button', onClick: () => discardRecoveredMeeting(recoverable) }, '结束并清理')
              )
            )
          ))
        : null;
      const quotaItem = quota && quota.over && quota.over.length ? quota.over[0] : null;
      const quotaModal = quotaItem
        ? portal(h('div', { className: 'bw-minutes-backdrop' },
            h('div', { className: 'bw-quota-modal' },
              h('div', { className: 'bw-minutes-modal-title' }, '会议原文超出保留额度'),
              h('p', { className: 'bw-quota-text' },
                '原文默认保留最近 ' + (quota.limit || 5) + ' 场，目前已保留 ' + (quota.rawCount || 0) + ' 场。'
                  + '最早的一场「' + quotaItem.title + '」可以先生成纪要，再只保留纪要。'
              ),
              h('div', { className: 'bw-minutes-actions' },
                h('button', {
                  className: 'bw-office-tool',
                  type: 'button',
                  disabled: summaryBusy === quotaItem.id,
                  onClick: async () => {
                    const ok = await summarizeMeeting(quotaItem.id, quotaItem.summaryModel || summarySettings);
                    if (ok) await archiveMeetingRaw(quotaItem.id);
                  },
                }, '生成纪要并归档'),
                h('button', {
                  className: 'bw-office-tool',
                  type: 'button',
                  disabled: summaryBusy === quotaItem.id,
                  onClick: async () => {
                    await exportMeeting(quotaItem.id);
                    await archiveMeetingRaw(quotaItem.id);
                  },
                }, '导出原文并归档'),
                h('button', { className: 'bw-office-tool', type: 'button', onClick: () => {
                  for (const item of quota.over || []) suppressedQuota.current.add(item.id);
                  setQuota(null);
                } }, '暂不处理')
              )
            )
          ))
        : null;

      return h('div', { className: 'bw-panel' },
        h('div', { className: 'bw-top' },
          h('span', { className: 'bw-title' }, '监控室'),
          h('span', { className: 'bw-live' }, h('i'), '实时'),
          h('span', { className: 'bw-spacer' }),
          h('button', { className: 'bw-refresh', type: 'button', onClick: () => setOfficeOpen(true) }, '办公室'),
          h('button', { className: 'bw-refresh', type: 'button', onClick: () => { setProjectOpen(true); void loadProjects(); } }, '项目'),
          h('button', { className: 'bw-refresh', type: 'button', onClick: () => setModelSettingsOpen(true) }, '纪要模型'),
          h('button', { className: 'bw-refresh', type: 'button', onClick: () => { void load(); setTick((n) => n + 1); } }, '刷新')
        ),
        h('div', { className: 'bw-stats' },
          h('span', { className: 'bw-chip' }, '在岗 ', h('b', null, String(working))),
          h('span', { className: 'bw-chip' }, '等回 ', h('b', null, String(waiting))),
          h('span', { className: 'bw-chip' }, '待你 ', h('b', null, String(attention))),
          h('span', { className: 'bw-chip' }, '正式任务 ', h('b', null, String(assignments.length))),
          h('span', { className: 'bw-chip' }, '定时 ', h('b', null, String(enabledSchedules))),
          snap ? h('span', { className: 'bw-chip' }, '今日 tok ', h('b', null, fmtTokens(snap.stats.totalToday))) : null
        ),
        error ? h('div', { className: 'bw-error' }, '读不到 Bot 数据：' + error) : null,
        notice ? h('div', { className: 'bw-notice' }, notice) : null,
        hotTasks.length
          ? h('div', { className: 'bw-alert' },
              '回合上下文告警：',
              hotTasks.map((task) => (task.botName || task.botSlug) + ' ' + (task.context ? task.context.pct : 0) + '%').join(' · ')
            )
          : null,
        !snap && !error ? h('div', { className: 'bw-grid' }, [0, 1, 2, 3].map((i) => h('div', { key: i, className: 'bw-skel' }))) : null,
        snap && bots.length === 0 ? h('div', { className: 'bw-empty' }, '还没有 Bot。先去 Bot 模式创建一个。') : null,
        snap && bots.length ? h('div', { className: 'bw-stage' },
          h('div', { className: 'bw-grid' }, sorted.map((bot) => {
            const state = statusOf(bot);
            const liveState = bySlug[bot.slug];
            const task = taskByBot[bot.slug];
            const taskPct = task && task.context ? task.context.pct : 0;
            const attentionOf = liveState && liveState.attention
              ? Object.values(liveState.attention).reduce((n, v) => n + (Number(v) || 0), 0)
              : (bot.attention || 0);
            const text = (liveState && liveState.text) || (liveState && liveState.page ? '正在看 ' + liveState.page : '') || '待命';
            const open = selected === bot.slug;
            return h('div', {
              key: bot.slug,
              role: 'button',
              tabIndex: 0,
              className: 'bw-card',
              'data-state': state,
              'data-open': open ? '1' : '0',
              style: cssVar(COLORS[state] || COLORS.idle),
              onClick: () => setSelected(open ? null : bot.slug),
              onKeyDown: (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setSelected(open ? null : bot.slug);
                }
              },
              title: bot.description || bot.name,
            },
              h('div', { className: 'bw-row' },
                h(Avatar, { bot, state }),
                h('div', { className: 'bw-id' },
                  h('div', { className: 'bw-name' }, bot.name),
                  h('div', { className: 'bw-sub' }, (bot.roles && bot.roles[0]) || (bot.memory ? '记忆 ' + bot.memory.head : 'PersonaBot')),
                  h('div', { className: 'bw-state' }, LABELS[state] || state)
                )
              ),
              h('div', { className: 'bw-act' }, String(text)),
              task
                ? h('div', { className: 'bw-ctx' + (taskPct >= 80 ? ' bad' : taskPct >= 50 ? ' warn' : '') },
                    h('i', { style: { width: Math.max(1, taskPct) + '%' } }))
                : null,
              h('div', { className: 'bw-foot' },
                h('span', null, '今日 ' + fmtTokens(bot.usage && bot.usage.outToday) + ' tok'),
                h('span', null, '· ' + rel(bot.lastActive)),
                attentionOf ? h('span', { className: 'bw-att' }, String(attentionOf)) : null
              ),
              open
                ? h('div', { className: 'bw-card-expand', onClick: (event) => event.stopPropagation() },
                    bot.description ? h('p', { className: 'bw-desc' }, bot.description) : null,
                    h('div', { className: 'bw-expand-grid' },
                      h('div', null, h('b', null, fmtTokens(bot.usage && bot.usage.outToday)), h('span', null, '今日输出')),
                      h('div', null, h('b', null, fmtTokens(bot.usage && bot.usage.totalWeek)), h('span', null, '近 7 天')),
                      h('div', null, h('b', null, String(attentionOf || 0)), h('span', null, '待处理')),
                      h('div', null, h('b', null, bot.memory ? bot.memory.head : '—'), h('span', null, '记忆'))
                    ),
                    task ? h('div', { className: 'bw-expand-task' },
                      h('div', { className: 'bw-expand-task-title' }, String(task.title || '当前回合')),
                      h('div', { className: 'bw-detail-meta' },
                        h('span', { className: 'bw-detail-chip' }, LABELS[task.state] || task.state || ''),
                        h('span', { className: 'bw-detail-chip' }, '上下文 ' + taskPct + '%'),
                        h('span', { className: 'bw-detail-chip' }, '工具 ' + (task.toolCalls || 0)),
                        h('span', { className: 'bw-detail-chip' }, '耗时 ' + Math.round((task.durationMs || 0) / 1000) + 's')
                      )
                    ) : null,
                    h('div', { className: 'bw-expand-actions' },
                      h('button', { className: 'bw-office-tool', type: 'button', onClick: () => openBotChat(bot.slug) }, '打开私聊'),
                      meeting && meeting.participants.includes(bot.slug)
                        ? h('span', { className: 'bw-tag' }, '已在会议室')
                        : h('button', { className: 'bw-office-tool', type: 'button', onClick: () => addToMeeting(bot.slug) }, '邀请到会议室'),
                      h('button', { className: 'bw-office-tool', type: 'button', onClick: () => setSelected(null) }, '收起')
                    )
                  )
                : null
            );
          }))
        ) : null,
        snap ? h('div', null,
          h('div', { className: 'bw-section' },
            h('h3', null, '正式任务'),
            h('span', { className: 'bw-sub' }, String(assignments.length) + ' 个'),
            h('span', { className: 'bw-sub', style: { marginLeft: 'auto' } }, '由秘书 / 大肥鱼统一派遣')
          ),
          h(AssignmentList, { assignments, onSelect: (slug) => setSelected(slug) }),
          h('div', { className: 'bw-section', style: { marginTop: 14 } },
            h('h3', null, '定时任务'),
            h('span', { className: 'bw-sub' }, String(enabledSchedules) + ' 启用 / ' + String(schedules.length) + ' 条记录')
          ),
          h('div', { className: 'bw-schedule-note' }, '一次性任务跑完就没用了，点「删除」清理；删除走 Tobs 官方接口。'),
          h(ScheduleList, { schedules, onDelete: handleDeleteSchedule, deletingId }),
          h('div', { className: 'bw-section', style: { marginTop: 14 } },
            h('h3', null, '会议纪要'),
            h('span', { className: 'bw-sub' }, String(filteredMeetings.length) + ' 场')
          ),
          h('input', {
            className: 'bw-model-input',
            placeholder: '搜索标题 / 纪要…',
            value: minutesSearch,
            onChange: (event) => setMinutesSearch(event.target.value),
            style: { marginBottom: '7px' },
          }),
          filteredMeetings.length
            ? h('div', { className: 'bw-minutes-list' }, filteredMeetings.slice(0, 6).map((item) => h('div', {
                key: item.id,
                className: 'bw-minutes-card',
                onClick: () => openMinutes(item.id),
              },
                h('div', { className: 'bw-minutes-top' },
                  h('span', { className: 'bw-minutes-title' }, item.title),
                  h('span', { className: 'bw-item-time' }, rel(item.startedAt))
                ),
                h('div', { className: 'bw-minutes-summary' },
                  item.summary ? String(item.summary).replace(/[#*>`]/g, '').replace(/\s+/g, ' ').slice(0, 160) : '还没有纪要，点开生成'),
                h('div', { className: 'bw-minutes-meta' },
                  h('span', null, String((item.participants || []).length) + ' 位 Bot'),
                  h('span', null, String(item.messageCount) + ' 条发言'),
                  h('span', null, item.rawDropped ? '原文已归档' : '原文保留')
                )
              )))
            : h('div', { className: 'bw-empty-small' }, '还没有会议纪要')
        ) : null,
        feed.length ? h('div', null,
          h('div', { className: 'bw-section' }, h('h3', null, '最近活动')),
          h('div', { className: 'bw-feed' }, feed.map((item) => {
            const bot = bots.find((b) => b.slug === item.bot);
            const name = item.botName || (bot && bot.name) || (item.authorKind === 'human' ? '你' : '系统');
            return h('div', { className: 'bw-item', key: item.id },
              bot
                ? h('img', { className: 'bw-mini', src: avatarUrl(bot.slug), alt: '', onError: (e) => { e.currentTarget.style.display = 'none'; } })
                : h('span', { className: 'bw-mini-fallback' }, initialOf(name)),
              h('div', { className: 'bw-item-main' },
                h('div', { className: 'bw-item-top' },
                  h('span', { className: 'bw-item-name' }, name),
                  h('span', { className: 'bw-item-time' }, rel(item.at))
                ),
                h('div', { className: 'bw-item-text' }, item.text)
              )
            );
          }))
        ) : null,
        h('div', { className: 'bw-note' }, '只读监控 · 删除定时任务走 Tobs 官方接口 · 不调用模型'),

        officeOpen
          ? (ReactDOM && typeof ReactDOM.createPortal === 'function'
              ? ReactDOM.createPortal(officeModal, document.body)
              : officeModal)
          : null,
        minutesModal,
        quotaModal,
        modelSettingsModal,
        recoveryModal,
        projectModal,
        meetingPanel
      );
    }

    function Module(ctx) {
      let presentation = null;
      let rpc = null;
      ctx.inject(['botPresentation'], (serviceCtx) => {
        presentation = serviceCtx.botPresentation || null;
      });
      ctx.inject(['connection'], (serviceCtx) => {
        rpc = serviceCtx.connection && serviceCtx.connection.rpc ? serviceCtx.connection.rpc : null;
      });

      const deleteSchedule = async (schedule) => {
        if (!rpc) throw new Error('Tobs 连接不可用，无法删除定时任务');
        const ok = window.confirm('删除定时任务「' + (schedule.title || schedule.id) + '」？\n\n这会通过 Tobs 的官方接口删除，不可撤销。');
        if (!ok) return false;
        const result = await rpc.call('/api', 'botharness/scheduleDelete', {
          args: { slug: schedule.botSlug, id: schedule.id },
        });
        if (!result || !result.ok) {
          throw new Error((result && result.error && result.error.message) || '删除失败');
        }
        return true;
      };

      ctx.effect(() => {
        const style = document.createElement('style');
        style.dataset.plugin = 'bot-workbench';
        style.textContent = CSS;
        document.head.append(style);
        return () => style.remove();
      }, 'bot-workbench: styles');

      ctx.inject(['dockPanels'], (serviceCtx) => {
        const dockPanels = serviceCtx.dockPanels;
        if (!dockPanels) return;
        ctx.effect(() => dockPanels.register({
          id: 'bot-workbench',
          title: '监控室',
          icon: 'activity',
          scope: 'global',
          defaultPosition: { zone: 'center' },
          order: 60,
          component: () => h(Workbench, { presentation, onDeleteSchedule: deleteSchedule, getRpc: () => rpc }),
        }), 'bot-workbench: global monitor panel');

        let opened = false;
        const openOnce = () => {
          if (opened) return;
          try {
            if (dockPanels.available && dockPanels.available()) {
              dockPanels.open('bot-workbench');
              opened = true;
            }
          } catch {
            // dock not mounted yet
          }
        };
        const offOpen = dockPanels.subscribe(openOnce);
        const timer = setInterval(() => {
          openOnce();
          if (opened) clearInterval(timer);
        }, 1500);
        ctx.effect(() => () => {
          clearInterval(timer);
          try { offOpen(); } catch { /* ignore */ }
        }, 'bot-workbench: auto-open timer');
      });
    }

    return {
      inject: [],
      apply(ctx) {
        try {
          void fetch('/bot-workbench/api/hello', { method: 'POST' }).catch(() => {});
        } catch {
          // The Host half may be unavailable during shutdown.
        }
        Module(ctx);
      },
    };
  },
});
