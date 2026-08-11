/**
 * Google OAuth token manager — persistent storage + auto-refresh.
 *
 * Tokens are stored in data/tokens.json (one entry per Google user id).
 * Each entry: { access_token, refresh_token, expiry, user }
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../../data');
const TOKENS_FILE = join(DATA_DIR, 'tokens.json');

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

// --------------- persistence ---------------

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function loadAllTokens() {
  ensureDataDir();
  if (!existsSync(TOKENS_FILE)) return {};
  try {
    return JSON.parse(readFileSync(TOKENS_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function saveAllTokens(store) {
  ensureDataDir();
  writeFileSync(TOKENS_FILE, JSON.stringify(store, null, 2));
}

// --------------- public API ---------------

/**
 * Exchange authorization code for tokens + fetch user profile.
 * Returns { tokens, user }.
 */
export async function exchangeCode(code) {
  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  });
  const tokens = await tokenRes.json();
  if (tokens.error) throw new Error(tokens.error_description || tokens.error);

  const userRes = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const user = await userRes.json();

  const record = {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry: Date.now() + (tokens.expires_in || 3600) * 1000,
    user: { id: user.id, email: user.email, name: user.name, picture: user.picture },
  };

  // persist
  const store = loadAllTokens();
  store[user.id] = record;
  saveAllTokens(store);

  return record;
}

/**
 * Ensure the access_token is still valid; refresh if expired.
 * Mutates the record in-place and persists.
 *
 * @param {{ access_token, refresh_token, expiry, user }} record
 * @returns {string} valid access_token
 */
export async function ensureFreshToken(record) {
  if (!record) throw new Error('No token record');
  if (record.access_token && record.expiry && Date.now() < record.expiry - 60_000) {
    return record.access_token; // still good (with 1-min buffer)
  }
  if (!record.refresh_token) throw new Error('No refresh_token — user must re-authenticate');

  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: record.refresh_token,
      grant_type: 'refresh_token',
    }),
  });
  const tokens = await tokenRes.json();
  if (tokens.error) throw new Error(`Token refresh failed: ${tokens.error_description || tokens.error}`);

  record.access_token = tokens.access_token;
  record.expiry = Date.now() + (tokens.expires_in || 3600) * 1000;
  // Google may return a new refresh_token
  if (tokens.refresh_token) record.refresh_token = tokens.refresh_token;

  // persist updated record
  const store = loadAllTokens();
  if (record.user?.id) store[record.user.id] = record;
  saveAllTokens(store);

  return record.access_token;
}

/**
 * Look up a token record by Google user id.
 */
export function getTokenByUserId(userId) {
  const store = loadAllTokens();
  return store[userId] || null;
}

/**
 * Remove tokens for a user (logout).
 */
export function revokeToken(userId) {
  const store = loadAllTokens();
  delete store[userId];
  saveAllTokens(store);
}
