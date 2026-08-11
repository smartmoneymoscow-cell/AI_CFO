import OpenAI from 'openai';

export class AIProcessor {
  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    const baseURL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
    this.useMock = !apiKey;
    if (!this.useMock) {
      this.client = new OpenAI({ apiKey, baseURL });
      this.model = process.env.AI_MODEL || 'gpt-4o';
    }
  }

  getSystemPrompt(existingData = null) {
    let p = `You are a financial modeling AI. Respond ONLY with valid JSON.
Format: {"explanation":"...","operations":[{"type":"create_spreadsheet","title":"...","sheets":["..."]},{"type":"write_data","sheet":"...","startCell":"A1","values":[["H1","H2"],["v1","v2"]]},{"type":"format","sheet":"...","headerRow":true},{"type":"chart","sheet":"...","chartType":"LINE","title":"...","dataRange":"A1:C10"}]}
Rules: formulas (=SUM,=NPV), absolute refs, totals row, professional formatting.`;
    if (existingData) p += '\n\nDATA:\n' + JSON.stringify(existingData).slice(0, 2000);
    return p;
  }

  async processMessage(msg, data = null) {
    if (this.useMock) return this.mockResponse(msg);
    try {
      const r = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'system', content: this.getSystemPrompt(data) }, { role: 'user', content: msg }],
        temperature: 0.3, max_tokens: 4000,
      });
      const text = r.choices[0].message.content;
      return JSON.parse((text.match(/\{[\s\S]*\}/) || [text])[0]);
    } catch (e) {
      console.error('AI error:', e.message);
      return this.mockResponse(msg);
    }
  }

  async *streamProcess(msg, data = null) {
    if (this.useMock) { yield JSON.stringify(this.mockResponse(msg)); return; }
    try {
      const stream = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'system', content: this.getSystemPrompt(data) }, { role: 'user', content: msg }],
        temperature: 0.3, max_tokens: 4000, stream: true,
      });
      for await (const chunk of stream) { const d = chunk.choices[0]?.delta?.content; if (d) yield d; }
    } catch (e) {
      console.error('AI stream error:', e.message);
      yield JSON.stringify(this.mockResponse(msg));
    }
  }

  mockResponse(msg) {
    const lower = msg.toLowerCase();
    if (lower.includes('revenue') || lower.includes('saas') || lower.includes('mrr')) {
      return {
        explanation: 'Creating a SaaS revenue model with MRR projections, churn, and dashboard.',
        operations: [
          { type: 'create_spreadsheet', title: 'SaaS Revenue Model', sheets: ['Assumptions', 'MRR Projections', 'Dashboard'] },
          { type: 'write_data', sheet: 'Assumptions', startCell: 'A1', values: [['Parameter', 'Value'], ['Starting MRR', 10000], ['Monthly Growth Rate', 0.15], ['Churn Rate', 0.05], ['ARPU', 50], ['New Customers/Month', 20]] },
          { type: 'write_data', sheet: 'MRR Projections', startCell: 'A1', values: [['Month', 'Starting MRR', 'New MRR', 'Churned MRR', 'Ending MRR', 'Customers'], ['Jan', 10000, 1000, 500, 10500, 210], ['Feb', 10500, 1575, 525, 11550, 231], ['Mar', 11550, 1733, 578, 12706, 254], ['Apr', 12706, 1906, 635, 13977, 280], ['May', 13977, 2097, 699, 15375, 308], ['Jun', 15375, 2306, 769, 16912, 338]] },
          { type: 'format', sheet: 'MRR Projections', headerRow: true, numberFormat: { columns: [1, 2, 3, 4], type: 'CURRENCY', pattern: '$#,##0' }, autoResize: true },
          { type: 'chart', sheet: 'Dashboard', chartType: 'LINE', title: 'MRR Growth', dataRange: 'MRR Projections!A1:E7' },
        ],
      };
    }
    if (lower.includes('dcf') || lower.includes('valuation')) {
      return {
        explanation: 'Creating a DCF valuation model with 5-year projections.',
        operations: [
          { type: 'create_spreadsheet', title: 'DCF Valuation', sheets: ['Assumptions', 'Projections', 'Valuation'] },
          { type: 'write_data', sheet: 'Assumptions', startCell: 'A1', values: [['Parameter', 'Value'], ['Revenue Year 1', 1000000], ['Revenue Growth Rate', 0.20], ['EBITDA Margin', 0.25], ['Tax Rate', 0.25], ['WACC', 0.10], ['Terminal Growth Rate', 0.03]] },
          { type: 'write_data', sheet: 'Projections', startCell: 'A1', values: [['Year', 'Revenue', 'EBITDA', 'Tax', 'NOPAT', 'Free Cash Flow'], [1, 1000000, 250000, 62500, 187500, 187500], [2, 1200000, 300000, 75000, 225000, 225000], [3, 1440000, 360000, 90000, 270000, 270000], [4, 1728000, 432000, 108000, 324000, 324000], [5, 2073600, 518400, 129600, 388800, 388800]] },
          { type: 'write_data', sheet: 'Valuation', startCell: 'A1', values: [['Metric', 'Value'], ['Sum of PV of FCF', '=NPV(0.10,B2:B6)'], ['Terminal Value', '=B6*(1+0.03)/(0.10-0.03)'], ['PV of Terminal Value', '=B3/(1+0.10)^5'], ['Enterprise Value', '=B2+B4']] },
          { type: 'format', sheet: 'Projections', headerRow: true, numberFormat: { columns: [1, 2, 3, 4, 5], type: 'CURRENCY', pattern: '$#,##0' } },
        ],
      };
    }
    // Default: P&L or generic
    return {
      explanation: 'Creating a P&L statement with revenue and cost breakdown.',
      operations: [
        { type: 'create_spreadsheet', title: 'P&L Statement', sheets: ['P&L', 'Summary'] },
        { type: 'write_data', sheet: 'P&L', startCell: 'A1', values: [['Category', 'Q1', 'Q2', 'Q3', 'Q4', 'Total'], ['Revenue', 500000, 550000, 600000, 650000, '=SUM(B2:E2)'], ['COGS', 200000, 220000, 240000, 260000, '=SUM(B3:E3)'], ['Gross Profit', '=B2-B3', '=C2-C3', '=D2-D3', '=E2-E3', '=SUM(B4:E4)'], ['Operating Expenses', 150000, 155000, 160000, 165000, '=SUM(B5:E5)'], ['EBITDA', '=B4-B5', '=C4-C5', '=D4-D5', '=E4-E5', '=SUM(B6:E6)'], ['Net Income', '=B6*0.75', '=C6*0.75', '=D6*0.75', '=E6*0.75', '=SUM(B7:E7)']] },
        { type: 'format', sheet: 'P&L', headerRow: true, numberFormat: { columns: [1, 2, 3, 4, 5], type: 'CURRENCY', pattern: '$#,##0' }, autoResize: true },
        { type: 'chart', sheet: 'Summary', chartType: 'COLUMN', title: 'Quarterly P&L', dataRange: 'P&L!A1:E7' },
      ],
    };
  }
}

export const FINANCIAL_TEMPLATES = {
  dcf: { name: 'DCF Valuation', description: 'Discounted Cash Flow model', sheets: ['Assumptions', 'Projections', 'Valuation'] },
  budget: { name: 'Budget Planner', description: 'Annual budget with variance', sheets: ['Budget', 'Actuals', 'Variance'] },
  pl: { name: 'P&L Statement', description: 'Profit & Loss', sheets: ['P&L', 'Summary'] },
  kpi: { name: 'KPI Dashboard', description: 'KPI tracking', sheets: ['Data', 'KPIs', 'Dashboard'] },
  unit_economics: { name: 'Unit Economics', description: 'CAC, LTV, margins', sheets: ['Inputs', 'Calculations', 'Summary'] },
};
