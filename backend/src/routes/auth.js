import { Router } from 'express';

export const authRouter = Router();

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

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

// Step 1: Redirect to Google OAuth
authRouter.get('/google', (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state: req.query.sessionId || Math.random().toString(36).slice(2),
  });
  res.json({ url: GOOGLE_AUTH_URL + '?' + params });
});

// Step 2: Handle Google callback
authRouter.get('/google/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).json({ error: 'No authorization code' });

  try {
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
      headers: { Authorization: 'Bearer ' + tokens.access_token },
    });
    const userInfo = await userRes.json();

    req.session.googleTokens = tokens;
    req.session.user = {
      id: userInfo.id,
      email: userInfo.email,
      name: userInfo.name,
      picture: userInfo.picture,
    };

    frontendRedirect(res, 'auth=success');
  } catch (err) {
    console.error('OAuth callback error:', err);
    frontendRedirect(res, 'auth=error');
  }
});

// Get current user
authRouter.get('/me', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Not authenticated' });
  res.json({ user: req.session.user, hasTokens: !!req.session.googleTokens });
});

// Logout
authRouter.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});
