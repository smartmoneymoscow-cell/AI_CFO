import { Router } from 'express';
import { exchangeCode, getTokenByUserId, revokeToken } from '../services/googleAuth.js';
import crypto from 'crypto';

export const authRouter = Router();

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

function frontendRedirect(res, query) {
  const base = process.env.FRONTEND_URL || 'http://localhost:5173';
  res.redirect(base + '?' + query);
}

// Step 1: Return OAuth URL (frontend opens it in a popup / redirect)
authRouter.get('/google', (req, res) => {
  // generate CSRF state and stash in session
  const state = crypto.randomBytes(16).toString('hex');
  req.session.oauthState = state;

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state,
  });
  res.json({ url: GOOGLE_AUTH_URL + '?' + params });
});

// Step 2: Handle Google callback
authRouter.get('/google/callback', async (req, res) => {
  const { code, state } = req.query;

  if (!code) return res.status(400).json({ error: 'No authorization code' });

  // CSRF validation
  if (!state || state !== req.session.oauthState) {
    console.error('OAuth state mismatch:', { received: state, expected: req.session.oauthState });
    return frontendRedirect(res, 'auth=error&reason=state_mismatch');
  }
  delete req.session.oauthState;

  try {
    const record = await exchangeCode(code);

    // Link session to this user
    req.session.userId = record.user.id;
    req.session.user = record.user;

    frontendRedirect(res, 'auth=success');
  } catch (err) {
    console.error('OAuth callback error:', err);
    frontendRedirect(res, 'auth=error');
  }
});

// Get current user
authRouter.get('/me', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Not authenticated' });

  // Re-hydrate from persistent store in case tokens were refreshed
  const record = getTokenByUserId(req.session.userId);
  res.json({
    user: req.session.user,
    hasTokens: !!record?.access_token,
  });
});

// Logout
authRouter.post('/logout', (req, res) => {
  const userId = req.session.userId;
  if (userId) revokeToken(userId);
  req.session.destroy(() => res.json({ ok: true }));
});
