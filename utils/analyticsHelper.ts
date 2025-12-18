
import { DataRow, KeyMetrics, ScoreResult, ScoreExplanation } from '../types';

const SCORING_MODEL_V1 = {
    version: "score_model_v1",
    benchmarks: {
        CTR: 1.2, 
        CPA: 40,  
        ROAS: 2.5, 
        CPC: 1.5  
    },
    weights: {
        efficiency: 0.40,
        consistency: 0.25,
        waste: 0.20,
        engagement: 0.15
    },
    explanation: {
        steps: [
            "Normalize raw metrics against benchmarks",
            "Apply weighted sum (Efficiency 40%, Consistency 25%, Waste 20%, Engagement 15%)",
            "Clamp final result between 0-100"
        ],
        data_rules: [
            "Row-level data only",
            "Respects active date filters",
            "Excludes summary/total rows"
        ],
        normalization: "Linear ratio of actual vs benchmark, capped at 1.0 (clamped 0-100 for score)",
        confidence_rule: "High confidence requires >3 conversion days or >10 total conversions."
    }
};

export const calculateAggregatedMetrics = (data: DataRow[]): { totals: KeyMetrics, trends: any[], waste: any, score: ScoreResult } => {
    const emptyExplanation: ScoreExplanation = {
        version: SCORING_MODEL_V1.version,
        steps: SCORING_MODEL_V1.explanation.steps,
        inputs: [],
        weights: {
            "Efficiency": "40%",
            "Consistency": "25%",
            "Waste": "20%",
            "Engagement": "15%"
        },
        normalization: SCORING_MODEL_V1.explanation.normalization,
        data_rules: SCORING_MODEL_V1.explanation.data_rules,
        confidence_rule: SCORING_MODEL_V1.explanation.confidence_rule
    };

    if (!data || data.length === 0) {
        return {
            totals: { spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0, ctr: 0, cpc: 0, cpa: 0, roas: 0, cpm: 0 },
            trends: [],
            waste: { amount: 0, count: 0, percentage: 0, entity: 'entities' },
            score: { 
                value: 0, 
                rating: 'Critical', 
                drivers: ['No data available'], 
                version: SCORING_MODEL_V1.version,
                explanation: emptyExplanation,
                breakdown: { efficiency: 0, consistency: 0, waste: 0, engagement: 0 } 
            }
        };
    }

    const columns = Object.keys(data[0]);

    const findKey = (patterns: RegExp[]) => {
      for (const pattern of patterns) {
        const found = columns.find(col => pattern.test(col));
        if (found) return found;
      }
      return null;
    };

    // Specific mapping for "Amount spent (EUR)" and "Leads" as per requirements
    const spendKey = findKey([/^amount spent/i, /^spend$/i, /^cost$/i]);
    const impKey = findKey([/^impressions$/i, /^imps$/i]);
    const clicksKey = findKey([/^clicks \(all\)$/i, /^clicks$/i, /^link clicks$/i]);
    const convKey = findKey([/^results$/i, /^leads?$/i, /^website leads?$/i, /^purchases?$/i, /^conversions?$/i, /^total conversions$/i]);
    const revKey = findKey([/purchase.*value/i, /conversion.*value/i, /^revenue$/i, /^total value$/i]);

    let totalSpend = 0, totalImpressions = 0, totalClicks = 0, totalConversions = 0, totalRevenue = 0;
    const dailyData: Record<string, any> = {};
    const entityAggregation: Record<string, { spend: number, conversions: number }> = {};

    const adIdKey = findKey([/ad ?id/i, /creative ?id/i]);
    const adNameKey = findKey([/ad ?name/i, /creative ?name/i]);
    const adSetIdKey = findKey([/ad ?set ?id/i]);
    const adSetNameKey = findKey([/ad ?set ?name/i]);
    const campIdKey = findKey([/campaign ?id/i]);
    const campNameKey = findKey([/campaign ?name/i]);

    let entityKey = adIdKey || adNameKey || adSetIdKey || adSetNameKey || campIdKey || campNameKey;
    let entityLabel = adIdKey || adNameKey ? 'ads' : (adSetIdKey || adSetNameKey ? 'ad sets' : 'campaigns');

    const parseNumber = (val: any): number => {
       if (typeof val === 'number') return val;
       if (typeof val === 'string') {
           const clean = val.replace(/[^0-9.-]/g, ''); 
           const num = parseFloat(clean);
           return isNaN(num) ? 0 : num;
       }
       return 0;
    };

    data.forEach(row => {
      const spend = spendKey ? parseNumber(row[spendKey]) : 0;
      const impressions = impKey ? parseNumber(row[impKey]) : 0;
      const clicks = clicksKey ? parseNumber(row[clicksKey]) : 0;
      const conversions = convKey ? parseNumber(row[convKey]) : 0;
      const revenue = revKey ? parseNumber(row[revKey]) : 0;

      totalSpend += spend;
      totalImpressions += impressions;
      totalClicks += clicks;
      totalConversions += conversions;
      totalRevenue += revenue;

      if (entityKey) {
          const id = String(row[entityKey]);
          if (!entityAggregation[id]) entityAggregation[id] = { spend: 0, conversions: 0 };
          entityAggregation[id].spend += spend;
          entityAggregation[id].conversions += conversions;
      }

      // Robust date detection including "Reporting starts"
      const dateKey = Object.keys(row).find(k => {
          const l = k.toLowerCase();
          return l.includes('date') || l.includes('day') || l.includes('reporting starts') || l.includes('reporting ends');
      });
      
      const dateRawVal = dateKey ? row[dateKey] : null;
      let dateKeyStr = 'Unknown';
      
      if (dateRawVal) {
          const d = new Date(String(dateRawVal));
          if (!isNaN(d.getTime())) {
              // Normalize to YYYY-MM-DD for aggregation (no string comparison of raw data)
              dateKeyStr = d.toISOString().split('T')[0];
          }
      }

      if (dateKeyStr !== 'Unknown') {
          if (!dailyData[dateKeyStr]) {
              dailyData[dateKeyStr] = { date: dateKeyStr, spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 };
          }
          dailyData[dateKeyStr].spend += spend;
          dailyData[dateKeyStr].impressions += impressions;
          dailyData[dateKeyStr].clicks += clicks;
          dailyData[dateKeyStr].conversions += conversions;
          dailyData[dateKeyStr].revenue += revenue;
      }
    });

    let wastedSpend = 0;
    let wastedCount = 0;
    if (convKey && Object.keys(entityAggregation).length > 0) {
        Object.values(entityAggregation).forEach(e => {
            if (e.spend > 0 && e.conversions === 0) {
                wastedSpend += e.spend;
                wastedCount++;
            }
        });
    }

    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
    const cpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;
    const cpa = totalConversions > 0 ? totalSpend / totalConversions : 0;
    const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

    const trendArray = Object.values(dailyData).map((d: any) => ({
        ...d,
        roas: d.spend > 0 ? d.revenue / d.spend : 0,
        cpa: d.conversions > 0 ? d.spend / d.conversions : 0,
        ctr: d.impressions > 0 ? (d.clicks / d.impressions) * 100 : 0,
        cpc: d.clicks > 0 ? d.spend / d.clicks : 0,
        cpm: d.impressions > 0 ? (d.spend / d.impressions) * 1000 : 0
    })).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const drivers: string[] = [];
    const inputsUsed: string[] = [];
    
    // 1. Efficiency (40%)
    let efficiencyRaw = 0;
    if (totalRevenue > 0) {
        efficiencyRaw = Math.min((roas / SCORING_MODEL_V1.benchmarks.ROAS) * 100, 100);
        inputsUsed.push("ROAS");
        if (efficiencyRaw >= 80) drivers.push(`Strong ROAS efficiency (${roas.toFixed(2)}x)`);
    } else if (totalConversions > 0) {
        efficiencyRaw = cpa === 0 ? 100 : Math.min((SCORING_MODEL_V1.benchmarks.CPA / cpa) * 85, 100);
        inputsUsed.push("CPA");
        if (efficiencyRaw >= 80) drivers.push(`Efficient CPA (${cpa.toFixed(2)})`);
    } else {
        efficiencyRaw = cpc === 0 ? 50 : Math.min((SCORING_MODEL_V1.benchmarks.CPC / cpc) * 80, 100);
        inputsUsed.push("CPC");
    }

    // 2. Consistency (25%)
    let activeDays = 0, conversionDays = 0;
    trendArray.forEach(d => { if (d.spend > 0) activeDays++; if (d.conversions > 0) conversionDays++; });
    let consistencyRaw = activeDays > 0 ? (conversionDays / activeDays) * 100 : 0;
    inputsUsed.push("Daily Conversions");
    if (consistencyRaw > 80) drivers.push("Consistent daily volume");

    // 3. Waste (20%)
    const wastePercent = totalSpend > 0 ? (wastedSpend / totalSpend) * 100 : 0;
    const wasteRaw = Math.max(0, 100 - (wastePercent * 1.5));
    inputsUsed.push("Wasted Spend %");
    if (wastePercent < 5) drivers.push("Minimal budget waste");

    // 4. Engagement (15%)
    const engagementRaw = Math.min((ctr / SCORING_MODEL_V1.benchmarks.CTR) * 100, 100);
    inputsUsed.push("CTR");
    if (engagementRaw >= 80) drivers.push("High ad engagement");

    const finalScore = (efficiencyRaw * SCORING_MODEL_V1.weights.efficiency) + 
                       (consistencyRaw * SCORING_MODEL_V1.weights.consistency) + 
                       (wasteRaw * SCORING_MODEL_V1.weights.waste) + 
                       (engagementRaw * SCORING_MODEL_V1.weights.engagement);

    const roundedScore = Math.round(finalScore);
    const rating = roundedScore >= 80 ? 'Excellent' : (roundedScore >= 60 ? 'Good' : (roundedScore >= 40 ? 'Average' : 'Critical'));

    return {
      totals: { spend: totalSpend, impressions: totalImpressions, clicks: totalClicks, conversions: totalConversions, revenue: totalRevenue, ctr, cpc, cpa, roas, cpm },
      trends: trendArray,
      waste: { amount: wastedSpend, count: wastedCount, percentage: wastePercent, entity: entityLabel },
      score: {
          value: roundedScore,
          rating,
          drivers: drivers.slice(0, 4),
          version: SCORING_MODEL_V1.version,
          explanation: { ...emptyExplanation, inputs: inputsUsed },
          breakdown: { efficiency: efficiencyRaw, consistency: consistencyRaw, waste: wasteRaw, engagement: engagementRaw }
      }
    };
};
