
import { DataRow, KeyMetrics, ScoreResult, ScoreExplanation, InsightObject } from '../types';

const SCORING_MODEL_V2 = {
    version: "score_model_v3_advanced",
    benchmarks: {
        CTR: 1.5, 
        CPA: 25,  
        ROAS: 3.5, 
        CPC: 1.0,
        CPM: 15.0,
        FREQ_MAX: 3.5 // Frequency threshold for fatigue
    },
    weights: {
        performance: 0.40,
        delivery: 0.25,
        creative: 0.20,
        structure: 0.15
    }
};

const findKey = (columns: string[], patterns: RegExp[]) => {
  for (const pattern of patterns) {
    const found = columns.find(col => pattern.test(col));
    if (found) return found;
  }
  return null;
};

const parseNumber = (val: any): number => {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
      let clean = val.trim();
      if (!clean) return 0;
      
      // Heuristic for European format (comma as decimal): 1.234,56 or 123,45
      // If last comma is after last dot, or comma exists without dot
      const lastComma = clean.lastIndexOf(',');
      const lastDot = clean.lastIndexOf('.');
      
      if (lastComma > lastDot) {
         // Comma is decimal. Remove dots (thousands), replace comma with dot
         clean = clean.replace(/\./g, '').replace(',', '.');
      } else {
         // Dot is decimal (or no separators). Remove commas (thousands)
         clean = clean.replace(/,/g, '');
      }
      
      // Remove spaces (common thousand separator)
      clean = clean.replace(/\s/g, '');
      
      // Sanitize remaining characters
      clean = clean.replace(/[^0-9.-]/g, '');
      
      const num = parseFloat(clean);
      return isNaN(num) ? 0 : num;
  }
  return 0;
};

export const calculateAggregatedMetrics = (data: DataRow[]): { totals: KeyMetrics, trends: any[], waste: any, score: ScoreResult, deterministicHeadline: string, insights: InsightObject[] } => {
    const emptyExplanation: ScoreExplanation = {
        version: SCORING_MODEL_V2.version,
        steps: [
            "1. Performance Effectiveness (40%): CPA/ROAS normalization vs targets",
            "2. Delivery & Auction Health (25%): CPM/CTR stability vs account average",
            "3. Creative & Message Quality (20%): Engagement signals & retention",
            "4. Data & Structure Quality (15%): Volume, attribution & tracking"
        ],
        inputs: [],
        weights: { 
          "Performance": "40%", 
          "Delivery": "25%", 
          "Creative": "20%", 
          "Structure": "15%" 
        },
        normalization: "Linear normalization against dynamic benchmarks. Penalties for conversions < 10.",
        data_rules: ["Volume-based confidence adjustments", "Auction health penalties"],
        confidence_rule: ">15 conversions for High, 5-15 for Medium, <5 for Low."
    };

    if (!data || data.length === 0) {
        // Return zeros
        return {
            totals: { spend: 0, revenue: 0, impressions: 0, clicks: 0, conversions: 0, ctr: 0, cpc: 0, cpa: 0, roas: 0, cpm: 0, purchases: 0, costPerPurchase: 0, leads: 0, costPerLead: 0, frequency: 0, linkClicks: 0, landingPageViews: 0 },
            trends: [],
            waste: { amount: 0, count: 0, percentage: 0, entity: 'entities' },
            score: { 
                value: 0, 
                rating: 'Critical', 
                drivers: [], 
                version: SCORING_MODEL_V2.version, 
                explanation: emptyExplanation, 
                confidence: 'Low', 
                logic_description: "No data available for score calculation.",
                breakdown: { performance: 0, delivery: 0, creative: 0, structure: 0 } 
            },
            deterministicHeadline: "NO DATA",
            insights: []
        };
    }

    const columns = Object.keys(data[0]);
    
    // Core Metrics
    const spendKey = findKey(columns, [/^amount spent/i, /^spend$/i, /^cost$/i, /^iztērētā summa$/i, /^summa$/i]);
    const impKey = findKey(columns, [/^impressions$/i, /^imps$/i, /^rādījumi$/i]);
    const clicksKey = findKey(columns, [/^clicks \(all\)$/i, /^clicks$/i, /^link clicks$/i, /^klikšķi$/i, /^klikšķi \(visi\)$/i]);
    const linkClicksKey = findKey(columns, [/^link clicks$/i, /^klikšķi uz saites$/i]);
    const freqKey = findKey(columns, [/^frequency$/i, /^biežums$/i]);
    const revKey = findKey(columns, [/purchase.*value/i, /conversion.*value/i, /^revenue$/i, /^total value$/i, /reklāmguvumu vērtība/i]);

    // Granular Conversion Keys
    const purchaseKey = findKey(columns, [/^purchases$/i, /^pirkumi$/i, /^website purchases$/i]);
    const leadsKey = findKey(columns, [/^leads$/i, /^potenciālie pirkumi$/i, /^website leads$/i, /^on-facebook leads$/i]);
    // Fallback general result
    const convKey = findKey(columns, [/^results$/i, /^conversions?$/i, /^total conversions$/i, /^rezultāti$/i]);

    let totalSpend = 0, totalImpressions = 0, totalClicks = 0, totalLinkClicks = 0;
    let totalPurchases = 0, totalLeads = 0, totalConversions = 0, totalRevenue = 0;
    let avgFreq = 0, rowCount = 0;

    const dailyData: Record<string, any> = {};

    data.forEach(row => {
      const spend = spendKey ? parseNumber(row[spendKey]) : 0;
      const impressions = impKey ? parseNumber(row[impKey]) : 0;
      const clicks = clicksKey ? parseNumber(row[clicksKey]) : 0;
      const linkClicks = linkClicksKey ? parseNumber(row[linkClicksKey]) : 0;
      const freq = freqKey ? parseNumber(row[freqKey]) : 1;
      const revenue = revKey ? parseNumber(row[revKey]) : 0;
      
      const purchases = purchaseKey ? parseNumber(row[purchaseKey]) : 0;
      const leads = leadsKey ? parseNumber(row[leadsKey]) : 0;
      
      // If distinct keys exist, sum them. If only generic 'Results' exist, use that.
      // We want to avoid double counting if "Results" includes Purchases.
      let genericConv = convKey ? parseNumber(row[convKey]) : 0;
      
      // Intelligence: If genericConv is used but specific keys exist, prioritise specific keys for totals
      // but keep generic as fallback for "Total Conversions"
      
      totalSpend += spend;
      totalImpressions += impressions;
      totalClicks += clicks;
      totalLinkClicks += linkClicks;
      totalRevenue += revenue;
      totalPurchases += purchases;
      totalLeads += leads;
      
      // Blended conversion count (prioritize specific signals if available)
      if (purchases > 0 || leads > 0) {
          totalConversions += (purchases + leads);
      } else {
          totalConversions += genericConv;
      }

      avgFreq += freq;
      rowCount++;

      const dateKey = columns.find(k => k.toLowerCase().includes('date') || k.toLowerCase().includes('day') || k.toLowerCase().includes('starts') || k.toLowerCase().includes('datums'));
      let dStr = 'Unknown';
      if (dateKey && row[dateKey]) {
        const d = new Date(String(row[dateKey]));
        if (!isNaN(d.getTime())) dStr = d.toISOString().split('T')[0];
      }

      if (dStr !== 'Unknown') {
          if (!dailyData[dStr]) dailyData[dStr] = { date: dStr, spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 };
          dailyData[dStr].spend += spend;
          dailyData[dStr].conversions += (purchases + leads > 0 ? purchases + leads : genericConv);
          dailyData[dStr].clicks += clicks;
          dailyData[dStr].impressions += impressions;
          dailyData[dStr].revenue += revenue;
      }
    });

    // Derived Metrics
    const finalAvgFreq = rowCount > 0 ? avgFreq / rowCount : 1;
    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const cpa = totalConversions > 0 ? totalSpend / totalConversions : 0;
    const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
    const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
    const cpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;
    
    const costPerPurchase = totalPurchases > 0 ? totalSpend / totalPurchases : 0;
    const costPerLead = totalLeads > 0 ? totalSpend / totalLeads : 0;

    // --- SCORING LOGIC ---
    // 1. Performance Effectiveness (40%)
    let perfScore = totalConversions > 0 
        ? Math.min(100, Math.max(10, (SCORING_MODEL_V2.benchmarks.CPA / cpa) * 90))
        : 20;
    if (roas > 0) perfScore = (perfScore + Math.min(100, (roas / SCORING_MODEL_V2.benchmarks.ROAS) * 100)) / 2;
    // Volume penalty for performance
    if (totalConversions < 5) perfScore *= 0.6;

    // 2. Delivery & Auction Health (25%)
    let deliveryScore = Math.min(100, Math.max(10, (SCORING_MODEL_V2.benchmarks.CPM / cpm) * 50 + (ctr / SCORING_MODEL_V2.benchmarks.CTR) * 50));
    if (finalAvgFreq > SCORING_MODEL_V2.benchmarks.FREQ_MAX) deliveryScore *= 0.8; // Fatigue penalty

    // 3. Creative & Message Quality (20%)
    const creativeScore = Math.min(100, Math.max(10, (ctr / SCORING_MODEL_V2.benchmarks.CTR) * 100));

    // 4. Data & Structure Quality (15%)
    let structureScore = totalConversions > 20 ? 95 : totalConversions > 5 ? 70 : 40;
    if (totalSpend > 2000 && totalConversions < 2) structureScore -= 40; // High spend but no tracking signal penalty

    // Final Weighted Integrated Score
    let finalBaseScore = Math.round(
        (perfScore * SCORING_MODEL_V2.weights.performance) +
        (deliveryScore * SCORING_MODEL_V2.weights.delivery) +
        (creativeScore * SCORING_MODEL_V2.weights.creative) +
        (structureScore * SCORING_MODEL_V2.weights.structure)
    );

    if (totalConversions < 10) finalBaseScore = Math.max(0, finalBaseScore - 15);

    const confidence = totalConversions > 15 ? 'High' : totalConversions > 5 ? 'Medium' : 'Low';
    const trendArray = Object.values(dailyData).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return {
      totals: { 
          spend: totalSpend, impressions: totalImpressions, clicks: totalClicks, conversions: totalConversions, revenue: totalRevenue, 
          ctr, cpc, cpa, roas, cpm,
          purchases: totalPurchases, costPerPurchase, leads: totalLeads, costPerLead, frequency: finalAvgFreq, linkClicks: totalLinkClicks, landingPageViews: 0
      },
      trends: trendArray,
      waste: { amount: 0, count: 0, percentage: 0, entity: 'ads' },
      score: { 
        value: finalBaseScore, 
        rating: finalBaseScore > 85 ? 'Excellent' : finalBaseScore > 70 ? 'Good' : finalBaseScore > 40 ? 'Average' : 'Critical', 
        drivers: [], 
        version: SCORING_MODEL_V2.version, 
        explanation: emptyExplanation, 
        confidence,
        logic_description: "Score calculated deterministically based on account averages and 4-pillar weighting model.",
        breakdown: { 
            performance: perfScore, 
            delivery: deliveryScore, 
            creative: creativeScore, 
            structure: structureScore 
        } 
      },
      deterministicHeadline: "INTEGRATED AUDIT COMPLETE",
      insights: []
    };
};
