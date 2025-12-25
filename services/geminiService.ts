
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

const safeParseJson = (text: string): any => {
    try {
        if (!text) return null;
        // Attempt to find JSON blob if wrapped in markdown
        const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/) || text.match(/({[\s\S]*})/);
        let cleaned = jsonMatch ? jsonMatch[1] || jsonMatch[0] : text;
        
        cleaned = cleaned.trim();
        
        // Basic cleanup for common LLM JSON errors
        cleaned = cleaned.replace(/,\s*([\]}])/g, '$1'); // Remove trailing commas
        // Only remove non-printable control characters that are NOT whitespace (like newlines/tabs are okay usually, but JSON.parse expects escaped)
        // We will remove typical 'bad' control chars but be careful with newlines if they are actual formatting
        cleaned = cleaned.replace(/[\u0000-\u0009\u000B-\u001F\u007F-\u009F]/g, ""); 

        return JSON.parse(cleaned);
    } catch (e) {
        console.error("JSON Parse Error:", e);
        // Fallback: If strict parse fails, try to extract the largest object looking string and parse that
        try {
            const fallbackMatch = text.match(/{[\s\S]*}/);
            if (fallbackMatch && fallbackMatch[0] !== text) {
                 return JSON.parse(fallbackMatch[0]);
            }
        } catch (e2) {}
        return null;
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

// Dataset Audit - Enforcing strict 3 cards per section and deep content
export const analyzeDataset = async (dataset: Dataset, currency: string, language: AnalysisLanguage): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // 1. Calculate Aggregated Metrics to force "Truth" into the prompt
  const mainData = dataset.files[0]?.data || [];
  const metrics = calculateAggregatedMetrics(mainData);
  
  const metricsContext = `
  HARD DATA TRUTH (Do not hallucinate numbers different from these):
  - Total Spend: ${metrics.totals.spend.toFixed(2)} ${currency}
  - Total Conversions (Results/Leads): ${metrics.totals.conversions}
  - Blended CPA: ${metrics.totals.cpa.toFixed(2)} ${currency}
  - Blended ROAS: ${metrics.totals.roas.toFixed(2)}
  - Blended CTR: ${metrics.totals.ctr.toFixed(2)}%
  - Blended CPC: ${metrics.totals.cpc.toFixed(2)} ${currency}
  `;

  // 2. Prepare Raw Data Context - REVERTED TO 500 ROWS LIMIT
  const rawDataContext = dataset.files.map(f => 
    `FILE: ${f.name} (First 500 rows):\n${exportToCSV(f.data.slice(0, 500))}`
  ).join('\n\n---\n\n');

  // Define schema inline to decouple from other services
  const auditPointSchema = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      text: { type: Type.STRING, description: "2-3 sentences explaining the insight from CSV data" },
      impact: { type: Type.STRING, description: "Potential Gain/Improvement (e.g. Save 500€, +15 Leads)" },
      confidence: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
      expert_pillars: {
        type: Type.OBJECT,
        properties: {
          observation: { type: Type.STRING, description: "Required. What does the CSV data show? 2-3 sentences." },
          conclusion: { type: Type.STRING, description: "Required. What is the result? 2-3 sentences." },
          justification: { type: Type.STRING, description: "Required. Why is this happening based on data? 2-3 sentences." },
          recommendation: { type: Type.STRING, description: "Required. What to do next? 2-3 sentences." }
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
              y_axis_label: { type: Type.STRING },
              x_axis_label: { type: Type.STRING },
              value_format: { type: Type.STRING, enum: ['currency', 'percent', 'number', 'float'] },
              unit_symbol: { type: Type.STRING, description: "Required symbol (e.g. €, %, x). MUST be populated." },
              data: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: { label: { type: Type.STRING }, value: { type: Type.NUMBER }, color: { type: Type.STRING }, is_benchmark: { type: Type.BOOLEAN } }
                }
              }
            },
            required: ["type", "title", "y_axis_label", "value_format", "unit_symbol", "data"]
          },
          analysis_logic: {
            type: Type.OBJECT,
            properties: { 
               headline: { type: Type.STRING }, 
               formula: { type: Type.STRING }, 
               logic: { type: Type.STRING, description: "Explain the calculation used on the CSV data." } 
            },
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
TASK: Execute an audit based EXCLUSIVELY on the provided CSV data.

INPUT DATA:
${metricsContext}

RAW CSV DATA:
${rawDataContext}

STRICT CONSTRAINTS:
1. DATA SOURCE: FACTS MUST COME FROM CSV. Do not hallucinate campaigns not in the file.
2. QUANTITY: GENERATE EXACTLY 3 ITEMS for 'performance_drivers', 3 for 'watch_outs_risks', and 3 for 'strategic_actions'. Total 9 cards.
3. CONTENT DEPTH (CRITICAL): 
   - The 'text' field on the card MUST be 2-3 sentences (approx 30-50 words) explaining the specific data pattern.
   - The 'expert_pillars' (Observation, Conclusion, Justification, Recommendation) MUST each be 2-3 sentences deep.
4. CHARTS:
   - EVERY item must have a 'deep_dive.chart_config'.
   - AXIS LABELS: You MUST provide specific 'x_axis_label', 'y_axis_label', and 'unit_symbol' (e.g. "€", "%") for every chart.
   - UNIT SYMBOLS: Ensure 'unit_symbol' is always present (e.g. "%" for CTR, "€" for CPA).
5. IMPACT: Calculate the POTENTIAL IMPROVEMENT. Do not just state current values. Use format like "Save €X", "+X Leads", "-X% CPA".
6. ANALYSIS LOGIC: In 'analysis_logic', explain exactly which columns and rows were used to calculate the finding (e.g., "Filtered for Age=65+, Sum(Impressions) / Sum(Spend)").
7. STRATEGIC ACTIONS: Ensure the 'strategic_actions' section is fully populated with actionable steps to improve performance based on the risks and drivers identified.
8. LANGUAGE: ${language === 'LV' ? 'Latvian' : 'English'}.
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
  
  // Inject calculated metrics for Q&A as well to ensure accuracy
  const mainData = dataset.files[0]?.data || [];
  const metrics = calculateAggregatedMetrics(mainData);
  const metricsContext = `
  TRUTH METRICS:
  Total Spend: ${metrics.totals.spend.toFixed(2)}
  Total Conversions: ${metrics.totals.conversions}
  CPA: ${metrics.totals.cpa.toFixed(2)}
  ROAS: ${metrics.totals.roas.toFixed(2)}
  `;

  // Increased context for Q&A - REVERTED TO 300 ROWS
  const context = dataset.files.map(f => `FILE: ${f.name} (First 300 rows):\n${exportToCSV(f.data.slice(0, 300))}`).join('\n\n---\n\n');
  
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
  
  // Detect Recruitment Context
  const isRecruitment = inputs.product.toLowerCase().includes('job') || 
                        inputs.product.toLowerCase().includes('hiring') || 
                        inputs.product.toLowerCase().includes('recruitment') ||
                        inputs.businessType === 'Lead Generation';

  const prompt = `ROLE: Senior Media Strategy Architect (Consulting Grade).
TASK: Create a 30-day client-ready acquisition strategy.
INPUTS: Product: ${inputs.product}, Market: ${inputs.location}, Goal: ${inputs.goal}, Budget: ${inputs.budget} EUR.
LANGUAGE: ${language === 'LV' ? 'Latvian' : 'English'}.

CRITICAL GUIDELINES:
1. HEADLINE: Must follow format "30-Day [Topic] Plan — [Location]". Example: "30-Day Hiring Plan — Latvia" or "30-Day Lead Acquisition Plan — Riga". NO "Sprint" or internal jargon.
2. MARKET INTEL: 
   - 'search_demand_rating' must match description.
   - 'search_demand' text MUST include estimated volume range (e.g., "8k-15k monthly searches").
   - "Interpretation" field is the "So What?".
   - "Implication" field is the tactical action.
3. BENCHMARKS:
   - ${isRecruitment ? "Use 'Cost per Application' (CPA) and 'Qualified Application Rate'." : "Use CPA and Lead CVR."}
   - Contextualize benchmarks (e.g., "Latvia Recruitment Auction Median").
4. STRATEGY:
   - 'dynamic_adjustment_scenario' MUST be a 2-step logic: "Step 1: Fix Search negatives. Step 2: If still high, shift to Retargeting."
   - 'risk_mitigation': Use specific, non-discriminatory gates (e.g., "Qualification Questions", "Location Gate").
   - 'funnel_split_justification': Must specify budget math (e.g., "€${inputs.budget} total. 60% Meta for volume, 40% Search for intent.").
5. METRICS:
   - ${isRecruitment ? "Replace 'Conversions' with 'Applications' everywhere." : "Use 'Conversions' or 'Leads'."}
   - If ROAS is not applicable (like recruitment), use "Quality Score" or "Interview Rate" instead.
6. CREATIVE:
   - 'value_props': Must be candidate-centric if hiring (e.g. "Net salary", "Shift flexibility"), not employer-centric.
   - 'anti_messaging': Must include "Bait-and-switch" warnings.
   - 'visual_direction' -> Rename to "Creative Direction" in output text if possible.
   - Guardrails: PROVIDE AT LEAST 5 ITEMS.
7. ROADMAP:
   - W2/W3 metrics must be specific (e.g. "Form Completion Rate", not generic "Bounce Rate").
   - W4 must include "CRM Feedback Loop".
8. BREVITY: Keep strings dense and under 15 words where possible.
9. VALID JSON ONLY.`;
  
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
              headline: { type: Type.STRING, description: "Professional strategy title" },
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
              interpretation: { type: Type.STRING, description: "The 'So What?' insight" },
              implication: { type: Type.STRING, description: "The tactical implication" },
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
