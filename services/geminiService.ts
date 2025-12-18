
import { GoogleGenAI } from "@google/genai";
import { AnalysisResult, DataRow, AdPilotJson, KeyMetrics, ScoreResult } from "../types";
import { exportToCSV } from "../utils/csvHelper";
import { calculateAggregatedMetrics } from "../utils/analyticsHelper";

const formatMetricForPrompt = (val: number, type: 'currency' | 'percent' | 'count', currency: string) => {
    if (type === 'count') return Math.round(val).toLocaleString();
    if (type === 'percent') return `${val.toFixed(2)}%`;
    return val.toLocaleString(undefined, { style: 'currency', currency });
};

/**
 * Robustly extracts the JSON string from potentially messy model output.
 * Handles markdown code blocks or stray conversational text.
 */
const safeParseJson = (text: string): any => {
    try {
        const startObj = text.indexOf('{');
        const startArr = text.indexOf('[');
        const start = (startObj !== -1 && (startArr === -1 || startObj < startArr)) ? startObj : startArr;

        const endObj = text.lastIndexOf('}');
        const endArr = text.lastIndexOf(']');
        const end = (endObj !== -1 && (endArr === -1 || endObj > endArr)) ? endObj : endArr;

        if (start === -1 || end === -1) return JSON.parse(text);
        const jsonStr = text.substring(start, end + 1);
        return JSON.parse(jsonStr);
    } catch (e) {
        console.error("Failed to parse JSON from response:", text);
        throw e;
  }
};

const getSystemInstruction = (currency: string, totals: KeyMetrics, score: ScoreResult) => {
    const fSpend = formatMetricForPrompt(totals.spend, 'currency', currency);
    const fCPA = formatMetricForPrompt(totals.cpa, 'currency', currency);
    const fCPC = formatMetricForPrompt(totals.cpc, 'currency', currency);
    const fCPM = formatMetricForPrompt(totals.cpm, 'currency', currency);
    const fLeads = formatMetricForPrompt(totals.conversions, 'count', currency);
    const fCTR = formatMetricForPrompt(totals.ctr, 'percent', currency);
    const fROAS = totals.roas.toFixed(2);

    return `
You are AdPilot — a Senior Performance Marketing Strategist. 
Analyze the provided CSV data and return an expert-level JSON analysis.

=== PERSONA & TONE ===
- Use professional, strategic language: "likely driven by", "concentration risk", "creative fatigue", "efficiency floor".
- Your analysis must be authoritative yet data-grounded.
- The currency for this dataset is **${currency}**.

=== PERFORMANCE SCORE CONTEXT (DETERMINISTIC) ===
The score of **${score.value}** (${score.rating}) was calculated using model **${score.version}**.
Scoring Logic used by system:
- Metrics used: ${score.explanation.inputs.join(', ')}
- Weights: Efficiency 40%, Consistency 25%, Budget Waste 20%, Engagement 15%
- Normalization: ${score.explanation.normalization}

=== SINGLE SOURCE OF TRUTH (MANDATORY) ===
Use these EXACT formatted strings. DO NOT invent metrics.

OFFICIAL STRINGS:
- Total Spend: ${fSpend}
- Total Conversions (Leads): ${fLeads}
- CPA (Cost Per Lead): ${fCPA}
- ROAS: ${fROAS}
- CTR: ${fCTR}
- CPC: ${fCPC}
- CPM: ${fCPM}

=== INSIGHTS: PERFORMANCE DRIVERS (MANDATORY) ===
You MUST return EXACTLY 3 objects in the 'whats_working' array. These are the Performance Drivers.
Structure/Priority:
1. Creative Performance Driver (Focus on assets, formats, or visual trends)
2. Platform / Placement Performance Driver (Focus on strongest delivery channels)
3. Efficiency / Cost Structure Driver (Focus on CPM/CPC floors or stability)

Rules for each 'whats_working' item:
- 'title': Exactly one of the labels above. You may dynamically enhance it (e.g. 'Creative & Audience Driver') only if a dual-signal is extremely strong.
- 'description': 1-2 sentence expert explanation with EXPLICIT numeric evidence. NO Markdown (***, **, #). Use <b>tags</b> for key metrics, asset names, and terms.
- 'metric': The most significant numeric signal (e.g., "2.03% CTR").
- Content: Focus on explanation only. Never mention risks, recommendations, or actions here.

=== OVERVIEW VERDICT (LOCKED) ===
- 'detailed_verdict' drivers, risks, and actions must each have exactly 3 items.

=== OUTPUT FORMAT (JSON ONLY) ===
You must return only the JSON object. No other text.
{
  "primary_kpi": "CPA",
  "key_metrics": { "spend": ${totals.spend}, "conversions": ${totals.conversions}, "cpa": ${totals.cpa}, "ctr": ${totals.ctr}, "cpc": ${totals.cpc}, "roas": ${totals.roas}, "impressions": ${totals.impressions}, "clicks": ${totals.clicks}, "revenue": ${totals.revenue} },
  "score": ${JSON.stringify(score)},
  "detailed_verdict": {
    "headline": "...",
    "summary": "...",
    "drivers": ["Title: ...", "Title: ...", "Title: ..."],
    "risks": ["Title: ...", "Title: ...", "Title: ..."],
    "actions": [
      { "step": "Specific task", "expected_impact": "Outcome" },
      { "step": "Specific task", "expected_impact": "Outcome" },
      { "step": "Specific task", "expected_impact": "Outcome" }
    ],
    "confidence": "High"
  },
  "next_best_action": { "action": "...", "expected_impact": "..." },
  "summary": "...",
  "whats_working": [], "whats_not_working": [], "breakdown_insights": [], "recommendations": []
}
`;
};

export const generateDataset = async (topic: string): Promise<DataRow[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview", 
      contents: `Generate a realistic advertising dataset for "${topic}". 20 rows. Return as JSON array of objects.`,
      config: { responseMimeType: "application/json" },
    });
    return safeParseJson(response.text || '[]');
  } catch (error) {
    console.error("Gemini Error:", error);
    return mockGenerate(topic);
  }
};

export const analyzeDataset = async (data: DataRow[], currency: string = 'USD'): Promise<AnalysisResult> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const { totals, score } = calculateAggregatedMetrics(data);
        
        const response = await ai.models.generateContent({
            model: "gemini-3-pro-preview", 
            contents: `Analyze data Snippet (CSV): ${exportToCSV(data.slice(0, 400))}`,
            config: {
                systemInstruction: getSystemInstruction(currency, totals, score),
                responseMimeType: "application/json"
            }
        });

        const structuredData = safeParseJson(response.text || "{}") as AdPilotJson;
        
        // Hard-enforce the deterministic score from the helper
        structuredData.score = score;
        structuredData.key_metrics = totals;

        return { markdownReport: structuredData.detailed_verdict?.headline || "Analysis complete", structuredData };
    } catch (error) {
        console.error("Analysis Error:", error);
        return mockAnalysis();
    }
}

export const askAdPilot = async (data: DataRow[], question: string, currency: string = 'USD'): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
      const { totals } = calculateAggregatedMetrics(data);
      const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview", 
          contents: `Question: ${question}. Data Context: Total Spend ${totals.spend}, CPA ${totals.cpa}, Conversions ${totals.conversions}. Snippet: ${exportToCSV(data.slice(0, 200))}`,
          config: {
            systemInstruction: `You are AdPilot, a Senior Performance Marketing Strategist. 
Analyze the data and answer the user question with professional, strategic depth.

=== STRICT FORMATTING RULES (MANDATORY) ===
1. NO Markdown: Do NOT use **bold**, _italic_, or ### headers.
2. Use <b>tags</b>: Use standard HTML <b>tags</b> for ALL bold text.
3. Bold specific elements: Section titles, Key risks, Conclusions, Numbers, metrics, and asset names MUST be <b>bolded</b>.
4. Lists: Use numbered lists (1., 2., 3.) and bullet points using • (dot symbol), never asterisk.
5. NO emojis. NO quotes wrapping text paragraphs.

=== REQUIRED OUTPUT STRUCTURE ===
Analysis Result
[Intro paragraph with regular text, key takeaway <b>bolded inline</b>]

1. <b>Section Title</b>
[Paragraph explanation]
• Supporting point with <b>metrics</b>
• Supporting point with <b>metrics</b>
• Risk: <b>Short bolded sentence</b>

2. <b>Section Title</b>
... (repeat pattern)

Recommendation for Scaling
<b>Action title</b>: explanation
<b>Action title</b>: explanation
<b>Action title</b>: explanation`
          }
      });
      return response.text || "No response.";
  } catch (error) {
      console.error("Ask Error:", error);
      return "I'm having trouble connecting to the analysis engine right now. Please try again later.";
  }
}

const mockGenerate = (topic: string): DataRow[] => Array.from({ length: 15 }).map((_, i) => ({
    date: `2023-10-${i + 1}`,
    campaign_name: "Campaign " + (i % 2),
    spend: Math.floor(Math.random() * 100),
    conversions: Math.floor(Math.random() * 5),
    impressions: 1000
}));

const mockAnalysis = (): AnalysisResult => {
    const { totals, score } = calculateAggregatedMetrics(mockGenerate("Demo"));
    return {
        markdownReport: "Demo Analysis",
        structuredData: {
            primary_kpi: "CPA",
            key_metrics: totals,
            score: score,
            detailed_verdict: {
                headline: "Healthy volume with stable unit economics.",
                summary: "The account is showing a CPA of $35.71, indicating strong creative resonance and efficient bidding.",
                drivers: [
                    "Lead Efficiency: A CPA of $35.71 ensures high-intent volume while maintaining a healthy efficiency floor.",
                    "Creative Resonance: CTR performance supports consistent auction competitiveness.",
                    "Bidding Stability: Deterministic bidding logic prevents cost volatility."
                ],
                risks: [
                    "Creative Fatigue: High frequency levels may signal upcoming CPA inflation.",
                    "Concentration Risk: High spend in single campaigns creates structural vulnerability.",
                    "Attribution Gaps: Delayed reporting cycles might skew short-term scaling decisions."
                ],
                actions: [
                    { "step": "Scale top campaign by 10% daily.", "expected_impact": "Increase lead volume by 5-8%." },
                    { "step": "Launch creative A/B test.", "expected_impact": "Mitigate fatigue and suppress CPC." },
                    { "step": "Review bid caps.", "expected_impact": "Protect efficiency during high-competition windows." }
                ],
                confidence: "High"
            },
            next_best_action: { action: "Scale Campaign 1", expected_impact: "+10% volume" },
            summary: "Stable.",
            whats_working: [], whats_not_working: [], breakdown_insights: [], recommendations: []
        }
    };
};
