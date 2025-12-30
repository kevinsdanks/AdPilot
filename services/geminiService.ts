
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

// Robust JSON Cleaner to handle Markdown fences and common LLM output issues
const cleanAndParseJson = (text: string): any => {
    if (!text) return null;
    
    let cleaned = text.trim();

    // 1. Remove Markdown code blocks (```json ... ```) and simple ``` wrapper
    cleaned = cleaned.replace(/^```(json)?/i, '').replace(/```$/, '');
    
    // 2. Locate JSON root (Object or Array) to strip prologue/epilogue
    const firstBrace = cleaned.indexOf('{');
    const firstBracket = cleaned.indexOf('[');
    
    let startIdx = -1;
    let endIdx = -1;
    let isObj = false;

    // Determine if we are looking for { or [ based on which comes first
    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
        startIdx = firstBrace;
        isObj = true;
    } else if (firstBracket !== -1) {
        startIdx = firstBracket;
        isObj = false;
    }

    if (startIdx !== -1) {
        // Find corresponding last closer
        const lastBrace = cleaned.lastIndexOf('}');
        const lastBracket = cleaned.lastIndexOf(']');
        
        if (isObj && lastBrace !== -1 && lastBrace > startIdx) {
            endIdx = lastBrace;
        } else if (!isObj && lastBracket !== -1 && lastBracket > startIdx) {
            endIdx = lastBracket;
        }
        
        if (endIdx !== -1) {
            cleaned = cleaned.substring(startIdx, endIdx + 1);
        }
    }

    // 3. Attempt parse
    try {
        return JSON.parse(cleaned);
    } catch (e) {
        // 4. Repair Mode
        try {
            let fixed = cleaned;
            // Remove comments //... and /* ... */
            fixed = fixed.replace(/\/\/.*$/gm, '');
            fixed = fixed.replace(/\/\*[\s\S]*?\*\//g, '');
            
            // Fix trailing commas before closing braces/brackets
            fixed = fixed.replace(/,(\s*[\]}])/g, '$1');
            
            // Fix missing commas between elements.
            // Strategy: Look for (End Token) + Space + (Start Token) and insert comma.
            // We exclude t/f/n from lookahead for numbers/bools to avoid corrupting text like "1 friend" or "true love".
            
            // Case 1: Closing Brackets (Object/Array end) -> Any valid start token
            // matches: } { | ] [ | } " | ] " | } 1 | ] true
            fixed = fixed.replace(/([}\]])(\s+)(?=[{\["\d\-tfn])/g, '$1,$2');

            // Case 2: String Quote end -> Any valid start token
            // matches: " { | " [ | " " | " 1 | " true
            fixed = fixed.replace(/(")(\s+)(?=[{\["\d\-tfn])/g, '$1,$2');

            // Case 3: Number end -> Safe start tokens (Quote, Brace, Bracket, Number, Minus)
            // Excludes t/f/n to protect text like "I have 1 true friend" inside a string (if regex matches wrong context)
            fixed = fixed.replace(/(\d)(\s+)(?=[{\["\d\-])/g, '$1,$2');

            // Case 4: Boolean/Null end -> Safe start tokens
            fixed = fixed.replace(/(true|false|null)(\s+)(?=[{\["\d\-])/g, '$1,$2');

            return JSON.parse(fixed);
        } catch (e2) {
            console.error("JSON Parsing Failed:", e2);
            // console.log("Failed Text Snippet:", cleaned.substring(0, 500) + "...");
            return null;
        }
    }
};

// Helper to strip URLs and technical IDs to save tokens and reduce 'unexpected characters' errors
const sanitizeDataForContext = (data: DataRow[]): DataRow[] => {
    return data.map(row => {
        const cleanRow: DataRow = {};
        Object.keys(row).forEach(key => {
            const lowerKey = key.toLowerCase();
            // Skip URLs, Images, technical IDs (except Ad ID/Name)
            if (lowerKey.includes('url') || lowerKey.includes('thumbnail') || lowerKey.includes('image') || lowerKey.includes('video') || (lowerKey.includes('id') && !lowerKey.includes('ad') && !lowerKey.includes('name'))) {
                return;
            }
            const val = row[key];
            // Skip long strings that look like URLs or base64
            if (typeof val === 'string') {
                if (val.startsWith('http') || val.startsWith('data:') || val.length > 200) return;
            }
            cleanRow[key] = val;
        });
        return cleanRow;
    });
};

export const analyzeAdCreative = async (base64Image: string, mimeType: string, context: { product: string; audience: string }, language: AnalysisLanguage): Promise<CreativeAuditResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { data: base64Image, mimeType } },
        { text: `ROLE: Senior Creative Director. Analyze this ad: Product: ${context.product}, Audience: ${context.audience}. LANGUAGE: ${language === 'LV' ? 'Latvian' : 'English'}. STRICT JSON OUTPUT. Ensure all properties are comma-separated.` }
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
  return cleanAndParseJson(response.text || "{}");
};

export const generateFocusGroup = async (inputs: { product: string; offer: string; audience: string }, language: AnalysisLanguage): Promise<FocusGroupResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `ROLE: Market Research Psychologist. Evaluate: Product: ${inputs.product}, Offer: ${inputs.offer}, Audience: ${inputs.audience}. LANGUAGE: ${language === 'LV' ? 'Latvian' : 'English'}. STRICT JSON OUTPUT. Ensure all array items and object properties are comma-separated.`,
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
  return cleanAndParseJson(response.text || "{}");
};

export const analyzeDataset = async (dataset: Dataset, currency: string, language: AnalysisLanguage): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const mainData = dataset.files[0]?.data || [];
  const metrics = calculateAggregatedMetrics(mainData);
  
  const metricsContext = `
  HARD DATA TRUTH (Do not hallucinate numbers):
  - Total Spend: ${metrics.totals.spend.toFixed(2)} ${currency}
  - Total Conversions (Blended): ${metrics.totals.conversions}
  - Total Purchases: ${metrics.totals.purchases} (CPA: ${metrics.totals.costPerPurchase.toFixed(2)})
  - Total Leads: ${metrics.totals.leads} (CPL: ${metrics.totals.costPerLead.toFixed(2)})
  - Blended CPA: ${metrics.totals.cpa.toFixed(2)} ${currency}
  - Blended ROAS: ${metrics.totals.roas.toFixed(2)}
  `;

  // Sanitize and limit context to avoid token limits and "unexpected character" errors from binary/url data
  const rawDataContext = dataset.files.map(f => {
    const cleanData = sanitizeDataForContext(f.data.slice(0, 40));
    return `FILE: ${f.name} (Top 40 rows):\n${exportToCSV(cleanData)}`;
  }).join('\n\n---\n\n');

  const fileNames = dataset.files.map(f => f.name).join(', ');

  const auditPointSchema = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      text: { type: Type.STRING, description: "Insight description." },
      impact: { type: Type.STRING, description: "Value AND Unit. E.g. '+25 Leads'." },
      confidence: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
      expert_pillars: {
        type: Type.OBJECT,
        properties: {
          observation: { type: Type.STRING, description: "MUST be 2-3 sentences long detailed observation." },
          conclusion: { type: Type.STRING, description: "MUST be 2-3 sentences long detailed conclusion." },
          justification: { type: Type.STRING, description: "MUST be 2-3 sentences long justification with data." },
          recommendation: { type: Type.STRING, description: "Actionable advice." }
        },
        required: ["observation", "conclusion", "justification", "recommendation"]
      },
      deep_dive: {
        type: Type.OBJECT,
        properties: {
          chart_config: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING, enum: ['bar_chart', 'line_chart', 'pie_chart'] },
              title: { type: Type.STRING },
              y_axis_label: { type: Type.STRING },
              x_axis_label: { type: Type.STRING },
              value_format: { type: Type.STRING, enum: ['currency', 'percent', 'number'] },
              unit_symbol: { type: Type.STRING },
              data: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: { 
                      label: { type: Type.STRING }, 
                      value: { type: Type.NUMBER }, 
                      color: { type: Type.STRING }, 
                      is_benchmark: { type: Type.BOOLEAN } 
                  }
                }
              }
            },
            required: ["type", "title", "data", "value_format"]
          },
          analysis_logic: {
            type: Type.OBJECT,
            properties: { headline: { type: Type.STRING }, formula: { type: Type.STRING }, logic: { type: Type.STRING } },
            required: ["headline", "logic"]
          }
        },
        required: ["chart_config", "analysis_logic"]
      }
    },
    required: ["title", "text", "confidence", "expert_pillars", "deep_dive"]
  };

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview', // Upgraded to Pro for complex reasoning and schema adherence
    contents: `ROLE: Senior Ad Performance Auditor & Marketing Scientist. 
TASK: Audit provided CSV data using multi-level hierarchy analysis.

INPUT DATA:
${metricsContext}

FILES INCLUDED IN ANALYSIS: ${fileNames}

RAW CSV DATA:
${rawDataContext}

STRICT INSTRUCTIONS:
1. **Funnel Analysis**: Identify bottlenecks.
2. **Creative Fatigue**: Look for high frequency + dropping CTR.
3. GENERATE EXACTLY 3 items per grid section.
4. GENERATE 3 "suggested_questions" that a user might ask about this specific data.
5. **Output must be valid JSON**. Ensure all array elements and properties are comma-separated. No markdown code blocks. Do not wrap in \`\`\`.
6. **Detailed Pillars**: Observation, Conclusion, and Justification MUST be 2-3 sentences each.
7. **Chart Units**: Use 'value_format' (currency/percent) correctly in deep_dive.
8. LANGUAGE: ${language === 'LV' ? 'Latvian' : 'English'}.
9. **Scoring**: Provide \`score.value\` on a 0-100 scale (e.g. 78, not 7.8). Breakdown scores also 0-100.
10. **JSON Integrity**: Double-check that all items in lists (arrays) and all properties in objects are separated by commas.
`,
    config: {
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          primary_kpi: { type: Type.STRING },
          score: {
            type: Type.OBJECT,
            properties: {
              value: { type: Type.NUMBER },
              rating: { type: Type.STRING },
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
        required: ["score", "detailed_verdict", "suggested_questions"]
      }
    }
  });

  const structuredData = cleanAndParseJson(response.text || "{}");
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
  const metricsContext = `Total Spend: ${metrics.totals.spend.toFixed(2)}`;

  // Sanitize context for chat as well
  const context = dataset.files.map(f => {
      const clean = sanitizeDataForContext(f.data.slice(0, 50));
      return `FILE: ${f.name} (First 50 rows):\n${exportToCSV(clean)}`;
  }).join('\n\n---\n\n');
  
  const response = await ai.models.generateContent({
    model,
    contents: `ROLE: Senior Ad Scientist.
LANGUAGE: ${language === 'LV' ? 'Latvian' : 'English'}.
METRICS: ${metricsContext}
DATA: ${context}
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
              search_demand_rating: { type: Type.STRING },
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
  return { ...cleanAndParseJson(response.text || "{}"), sources: extractGroundingSources(response) };
};
