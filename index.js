/**
 * bot-workbench — Host half.
 *
 * Reads Tobs' operational SQLite database (read-only) and serves a small
 * local API for the Bot-mode panel. It never writes to Bot data, never
 * opens a network connection, and never sends data to a model.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

export const name = 'bot-workbench';
export const inject = ['webServer'];

const MOUNT = '/bot-workbench';
const CACHE_MS = 2500;
const HERE = path.dirname(fileURLToPath(import.meta.url));
const OFFICE_DIR = path.join(HERE, 'office');
const PORTRAIT_DIR = path.join(HERE, 'portraits');
const PORTRAIT_EXTS = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];
const PORTRAIT_TYPES = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};
const RAW_MEETING_LIMIT = 5;
const MEETINGS_FILE = path.join(dshHome(), 'bot-workbench', 'meetings.json');
const MEETINGS_MD_DIR = path.join(dshHome(), 'bot-workbench', 'meetings');
const SETTINGS_FILE = path.join(dshHome(), 'bot-workbench', 'settings.json');
const PROJECTS_FILE = path.join(dshHome(), 'bot-workbench', 'projects.json');

function dshHome() {
  return process.env.DSH_HOME || path.join(os.homedir(), '.dsh');
}

function databasePath() {
  return path.join(dshHome(), 'botharness', 'botharness.db');
}

let db = null;
let dbPath = '';

function getDb() {
  const next = databasePath();
  if (db && dbPath === next) return db;
  closeDb();
  db = new DatabaseSync(next, { readOnly: true });
  dbPath = next;
  try {
    db.exec('PRAGMA busy_timeout = 1500');
  } catch {
    // A read-only connection may not accept PRAGMA; the reads still work.
  }
  return db;
}

function closeDb() {
  if (!db) return;
  try {
    db.close();
  } catch {
    // ignore
  }
  db = null;
  dbPath = '';
}

function json(res, body, status = 200) {
  const text = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(text),
    'Cache-Control': 'no-store',
  });
  res.end(text);
}

function readBody(req, limit = 4 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error('request body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {});
      } catch {
        reject(new Error('invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function isoDay(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return d.toISOString().slice(0, 10);
}

// ── Meeting records ──────────────────────────────────────────────────────
// Meetings are plugin-owned data: deleting a temporary Tobs group must not
// erase the transcript or the minutes. Records live outside botharness.db.
let llmService = null;
let defaultModelService = null;
let credentialsService = null;
const SUMMARY_API_KEY_REF = 'BOT_WORKBENCH_SUMMARY_API_KEY';

async function resolveSummaryApiKey() {
  if (credentialsService) {
    try {
      const resolved = await credentialsService.resolve(SUMMARY_API_KEY_REF);
      if (resolved && resolved.value) return resolved.value;
    } catch {
      // fall through to the legacy settings value
    }
  }
  return String(readSettings().apiKey || '');
}

async function hasSummaryApiKey() {
  if (credentialsService) {
    try {
      const described = await credentialsService.describe(SUMMARY_API_KEY_REF);
      return Boolean(described && described.configured);
    } catch {
      // fall through
    }
  }
  return Boolean(readSettings().apiKey);
}

async function storeSummaryApiKey(value) {
  if (credentialsService) {
    await credentialsService.set(SUMMARY_API_KEY_REF, value);
    const settings = readSettings();
    if (settings.apiKey) {
      delete settings.apiKey;
      writeSettings(settings);
    }
    return;
  }
  const settings = readSettings();
  settings.apiKey = value;
  writeSettings(settings);
}

async function clearSummaryApiKey() {
  if (credentialsService) {
    try { await credentialsService.unset(SUMMARY_API_KEY_REF); } catch { /* ignore */ }
  }
  const settings = readSettings();
  if (settings.apiKey) {
    delete settings.apiKey;
    writeSettings(settings);
  }
}

async function migrateLegacyApiKey() {
  const settings = readSettings();
  if (settings.apiKey && credentialsService) {
    try {
      await credentialsService.set(SUMMARY_API_KEY_REF, settings.apiKey);
      delete settings.apiKey;
      writeSettings(settings);
    } catch {
      // keep the legacy value if the credential store rejects it
    }
  }
}

function ensureMeetingDir() {
  fs.mkdirSync(path.dirname(MEETINGS_FILE), { recursive: true });
  fs.mkdirSync(MEETINGS_MD_DIR, { recursive: true });
}

function readSettings() {
  try {
    ensureMeetingDir();
    const parsed = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeSettings(next) {
  ensureMeetingDir();
  const tmp = SETTINGS_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(next, null, 2), 'utf8');
  try { fs.chmodSync(tmp, 0o600); } catch { /* Windows ACLs are managed by the OS */ }
  fs.renameSync(tmp, SETTINGS_FILE);
}

async function publicSettings() {
  const settings = readSettings();
  const model = settings.summaryModel && typeof settings.summaryModel === 'object' ? settings.summaryModel : { mode: 'default' };
  const hasApiKey = await hasSummaryApiKey();
  return {
    summaryModel: {
      mode: model.mode || 'default',
      provider: model.provider || '',
      model: model.model || '',
      modelName: model.modelName || '',
      baseURL: model.baseURL || '',
      hasApiKey,
    },
    hasApiKey,
  };
}

let modelCache = { at: 0, value: null };
async function listAvailableModels() {
  if (modelCache.value && Date.now() - modelCache.at < 60_000) return modelCache.value;
  const models = [];
  const providers = [];
  try {
    const list = llmService && typeof llmService.listProviders === 'function'
      ? await llmService.listProviders()
      : [];
    for (const provider of list || []) {
      providers.push({ id: provider.id, name: provider.name || provider.id });
      try {
        const found = llmService && typeof llmService.listModels === 'function'
          ? await llmService.listModels(provider.id)
          : [];
        for (const model of found || []) {
          models.push({
            provider: provider.id,
            providerName: provider.name || provider.id,
            model: model.id,
            name: model.name || model.id,
          });
        }
      } catch {
        // a provider may not expose a model catalogue
      }
    }
  } catch {
    // llm service may be unavailable
  }
  let defaultModel = null;
  try {
    const selection = defaultModelService && typeof defaultModelService.currentSelection === 'function'
      ? defaultModelService.currentSelection()
      : null;
    if (selection && selection.provider && selection.model) {
      defaultModel = { provider: selection.provider, model: selection.model };
    }
  } catch {
    defaultModel = null;
  }
  const value = {
    providers,
    models,
    defaultModel,
    customSupported: true,
  };
  modelCache = { at: Date.now(), value };
  return value;
}

async function callCustomSummary(selection, system, prompt) {
  const baseURL = String(selection.baseURL || '').trim();
  const model = String(selection.model || selection.modelName || '').trim();
  const apiKey = await resolveSummaryApiKey();
  if (!baseURL || !model) throw new Error('自定义 API 需要 Base URL 和模型名');
  const url = /\/chat\/completions$/i.test(baseURL)
    ? baseURL
    : baseURL.replace(/\/+$/, '') + '/chat/completions';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120_000);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: 'Bearer ' + apiKey } : {}),
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 1800,
        stream: false,
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error('自定义 API 返回 ' + response.status + (detail ? '：' + detail.slice(0, 200) : ''));
    }
    const body = await response.json();
    const text = body && body.choices && body.choices[0] && body.choices[0].message
      ? body.choices[0].message.content
      : '';
    if (typeof text !== 'string' || !text.trim()) throw new Error('自定义 API 没有返回文本');
    return text.trim();
  } finally {
    clearTimeout(timer);
  }
}


function readMeetings() {
  try {
    ensureMeetingDir();
    const raw = fs.readFileSync(MEETINGS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && Array.isArray(parsed.meetings) ? parsed.meetings : [];
  } catch {
    return [];
  }
}

function writeMeetings(records) {
  ensureMeetingDir();
  const tmp = MEETINGS_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify({ version: 1, meetings: records }, null, 2), 'utf8');
  fs.renameSync(tmp, MEETINGS_FILE);
}

function publicMeeting(record) {
  const messages = Array.isArray(record.messages) ? record.messages : [];
  return {
    id: record.id,
    title: record.title || '会议',
    startedAt: record.startedAt || null,
    endedAt: record.endedAt || null,
    active: Boolean(record.active),
    mode: record.mode || null,
    groupName: record.groupName || '',
    channelId: record.channelId || '',
    originalMembers: Array.isArray(record.originalMembers) ? record.originalMembers : [],
    tempAdded: Array.isArray(record.tempAdded) ? record.tempAdded : [],
    participants: Array.isArray(record.participants) ? record.participants : [],
    messageCount: messages.length,
    rawDropped: Boolean(record.rawDropped),
    summary: record.summary || '',
    summaryAt: record.summaryAt || null,
    summaryModel: record.summaryModel || null,
    autoSummary: Boolean(record.autoSummary),
    markdownPath: record.markdownPath || null,
  };
}

function getMeeting(id) {
  return readMeetings().find((record) => record.id === id) || null;
}

function readProjects() {
  try {
    ensureMeetingDir();
    const parsed = JSON.parse(fs.readFileSync(PROJECTS_FILE, 'utf8'));
    return parsed && Array.isArray(parsed.projects) ? parsed.projects : [];
  } catch {
    return [];
  }
}

function writeProjects(records) {
  ensureMeetingDir();
  const tmp = PROJECTS_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify({ version: 1, projects: records }, null, 2), 'utf8');
  fs.renameSync(tmp, PROJECTS_FILE);
}

function publicProject(record) {
  return {
    id: record.id,
    title: record.title || '未命名项目',
    goal: record.goal || '',
    status: record.status || 'active',
    groupId: record.groupId || '',
    groupName: record.groupName || '',
    leadSlug: record.leadSlug || '',
    members: Array.isArray(record.members) ? record.members : [],
    tasks: Array.isArray(record.tasks) ? record.tasks : [],
    meetingIds: Array.isArray(record.meetingIds) ? record.meetingIds : [],
    createdAt: record.createdAt || null,
    endedAt: record.endedAt || null,
  };
}

function saveProjectRecord(input) {
  const records = readProjects();
  const id = String(input.id || '').trim() || ('project-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7));
  const index = records.findIndex((record) => record.id === id);
  const previous = index >= 0 ? records[index] : {};
  const record = {
    ...previous,
    ...input,
    id,
    title: String(input.title || previous.title || '未命名项目').slice(0, 120),
    goal: String(input.goal ?? previous.goal ?? '').slice(0, 2000),
    updatedAt: new Date().toISOString(),
  };
  delete record.apiKey;
  if (index >= 0) records[index] = record;
  else records.unshift(record);
  records.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  writeProjects(records);
  return record;
}

function saveMeetingRecord(input) {
  const records = readMeetings();
  const id = String(input.id || '').trim() || ('meeting-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8));
  const index = records.findIndex((record) => record.id === id);
  const previous = index >= 0 ? records[index] : {};
  const record = {
    ...previous,
    ...input,
    id,
    title: String(input.title || previous.title || '会议').slice(0, 160),
    messages: Array.isArray(input.messages) ? input.messages.slice(-300) : (previous.messages || []),
    participants: Array.isArray(input.participants) ? input.participants : (previous.participants || []),
    updatedAt: new Date().toISOString(),
  };
  if (index >= 0) records[index] = record;
  else records.unshift(record);
  records.sort((a, b) => String(b.startedAt || b.updatedAt || '').localeCompare(String(a.startedAt || a.updatedAt || '')));
  writeMeetings(records);
  return record;
}

function meetingFilename(record) {
  const stamp = String(record.startedAt || new Date().toISOString()).replace(/[:.]/g, '-').slice(0, 19);
  const safeId = String(record.id || 'meeting').replace(/[^a-zA-Z0-9._-]/g, '');
  return path.join(MEETINGS_MD_DIR, stamp + '-' + safeId + '.md');
}

function writeMeetingMarkdown(record, includeRaw = true) {
  ensureMeetingDir();
  const file = meetingFilename(record);
  const lines = [];
  lines.push('# 会议纪要 · ' + (record.title || '会议'));
  lines.push('');
  lines.push('- 时间：' + (record.startedAt || '—'));
  if (record.endedAt) lines.push('- 结束：' + record.endedAt);
  lines.push('- 群：' + (record.groupName || '—') + (record.mode === 'temporary' ? '（临时群）' : ''));
  lines.push('- 参与：' + (record.participants || []).map((p) => (typeof p === 'string' ? p : p.name || p.slug)).join('、'));
  lines.push('');
  lines.push('## 总结');
  lines.push('');
  lines.push(record.summary ? String(record.summary).trim() : '（尚未生成纪要）');
  lines.push('');
  if (includeRaw && Array.isArray(record.messages) && record.messages.length) {
    lines.push('## 原文');
    lines.push('');
    for (const message of record.messages) {
      lines.push('**' + (message.author || '系统') + '** · ' + (message.at || '') + '  ');
      lines.push(String(message.text || '').replace(/\n/g, '\n> '));
      lines.push('');
    }
  }
  fs.writeFileSync(file, lines.join('\n'), 'utf8');
  return file;
}

function meetingQuota(records) {
  const raw = records
    .filter((record) => Array.isArray(record.messages) && record.messages.length > 0 && !record.rawDropped)
    .sort((a, b) => String(a.startedAt || '').localeCompare(String(b.startedAt || '')));
  const over = raw.slice(0, Math.max(0, raw.length - RAW_MEETING_LIMIT));
  return {
    limit: RAW_MEETING_LIMIT,
    rawCount: raw.length,
    over: over.map(publicMeeting),
  };
}

async function runSummaryModel(selection, system, prompt, maxTokens = 1800) {
  let text = '';
  let used = { mode: selection.mode || 'default' };
  if (selection.mode === 'custom') {
    text = await callCustomSummary(selection, system, prompt);
    used = {
      mode: 'custom',
      provider: 'custom',
      model: selection.model || selection.modelName || '',
      modelName: selection.modelName || selection.model || '自定义 API',
    };
    return { text: text.trim(), used };
  }
  let provider = selection.provider || '';
  let model = selection.model || '';
  let reasoningEffort = selection.reasoningEffort;
  if (selection.mode !== 'dsh' || !provider || !model) {
    if (!defaultModelService || typeof defaultModelService.currentSelection !== 'function') throw new Error('读不到默认模型');
    const fallback = defaultModelService.currentSelection();
    if (!fallback || !fallback.provider || !fallback.model) throw new Error('默认模型未配置');
    provider = fallback.provider;
    model = fallback.model;
    reasoningEffort = fallback.reasoningEffort;
    used = { mode: 'default', provider, model, modelName: model };
  } else {
    used = { mode: 'dsh', provider, model, modelName: selection.modelName || model };
  }
  if (!llmService || typeof llmService.stream !== 'function') throw new Error('当前 Host 没有可用的 LLM 服务');
  const stream = llmService.stream({
    provider,
    model,
    ...(reasoningEffort ? { reasoningEffort } : {}),
    maxTokens,
    system,
    messages: [{ role: 'user', content: [{ type: 'text', text: prompt }] }],
  });
  for await (const chunk of stream) {
    if (!chunk) continue;
    if (chunk.type === 'text-delta' && typeof chunk.text === 'string') text += chunk.text;
    else if (chunk.type === 'block-end' && chunk.block && chunk.block.type === 'text' && !text) text += chunk.block.text;
    else if (chunk.type === 'finish' && chunk.reason && chunk.reason.kind === 'error') {
      throw new Error((chunk.reason.failure && chunk.reason.failure.message) || '模型调用失败');
    }
  }
  return { text: text.trim(), used };
}

function summaryPrompt(transcript) {
  return [
    '下面是一场 Bot 团队会议的真实记录。请整理成中文会议纪要，用 Markdown 输出。',
    '要求：',
    '1. 开头写一段 2–3 句的总结；',
    '2. 用「## 主要观点」列出 3–6 条要点，每条一句话；',
    '3. 如果记录里有待办、分歧或需要人类决定的事，单独用「## 待办 / 待确认」列出；',
    '4. 不要编造记录里没有的内容；没有就写「无」。',
    '',
    '会议记录：',
    transcript,
  ].join('\n');
}

function segmentPrompt(label, transcript) {
  return [
    '下面是同一场 Bot 团队会议的' + label + '记录。',
    '请只提炼这一段里出现的事实、观点、分歧、待办和结论，用 Markdown 短列表输出。',
    '不要写总结套话，不要编造，不要写“上半段/下半段”这种标题。',
    '',
    '记录：',
    transcript,
  ].join('\n');
}

async function summarizeMeetingRecord(id, override) {
  const records = readMeetings();
  const record = records.find((item) => item.id === id);
  if (!record) throw new Error('会议记录不存在');
  if (!Array.isArray(record.messages) || !record.messages.length) throw new Error('会议还没有原文，无法生成纪要');
  const settings = readSettings();
  const selection = override && typeof override === 'object'
    ? override
    : (settings.summaryModel && typeof settings.summaryModel === 'object' ? settings.summaryModel : { mode: 'default' });
  const system = '你是严谨的会议纪要助手，只根据给出的会议记录写 Markdown 纪要，不编造。';
  const messages = record.messages.slice(-240);
  const transcript = messages.map((message) => {
    return '[' + (message.at || '') + '] ' + (message.author || '系统') + '：' + String(message.text || '');
  }).join('\n');
  let text = '';
  let used = { mode: selection.mode || 'default' };
  const transcriptLimit = selection.mode === 'custom' ? 24_000 : 60_000;

  if (messages.length > 120 || transcript.length > transcriptLimit) {
    const middle = Math.ceil(messages.length / 2);
    const halves = [
      { label: '上半段', rows: messages.slice(0, middle) },
      { label: '下半段', rows: messages.slice(middle) },
    ];
    const notes = [];
    for (const half of halves) {
      const partTranscript = half.rows.map((message) => '[' + (message.at || '') + '] ' + (message.author || '系统') + '：' + String(message.text || '')).join('\n').slice(0, transcriptLimit);
      const part = await runSummaryModel(selection, system, segmentPrompt(half.label, partTranscript), 1200);
      notes.push('## ' + half.label + '\n' + part.text);
      used = part.used;
    }
    const final = await runSummaryModel(selection, system, [
      '下面是一场较长会议的「上半段要点」和「下半段要点」。',
      '请合并成一份最终的中文会议纪要，用 Markdown 输出。',
      '要求：',
      '1. 开头 2–3 句总结；',
      '2. 「## 主要观点」列出 3–8 条，合并重复项；',
      '3. 「## 待办 / 待确认」列出需要人类决定或后续跟进的事项；',
      '4. 不要编造两段要点之外的内容。',
      '',
      notes.join('\n\n'),
    ].join('\n'), 2000);
    text = final.text;
    used = final.used;
  } else {
    const result = await runSummaryModel(selection, system, summaryPrompt(transcript.slice(0, transcriptLimit)), 1800);
    text = result.text;
    used = result.used;
  }

  const summary = text.trim();
  if (!summary) throw new Error('模型没有返回纪要内容');
  record.summary = summary;
  record.summaryAt = new Date().toISOString();
  record.summaryModel = used;
  record.markdownPath = writeMeetingMarkdown(record, true);
  writeMeetings(records);
  return record;
}

const avatarCache = new Map();

function avatarOf(bodyText) {
  const body = safeJson(bodyText);
  const data = body && typeof body.avatar === 'string' ? body.avatar : '';
  const match = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i.exec(data);
  if (!match) return null;
  return { type: match[1], bytes: Buffer.from(match[2], 'base64') };
}

function findPortrait(slug) {
  const safe = String(slug).replace(/[^a-zA-Z0-9._-]/g, '');
  if (!safe || safe !== String(slug)) return null;
  for (const ext of PORTRAIT_EXTS) {
    const file = path.join(PORTRAIT_DIR, safe + ext);
    try {
      const stat = fs.statSync(file);
      if (stat.isFile()) return { file, mtimeMs: stat.mtimeMs, type: PORTRAIT_TYPES[ext] || 'application/octet-stream' };
    } catch {
      // try the next extension
    }
  }
  return null;
}

function botRecord(row) {
  const body = safeJson(row.body) || {};
  const slug = String(row.slug);
  const primary = body.primaryColor && typeof body.primaryColor === 'object'
    ? body.primaryColor.fallback
    : undefined;
  return {
    slug,
    name: typeof body.displayName === 'string' && body.displayName.trim()
      ? body.displayName.trim()
      : slug,
    roles: Array.isArray(body.roles) ? body.roles.filter((r) => typeof r === 'string').slice(0, 6) : [],
    description: typeof body.description === 'string' ? body.description.slice(0, 600) : '',
    avatar: typeof body.avatar === 'string' && body.avatar.startsWith('data:image/'),
    color: typeof primary === 'string' ? primary : '#6b7a90',
    createdAt: body.createdAt || null,
    workspaces: Array.isArray(body.workspaces) ? body.workspaces.slice(0, 4) : [],
  };
}

function channelNames(database) {
  const map = new Map();
  try {
    const rows = database.prepare('SELECT channel_id, record_json FROM channel_records').all();
    for (const row of rows) {
      const rec = safeJson(row.record_json) || {};
      const name = rec.name || rec.title || rec.displayName || '';
      if (name) map.set(row.channel_id, name);
    }
  } catch {
    // channel names are optional
  }
  return map;
}

// ── Session/task reading ──────────────────────────────────────────────────
// DSH session logs are zstd frames. Only the tail is read: enough for the
// current turn, the last tool, the latest usage and the completion reason.
const ZSTD_MAGIC = Buffer.from([0x28, 0xb5, 0x2f, 0xfd]);
const SESSION_ROOT = path.join(dshHome(), 'sessions');
const TASK_TAIL_BYTES = 384 * 1024;
const TASK_TAIL_FRAMES = 60;
let sessionIndex = null;
let sessionIndexAt = 0;

function refreshSessionIndex() {
  if (sessionIndex && Date.now() - sessionIndexAt < 60_000) return sessionIndex;
  const map = new Map();
  let projects = [];
  try {
    projects = fs.readdirSync(SESSION_ROOT);
  } catch {
    projects = [];
  }
  for (const project of projects) {
    const projectDir = path.join(SESSION_ROOT, project);
    let sessions = [];
    try {
      sessions = fs.readdirSync(projectDir);
    } catch {
      continue;
    }
    for (const session of sessions) {
      const file = path.join(projectDir, session, 'session.v4.jsonl.zstd');
      try {
        const stat = fs.statSync(file);
        map.set(session, { file, mtimeMs: stat.mtimeMs, size: stat.size });
      } catch {
        // no session log for this directory
      }
    }
  }
  sessionIndex = map;
  sessionIndexAt = Date.now();
  return map;
}

function readSessionTail(file) {
  let buffer;
  try {
    const stat = fs.statSync(file);
    const start = Math.max(0, stat.size - TASK_TAIL_BYTES);
    const handle = fs.openSync(file, 'r');
    buffer = Buffer.alloc(stat.size - start);
    fs.readSync(handle, buffer, 0, buffer.length, start);
    fs.closeSync(handle);
  } catch {
    return [];
  }
  if (typeof zlib.zstdDecompressSync !== 'function') return [];
  const positions = [];
  let cursor = 0;
  for (;;) {
    const at = buffer.indexOf(ZSTD_MAGIC, cursor);
    if (at < 0) break;
    positions.push(at);
    cursor = at + 1;
  }
  const from = Math.max(buffer.length > 0 && positions.length > 0 && positions[0] > 0 ? 1 : 0, positions.length - TASK_TAIL_FRAMES);
  const events = [];
  for (let i = from; i < positions.length; i += 1) {
    const end = i + 1 < positions.length ? positions[i + 1] : buffer.length;
    let text;
    try {
      text = zlib.zstdDecompressSync(buffer.subarray(positions[i], end)).toString('utf8');
    } catch {
      continue;
    }
    for (const line of text.split('\n')) {
      if (!line.trim()) continue;
      try {
        events.push(JSON.parse(line));
      } catch {
        // a frame can end with a half line while being written
      }
    }
  }
  return events;
}

function textOfContent(content, type) {
  if (!Array.isArray(content)) return '';
  return content
    .filter((part) => part && part.type === type && typeof part.text === 'string')
    .map((part) => part.text)
    .join('\n')
    .trim();
}

function cleanUserText(text) {
  let value = String(text || '').replace(/\r/g, '');
  value = value
    .replace(/^Current Channel Human:[\s\S]*?\n\n/, '')
    .replace(/^\[[^\]]*\]\s*/gm, '')
    .replace(/^Source Event ID:.*$/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
  return value.slice(0, 180);
}

function contextWindowFor(model) {
  const name = String(model || '').toLowerCase();
  if (name.includes('deepseek')) return 1_048_576;
  if (name.includes('claude')) return 200_000;
  if (name.includes('gpt')) return 128_000;
  return 200_000;
}

const taskCache = new Map();

function summarizeSession(sessionId) {
  const index = refreshSessionIndex();
  const entry = index.get(sessionId);
  if (!entry) return null;
  const cacheKey = `${entry.file}|${entry.mtimeMs}|${entry.size}`;
  const cached = taskCache.get(entry.file);
  if (cached && cached.key === cacheKey) return cached.value;

  const events = readSessionTail(entry.file);
  const now = Date.now();
  const out = {
    title: '',
    state: 'idle',
    turn: 0,
    step: 0,
    steps: 0,
    toolCalls: 0,
    currentTool: null,
    startedAt: null,
    endedAt: null,
    lastAt: null,
    lastEventType: '',
    reason: null,
    summary: '',
    lastUser: '',
    model: '',
    contextWindow: 0,
    lastUsage: null,
    turnUsage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
  };

  for (const event of events) {
    if (!event || typeof event.type !== 'string') continue;
    const data = event.data || {};
    if (Number.isFinite(event.time)) out.lastAt = event.time;
    out.lastEventType = event.type;

    if (event.type === 'turn/start') {
      out.state = 'running';
      out.turn = Number(data.turn) || out.turn + 1;
      out.step = 0;
      out.steps = 0;
      out.toolCalls = 0;
      out.currentTool = null;
      out.startedAt = event.time ?? out.startedAt;
      out.endedAt = null;
      out.reason = null;
      out.turnUsage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 };
      out.lastUsage = null;
    } else if (event.type === 'step/start') {
      out.step = Number(data.step) || out.step + 1;
      out.steps += 1;
    } else if (event.type === 'tool/call') {
      out.currentTool = String(data.name || 'tool');
      out.toolCalls += 1;
    } else if (event.type === 'tool/result') {
      out.currentTool = null;
    } else if (event.type === 'assistant/message') {
      const usage = data.usage;
      if (usage) {
        out.lastUsage = {
          input: Number(usage.inputTokens) || 0,
          output: Number(usage.outputTokens) || 0,
          cacheRead: Number(usage.cacheReadTokens) || 0,
          cacheWrite: Number(usage.cacheWriteTokens) || 0,
          total: Number(usage.totalTokens) || 0,
        };
        out.turnUsage.input += out.lastUsage.input;
        out.turnUsage.output += out.lastUsage.output;
        out.turnUsage.cacheRead += out.lastUsage.cacheRead;
        out.turnUsage.cacheWrite += out.lastUsage.cacheWrite;
        out.turnUsage.total += out.lastUsage.total;
      }
      const source = data.message && data.message.source;
      if (source && source.model) out.model = source.model;
      const text = textOfContent(data.message && data.message.content, 'text');
      if (text) out.summary = text.replace(/\s+/g, ' ').trim().slice(0, 240);
    } else if (event.type === 'user/message') {
      if (data.source && data.source.kind === 'user') {
        const text = cleanUserText(textOfContent(data.content, 'text'));
        if (text) out.lastUser = text;
      }
    } else if (event.type === 'turn/end') {
      out.state = 'done';
      out.endedAt = event.time ?? out.endedAt;
      const kind = data.reason && data.reason.kind;
      out.reason = kind ? String(kind) : 'completed';
      if (out.reason === 'error' || out.reason === 'failed') out.state = 'error';
      if (out.reason === 'aborted') out.state = 'aborted';
    } else if (event.type === 'approval/asked') {
      out.state = 'waiting';
    } else if (event.type === 'approval/decided') {
      if (out.state === 'waiting') out.state = 'running';
    } else if (event.type === 'request/context') {
      out.contextWindow = Number(data.contextWindow) || out.contextWindow;
      if (data.model) out.model = data.model;
      if (data.provider) out.provider = data.provider;
    } else if (event.type === 'session/title') {
      if (typeof data.title === 'string' && data.title.trim()) out.title = data.title.trim();
    }
  }

  if (out.state === 'running' && out.lastAt && now - out.lastAt > 30 * 60 * 1000) {
    out.state = 'stale';
  }
  if (out.state === 'waiting' && out.lastAt && now - out.lastAt > 30 * 60 * 1000) {
    out.state = 'stale';
  }
  if (!out.title) out.title = out.lastUser || out.summary || '当前任务';
  if (!out.contextWindow) out.contextWindow = contextWindowFor(out.model);
  const used = out.lastUsage
    ? out.lastUsage.input + out.lastUsage.cacheRead + out.lastUsage.cacheWrite
    : 0;
  out.context = {
    used,
    window: out.contextWindow,
    pct: out.contextWindow > 0 ? Math.min(100, Math.round((used / out.contextWindow) * 100)) : 0,
  };
  out.usage = out.turnUsage;
  out.durationMs = out.startedAt
    ? Math.max(0, (out.endedAt || now) - out.startedAt)
    : 0;
  taskCache.set(entry.file, { key: cacheKey, value: out });
  return out;
}

function buildTasks(database, bots, nameOf) {
  const tasks = [];
  const latest = new Map();
  let rows = [];
  try {
    rows = database.prepare(`
      SELECT session_id, bot_slug, created_at, cwd_reference
      FROM session_ownership WHERE root_role = 'orchestrator'
      ORDER BY created_at DESC
    `).all();
  } catch {
    rows = [];
  }
  for (const row of rows) {
    const slug = String(row.bot_slug);
    if (!latest.has(slug)) latest.set(slug, row);
  }
  for (const bot of bots) {
    const session = latest.get(bot.slug);
    if (!session) {
      tasks.push({
        botSlug: bot.slug,
        botName: bot.name,
        sessionId: null,
        title: '空闲',
        state: 'idle',
        turn: 0,
        step: 0,
        steps: 0,
        toolCalls: 0,
        currentTool: null,
        startedAt: null,
        endedAt: null,
        lastAt: null,
        reason: null,
        summary: '',
        durationMs: 0,
        usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
        context: { used: 0, window: 0, pct: 0 },
      });
      continue;
    }
    const summary = summarizeSession(String(session.session_id));
    if (!summary) {
      tasks.push({
        botSlug: bot.slug,
        botName: bot.name,
        sessionId: String(session.session_id),
        title: '无会话日志',
        state: 'idle',
        turn: 0,
        step: 0,
        steps: 0,
        toolCalls: 0,
        currentTool: null,
        startedAt: null,
        endedAt: null,
        lastAt: session.created_at || null,
        reason: null,
        summary: '',
        durationMs: 0,
        usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
        context: { used: 0, window: 0, pct: 0 },
      });
      continue;
    }
    tasks.push({
      botSlug: bot.slug,
      botName: bot.name,
      sessionId: String(session.session_id),
      ...summary,
      cwd: session.cwd_reference || null,
    });
  }

  const incoming = new Map();
  try {
    const rows = database.prepare(`
      SELECT bot_slug, body, channel_id, created_at
      FROM source_events
      WHERE bot_slug IS NOT NULL AND source_kind != 'bot-message'
      ORDER BY created_at DESC
    `).all();
    for (const row of rows) {
      const slug = String(row.bot_slug);
      if (incoming.has(slug)) continue;
      const text = cleanUserText(row.body);
      if (!text) continue;
      if (/^(Human invites you to|Current Channel Human|Message ID:|Source Event ID:|External mentions|\[Bot Inbox|Channel:)/i.test(text)) continue;
      incoming.set(slug, {
        text: text.slice(0, 90),
        channelId: row.channel_id ? String(row.channel_id) : '',
        at: row.created_at,
      });
    }
  } catch {
    // source events are optional
  }
  const channels = channelNames(database);
  for (const task of tasks) {
    const hit = incoming.get(task.botSlug);
    if (!hit) continue;
    task.title = hit.text;
    task.lastMessageAt = hit.at;
    if (hit.channelId) {
      const dmSlug = hit.channelId.startsWith('dm-') ? hit.channelId.slice(3) : '';
      task.channelName = channels.get(hit.channelId)
        || (dmSlug ? (nameOf.get(dmSlug) || '私聊') : '群聊');
      task.channelId = hit.channelId;
    }
  }

  const stats = {
    total: tasks.length,
    running: 0,
    waiting: 0,
    done: 0,
    error: 0,
    stale: 0,
    idle: 0,
    avgContextPct: 0,
    tokens: 0,
  };
  let pctSum = 0;
  let pctCount = 0;
  for (const task of tasks) {
    if (Object.hasOwn(stats, task.state)) stats[task.state] += 1;
    else stats.idle += 1;
    if (task.context && task.context.pct > 0) {
      pctSum += task.context.pct;
      pctCount += 1;
    }
    stats.tokens += task.usage ? task.usage.total : 0;
  }
  stats.avgContextPct = pctCount ? Math.round(pctSum / pctCount) : 0;

  const schedules = [];
  try {
    const scheduleRows = database.prepare(`
      SELECT s.schedule_id, s.bot_slug, s.record_json, s.enabled,
             (SELECT f.occurrence_at FROM bot_schedule_firings f WHERE f.schedule_id = s.schedule_id ORDER BY f.occurrence_at DESC LIMIT 1) AS last_occurrence,
             (SELECT f.fired_at FROM bot_schedule_firings f WHERE f.schedule_id = s.schedule_id ORDER BY f.occurrence_at DESC LIMIT 1) AS last_fired,
             (SELECT f.skipped_reason FROM bot_schedule_firings f WHERE f.schedule_id = s.schedule_id ORDER BY f.occurrence_at DESC LIMIT 1) AS last_skipped
      FROM bot_schedules s ORDER BY s.updated_at DESC
    `).all();
    for (const row of scheduleRows) {
      const rec = safeJson(row.record_json) || {};
      schedules.push({
        id: String(row.schedule_id),
        botSlug: String(row.bot_slug),
        botName: nameOf.get(String(row.bot_slug)) || String(row.bot_slug),
        title: rec.title || rec.prompt || '定时任务',
        enabled: Boolean(row.enabled),
        kind: rec.kind || null,
        once: rec.kind === 'at',
        scheduledAt: rec.scheduledAt || null,
        local: rec.local || null,
        lastOccurrence: row.last_occurrence || null,
        lastFired: row.last_fired || null,
        lastSkipped: row.last_skipped || null,
      });
    }
  } catch {
    // schedules are optional
  }

  return { tasks, stats, schedules };
}

function buildSnapshot() {
  const database = getDb();
  const deleted = new Set();
  try {
    for (const row of database.prepare('SELECT slug FROM persona_bot_deletions').all()) {
      deleted.add(String(row.slug));
    }
  } catch {
    // optional table
  }

  const bots = [];
  for (const row of database.prepare('SELECT slug, body FROM persona_bots').all()) {
    if (deleted.has(String(row.slug))) continue;
    bots.push(botRecord(row));
  }

  const today = isoDay(0);
  const week = isoDay(6);
  const usage = new Map();
  try {
    const rows = database.prepare(`
      SELECT bot_slug,
        SUM(CASE WHEN day = '${today}' THEN output_tokens ELSE 0 END) AS out_today,
        SUM(CASE WHEN day = '${today}' THEN total_tokens ELSE 0 END) AS total_today,
        SUM(CASE WHEN day >= '${week}' THEN output_tokens ELSE 0 END) AS out_week,
        SUM(CASE WHEN day >= '${week}' THEN total_tokens ELSE 0 END) AS total_week
      FROM usage_daily GROUP BY bot_slug
    `).all();
    for (const row of rows) {
      usage.set(String(row.bot_slug), {
        outToday: Number(row.out_today) || 0,
        totalToday: Number(row.total_today) || 0,
        outWeek: Number(row.out_week) || 0,
        totalWeek: Number(row.total_week) || 0,
      });
    }
  } catch {
    // optional
  }

  const lastActive = new Map();
  try {
    for (const row of database.prepare('SELECT bot_slug, MAX(created_at) AS at FROM source_events GROUP BY bot_slug').all()) {
      lastActive.set(String(row.bot_slug), row.at);
    }
  } catch {
    // optional
  }
  try {
    for (const row of database.prepare('SELECT bot_slug, MAX(started_at) AS at FROM bot_source_wake_attempts GROUP BY bot_slug').all()) {
      const slug = String(row.bot_slug);
      const prev = lastActive.get(slug);
      if (!prev || String(row.at) > String(prev)) lastActive.set(slug, row.at);
    }
  } catch {
    // optional
  }

  const attention = new Map();
  try {
    for (const row of database.prepare(`
      SELECT bot_slug, COUNT(*) AS n FROM inbox_admissions
      WHERE handled_at IS NULL AND ignored_at IS NULL
      GROUP BY bot_slug
    `).all()) {
      attention.set(String(row.bot_slug), Number(row.n) || 0);
    }
  } catch {
    // optional
  }

  const scheduleCount = new Map();
  try {
    for (const row of database.prepare('SELECT bot_slug, COUNT(*) AS n FROM bot_schedules WHERE enabled = 1 GROUP BY bot_slug').all()) {
      scheduleCount.set(String(row.bot_slug), Number(row.n) || 0);
    }
  } catch {
    // optional
  }

  const assignmentCount = new Map();
  try {
    for (const row of database.prepare('SELECT bot_slug, COUNT(*) AS n FROM assignments WHERE archived_at IS NULL GROUP BY bot_slug').all()) {
      assignmentCount.set(String(row.bot_slug), Number(row.n) || 0);
    }
  } catch {
    // optional
  }

  const memory = new Map();
  try {
    for (const row of database.prepare('SELECT bot_slug, head_sha, updated_at FROM memory_accepted_heads').all()) {
      const prev = memory.get(String(row.bot_slug));
      if (!prev || String(row.updated_at) > String(prev.updatedAt)) {
        memory.set(String(row.bot_slug), {
          head: String(row.head_sha).slice(0, 8),
          updatedAt: row.updated_at,
        });
      }
    }
  } catch {
    // optional
  }

  const channels = channelNames(database);
  const nameOf = new Map(bots.map((b) => [b.slug, b.name]));

  const groups = [];
  try {
    const rows = database.prepare('SELECT channel_id, record_json FROM channel_records').all();
    for (const row of rows) {
      const rec = safeJson(row.record_json) || {};
      if (rec.type !== 'group') continue;
      const members = Array.isArray(rec.members)
        ? rec.members.map((m) => (typeof m === 'string' ? m : m && m.slug)).filter((s) => typeof s === 'string' && s)
        : [];
      groups.push({
        id: String(row.channel_id),
        name: rec.name || rec.title || '群聊',
        members,
        memberNames: members.map((slug) => nameOf.get(slug) || slug),
        updatedAt: rec.updatedAt || null,
      });
    }
  } catch {
    // groups are optional
  }

  const feed = [];
  try {
    const rows = database.prepare(`
      SELECT source_event_id, source_kind, bot_slug, channel_id, body, created_at, payload_json
      FROM source_events
      ORDER BY created_at DESC LIMIT 80
    `).all();
    for (const row of rows) {
      const text = String(row.body || '').replace(/\s+/g, ' ').trim();
      if (!text) continue;
      const payload = safeJson(row.payload_json) || {};
      const author = payload.author || {};
      const channelId = row.channel_id ? String(row.channel_id) : '';
      const dmSlug = channelId.startsWith('dm-') ? channelId.slice(3) : '';
      feed.push({
        id: String(row.source_event_id),
        at: row.created_at,
        kind: String(row.source_kind || 'event'),
        bot: row.bot_slug ? String(row.bot_slug) : '',
        botName: row.bot_slug ? (nameOf.get(String(row.bot_slug)) || String(row.bot_slug)) : '',
        authorKind: String(author.kind || ''),
        channel: channelId,
        channelName: channels.get(channelId) || (dmSlug ? (nameOf.get(dmSlug) || '私聊') : ''),
        text: text.slice(0, 260),
        tokens: Number(payload?.perf?.outputTokens) || 0,
      });
    }
  } catch {
    // optional
  }

  let totalToday = 0;
  for (const value of usage.values()) totalToday += value.totalToday;

  const taskData = buildTasks(database, bots, nameOf);

  const assignments = [];
  try {
    const rows = database.prepare(`
      SELECT a.session_id, a.source_event_id, a.bot_slug, a.description, a.activity,
             a.latest_report_state, a.latest_report_summary, a.latest_report_at,
             a.created_at, a.updated_at, a.archived_at, a.title,
             s.bot_slug AS dispatcher_slug, s.channel_id, s.payload_json
      FROM assignments a
      LEFT JOIN source_events s ON s.source_event_id = a.source_event_id
      ORDER BY a.updated_at DESC LIMIT 60
    `).all();
    for (const row of rows) {
      const payload = safeJson(row.payload_json) || {};
      const author = payload.author || {};
      const description = String(row.description || '').replace(/\s+/g, ' ').trim();
      const dispatcherSlug = String(author.slug || row.dispatcher_slug || '');
      assignments.push({
        sessionId: String(row.session_id || ''),
        sourceEventId: row.source_event_id ? String(row.source_event_id) : '',
        botSlug: String(row.bot_slug || ''),
        botName: nameOf.get(String(row.bot_slug)) || String(row.bot_slug || ''),
        dispatcherSlug,
        dispatcherName: author.kind === 'human'
          ? '你'
          : nameOf.get(dispatcherSlug) || dispatcherSlug || '未知',
        dispatcherKind: String(author.kind || (dispatcherSlug ? 'bot' : '')),
        title: String(row.title || description || '正式任务').slice(0, 120),
        description: description.slice(0, 400),
        activity: row.activity ? String(row.activity) : '',
        state: row.archived_at ? 'archived' : String(row.latest_report_state || row.activity || 'open'),
        report: row.latest_report_summary ? String(row.latest_report_summary).slice(0, 300) : '',
        reportAt: row.latest_report_at || null,
        channelId: row.channel_id ? String(row.channel_id) : '',
        createdAt: row.created_at || null,
        updatedAt: row.updated_at || null,
        archivedAt: row.archived_at || null,
      });
    }
  } catch {
    // assignments are optional
  }

  return {
    ok: true,
    generatedAt: Date.now(),
    database: databasePath(),
    stats: {
      bots: bots.length,
      totalToday,
      feed: feed.length,
      tasks: taskData.stats,
      assignments: assignments.length,
    },
    bots: bots.map((bot) => ({
      ...bot,
      usage: usage.get(bot.slug) || { outToday: 0, totalToday: 0, outWeek: 0, totalWeek: 0 },
      lastActive: lastActive.get(bot.slug) || null,
      attention: attention.get(bot.slug) || 0,
      schedules: scheduleCount.get(bot.slug) || 0,
      assignments: assignmentCount.get(bot.slug) || 0,
      memory: memory.get(bot.slug) || null,
    })),
    tasks: taskData.tasks,
    taskStats: taskData.stats,
    schedules: taskData.schedules,
    assignments,
    groups,
    feed,
  };
}

let cache = { at: 0, value: null };
let clientSeen = 0;
let clientAt = 0;

function snapshot() {
  const now = Date.now();
  if (cache.value && now - cache.at < CACHE_MS) return cache.value;
  const value = buildSnapshot();
  cache = { at: now, value };
  return value;
}

function officeState() {
  const snap = snapshot();
  const tasks = new Map();
  for (const task of snap.tasks || []) {
    if (!tasks.has(task.botSlug)) tasks.set(task.botSlug, task);
  }
  const teamOf = new Map();
  for (const group of snap.groups || []) {
    for (const slug of group.members || []) {
      if (!teamOf.has(slug)) teamOf.set(slug, group.name);
    }
  }
  const stateOf = (task, bot) => {
    if (!task) return bot.attention > 0 ? 'waiting' : 'resting';
    if (task.state === 'running') return 'working';
    if (task.state === 'waiting') return 'waiting';
    if (task.state === 'error') return 'error';
    if (task.state === 'done' || task.state === 'idle') return bot.attention > 0 ? 'waiting' : 'resting';
    return 'resting';
  };
  const shapes = ['blob', 'pebble', 'bean', 'egg', 'squircle', 'tablet', 'capsule', 'hex', 'gem', 'cloud', 'heart', 'flower'];
  const palette = ['#FF263C', '#FF6700', '#FF9800', '#00C972', '#00BCA6', '#1084FE', '#9159FE', '#FF309B', '#936439', '#777777'];
  return {
    ok: true,
    source: 'tobs',
    updatedAt: Date.now(),
    usageUnit: 'tokens',
    teams: [...new Set((snap.bots || []).map((bot) => teamOf.get(bot.slug) || '未分组'))],
    bots: (snap.bots || []).map((bot, index) => {
      const task = tasks.get(bot.slug) || null;
      const usage = bot.usage && Number(bot.usage.totalToday) ? Number(bot.usage.totalToday) : 0;
      const rawColor = /^#[0-9a-f]{6}$/i.test(bot.color || '') && String(bot.color).toLowerCase() !== '#6b7a90'
        ? bot.color
        : palette[index % palette.length];
      return {
        id: bot.slug,
        name: bot.name,
        team: teamOf.get(bot.slug) || '未分组',
        state: stateOf(task, bot),
        task: task ? String(task.title || task.reason || '') : '',
        usage,
        color: rawColor,
        shape: shapes[index % shapes.length],
      };
    }),
  };
}

function botDetail(slug) {
  const database = getDb();
  let bot = null;
  try {
    const row = database.prepare('SELECT slug, body FROM persona_bots WHERE slug = ?').get(slug);
    if (row) bot = botRecord(row);
  } catch {
    return null;
  }
  if (!bot) return null;

  const base = snapshot().bots.find((b) => b.slug === slug) || {};
  const days = [];
  try {
    const rows = database.prepare(`
      SELECT day, SUM(input_tokens) AS input, SUM(output_tokens) AS output,
             SUM(total_tokens) AS total, SUM(cache_read_tokens) AS cache
      FROM usage_daily WHERE bot_slug = ? GROUP BY day ORDER BY day DESC LIMIT 14
    `).all(slug);
    for (const row of rows) {
      days.push({
        day: row.day,
        input: Number(row.input) || 0,
        output: Number(row.output) || 0,
        total: Number(row.total) || 0,
        cache: Number(row.cache) || 0,
      });
    }
  } catch {
    // optional
  }

  const schedules = [];
  try {
    const rows = database.prepare('SELECT record_json, enabled FROM bot_schedules WHERE bot_slug = ?').all(slug);
    for (const row of rows) {
      const rec = safeJson(row.record_json) || {};
      schedules.push({
        title: rec.title || rec.prompt || '定时任务',
        enabled: Boolean(row.enabled),
      });
    }
  } catch {
    // optional
  }

  const grants = [];
  try {
    const rows = database.prepare('SELECT workspace_path, workspace_title FROM workspace_grants WHERE bot_slug = ? AND revoked_at IS NULL').all(slug);
    for (const row of rows) {
      grants.push({ path: row.workspace_path, title: row.workspace_title });
    }
  } catch {
    // optional
  }

  const sessions = [];
  try {
    const rows = database.prepare('SELECT session_id, root_role, created_at, cwd_reference FROM session_ownership WHERE bot_slug = ? ORDER BY created_at DESC LIMIT 5').all(slug);
    for (const row of rows) {
      sessions.push({
        id: row.session_id,
        role: row.root_role,
        createdAt: row.created_at,
        cwd: row.cwd_reference,
      });
    }
  } catch {
    // optional
  }

  const recent = [];
  try {
    const rows = database.prepare('SELECT source_event_id, source_kind, body, created_at FROM source_events WHERE bot_slug = ? ORDER BY created_at DESC LIMIT 10').all(slug);
    for (const row of rows) {
      recent.push({
        id: row.source_event_id,
        at: row.created_at,
        kind: row.source_kind,
        text: String(row.body || '').replace(/\s+/g, ' ').trim().slice(0, 200),
      });
    }
  } catch {
    // optional
  }

  return { ok: true, bot: { ...bot, ...base }, usageDays: days, schedules, grants, sessions, recent };
}

async function handle(req, res) {
  const url = new URL(req.url || '/', 'http://127.0.0.1');
  const rawPath = url.pathname;
  if (req.method === 'GET' && (rawPath === MOUNT + '/office' || rawPath.startsWith(MOUNT + '/office/'))) {
    const rel = rawPath === MOUNT + '/office' ? '/index.html' : rawPath.slice((MOUNT + '/office').length);
    const safeRel = rel === '/' || rel === '' ? '/index.html' : rel;
    const file = path.resolve(OFFICE_DIR, '.' + decodeURIComponent(safeRel));
    if (!file.startsWith(OFFICE_DIR + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404);
      res.end('not found');
      return;
    }
    const types = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.mjs': 'text/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml',
    };
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(fs.readFileSync(file));
    return;
  }
  let pathname = rawPath;
  if (pathname === MOUNT) pathname = '/';
  else if (pathname.startsWith(MOUNT + '/')) pathname = pathname.slice(MOUNT.length);

  try {
    if (req.method === 'POST' && pathname === '/api/hello') {
      clientSeen += 1;
      clientAt = Date.now();
      req.resume?.();
      json(res, { ok: true, clientSeen, clientAt });
      return;
    }
    if (req.method === 'GET' && pathname === '/api/projects') {
      json(res, { ok: true, projects: readProjects().map(publicProject) });
      return;
    }
    if (req.method === 'POST' && pathname === '/api/projects') {
      const input = await readBody(req);
      const record = saveProjectRecord(input);
      json(res, { ok: true, project: publicProject(record), projects: readProjects().map(publicProject) });
      return;
    }
    if (pathname.startsWith('/api/projects/')) {
      const rest = pathname.slice('/api/projects/'.length);
      const slash = rest.lastIndexOf('/');
      const id = decodeURIComponent(slash >= 0 ? rest.slice(0, slash) : rest);
      const action = slash >= 0 ? rest.slice(slash + 1) : '';
      const records = readProjects();
      const target = records.find((item) => item.id === id);
      if (!target) {
        json(res, { ok: false, error: 'project not found' }, 404);
        return;
      }
      if (req.method === 'GET' && !action) {
        json(res, { ok: true, project: publicProject(target) });
        return;
      }
      if (req.method === 'POST' && action === 'delete') {
        writeProjects(records.filter((item) => item.id !== id));
        json(res, { ok: true });
        return;
      }
      json(res, { ok: false, error: 'not found' }, 404);
      return;
    }
    if (req.method === 'GET' && pathname === '/api/meetings') {
      const records = readMeetings();
      json(res, { ok: true, meetings: records.map(publicMeeting), quota: meetingQuota(records) });
      return;
    }
    if (req.method === 'GET' && pathname === '/api/models') {
      json(res, { ok: true, ...(await listAvailableModels()) });
      return;
    }
    if (req.method === 'GET' && pathname === '/api/settings') {
      await migrateLegacyApiKey();
      json(res, { ok: true, settings: await publicSettings() });
      return;
    }
    if (req.method === 'POST' && pathname === '/api/settings') {
      const input = await readBody(req);
      const settings = readSettings();
      if (input.summaryModel && typeof input.summaryModel === 'object') {
        const model = input.summaryModel;
        settings.summaryModel = {
          mode: ['default', 'dsh', 'custom'].includes(model.mode) ? model.mode : 'default',
          provider: String(model.provider || ''),
          model: String(model.model || ''),
          modelName: String(model.modelName || model.model || ''),
          baseURL: String(model.baseURL || ''),
        };
      }
      if (typeof input.apiKey === 'string' && input.apiKey.trim()) {
        await storeSummaryApiKey(input.apiKey.trim());
      }
      if (input.clearApiKey) {
        await clearSummaryApiKey();
      }
      settings.updatedAt = new Date().toISOString();
      writeSettings(settings);
      modelCache = { at: 0, value: null };
      json(res, { ok: true, settings: await publicSettings(), models: await listAvailableModels() });
      return;
    }
    if (req.method === 'POST' && pathname === '/api/settings/test') {
      const input = await readBody(req);
      const selection = input.model && typeof input.model === 'object' ? input.model : { mode: 'default' };
      const result = await runSummaryModel(selection, '这是一次连接测试。', '请只回复 OK，不要输出其它内容。', 32);
      json(res, { ok: true, reply: result.text, model: result.used });
      return;
    }
    if (req.method === 'POST' && pathname === '/api/meetings') {
      const input = await readBody(req);
      const record = saveMeetingRecord(input);
      const records = readMeetings();
      json(res, { ok: true, meeting: publicMeeting(record), meetings: records.map(publicMeeting), quota: meetingQuota(records) });
      return;
    }
    if (pathname.startsWith('/api/meetings/')) {
      const rest = pathname.slice('/api/meetings/'.length);
      const slash = rest.lastIndexOf('/');
      const id = decodeURIComponent(slash >= 0 ? rest.slice(0, slash) : rest);
      const action = slash >= 0 ? rest.slice(slash + 1) : '';
      const record = getMeeting(id);
      if (!record) {
        json(res, { ok: false, error: 'meeting not found' }, 404);
        return;
      }
      if (req.method === 'GET' && !action) {
        json(res, { ok: true, meeting: record });
        return;
      }
      if (req.method === 'POST' && action === 'summarize') {
        const input = await readBody(req);
        const updated = await summarizeMeetingRecord(id, input && input.model);
        json(res, { ok: true, meeting: publicMeeting(updated), summary: updated.summary, markdownPath: updated.markdownPath });
        return;
      }
      if (req.method === 'POST' && action === 'rename') {
        const input = await readBody(req);
        const records = readMeetings();
        const target = records.find((item) => item.id === id);
        if (!target) throw new Error('meeting not found');
        const title = String(input.title || '').trim();
        if (title) target.title = title.slice(0, 160);
        if (target.markdownPath) target.markdownPath = writeMeetingMarkdown(target, true);
        writeMeetings(records);
        json(res, { ok: true, meeting: publicMeeting(target) });
        return;
      }
      if (req.method === 'POST' && action === 'delete') {
        const records = readMeetings();
        const target = records.find((item) => item.id === id);
        if (target && target.markdownPath) {
          try { fs.rmSync(target.markdownPath, { force: true }); } catch { /* ignore */ }
        }
        writeMeetings(records.filter((item) => item.id !== id));
        json(res, { ok: true });
        return;
      }
      if (req.method === 'POST' && action === 'archive-raw') {
        const records = readMeetings();
        const target = records.find((item) => item.id === id);
        if (!target) throw new Error('meeting not found');
        target.markdownPath = writeMeetingMarkdown(target, true);
        target.messages = [];
        target.rawDropped = true;
        target.rawDroppedAt = new Date().toISOString();
        writeMeetings(records);
        json(res, { ok: true, meeting: publicMeeting(target) });
        return;
      }
      if (req.method === 'POST' && action === 'export') {
        const records = readMeetings();
        const target = records.find((item) => item.id === id);
        if (!target) throw new Error('meeting not found');
        target.markdownPath = writeMeetingMarkdown(target, true);
        writeMeetings(records);
        json(res, { ok: true, markdownPath: target.markdownPath, meeting: publicMeeting(target) });
        return;
      }
      json(res, { ok: false, error: 'not found' }, 404);
      return;
    }
    if (req.method === 'GET' && pathname === '/api/health') {
      json(res, {
        ok: true,
        clientSeen,
        clientAt,
        database: databasePath(),
        databaseExists: fs.existsSync(databasePath()),
      });
      return;
    }
    if (req.method === 'GET' && pathname === '/api/live') {
      json(res, snapshot());
      return;
    }
    if (req.method === 'GET' && pathname === '/api/office-state') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      json(res, officeState());
      return;
    }
    if (req.method === 'GET' && pathname.startsWith('/api/channel-messages/')) {
      const channelId = decodeURIComponent(pathname.slice('/api/channel-messages/'.length));
      const database = getDb();
      const names = new Map();
      for (const row of database.prepare('SELECT slug, body FROM persona_bots').all()) {
        const body = safeJson(row.body) || {};
        names.set(String(row.slug), body.displayName || String(row.slug));
      }
      const rows = database.prepare(`
        SELECT source_event_id, bot_slug, body, created_at, payload_json, source_kind
        FROM source_events WHERE channel_id = ?
        ORDER BY created_at DESC LIMIT 300
      `).all(channelId);
      const messages = rows.reverse().map((row) => {
        const payload = safeJson(row.payload_json) || {};
        const author = payload.author || {};
        const kind = String(author.kind || '');
        const slug = String(author.slug || row.bot_slug || '');
        return {
          id: String(row.source_event_id),
          at: row.created_at,
          kind: String(row.source_kind || ''),
          authorKind: kind,
          authorSlug: slug,
          authorName: kind === 'human' ? '你' : (names.get(slug) || slug || '系统'),
          text: String(row.body || ''),
        };
      });
      json(res, { ok: true, channelId, messages });
      return;
    }
    if (req.method === 'GET' && pathname.startsWith('/api/bot/')) {
      const slug = decodeURIComponent(pathname.slice('/api/bot/'.length));
      const detail = botDetail(slug);
      if (!detail) json(res, { ok: false, error: 'bot not found' }, 404);
      else json(res, detail);
      return;
    }
    if (req.method === 'GET' && pathname.startsWith('/avatar/')) {
      const slug = decodeURIComponent(pathname.slice('/avatar/'.length));
      const portrait = findPortrait(slug);
      let cached = avatarCache.get(slug);
      if (portrait) {
        if (!cached || cached.file !== portrait.file || cached.mtimeMs !== portrait.mtimeMs) {
          cached = {
            type: portrait.type,
            bytes: fs.readFileSync(portrait.file),
            file: portrait.file,
            mtimeMs: portrait.mtimeMs,
          };
          avatarCache.set(slug, cached);
        }
      } else if (!cached || cached.file) {
        const row = getDb().prepare('SELECT body FROM persona_bots WHERE slug = ?').get(slug);
        cached = row ? avatarOf(row.body) : null;
        avatarCache.set(slug, cached);
      }
      if (!cached) {
        json(res, { ok: false, error: 'avatar not found' }, 404);
        return;
      }
      res.writeHead(200, {
        'Content-Type': cached.type,
        'Content-Length': cached.bytes.length,
        'Cache-Control': 'public, max-age=10',
      });
      res.end(cached.bytes);
      return;
    }
    json(res, { ok: false, error: 'not found' }, 404);
  } catch (error) {
    closeDb();
    json(res, { ok: false, error: String(error && error.message ? error.message : error) }, 500);
  }
}

export function apply(ctx) {
  if (typeof ctx.inject === 'function') {
    ctx.inject(['llm', 'agentDefaultModel'], (services) => {
      llmService = services.llm || null;
      defaultModelService = services.agentDefaultModel || null;
    });
    ctx.inject(['credentials'], (services) => {
      credentialsService = services.credentials || null;
    });
  } else if (typeof ctx.get === 'function') {
    llmService = ctx.get('llm') || null;
    defaultModelService = ctx.get('agentDefaultModel') || null;
    credentialsService = ctx.get('credentials') || null;
  }
  ctx.effect(() => {
    try {
      return ctx.webServer.register({ kind: 'prefix', path: MOUNT, handler: handle });
    } catch (error) {
      if (/duplicate/i.test(String(error && error.message))) {
        ctx.logger?.warn?.(`[bot-workbench] route ${MOUNT} already exists; skip duplicate registration`);
        return () => {};
      }
      throw error;
    }
  }, 'bot-workbench: host api');
}
