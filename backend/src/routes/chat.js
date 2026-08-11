import { Router } from 'express';
import { AIProcessor, FINANCIAL_TEMPLATES } from '../services/aiProcessor.js';
import { GoogleSheetsService } from '../services/googleSheets.js';
import { getTokenByUserId } from '../services/googleAuth.js';

export const chatRouter = Router();

// Store conversation history per session
const conversations = new Map();

function getSessionId(req) {
  return req.sessionID || req.headers['x-session-id'] || 'default';
}

function getConversation(sessionId) {
  if (!conversations.has(sessionId)) {
    conversations.set(sessionId, []);
  }
  return conversations.get(sessionId);
}

function broadcastToSession(req, event) {
  const sessionId = getSessionId(req);
  const clients = req.wsClients?.get(sessionId);
  if (clients) {
    const msg = JSON.stringify(event);
    for (const ws of clients) {
      if (ws.readyState === 1) ws.send(msg);
    }
  }
}

// Stream chat response with real-time Sheets operations
chatRouter.post('/send', async (req, res) => {
  const { message, spreadsheetId, documentUrl } = req.body;
  const sessionId = getSessionId(req);
  const conversation = getConversation(sessionId);

  // Add user message to history
  conversation.push({ role: 'user', content: message });

  // Keep history manageable (last 20 messages)
  if (conversation.length > 20) {
    conversation.splice(0, conversation.length - 20);
  }

  // Set up SSE for streaming
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  const sendEvent = (event) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
    broadcastToSession(req, event);
  };

  try {
    // If there's a document URL, fetch its data
    let existingData = null;
    const _tokenRec = req.session?.userId ? getTokenByUserId(req.session.userId) : null;
    if (spreadsheetId && _tokenRec) {
      try {
        const sheetsService = new GoogleSheetsService(_tokenRec);
        existingData = await sheetsService.readAll(spreadsheetId);
      } catch (e) {
        sendEvent({ type: 'info', message: 'Could not read existing spreadsheet data' });
      }
    }

    // Process with AI
    const ai = new AIProcessor(process.env.AI_PROVIDER || 'openai');
    let fullResponse = '';

    sendEvent({ type: 'status', message: '🤔 Thinking...' });

    // Collect streamed response
    for await (const chunk of ai.streamProcess(
      message + (documentUrl ? `\n\nReference document: ${documentUrl}` : ''),
      existingData
    )) {
      fullResponse += chunk;
      sendEvent({ type: 'stream', content: chunk });
    }

    // Parse the complete response
    let operations;
    try {
      // Try to extract JSON from the response
      const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
      operations = JSON.parse(jsonMatch ? jsonMatch[0] : fullResponse);
    } catch (parseErr) {
      sendEvent({ type: 'error', message: 'Failed to parse AI response' });
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }

    sendEvent({ type: 'operations', operations });
    sendEvent({ type: 'status', message: '📊 Executing operations...' });

    // Execute operations if user has Google tokens
    const _tokenRec2 = req.session?.userId ? getTokenByUserId(req.session.userId) : null;
    if (_tokenRec2) {
      const sheetsService = new GoogleSheetsService(_tokenRec2);
      let currentSpreadsheetId = spreadsheetId;

      for (const op of operations.operations || []) {
        try {
          let result;

          switch (op.type) {
            case 'create_spreadsheet': {
              const created = await sheetsService.createSpreadsheet(
                op.title || 'Financial Model',
                op.sheets || ['Sheet1']
              );
              currentSpreadsheetId = created.spreadsheetId;
              result = created;
              sendEvent({
                type: 'spreadsheet_created',
                spreadsheetId: created.spreadsheetId,
                url: created.spreadsheetUrl,
                title: created.title,
              });
              break;
            }

            case 'write_data': {
              if (!currentSpreadsheetId) {
                sendEvent({ type: 'error', message: 'No spreadsheet to write to. Create one first.' });
                break;
              }
              const range = `'${op.sheet || 'Sheet1'}'!${op.startCell || 'A1'}`;
              result = await sheetsService.writeRange(
                currentSpreadsheetId,
                range,
                op.values
              );
              sendEvent({ type: 'data_written', range, ...result });
              break;
            }

            case 'append_data': {
              if (!currentSpreadsheetId) break;
              const range = `'${op.sheet || 'Sheet1'}'!A:Z`;
              result = await sheetsService.appendData(
                currentSpreadsheetId,
                range,
                op.values
              );
              sendEvent({ type: 'data_appended', ...result });
              break;
            }

            case 'format': {
              if (!currentSpreadsheetId) break;
              // Get sheet ID from metadata
              const meta = await sheetsService.getMetadata(currentSpreadsheetId);
              const sheet = meta.sheets.find(
                (s) => s.title === (op.sheet || 'Sheet1')
              );
              if (sheet) {
                result = await sheetsService.formatCells(
                  currentSpreadsheetId,
                  sheet.id,
                  op
                );
                sendEvent({ type: 'formatted', sheet: op.sheet });
              }
              break;
            }

            case 'chart': {
              if (!currentSpreadsheetId) break;
              const chartMeta = await sheetsService.getMetadata(currentSpreadsheetId);
              const chartSheet = chartMeta.sheets.find(
                (s) => s.title === (op.sheet || 'Sheet1')
              );
              if (chartSheet) {
                // Build chart spec
                const chartSpec = buildChartSpec(op, chartSheet.id);
                result = await sheetsService.createChart(
                  currentSpreadsheetId,
                  chartSheet.id,
                  chartSpec
                );
                sendEvent({ type: 'chart_created', chartType: op.chartType });
              }
              break;
            }

            case 'clear_range': {
              if (!currentSpreadsheetId) break;
              const clearRange = `'${op.sheet || 'Sheet1'}'!${op.range || 'A1:Z1000'}`;
              result = await sheetsService.writeRange(
                currentSpreadsheetId,
                clearRange,
                [[]]
              );
              sendEvent({ type: 'range_cleared', range: clearRange });
              break;
            }

            default:
              sendEvent({ type: 'info', message: `Unknown operation: ${op.type}` });
          }
        } catch (opErr) {
          sendEvent({
            type: 'operation_error',
            operation: op.type,
            error: opErr.message,
          });
        }
      }

      // Store assistant response
      conversation.push({
        role: 'assistant',
        content: operations.explanation || 'Operations executed',
        spreadsheetId: currentSpreadsheetId,
      });

      sendEvent({
        type: 'complete',
        message: operations.explanation || 'Done!',
        spreadsheetId: currentSpreadsheetId,
      });
    } else {
      // No Google tokens - just return the plan
      sendEvent({
        type: 'plan_only',
        message: operations.explanation,
        operations: operations.operations,
        note: 'Connect Google account to execute operations',
      });

      conversation.push({
        role: 'assistant',
        content: operations.explanation || 'Plan generated',
      });
    }
  } catch (err) {
    console.error('Chat error:', err);
    sendEvent({ type: 'error', message: err.message });
  }

  res.write('data: [DONE]\n\n');
  res.end();
});

// Get conversation history
chatRouter.get('/history', (req, res) => {
  const sessionId = getSessionId(req);
  const conversation = getConversation(sessionId);
  res.json({ messages: conversation });
});

// Clear conversation
chatRouter.post('/clear', (req, res) => {
  const sessionId = getSessionId(req);
  conversations.delete(sessionId);
  res.json({ ok: true });
});

// Get available templates
chatRouter.get('/templates', (req, res) => {
  res.json({ templates: FINANCIAL_TEMPLATES });
});

// Use a template
chatRouter.post('/template/:key', async (req, res) => {
  const template = FINANCIAL_TEMPLATES[req.params.key];
  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  const sendEvent = (event) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  const _tmplTokenRec = req.session?.userId ? getTokenByUserId(req.session.userId) : null;
  if (!_tmplTokenRec) {
    sendEvent({
      type: 'error',
      message: 'Connect Google account first',
    });
    res.write('data: [DONE]\n\n');
    return res.end();
  }

  try {
    const sheetsService = new GoogleSheetsService(_tmplTokenRec);

    sendEvent({ type: 'status', message: `Creating ${template.name}...` });

    const created = await sheetsService.createSpreadsheet(
      template.name,
      template.sheets
    );

    sendEvent({
      type: 'spreadsheet_created',
      spreadsheetId: created.spreadsheetId,
      url: created.spreadsheetUrl,
      title: created.title,
    });

    // Now use AI to populate the template
    const ai = new AIProcessor(process.env.AI_PROVIDER || 'openai');
    const prompt = `Create a complete ${template.name} financial model. ${template.description}. 
    Spreadsheet ID: ${created.spreadsheetId}
    Sheets: ${template.sheets.join(', ')}
    
    Populate all sheets with realistic sample data, formulas, formatting, and charts.`;

    let fullResponse = '';
    for await (const chunk of ai.streamProcess(prompt)) {
      fullResponse += chunk;
      sendEvent({ type: 'stream', content: chunk });
    }

    // Parse and execute
    try {
      const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
      const operations = JSON.parse(jsonMatch ? jsonMatch[0] : fullResponse);

      sendEvent({ type: 'operations', operations });

      for (const op of operations.operations || []) {
        // Execute each operation (similar to above)
        try {
          switch (op.type) {
            case 'write_data': {
              const range = `'${op.sheet}'!${op.startCell || 'A1'}`;
              await sheetsService.writeRange(created.spreadsheetId, range, op.values);
              sendEvent({ type: 'data_written', sheet: op.sheet });
              break;
            }
            case 'format': {
              const meta = await sheetsService.getMetadata(created.spreadsheetId);
              const sheet = meta.sheets.find((s) => s.title === op.sheet);
              if (sheet) {
                await sheetsService.formatCells(created.spreadsheetId, sheet.id, op);
                sendEvent({ type: 'formatted', sheet: op.sheet });
              }
              break;
            }
            case 'chart': {
              const meta = await sheetsService.getMetadata(created.spreadsheetId);
              const sheet = meta.sheets.find((s) => s.title === op.sheet);
              if (sheet) {
                const spec = buildChartSpec(op, sheet.id);
                await sheetsService.createChart(created.spreadsheetId, sheet.id, spec);
                sendEvent({ type: 'chart_created', chartType: op.chartType });
              }
              break;
            }
          }
        } catch (e) {
          sendEvent({ type: 'operation_error', operation: op.type, error: e.message });
        }
      }
    } catch (e) {
      sendEvent({ type: 'info', message: 'Template created but AI generation incomplete' });
    }

    sendEvent({
      type: 'complete',
      message: `${template.name} template created!`,
      spreadsheetId: created.spreadsheetId,
      url: created.spreadsheetUrl,
    });
  } catch (err) {
    sendEvent({ type: 'error', message: err.message });
  }

  res.write('data: [DONE]\n\n');
  res.end();
});

/**
 * Build a Google Sheets chart spec from simplified AI output
 */
function buildChartSpec(op, sheetId) {
  const chartTypes = {
    LINE: 'LINE',
    BAR: 'BAR',
    PIE: 'PIE',
    COLUMN: 'COLUMN',
    AREA: 'AREA',
    SCATTER: 'SCATTER',
  };

  // Parse data range (e.g., "A1:C13")
  const rangeMatch = (op.dataRange || 'A1:Z100').match(/([A-Z]+)(\d+):([A-Z]+)(\d+)/);
  let dataRange = {};

  if (rangeMatch) {
    const colToIndex = (col) => {
      let index = 0;
      for (let i = 0; i < col.length; i++) {
        index = index * 26 + (col.charCodeAt(i) - 64);
      }
      return index - 1;
    };

    dataRange = {
      sheetId,
      startRowIndex: parseInt(rangeMatch[2]) - 1,
      endRowIndex: parseInt(rangeMatch[4]),
      startColumnIndex: colToIndex(rangeMatch[1]),
      endColumnIndex: colToIndex(rangeMatch[3]) + 1,
    };
  }

  return {
    basicChart: {
      chartType: chartTypes[op.chartType] || 'LINE',
      legendPosition: 'BOTTOM_LEGEND',
      domains: [
        {
          domain: {
            sourceRange: {
              sources: [
                {
                  ...dataRange,
                  endColumnIndex: dataRange.startColumnIndex + 1,
                },
              ],
            },
          },
        },
      ],
      series: [
        {
          series: {
            sourceRange: {
              sources: [
                {
                  ...dataRange,
                  startColumnIndex: dataRange.startColumnIndex + 1,
                },
              ],
            },
          },
          targetAxis: 'LEFT_AXIS',
        },
      ],
      headerCount: 1,
    },
    title: op.title || '',
  };
}
