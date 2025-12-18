
export type DataRow = Record<string, string | number | boolean | null>;

export enum AppMode {
  LANDING = 'LANDING',
  UPLOAD = 'UPLOAD',
  GENERATE = 'GENERATE',
  DASHBOARD = 'DASHBOARD'
}

export interface InsightItem {
  title: string;
  description: string;
  metric: string;
}

export interface ScalingPlan {
  suggested_increase: string;
  watch_metrics: string[];
  stop_condition: string;
}

export interface RecommendationItem {
  title: string;
  description: string;
  type: 'quick_win' | 'strategic';
  impact?: 'High' | 'Medium' | 'Low';
  scaling_plan?: ScalingPlan;
}

export interface BreakdownInsight {
  dimension: string; 
  insight: string;   
  segment_data: string; 
  action: string;    
}

export interface KeyMetrics {
  spend: number;
  revenue: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cpa: number;
  roas: number;
  cpm: number;
}

export interface ScoreExplanation {
    version: string;
    steps: string[];
    inputs: string[];
    weights: Record<string, string>;
    normalization: string;
    data_rules: string[];
    confidence_rule: string;
}

export interface ScoreResult {
    value: number;
    rating: 'Excellent' | 'Good' | 'Average' | 'Critical';
    drivers: string[];
    version: string;
    explanation: ScoreExplanation;
    breakdown: {
        efficiency: number;
        consistency: number;
        waste: number;
        engagement: number;
    };
}

export interface StrategicAction {
  step: string;
  expected_impact: string;
}

export interface DetailedVerdict {
  headline: string;
  summary: string;
  drivers: string[]; 
  risks: string[];   
  actions: StrategicAction[]; 
  confidence: 'High' | 'Medium' | 'Low';
}

export interface AdPilotJson {
  primary_kpi: string;
  key_metrics: KeyMetrics;
  score: ScoreResult;
  detailed_verdict: DetailedVerdict;
  next_best_action: {
    action: string;
    expected_impact: string;
  };
  summary: string;
  whats_working: InsightItem[];
  whats_not_working: InsightItem[];
  breakdown_insights: BreakdownInsight[];
  recommendations: RecommendationItem[];
}

export interface AnalysisResult {
  markdownReport: string;
  structuredData: AdPilotJson | null;
}

export interface Dataset {
  name: string;
  data: DataRow[];
  columns: string[];
  summaryRowsExcluded?: number;
}
