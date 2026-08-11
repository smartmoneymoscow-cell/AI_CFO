import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

/**
 * AI Processor - Converts natural language requests into Google Sheets operations
 */
export class AIProcessor {
  constructor(provider = 'openai') {
    this.provider = provider;

    if (provider === 'openai') {
      this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    } else {
      this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    }
  }

  /**
   * System prompt that teaches the AI how to generate Sheets operations
   */
  getSystemPrompt(existingData = null) {
    let prompt = `You are a financial modeling AI assistant. Your job is to understand user requests and generate Google Sheets API operations.

You respond ONLY with valid JSON in this exact format:
{
  "explanation": "Brief explanation of what you're doing",
  "operations": [
    {
      "type": "create_spreadsheet",
      "title": "My Financial Model",
      "sheets": ["Revenue", "Costs", "Summary"]
    },
    {
      "type": "write_data",
      "sheet": "Revenue",
      "startCell": "A1",
      "values": [
        ["Month", "Revenue", "Growth %"],
        ["Jan", 100000, "=B2/B1-1"],
        ["Feb", 120000, "=B3/B2-1"]
      ]
    },
    {
      "type": "format",
      "sheet": "Revenue",
      "headerRow": true,
      "numberFormat": {
        "columns": [1],
        "type": "CURRENCY",
        "pattern": "$#,##0"
      },
      "autoResize": true
    },
    {
      "type": "chart",
      "sheet": "Revenue",
      "chartType": "LINE",
      "title": "Revenue Trend",
      "dataRange": "A1:C13",
      "position": { "row": 15, "col": 0 }
    }
  ]
}

OPERATION TYPES SUPPORTED:
1. create_spreadsheet - Create new spreadsheet with named sheets
2. write_data - Write a 2D array of values to a range (formulas start with =)
3. format - Apply formatting (headerRow, numberFormat, columnWidths, autoResize)
4. chart - Add a chart (LINE, BAR, PIE, COLUMN, AREA, SCATTER)
5. append_data - Add rows to existing data
6. clear_range - Clear a range of cells
7. import_url - Import data from a CSV/URL
8. comment - Add cell comments/notes

FINANCIAL MODELING RULES:
- Always include proper formulas (SUM, AVERAGE, NPV, IRR, etc.)
- Use absolute references ($A$1) where appropriate
- Add percentage formatting for ratios
- Include totals/summary rows
- Use conditional formatting for alerts (negative values, thresholds)
- Structure: Assumptions → Calculations → Summary/Dashboard
- Currency symbols in display, numbers as values
- Use named ranges conceptually in formulas

CHART TYPES:
- LINE: trend over time
- BAR/COLUMN: comparison
- PIE: composition
- AREA: cumulative
- SCATTER: correlation
- Combo: mixed`;

    if (existingData) {
      prompt += `\n\nEXISTING SPREADSHEET DATA:\n${JSON.stringify(existingData, null, 2).slice(0, 3000)}\n\nWhen updating existing data, reference the existing structure and build upon it.`;
    }

    return prompt;
  }

  /**
   * Process a user message and return Sheets operations
   */
  async processMessage(userMessage, existingData = null) {
    const systemPrompt = this.getSystemPrompt(existingData);

    if (this.provider === 'openai') {
      return this._processWithOpenAI(systemPrompt, userMessage);
    } else {
      return this._processWithAnthropic(systemPrompt, userMessage);
    }
  }

  async _processWithOpenAI(systemPrompt, userMessage) {
    const response = await this.client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 4000,
    });

    const content = response.choices[0].message.content;
    return JSON.parse(content);
  }

  async _processWithAnthropic(systemPrompt, userMessage) {
    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
      temperature: 0.3,
    });

    const content = response.content[0].text;
    // Extract JSON from potential markdown code blocks
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : content);
  }

  /**
   * Stream processing for real-time responses
   */
  async *streamProcess(userMessage, existingData = null) {
    const systemPrompt = this.getSystemPrompt(existingData);

    if (this.provider === 'openai') {
      const stream = await this.client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 4000,
        stream: true,
      });

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) yield delta;
      }
    } else {
      const stream = await this.client.messages.stream({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
        temperature: 0.3,
      });

      for await (const event of stream) {
        if (event.type === 'content_block_delta') {
          yield event.delta.text;
        }
      }
    }
  }
}

/**
 * Financial analysis templates
 */
export const FINANCIAL_TEMPLATES = {
  dcf: {
    name: 'DCF Valuation',
    description: 'Discounted Cash Flow model with projections',
    sheets: ['Assumptions', 'Projections', 'Valuation', 'Dashboard'],
  },
  budget: {
    name: 'Budget Planner',
    description: 'Annual budget with variance analysis',
    sheets: ['Budget', 'Actuals', 'Variance', 'Charts'],
  },
  pl: {
    name: 'P&L Statement',
    description: 'Profit & Loss with YoY comparison',
    sheets: ['P&L Summary', 'Revenue Detail', 'Cost Detail', 'Analysis'],
  },
  kpi: {
    name: 'KPI Dashboard',
    description: 'Key Performance Indicators tracking',
    sheets: ['Raw Data', 'KPIs', 'Dashboard', 'Targets'],
  },
  unit_economics: {
    name: 'Unit Economics',
    description: 'CAC, LTV, margins per unit',
    sheets: ['Inputs', 'Calculations', 'Sensitivity', 'Summary'],
  },
};
