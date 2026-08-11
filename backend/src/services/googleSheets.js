import { google } from 'googleapis';

/**
 * Google Sheets API service
 * Handles all spreadsheet operations: create, read, write, format, charts
 */
export class GoogleSheetsService {
  constructor(tokens) {
    this.auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    this.auth.setCredentials(tokens);
    this.sheets = google.sheets({ version: 'v4', auth: this.auth });
    this.drive = google.drive({ version: 'v3', auth: this.auth });
  }

  /**
   * Create a new spreadsheet
   */
  async createSpreadsheet(title, sheetNames = ['Sheet1']) {
    const resource = {
      properties: { title },
      sheets: sheetNames.map((name, i) => ({
        properties: {
          title: name,
          index: i,
          sheetId: i,
        },
      })),
    };

    const res = await this.sheets.spreadsheets.create({
      resource,
      fields: 'spreadsheetId,spreadsheetUrl,properties',
    });

    return {
      spreadsheetId: res.data.spreadsheetId,
      spreadsheetUrl: res.data.spreadsheetUrl,
      title: res.data.properties.title,
    };
  }

  /**
   * Write data to a range
   */
  async writeRange(spreadsheetId, range, values) {
    const res = await this.sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      resource: { values },
    });

    return {
      updatedRows: res.data.updatedRows,
      updatedColumns: res.data.updatedColumns,
      updatedCells: res.data.updatedCells,
    };
  }

  /**
   * Append data to a sheet
   */
  async appendData(spreadsheetId, range, values) {
    const res = await this.sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      resource: { values },
    });

    return {
      updatedRows: res.data.updates?.updatedRows || 0,
      updatedRange: res.data.updates?.updatedRange,
    };
  }

  /**
   * Read data from a range
   */
  async readRange(spreadsheetId, range) {
    const res = await this.sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    return res.data.values || [];
  }

  /**
   * Read all data from a spreadsheet
   */
  async readAll(spreadsheetId) {
    const meta = await this.sheets.spreadsheets.get({
      spreadsheetId,
      fields: 'sheets.properties',
    });

    const results = {};
    for (const sheet of meta.data.sheets) {
      const title = sheet.properties.title;
      results[title] = await this.readRange(spreadsheetId, `'${title}'`);
    }

    return results;
  }

  /**
   * Batch update: formatting, merges, charts, etc.
   */
  async batchUpdate(spreadsheetId, requests) {
    const res = await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: { requests },
    });

    return res.data;
  }

  /**
   * Apply common formatting operations
   */
  async formatCells(spreadsheetId, sheetId, options) {
    const requests = [];

    if (options.headerRow) {
      // Bold header row
      requests.push({
        repeatCell: {
          range: {
            sheetId,
            startRowIndex: 0,
            endRowIndex: 1,
          },
          cell: {
            userEnteredFormat: {
              textFormat: { bold: true, fontSize: 11 },
              backgroundColor: { red: 0.2, green: 0.4, blue: 0.7 },
              textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
            },
          },
          fields: 'userEnteredFormat(textFormat,backgroundColor)',
        },
      });
    }

    if (options.numberFormat) {
      // Apply number format to specified columns
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

    if (options.columnWidths) {
      for (const [col, width] of Object.entries(options.columnWidths)) {
        requests.push({
          updateDimensionProperties: {
            range: {
              sheetId,
              dimension: 'COLUMNS',
              startIndex: parseInt(col),
              endIndex: parseInt(col) + 1,
            },
            properties: { pixelSize: width },
            fields: 'pixelSize',
          },
        });
      }
    }

    if (options.autoResize) {
      requests.push({
        autoResizeDimensions: {
          dimensions: {
            sheetId,
            dimension: 'COLUMNS',
            startIndex: 0,
            endIndex: options.autoResize.endColumn || 20,
          },
        },
      });
    }

    if (requests.length > 0) {
      return this.batchUpdate(spreadsheetId, requests);
    }
    return null;
  }

  /**
   * Create a chart in the spreadsheet
   */
  async createChart(spreadsheetId, sheetId, chartSpec) {
    const chartRequest = {
      addChart: {
        chart: {
          spec: chartSpec,
          position: {
            overlayPosition: {
              anchorCell: {
                sheetId,
                rowIndex: chartSpec.anchorRow || 0,
                columnIndex: chartSpec.anchorCol || 0,
              },
              widthPixels: chartSpec.width || 600,
              heightPixels: chartSpec.height || 400,
            },
          },
        },
      },
    };

    return this.batchUpdate(spreadsheetId, [chartRequest]);
  }

  /**
   * Publish spreadsheet (make it public via Drive)
   */
  async publishSpreadsheet(spreadsheetId) {
    // Make it publicly viewable
    await this.drive.permissions.create({
      fileId: spreadsheetId,
      resource: {
        role: 'reader',
        type: 'anyone',
      },
    });

    // Get the published URL
    const file = await this.drive.files.get({
      fileId: spreadsheetId,
      fields: 'webViewLink,webContentLink',
    });

    return {
      viewLink: file.data.webViewLink,
      downloadLink: file.data.webContentLink,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
    };
  }

  /**
   * Share with specific users
   */
  async shareWithUsers(spreadsheetId, emails, role = 'reader') {
    const results = [];
    for (const email of emails) {
      const res = await this.drive.permissions.create({
        fileId: spreadsheetId,
        sendNotificationEmail: true,
        resource: {
          role,
          type: 'user',
          emailAddress: email,
        },
      });
      results.push({ email, permissionId: res.data.id });
    }
    return results;
  }

  /**
   * Get spreadsheet metadata
   */
  async getMetadata(spreadsheetId) {
    const res = await this.sheets.spreadsheets.get({
      spreadsheetId,
      fields: 'properties,sheets.properties',
    });

    return {
      title: res.data.properties.title,
      sheets: res.data.sheets.map((s) => ({
        id: s.properties.sheetId,
        title: s.properties.title,
        index: s.properties.index,
        rowCount: s.properties.gridProperties?.rowCount,
        columnCount: s.properties.gridProperties?.columnCount,
      })),
    };
  }

  /**
   * Import data from a URL (CSV, etc.)
   */
  async importFromUrl(spreadsheetId, url, sheetName = 'Imported') {
    // Fetch the URL content
    const response = await fetch(url);
    const text = await response.text();

    // Parse CSV-like content
    const rows = text.split('\n').map((row) => row.split(',').map((cell) => cell.trim()));

    // Write to the spreadsheet
    return this.appendData(spreadsheetId, `'${sheetName}'!A1`, rows);
  }
}
