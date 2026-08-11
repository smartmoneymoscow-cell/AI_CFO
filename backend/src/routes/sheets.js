import { Router } from 'express';
import { GoogleSheetsService } from '../services/googleSheets.js';
import { getTokenByUserId } from '../services/googleAuth.js';

export const sheetsRouter = Router();

// Middleware: require auth — loads token record from persistent store
function requireAuth(req, res, next) {
  const userId = req.session?.userId;
  if (!userId) {
    return res.status(401).json({ error: 'Not authenticated with Google' });
  }

  const tokenRecord = getTokenByUserId(userId);
  if (!tokenRecord) {
    return res.status(401).json({ error: 'Google tokens not found — please re-authenticate' });
  }

  req.sheetsService = new GoogleSheetsService(tokenRecord);
  next();
}

// Create a new spreadsheet
sheetsRouter.post('/create', requireAuth, async (req, res) => {
  try {
    const { title, sheets } = req.body;
    const result = await req.sheetsService.createSpreadsheet(
      title || 'Financial Model',
      sheets || ['Sheet1']
    );

    if (!req.session.spreadsheets) req.session.spreadsheets = [];
    req.session.spreadsheets.push(result.spreadsheetId);

    res.json(result);
  } catch (err) {
    console.error('Create spreadsheet error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Write data to a spreadsheet
sheetsRouter.post('/:id/write', requireAuth, async (req, res) => {
  try {
    const { range, values } = req.body;
    const result = await req.sheetsService.writeRange(req.params.id, range, values);
    res.json(result);
  } catch (err) {
    console.error('Write error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Read data from a spreadsheet
sheetsRouter.get('/:id/read', requireAuth, async (req, res) => {
  try {
    const range = req.query.range || 'Sheet1!A1:Z1000';
    const values = await req.sheetsService.readRange(req.params.id, range);
    res.json({ values });
  } catch (err) {
    console.error('Read error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Read all sheets
sheetsRouter.get('/:id/read-all', requireAuth, async (req, res) => {
  try {
    const data = await req.sheetsService.readAll(req.params.id);
    res.json({ data });
  } catch (err) {
    console.error('Read all error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get spreadsheet metadata
sheetsRouter.get('/:id/metadata', requireAuth, async (req, res) => {
  try {
    const meta = await req.sheetsService.getMetadata(req.params.id);
    res.json(meta);
  } catch (err) {
    console.error('Metadata error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Batch update (formatting, charts, etc.)
sheetsRouter.post('/:id/batch-update', requireAuth, async (req, res) => {
  try {
    const { requests } = req.body;
    const result = await req.sheetsService.batchUpdate(req.params.id, requests);
    res.json(result);
  } catch (err) {
    console.error('Batch update error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Format cells
sheetsRouter.post('/:id/format', requireAuth, async (req, res) => {
  try {
    const { sheetId, options } = req.body;
    const result = await req.sheetsService.formatCells(req.params.id, sheetId, options);
    res.json(result);
  } catch (err) {
    console.error('Format error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create chart
sheetsRouter.post('/:id/chart', requireAuth, async (req, res) => {
  try {
    const { sheetId, chartSpec } = req.body;
    const result = await req.sheetsService.createChart(req.params.id, sheetId, chartSpec);
    res.json(result);
  } catch (err) {
    console.error('Chart error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Publish spreadsheet
sheetsRouter.post('/:id/publish', requireAuth, async (req, res) => {
  try {
    const result = await req.sheetsService.publishSpreadsheet(req.params.id);
    res.json(result);
  } catch (err) {
    console.error('Publish error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Share with users
sheetsRouter.post('/:id/share', requireAuth, async (req, res) => {
  try {
    const { emails, role } = req.body;
    const result = await req.sheetsService.shareWithUsers(req.params.id, emails, role);
    res.json(result);
  } catch (err) {
    console.error('Share error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Import data from URL
sheetsRouter.post('/:id/import', requireAuth, async (req, res) => {
  try {
    const { url, sheetName } = req.body;
    if (!url) return res.status(400).json({ error: 'url is required' });
    const result = await req.sheetsService.importFromUrl(req.params.id, url, sheetName);
    res.json(result);
  } catch (err) {
    console.error('Import error:', err);
    res.status(500).json({ error: err.message });
  }
});
