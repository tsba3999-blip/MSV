'use strict';

/* ============================================================
   Настройки и база данных

   Настройки читаются из .env рядом с index.js. Файла может не быть —
   тогда берутся переменные окружения. Без DATABASE_URL сервер
   не стартует: работать без базы ему нечем.
   ============================================================ */

const fs = require('fs');
const path = require('path');

function loadEnv() {
  const file = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 0) continue;
    const key = t.slice(0, i).trim();
    const val = t.slice(i + 1).trim();
    if (!(key in process.env)) process.env[key] = val;
  }
}

loadEnv();

const config = {
  port: Number(process.env.PORT) || 3000,
  databaseUrl: process.env.DATABASE_URL || '',
  sessionSecret: process.env.SESSION_SECRET || '',
  webDir: path.resolve(__dirname, '..', process.env.WEB_DIR || '../web'),
  demoMode: process.env.DEMO_MODE === '1',
  demoPin: '7777',
  pinTtlMinutes: 10,
  pinMaxAttempts: 5,
  sessionDays: 30
};

function assertConfig() {
  const missing = [];
  if (!config.databaseUrl) missing.push('DATABASE_URL');
  if (!config.sessionSecret || config.sessionSecret.length < 16) missing.push('SESSION_SECRET (не короче 16 знаков)');
  if (missing.length) {
    throw new Error('Не заполнены настройки: ' + missing.join(', ') + '. См. .env.example');
  }
}

/* ---------- Пул соединений ----------
   pg подключается лениво: первый запрос откроет соединение.
   Пул создаётся один раз на процесс. */

let pool = null;

function getPool() {
  if (pool) return pool;
  const { Pool } = require('pg');
  pool = new Pool({ connectionString: config.databaseUrl, max: 10 });
  pool.on('error', (err) => console.error('[db] ошибка соединения:', err.message));
  return pool;
}

/* Один запрос. Параметры всегда через $1, $2 — никогда через склейку строк. */
async function query(text, params) {
  return getPool().query(text, params || []);
}

/* Несколько запросов одной транзакцией: либо все, либо ни одного. */
async function tx(fn) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn((text, params) => client.query(text, params || []));
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { config, assertConfig, query, tx };
