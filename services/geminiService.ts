
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { AnalysisResult, AdPilotJson, KeyMetrics, ScoreResult, AnalysisLanguage, Dataset, DimensionFile, DataRow, SimulationInputs, SimulationResult, GroundingSource, CreativeAuditResult, FocusGroupResult } from "../types";
import { exportToCSV } from "../utils/csvHelper";
import { calculateAggregatedMetrics } from "../utils/analyticsHelper";

const extractGroundingSources = (response: GenerateContentResponse): GroundingSource[] => {
  const sources: GroundingSource[] = [];
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (chunks) {
    chunks.forEach((chunk: any) => {
      if (chunk.web && chunk.web.uri) {
        sources.push({
          title: chunk.web.title || chunk.web.uri,
          uri: chunk.web.uri
        });
      }
    });
  }
  return sources;
};

const repairJson = (json: string): string => {
    let balanced = json;
    const stack: string[] = [];
    let inString = false;
    let escaped = false;

    for (let i = 0; i < json.length; i++) {
        const char = json[i];
        if (inString) {
            if (char === '\\' && !escaped) {
                escaped = true;
            } else {
                if (char === '"' && !escaped) inString = false;
                escaped = false;
            }
        } else {
            if (char === '"') inString = true;
            else if (char === '{') stack.push('}');
            else if (char === '[') stack.push(']');
            else if (char === '}' || char === ']') {
                if (stack.length > 0 && stack[stack.length - 1] === char) {
                    stack.pop();
                }
            }
        }
    }

    // Append missing closing braces in reverse order
    while (stack.length > 0) {
        balanced += stack.pop();
    }
    return balanced;
};

const safeParseJson = (text: string): any => {
    if (!text) return null;

    // 1. Try parsing as-is
    try {
        return JSON.parse(text);
    } catch (e) {
        // Continue
    }

    let cleaned = text;

    // 2. Extract JSON block (Markdown or just braces)
    const markdownMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (markdownMatch) {
        cleaned = markdownMatch[1];
    } else {
        const firstBrace = cleaned.indexOf('{');
        // We use lastIndexOf to try and get the full object, but if truncated, we might need to repair
        const lastBrace = cleaned.lastIndexOf('}');
        if (firstBrace !== -1) {
            // If we found a closing brace, use it. If not (truncated), take everything after first brace.
            if (lastBrace !== -1 && lastBrace > firstBrace) {
                cleaned = cleaned.substring(firstBrace, lastBrace + 1);
            } else {
                cleaned = cleaned.substring(firstBrace);
            }
        }
    }

    // 3. Recursive cleanup strategy
    try {
        // Remove comments
        cleaned = cleaned.replace(/^\s*\/\/.*$/gm, '');
        cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');

        // Fix potential newlines in strings
        cleaned = cleaned.replace(/[\u0000-\u001F]+/g, (match) => {
             if (match === '\n' || match === '\r' || match === '\t') return match; 
             return ''; 
        });

        // Remove trailing commas before closing braces/brackets
        cleaned = cleaned.replace(/,(\s*[\]}])/g, '$1');

        // Fix missing commas between objects: } { -> }, {
        cleaned = cleaned.replace(/}\s*{/g, '}, {');
        cleaned = cleaned.replace(/]\s*{/g, '], {');
        cleaned = cleaned.replace(/}\s*\[/g, '}, [');

        // Aggressively insert missing commas between properties/values
        // Only if NOT followed by comma already.
        // Matches: value ending (digit, quote, bool, null, brace, bracket) followed by whitespace, then a quote (start of key)
        cleaned = cleaned.replace(/([0-9]|true|false|null|"|}|])\s+(?=")/g, '$1,');

        return JSON.parse(cleaned);
    } catch (e) {
        // 4. Try repairing truncated JSON
        try {
            const repaired = repairJson(cleaned);
            return JSON.parse(repaired);
        } catch (e2) {
             console.error("JSON Parse Failed Final Attempt. Raw text length:", text.length, e2);
             // Return null to allow the UI to handle the error state
             return null; 
        }
    }
};

export const analyzeAdCreative = async (base64Image: string, mimeType: string, context: { product: string; audience: string }, language: AnalysisLanguage): Promise<CreativeAuditResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { data: base64Image, mimeType } },
        { text: `ROLE: Senior Creative Director. Analyze this ad: Product: ${context.product}, Audience: ${context.audience}. LANGUAGE: ${language === 'LV' ? 'Latvian' : 'English'}.` }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER },
          pillars: {
            type: Type.OBJECT,
            properties: {
              stopping_power: { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, feedback: { type: Type.STRING } } },
              messaging_clarity: { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, feedback: { type: Type.STRING } } },
              brand_recall: { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, feedback: { type: Type.STRING } } },
              visual_hierarchy: { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, feedback: { type: Type.STRING } } }
            }
          },
          key_observations: { type: Type.ARRAY, items: { type: Type.STRING } },
          suggested_edits: { type: Type.ARRAY, items: { type: Type.STRING } },
          accessibility_note: { type: Type.STRING }
        }
      }
    }
  });
  return safeParseJson(response.text || "{}");
};

export const generateFocusGroup = async (inputs: { product: string; offer: string; audience: string }, language: AnalysisLanguage): Promise<FocusGroupResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `ROLE: Market Research Psychologist. Evaluate: Product: ${inputs.product}, Offer: ${inputs.offer}, Audience: ${inputs.audience}. LANGUAGE: ${language === 'LV' ? 'Latvian' : 'English'}.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          personas: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                archetype: { type: Type.STRING },
                reaction: { type: Type.STRING },
                purchase_intent: { type: Type.NUMBER },
                critical_concern: { type: Type.STRING },
                positive_trigger: { type: Type.STRING }
              }
            }
          },
          aggregate_sentiment: { type: Type.STRING },
          recommended_pivot: { type: Type.STRING }
        }
      }
    }
  });
  return safeParseJson(response.text || "{}");
};

export const analyzeDataset = async (dataset: Dataset, currency: string, language: AnalysisLanguage): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const mainData = dataset.files[0]?.data || [];
  const metrics = calculateAggregatedMetrics(mainData);
  
  const metricsContext = `
  HARD DATA TRUTH (Do not hallucinate numbers):
  - Total Spend: ${metrics.totals.spend.toFixed(2)} ${currency}
  - Total Conversions: ${metrics.totals.conversions}
  - Blended CPA: ${metrics.totals.cpa.toFixed(2)} ${currency}
  - Blended ROAS: ${metrics.totals.roas.toFixed(2)}
  - Blended CTR: ${metrics.totals.ctr.toFixed(2)}%
  - Blended CPC: ${metrics.totals.cpc.toFixed(2)} ${currency}
  `;

  // Limit rows to prevent context overflow and reduce JSON complexity risk. 
  // Reduced to Top 75 to save tokens for the output.
  const rawDataContext = dataset.files.map(f => 
    `FILE: ${f.name} (Top 75 rows):\n${exportToCSV(f.data.slice(0, 75))}`
  ).join('\n\n---\n\n');

  const auditPointSchema = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      text: { type: Type.STRING, description: "Insight description." },
      impact: { type: Type.STRING, description: "Value AND Unit/Context. E.g. '+25 Leads', '-15% CPA', 'Save €500'." },
      confidence: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
      expert_pillars: {
        type: Type.OBJECT,
        properties: {
          observation: { type: Type.STRING, description: "2 sentences max." },
          conclusion: { type: Type.STRING, description: "2 sentences max." },
          justification: { type: Type.STRING, description: "2 sentences max." },
          recommendation: { type: Type.STRING, description: "2 sentences max." }
        },
        required: ["observation", "conclusion", "justification", "recommendation"]
      },
      deep_dive: {
        type: Type.OBJECT,
        properties: {
          chart_config: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING, enum: ['bar_chart', 'line_chart', 'pie_chart', 'area_chart', 'funnel_chart', 'stacked_bar'] },
              title: { type: Type.STRING },
              y_axis_label: { type: Type.STRING, description: "Label for Y axis." },
              x_axis_label: { type: Type.STRING, description: "Label for X axis." },
              value_format: { type: Type.STRING, enum: ['currency', 'percent', 'number', 'float'] },
              unit_symbol: { type: Type.STRING },
              data: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: { 
                      label: { type: Type.STRING }, 
                      value: { type: Type.NUMBER }, 
                      color: { type: Type.STRING, description: "Hex code." }, 
                      is_benchmark: { type: Type.BOOLEAN } 
                  }
                }
              }
            },
            required: ["type", "title", "y_axis_label", "x_axis_label", "value_format", "unit_symbol", "data"]
          },
          analysis_logic: {
            type: Type.OBJECT,
            properties: { headline: { type: Type.STRING }, formula: { type: Type.STRING }, logic: { type: Type.STRING } },
            required: ["headline", "formula", "logic"]
          }
        },
        required: ["chart_config", "analysis_logic"]
      }
    },
    required: ["title", "text", "impact", "confidence", "expert_pillars", "deep_dive"]
  };

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview', 
    contents: `ROLE: Senior Ad Performance Auditor. 
TASK: Audit provided CSV data.

INPUT DATA:
${metricsContext}

RAW CSV DATA:
${rawDataContext}

STRICT CONSTRAINTS:
1. QUANTITY: GENERATE EXACTLY 3 ITEMS for 'performance_drivers', 3 for 'watch_outs_risks', and 3 for 'strategic_actions'. Total 9 cards.
2. CONTENT DEPTH:
   - 'impact' field MUST include a Value AND Unit. Examples: "+45 Leads", "-€2.50 CPA", "2.5x ROAS", "Save €400". Do NOT provide bare numbers like "45".
   - 'expert_pillars' MUST be concise (2 sentences max).
3. CHARTS:
   - Max 6 data points per chart to save tokens.
   - Must have axis labels.
4. JSON FORMATTING (CRITICAL):
   - NO newlines or tabs inside strings.
   - Use SINGLE QUOTES inside string values if needed.
   - Ensure the output is valid JSON.
5. LANGUAGE: ${language === 'LV' ? 'Latvian' : 'English'}.
`,
    config: {
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          primary_kpi: { type: Type.STRING },
          key_metrics: {
            type: Type.OBJECT,
            properties: {
              spend: { type: Type.NUMBER }, revenue: { type: Type.NUMBER }, impressions: { type: Type.NUMBER }, clicks: { type: Type.NUMBER },
              conversions: { type: Type.NUMBER }, ctr: { type: Type.NUMBER }, cpc: { type: Type.NUMBER }, cpa: { type: Type.NUMBER },
              roas: { type: Type.NUMBER }, cpm: { type: Type.NUMBER }
            }
          },
          score: {
            type: Type.OBJECT,
            properties: {
              value: { type: Type.NUMBER },
              rating: { type: Type.STRING, enum: ["Excellent", "Good", "Average", "Critical"] },
              drivers: { type: Type.ARRAY, items: { type: Type.STRING } },
              version: { type: Type.STRING },
              confidence: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
              breakdown: {
                type: Type.OBJECT,
                properties: { performance: { type: Type.NUMBER }, delivery: { type: Type.NUMBER }, creative: { type: Type.NUMBER }, structure: { type: Type.NUMBER } }
              }
            }
          },
          suggested_questions: { type: Type.ARRAY, items: { type: Type.STRING } },
          detailed_verdict: {
            type: Type.OBJECT,
            properties: {
              verdict: { type: Type.OBJECT, properties: { headline: { type: Type.STRING }, description: { type: Type.STRING } } },
              grid: {
                type: Type.OBJECT,
                properties: {
                  performance_drivers: { type: Type.ARRAY, items: auditPointSchema },
                  watch_outs_risks: { type: Type.ARRAY, items: auditPointSchema },
                  strategic_actions: { type: Type.ARRAY, items: auditPointSchema }
                },
                required: ["performance_drivers", "watch_outs_risks", "strategic_actions"]
              }
            },
            required: ["verdict", "grid"]
          }
        },
        required: ["primary_kpi", "key_metrics", "score", "detailed_verdict"]
      }
    }
  });

  const structuredData = safeParseJson(response.text || "{}");
  const sources = extractGroundingSources(response);
  if (structuredData) structuredData.sources = sources;

  return {
    markdownReport: response.text || '',
    structuredData: structuredData as AdPilotJson
  };
};

export const askAdPilot = async (dataset: Dataset, question: string, currency: string, language: AnalysisLanguage, deepThinking: boolean): Promise<{ text: string, sources: GroundingSource[] }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = deepThinking ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';
  
  const mainData = dataset.files[0]?.data || [];
  const metrics = calculateAggregatedMetrics(mainData);
  const metricsContext = `
  TRUTH METRICS:
  Total Spend: ${metrics.totals.spend.toFixed(2)}
  Total Conversions: ${metrics.totals.conversions}
  CPA: ${metrics.totals.cpa.toFixed(2)}
  ROAS: ${metrics.totals.roas.toFixed(2)}
  `;

  // Reduced context for chat as well to prevent overload
  const context = dataset.files.map(f => `FILE: ${f.name} (First 50 rows):\n${exportToCSV(f.data.slice(0, 50))}`).join('\n\n---\n\n');
  
  const response = await ai.models.generateContent({
    model,
    contents: `ROLE: Senior Ad Scientist. Answer using the dataset.
LANGUAGE: ${language === 'LV' ? 'Latvian' : 'English'}.
CONTEXT METRICS: ${metricsContext}
DATASET: ${context}
QUESTION: ${question}`,
    config: { tools: [{ googleSearch: {} }] }
  });
  return { text: response.text || '', sources: extractGroundingSources(response) };
};

export const runAiSimulation = async (inputs: SimulationInputs, language: AnalysisLanguage): Promise<SimulationResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `ROLE: Senior Media Strategy Architect.
TASK: Create a 30-day strategy.
INPUTS: Product: ${inputs.product}, Market: ${inputs.location}, Goal: ${inputs.goal}, Budget: ${inputs.budget} EUR.
LANGUAGE: ${language === 'LV' ? 'Latvian' : 'English'}.
STRICT JSON OUTPUT.`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      maxOutputTokens: 8192,
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          executive_summary: {
            type: Type.OBJECT,
            properties: {
              headline: { type: Type.STRING },
              summary: { type: Type.STRING },
              strategic_verdict: { type: Type.STRING },
              expected_outcome_summary: { type: Type.STRING },
              recommended_mix: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { channel: { type: Type.STRING }, priority: { type: Type.NUMBER }, role: { type: Type.STRING } } } }
            }
          },
          market_intelligence: {
            type: Type.OBJECT,
            properties: {
              search_demand: { type: Type.STRING },
              search_demand_rating: { type: Type.STRING, enum: ["Low", "Medium", "High"] },
              search_intent_split: { type: Type.OBJECT, properties: { high: { type: Type.NUMBER }, mid: { type: Type.NUMBER }, info: { type: Type.NUMBER } } },
              interpretation: { type: Type.STRING },
              implication: { type: Type.STRING },
              benchmarks: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, value: { type: Type.STRING }, context: { type: Type.STRING } } } }
            }
          },
          strategic_approach: {
            type: Type.OBJECT,
            properties: { logic: { type: Type.STRING }, funnel_split_justification: { type: Type.STRING }, funnel_balance: { type: Type.STRING }, confidence_score: { type: Type.STRING }, dynamic_adjustment_scenario: { type: Type.STRING }, risk_mitigation: { type: Type.STRING } }
          },
          channel_breakdown: {
            type: Type.ARRAY,
            items: { type: Type.OBJECT, properties: { channel_name: { type: Type.STRING }, budget_share: { type: Type.STRING }, strategy: { type: Type.STRING }, primary_kpi: { type: Type.STRING }, key_risk: { type: Type.STRING }, success_30d: { type: Type.STRING } } }
          },
          forecast: {
            type: Type.OBJECT,
            properties: {
              conservative: { type: Type.OBJECT, properties: { conversions: { type: Type.STRING }, cpa: { type: Type.STRING }, roas: { type: Type.STRING }, logic: { type: Type.STRING }, driver: { type: Type.STRING } } },
              expected: { type: Type.OBJECT, properties: { conversions: { type: Type.STRING }, cpa: { type: Type.STRING }, roas: { type: Type.STRING }, logic: { type: Type.STRING }, driver: { type: Type.STRING } } },
              optimistic: { type: Type.OBJECT, properties: { conversions: { type: Type.STRING }, cpa: { type: Type.STRING }, roas: { type: Type.STRING }, logic: { type: Type.STRING }, driver: { type: Type.STRING } } }
            }
          },
          creative_strategy: {
            type: Type.OBJECT,
            properties: { value_props: { type: Type.ARRAY, items: { type: Type.STRING } }, messaging_by_funnel: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { stage: { type: Type.STRING }, angle: { type: Type.STRING } } } }, anti_messaging: { type: Type.ARRAY, items: { type: Type.STRING } }, visual_direction: { type: Type.STRING } }
          },
          roadmap: {
            type: Type.ARRAY,
            items: { type: Type.OBJECT, properties: { week: { type: Type.NUMBER }, title: { type: Type.STRING }, tasks: { type: Type.ARRAY, items: { type: Type.STRING } }, success_criteria: { type: Type.STRING }, decision_gate: { type: Type.STRING } } }
          },
          syntheticData: {
            type: Type.ARRAY,
            items: { type: Type.OBJECT, properties: { "Date": { type: Type.STRING }, "Spend": { type: Type.NUMBER }, "Conversions": { type: Type.NUMBER } } }
          }
        },
        required: ["executive_summary", "market_intelligence", "strategic_approach", "channel_breakdown", "forecast", "creative_strategy", "roadmap", "syntheticData"]
      }
    }
  });
  return { ...safeParseJson(response.text || "{}"), sources: extractGroundingSources(response) };
};
