/**
 * Google Sheets API service — pure REST, no googleapis dependency.
 * Now with automatic token refresh via googleAuth.
 */

import { ensureFreshToken } from './googleAuth.js';

export class GoogleSheetsService {
  /**
   * @param {{ access_token, refresh_token, expiry, user }} tokenRecord
   *   A mutable token record from googleAuth — will be refreshed in-place if expired.
   */
  constructor(tokenRecord) {
    this.tokenRecord = tokenRecord;
    this.sheetsBase = 'https://sheets.googleapis.com/v4/spreadsheets';
    this.driveBase = 'https://www.googleapis.com/drive/v3';
    this.driveUploadBase = 'https://www.googleapis.com/upload/drive/v3';
  }

  /** Ensure we have a valid access_token, refreshing if needed. */
  async _ensureToken() {
    this.accessToken = await ensureFreshToken(this.tokenRecord);
  }

  /** Low-level fetch with auth header. Retries once on 401 after token refresh. */
  async _fetch(url, options = {}) {
    await this._ensureToken();

    let res = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });

    // If 401, try one refresh + retry
    if (res.status === 401) {
      this.tokenRecord.expiry = 0; // force refresh
      await this._ensureToken();
      res = await fetch(url, {
        ...options,
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
      });
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Google API ${res.status}: ${body}`);
    }
    return res.json();
  }

  // -------- Sheets CRUD --------

  async createSpreadsheet(title, sheetNames = ['Sheet1']) {
    const resource = {
      properties: { title },
      sheets: sheetNames.map((name, i) => ({
        properties: { title: name, index: i, sheetId: i },
      })),
    };
    const data = await this._fetch(this.sheetsBase, {
      method: 'POST',
      body: JSON.stringify(resource),
    });
    return {
      spreadsheetId: data.spreadsheetId,
      spreadsheetUrl: data.spreadsheetUrl,
      title: data.properties.title,
    };
  }

  async writeRange(spreadsheetId, range, values) {
    const data = await this._fetch(
      `${this.sheetsBase}/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
      { method: 'PUT', body: JSON.stringify({ values }) }
    );
    return {
      updatedRows: data.updatedRows,
      updatedColumns: data.updatedColumns,
      updatedCells: data.updatedCells,
    };
  }

  async appendData(spreadsheetId, range, values) {
    const data = await this._fetch(
      `${this.sheetsBase}/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      { method: 'POST', body: JSON.stringify({ values }) }
    );
    return {
      updatedRows: data.updates?.updatedRows || 0,
      updatedRange: data.updates?.updatedRange,
    };
  }

  async readRange(spreadsheetId, range) {
    const data = await this._fetch(
      `${this.sheetsBase}/${spreadsheetId}/values/${encodeURIComponent(range)}`
    );
    return data.values || [];
  }

  async readAll(spreadsheetId) {
    const meta = await this._fetch(
      `${this.sheetsBase}/${spreadsheetId}?fields=sheets.properties`
    );
    const results = {};
    for (const sheet of meta.sheets) {
      const title = sheet.properties.title;
      results[title] = await this.readRange(spreadsheetId, `'${title}'`);
    }
    return results;
  }

  async batchUpdate(spreadsheetId, requests) {
    return this._fetch(`${this.sheetsBase}/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({ requests }),
    });
  }

  async formatCells(spreadsheetId, sheetId, options) {
    const requests = [];

    if (options.headerRow) {
      requests.push({
        repeatCell: {
          range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
          cell: {
            userEnteredFormat: {
              textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
              backgroundColor: { red: 0.2, green: 0.4, blue: 0.7 },
            },
          },
          fields: 'userEnteredFormat(textFormat,backgroundColor)',
        },
      });
    }

    if (options.numberFormat) {
      for (const col of options.numberFormat.columns) {
        requests.push({
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: options.numberFormat.startRow || 1,
              startColumnIndex: col,
              endColumnIndex: col + 1,
            },
            cell: {
              userEnteredFormat: {
                numberFormat: {
                  type: options.numberFormat.type || 'NUMBER',
                  pattern: options.numberFormat.pattern || '#,##0.00',
                },
              },
            },
            fields: 'userEnteredFormat.numberFormat',
          },
        });
      }
    }

    if (options.autoResize) {
      requests.push({
        autoResizeDimensions: {
          dimensions: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: options.autoResize.endColumn || 20 },
        },
      });
    }

    if (requests.length) return this.batchUpdate(spreadsheetId, requests);
    return null;
  }

  async getMetadata(spreadsheetId) {
    const data = await this._fetch(
      `${this.sheetsBase}/${spreadsheetId}?fields=properties,sheets.properties`
    );
    return {
      title: data.properties.title,
      sheets: data.sheets.map((s) => ({
        id: s.properties.sheetId,
        title: s.properties.title,
        index: s.properties.index,
        rowCount: s.properties.gridProperties?.rowCount,
        columnCount: s.properties.gridProperties?.columnCount,
      })),
    };
  }

  async createChart(spreadsheetId, sheetId, chartSpec) {
    return this.batchUpdate(spreadsheetId, [
      {
        addChart: {
          chart: {
            spec: chartSpec,
            position: {
              overlayPosition: {
                anchorCell: { sheetId, rowIndex: 0, columnIndex: 0 },
                offsetXPixels: 0,
                offsetYPixels: 0,
              },
            },
          },
        },
      },
    ]);
  }

  // -------- Drive operations --------

  async publishSpreadsheet(spreadsheetId) {
    await this._fetch(`${this.driveBase}/files/${spreadsheetId}/permissions`, {
      method: 'POST',
      body: JSON.stringify({ role: 'reader', type: 'anyone' }),
    });
    const file = await this._fetch(
      `${this.driveBase}/files/${spreadsheetId}?fields=webViewLink`
    );
    return {
      viewLink: file.webViewLink,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
    };
  }

  async shareWithUsers(spreadsheetId, emails, role = 'reader') {
    const results = [];
    for (const email of emails) {
      const data = await this._fetch(
        `${this.driveBase}/files/${spreadsheetId}/permissions?sendNotificationEmail=true`,
        {
          method: 'POST',
          body: JSON.stringify({ role, type: 'user', emailAddress: email }),
        }
      );
      results.push({ email, permissionId: data.id });
    }
    return results;
  }

  // -------- Import from URL --------

  /**
   * Import CSV / TSV data from a public URL into a sheet.
   * Fetches the URL, parses rows, and writes them to the spreadsheet.
   */
  async importFromUrl(spreadsheetId, url, sheetName = 'Sheet1') {
    // Fetch the remote resource
    const remoteRes = await fetch(url);
    if (!remoteRes.ok) {
      throw new Error(`Failed to fetch import URL: ${remoteRes.status}`);
    }
    const contentType = remoteRes.headers.get('content-type') || '';
    const text = await remoteRes.text();

    let rows;

    if (contentType.includes('application/json') || text.trim().startsWith('[')) {
      // JSON array of arrays or array of objects
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed) && parsed.length > 0) {
        if (typeof parsed[0] === 'object' && !Array.isArray(parsed[0])) {
          // array of objects → header row + data rows
          const headers = Object.keys(parsed[0]);
          rows = [headers, ...parsed.map((obj) => headers.map((h) => obj[h] ?? ''))];
        } else {
          rows = parsed;
        }
      } else {
        rows = [[]];
      }
    } else {
      // Default: CSV / TSV parsing (simple)
      const delimiter = text.includes('\t') ? '\t' : ',';
      rows = text
        .split('\n')
        .filter((line) => line.trim())
        .map((line) => line.split(delimiter).map((cell) => cell.trim()));
    }

    if (rows.length === 0) throw new Error('No data found at import URL');

    const range = `'${sheetName}'!A1`;
    return this.writeRange(spreadsheetId, range, rows);
  }
}
