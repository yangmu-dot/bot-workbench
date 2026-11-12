// Where status lines come from: an ntfy topic (?topic=...) or a made-up demo team.

import { ingest, state, setConn } from './store.js';

const ROSTER = [
  { id: 'ganyu', name: '甘雨', team: '我的秘书', shape: 'squircle', color: '#1084FE', init: 'meeting' },
  { id: 'keqing', name: '刻晴', team: '我的秘书', shape: 'sparkle', color: '#9159FE', init: 'working' },
  { id: 'yanfei', name: '烟绯', team: '我的秘书', shape: 'heart', color: '#FF309B', init: 'waiting' },
  { id: 'ningguang', name: '凝光', team: '我的秘书', shape: 'gem', color: '#FF9800', init: 'meeting' },
  { id: 'huangtingjian', name: '黄庭坚', team: '书法组', shape: 'pumpkin', color: '#FF6700', init: 'meeting' },
  { id: 'mifu', name: '米芾', team: '书法组', shape: 'blob', color: '#936439', init: 'error' },
  { id: 'yanzhenqing', name: '颜真卿', team: '书法组', shape: 'tablet', color: '#FF263C', init: 'resting' },
  { id: 'zhaomengfu', name: '赵孟頫', team: '书法组', shape: 'shield', color: '#00BCA6', init: 'working' },
  { id: 'wangxizhi', name: '王羲之', team: '书法组', shape: 'egg', color: '#00C972', init: 'resting' },
  { id: 'sushi', name: '苏轼', team: '书法组', shape: 'cloud', color: '#FF9800', init: 'working' },
  { id: 'wangxianzhi', name: '王献之', team: '书法组', shape: 'bean', color: '#9159FE', init: 'resting' },
  { id: 'dafeiyu', name: '大肥鱼', team: '其他', shape: 'pebble', color: '#FF6700', init: 'working' },
  { id: 'luofengchun', name: '洛逢春', team: '其他', shape: 'flower', color: '#00BCA6', init: 'resting' },
];

const TASKS = {
  我的秘书: ['整理本周日程', '核对书法展名单', '写会议纪要', '准备发布文案', '回复群消息'],
  书法组: ['临《兰亭序》第三段', '整理碑帖目录', '校对展览说明', '给新作品题签', '查一条拍卖记录'],
  其他: ['剪一段视频', '写一条文案', '整理素材'],
  会议: ['评审本周发布节奏', '确认展览物料', '讨论新作品题签'],
};
const ASKS = ['现在发还是等周一？', '用 A 版还是 B 版标题？', '可以替你回复吗？', '先发视频还是先改 demo？'];
const ERRORS = ['会话过期', '触发限流', '页面结构变了'];

const pick = (a) => a[Math.floor(Math.random() * a.length)];

// ?sleepy: everyone but a few starts on a break (for recordings about dozing bots)
const AWAKE = new Set(['Arxiv Owl', 'Repo Scout', 'Lead Finder', 'Inbox Butler']);

function startDemo(still, sleepy) {
  setConn('demo', 'live');
  const now = Date.now();
  // recordings get Grok Bot links so the card shows its real button (they point nowhere)
  ingest({ t: 'roster', bots: ROSTER.map(({ init, ...b }) => ({ ...b, chat: '', usage: 4000 + Math.random() * 60000 })) }, now - 3600e3);
  for (const b of ROSTER) {
    const at = now - Math.random() * 40 * 60e3;
    const init = sleepy && !AWAKE.has(b.name) ? 'resting' : still && b.init === 'waiting' ? 'working' : b.init;
    const task = init === 'waiting' ? pick(ASKS) : init === 'meeting' ? pick(TASKS['会议']) : pick(TASKS[b.team]);
    if (init === 'resting') ingest({ bot: b.name, state: 'done', task: pick(TASKS[b.team]) }, at);
    else ingest({ bot: b.name, state: init, task }, at);
  }
  // ?still: no random events, so a recording can script every change itself
  if (!still) setInterval(tick, 2600);
}

function tick() {
  const bots = [...state.bots.values()];
  const b = pick(bots);
  const tasks = TASKS[b.team] || TASKS.Lab;
  const r = Math.random();
  if (b.state === 'working') {
    if (r < 0.5) ingest({ bot: b.id, state: 'working', task: pick(tasks) });
    else if (r < 0.72) ingest({ bot: b.id, state: 'done', task: b.task });
    else if (r < 0.82) ingest({ bot: b.id, state: 'waiting', task: pick(ASKS) });
    else if (r < 0.86) ingest({ bot: b.id, state: 'error', task: pick(ERRORS) });
  } else if (b.state === 'resting') {
    if (r < 0.55) ingest({ bot: b.id, state: 'working', task: pick(tasks) });
  } else if (b.state === 'waiting') {
    if (r < 0.35) ingest({ bot: b.id, state: 'working', task: pick(tasks) });
  } else if (r < 0.45) {
    ingest({ bot: b.id, state: 'working', task: pick(tasks) });
  }
  ingest({ t: 'usage', bots: bots.filter((x) => x.state === 'working').map((x) => ({ bot: x.id, used: x.usage + 150 + Math.random() * 900 })) });
}

// Lines may be JSON or plain "Bot | state | task".
function parseBody(text) {
  text = String(text || '').trim();
  if (text.startsWith('{')) {
    try { return JSON.parse(text); } catch { return null; }
  }
  const [bot, st, ...rest] = text.split('|').map((s) => s.trim());
  return bot && st ? { bot, state: st, task: rest.join(' | ') } : null;
}

function startNtfy(server, topic) {
  setConn('ntfy', 'connecting');
  const es = new EventSource(`${server.replace(/\/$/, '')}/${encodeURIComponent(topic)}/sse?since=24h`);
  es.onopen = () => setConn('ntfy', 'live');
  es.onerror = () => setConn('ntfy', 'reconnecting');
  es.onmessage = (e) => {
    let m;
    try { m = JSON.parse(e.data); } catch { return; }
    if (m.event && m.event !== 'message') return;
    const body = parseBody(m.message);
    if (body) ingest(body, (m.time || Date.now() / 1000) * 1000);
  };
}

// Served by bin/office.mjs: read the Grok Bot app on this machine.
function startLocal() {
  setConn('local', 'connecting');
  const es = new EventSource('/api/events');
  es.onopen = () => setConn('local', 'live');
  es.onerror = () => setConn('local', 'reconnecting');
  es.onmessage = (e) => {
    let m;
    try { m = JSON.parse(e.data); } catch { return; }
    ingest(m, m.at || Date.now());
  };
}

// Live data from bot-workbench's read-only Tobs snapshot.
function startLive(api) {
  const base = String(api || '').replace(/\/+$/, '');
  const last = new Map();
  setConn('tobs', 'connecting');
  const pull = async () => {
    try {
      const endpoint = base ? base + '/api/office-state' : '/bot-workbench/api/office-state';
      const response = await fetch(endpoint, { cache: 'no-store' });
      if (!response.ok) throw new Error('office-state ' + response.status);
      const data = await response.json();
      if (!data.ok || !Array.isArray(data.bots)) throw new Error('bad office-state');
      ingest({
        t: 'roster',
        bots: data.bots.map((bot) => ({
          id: bot.id,
          name: bot.name,
          team: bot.team,
          shape: bot.shape,
          color: bot.color,
          usage: bot.usage || 0,
        })),
      });
      for (const bot of data.bots) {
        const key = bot.state + '\u0001' + (bot.task || '');
        if (last.get(bot.id) === key) continue;
        last.set(bot.id, key);
        ingest({ bot: bot.id, state: bot.state, task: bot.task || '' });
      }
      setConn('tobs', 'live');
    } catch {
      setConn('tobs', 'reconnecting');
    }
  };
  void pull();
  setInterval(pull, 3000);
}

export async function startFeed() {
  const q = new URLSearchParams(location.search);
  const topic = q.get('topic');
  if (topic) return startNtfy(q.get('server') || 'https://ntfy.sh', topic);
  if (q.has('live')) return startLive(q.get('api'));
  if (!q.has('demo') && !q.has('still')) {
    const ping = await fetch('/api/ping').then((r) => (r.ok ? r.json() : null)).catch(() => null);
    if (ping?.source === 'grokbot-local' && ping.found) return startLocal();
    return startLive(q.get('api'));
  }
  startDemo(q.has('still'), q.has('sleepy'));
}
