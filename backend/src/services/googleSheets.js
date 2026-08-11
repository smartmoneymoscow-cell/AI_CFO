/**
 * Google Sheets API service — pure REST, no googleapis dependency.
 */
export class GoogleSheetsService {
  constructor(tokens) {
    this.accessToken = tokens.access_token;
    this.sheetsBase = 'https://sheets.googleapis.com/v4/spreadsheets';
    this.driveBase = 'https://www.googleapis.com/drive/v3';
  }

  async _fetch(url, options = {}) {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Google API ${res.status}: ${body}`);
    }
    return res.json();
  }

  async createSpreadsheet(title, sheetNames = ['Sheet1']) {
    const resource = {
      properties: { title },
      sheets: sheetNames.map((name, i) => ({
        properties: { title: name, index: i, sheetId: i },
      })),
    };
    const data = await this._fetch(`${this.sheetsBase}`, {
      method: 'POST',
      body: JSON.stringify(resource),
    });
    return { spreadsheetId: data.spreadsheetId, spreadsheetUrl: data.spreadsheetUrl, title: data.properties.title };
  }

  async writeRange(spreadsheetId, range, values) {
    const data = await this._fetch(
      `${this.sheetsBase}/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
      { method: 'PUT', body: JSON.stringify({ values }) }
    );
    return { updatedRows: data.updatedRows, updatedColumns: data.updatedColumns, updatedCells: data.updatedCells };
  }

  async appendData(spreadsheetId, range, values) {
    const data = await this._fetch(
      `${this.sheetsBase}/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      { method: 'POST', body: JSON.stringify({ values }) }
    );
    return { updatedRows: data.updates?.updatedRows || 0, updatedRange: data.updates?.updatedRange };
  }

  async readRange(spreadsheetId, range) {
    const data = await this._fetch(`${this.sheetsBase}/${spreadsheetId}/values/${encodeURIComponent(range)}`);
    return data.values || [];
  }

  async readAll(spreadsheetId) {
    const meta = await this._fetch(`${this.sheetsBase}/${spreadsheetId}?fields=sheets.properties`);
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
          cell: { userEnteredFormat: { textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } }, backgroundColor: { red: 0.2, green: 0.4, blue: 0.7 } } },
          fields: 'userEnteredFormat(textFormat,backgroundColor)',
        },
      });
    }
    if (options.numberFormat) {
      for (const col of options.numberFormat.columns) {
        requests.push({
          repeatCell: {
            range: { sheetId, startRowIndex: options.numberFormat.startRow || 1, startColumnIndex: col, endColumnIndex: col + 1 },
            cell: { userEnteredFormat: { numberFormat: { type: options.numberFormat.type || 'NUMBER', pattern: options.numberFormat.pattern || '#,##0.00' } } },
            fields: 'userEnteredFormat.numberFormat',
          },
        });
      }
    }
    if (options.autoResize) {
      requests.push({ autoResizeDimensions: { dimensions: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: options.autoResize.endColumn || 20 } } });
    }
    if (requests.length) return this.batchUpdate(spreadsheetId, requests);
    return null;
  }

  async getMetadata(spreadsheetId) {
    const data = await this._fetch(`${this.sheetsBase}/${spreadsheetId}?fields=properties,sheets.properties`);
    return {
      title: data.properties.title,
      sheets: data.sheets.map(s => ({ id: s.properties.sheetId, title: s.properties.title, index: s.properties.index, rowCount: s.properties.gridProperties?.rowCount, columnCount: s.properties.gridProperties?.columnCount })),
    };
  }

  async publishSpreadsheet(spreadsheetId) {
    await fetch(`${this.driveBase}/files/${spreadsheetId}/permissions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'reader', type: 'anyone' }),
    });
    const file = await this._fetch(`${this.driveBase}/files/${spreadsheetId}?fields=webViewLink`);
    return { viewLink: file.webViewLink, spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}` };
  }

  async shareWithUsers(spreadsheetId, emails, role = 'reader') {
    const results = [];
    for (const email of emails) {
      const res = await fetch(`${this.driveBase}/files/${spreadsheetId}/permissions?sendNotificationEmail=true`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, type: 'user', emailAddress: email }),
      });
      const data = await res.json();
      results.push({ email, permissionId: data.id });
    }
    return results;
  }
}
