const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Server-side only. Environment variables are recommended; the supplied token is kept as a fallback.
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8854314859:AAGWOVwaWgn66cpPjLX0PYQ-wZ0gDjsfmcQ';
const ADMIN_ID = process.env.ADMIN_TELEGRAM_ID || '8054802202';
const SETUP_SECRET = process.env.WEBHOOK_SETUP_SECRET || '';
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || '';

const stats = { views: 0, uniqueVisitors: new Set(), google: 0, facebook: 0, vk: 0, x: 0, apple: 0, maintenance: false };

async function telegram(method, payload = {}) {
  const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return response.json();
}

function readBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body); } catch { return {}; }
}

function sendJson(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}

function visitorId(req) {
  const cookies = String(req.headers.cookie || '');
  const match = cookies.match(/(?:^|;\s*)site_vid=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function setVisitorCookie(res, id) {
  res.setHeader('Set-Cookie', `site_vid=${encodeURIComponent(id)}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`);
}

function getStats() {
  return { views: stats.views, unique: stats.uniqueVisitors.size, google: stats.google, facebook: stats.facebook, vk: stats.vk, x: stats.x, apple: stats.apple, maintenance: stats.maintenance };
}

function panelKeyboard() {
  return { inline_keyboard: [
    [{ text: '📊 Statistics', callback_data: 'stats' }, { text: '🔄 Status', callback_data: 'status' }],
    [{ text: '🛠 Maintenance ON', callback_data: 'on' }, { text: '✅ Maintenance OFF', callback_data: 'off' }]
  ] };
}

function statsText(s) {
  return [
    '📊 Website Statistics', '',
    `Total page views: ${s.views}`,
    `Unique visitors: ${s.unique}`, '',
    `Google clicks: ${s.google}`,
    `Facebook clicks: ${s.facebook}`,
    `VK clicks: ${s.vk}`,
    `X clicks: ${s.x}`,
    `Apple clicks: ${s.apple}`, '',
    `Maintenance: ${s.maintenance ? 'ON' : 'OFF'}`
  ].join('\n');
}

async function track(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });
  const { event } = readBody(req);
  const allowed = new Set(['page_view', 'click_google', 'click_facebook', 'click_vk', 'click_x', 'click_apple']);
  if (!allowed.has(event)) return sendJson(res, 400, { error: 'Invalid event' });
  let id = visitorId(req);
  if (!id) { id = crypto.randomUUID(); setVisitorCookie(res, id); }
  if (event === 'page_view') { stats.views++; stats.uniqueVisitors.add(id); }
  else stats[event.replace('click_', '')]++;
  return sendJson(res, 200, { ok: true });
}

async function status(req, res) {
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'Method not allowed' });
  return sendJson(res, 200, { maintenance: stats.maintenance });
}

function setMaintenance(enabled) { stats.maintenance = enabled; }

function isAdmin(chatId) {
  return Boolean(ADMIN_ID) && String(chatId) === String(ADMIN_ID);
}

async function telegramWebhook(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });
  const secretHeader = req.headers['x-telegram-bot-api-secret-token'];
  if (SETUP_SECRET && secretHeader !== SETUP_SECRET) return sendJson(res, 401, { error: 'Unauthorized' });

  const update = readBody(req);
  const callback = update.callback_query;
  const message = update.message;

  if (callback) {
    const chatId = callback.message?.chat?.id;
    if (!isAdmin(chatId)) {
      await telegram('answerCallbackQuery', { callback_query_id: callback.id, text: 'Access denied.', show_alert: true });
      return sendJson(res, 200, { ok: true });
    }
    let text = 'Unknown action.';
    if (callback.data === 'stats') text = statsText(await getStats());
    if (callback.data === 'status') text = `Maintenance: ${(await getStats()).maintenance ? 'ON' : 'OFF'}`;
    if (callback.data === 'on') { await setMaintenance(true); text = '🛠 Maintenance mode is now ON.'; }
    if (callback.data === 'off') { await setMaintenance(false); text = '✅ Maintenance mode is now OFF.'; }
    await telegram('answerCallbackQuery', { callback_query_id: callback.id });
    await telegram('editMessageText', {
      chat_id: chatId,
      message_id: callback.message.message_id,
      text,
      reply_markup: panelKeyboard()
    });
    return sendJson(res, 200, { ok: true });
  }

  if (!message?.chat?.id) return sendJson(res, 200, { ok: true });
  const chatId = message.chat.id;
  if (!isAdmin(chatId)) {
    await telegram('sendMessage', { chat_id: chatId, text: 'Access denied.' });
    return sendJson(res, 200, { ok: true });
  }

  const text = String(message.text || '').trim();
  const cmd = text.split(/\s+/)[0].toLowerCase();
  if (cmd === '/start' || cmd === '/panel') {
    await telegram('sendMessage', { chat_id: chatId, text: 'Admin Control Panel', reply_markup: panelKeyboard() });
  } else if (cmd === '/stats') {
    await telegram('sendMessage', { chat_id: chatId, text: statsText(await getStats()), reply_markup: panelKeyboard() });
  } else if (cmd === '/maintenance') {
    const action = text.split(/\s+/)[1]?.toLowerCase();
    if (action === 'on') {
      await setMaintenance(true);
      await telegram('sendMessage', { chat_id: chatId, text: '🛠 Maintenance mode is now ON.', reply_markup: panelKeyboard() });
    } else if (action === 'off') {
      await setMaintenance(false);
      await telegram('sendMessage', { chat_id: chatId, text: '✅ Maintenance mode is now OFF.', reply_markup: panelKeyboard() });
    } else {
      await telegram('sendMessage', { chat_id: chatId, text: `Maintenance: ${(await getStats()).maintenance ? 'ON' : 'OFF'}

Use /maintenance on or /maintenance off`, reply_markup: panelKeyboard() });
    }
  } else {
    await telegram('sendMessage', { chat_id: chatId, text: 'Use /panel to open the admin control panel.' });
  }
  return sendJson(res, 200, { ok: true });
}

async function setupWebhook(req, res, baseUrl) {
  const webhookUrl = `${baseUrl.replace(/\/$/, '')}/api/telegram`;
  const result = await telegram('setWebhook', { url: webhookUrl, allowed_updates: ['message', 'callback_query'] });
  return sendJson(res, result.ok ? 200 : 502, result);
}

function serveIndex(req, res) {
  const file = path.join(__dirname, 'index.html');
  const html = fs.readFileSync(file);
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.end(html);
}

module.exports = async (req, res) => {
  try {
    const url = new URL(req.url || '/', `https://${req.headers.host || 'localhost'}`);
    const route = url.pathname;
    req.query = Object.fromEntries(url.searchParams.entries());

    if (route === '/api/track') return track(req, res);
    if (route === '/api/status') return status(req, res);
    if (route === '/api/telegram') return telegramWebhook(req, res);
    if (route === '/api/set-webhook') return setupWebhook(req, res, `${url.protocol}//${url.host}`);
    if (route === '/' || route === '/index.html') {
      // Automatically register the Telegram webhook when the site is first opened.
      setupWebhook(req, { statusCode: 204, setHeader() {}, end() {} }, `${url.protocol}//${url.host}`).catch(() => {});
      return serveIndex(req, res);
    }

    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('Not found');
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { error: 'Server error' });
  }
};
