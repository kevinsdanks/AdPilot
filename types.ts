
export type DataRow = Record<string, string | number | boolean | null>;

export enum AppMode {
  LANDING = 'LANDING',
  UPLOAD = 'UPLOAD',
  GENERATE = 'GENERATE',
  SIMULATION_RESULT = 'SIMULATION_RESULT',
  DASHBOARD = 'DASHBOARD',
  META_SELECT = 'META_SELECT',
  CREATIVE_STUDIO = 'CREATIVE_STUDIO'
}

export type AnalysisLanguage = 'ENG' | 'LV';

export interface DateRange {
  label: string;
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface MetaAdAccount {
  id: string;
  name: string;
  currency: string;
  account_id: string;
}

export interface KeyMetrics {
  spend: number;
  revenue: number;
  impressions: number;
  clicks: number;
  conversions: number; // Blended total
  ctr: number;
  cpc: number;
  cpa: number; // Blended CPA
  roas: number;
  cpm: number;
  // Granular Metrics
  purchases: number;
  costPerPurchase: number;
  leads: number;
  costPerLead: number;
  frequency: number;
  linkClicks: number;
  landingPageViews: number;
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
    confidence: 'High' | 'Medium' | 'Low';
    logic_description?: string;
    breakdown: {
        performance: number;
        delivery: number;
        creative: number;
        structure: number;
    };
}

export interface CreativeAuditResult {
  score: number;
  pillars: {
    stopping_power: { score: number; feedback: string };
    messaging_clarity: { score: number; feedback: string };
    brand_recall: { score: number; feedback: string };
    visual_hierarchy: { score: number; feedback: string };
  };
  key_observations: string[];
  suggested_edits: string[];
  accessibility_note: string;
}

export interface FocusGroupPersona {
  name: string;
  archetype: string;
  reaction: string;
  purchase_intent: number; // 1-10
  critical_concern: string;
  positive_trigger: string;
}

export interface FocusGroupResult {
  personas: FocusGroupPersona[];
  aggregate_sentiment: string;
  recommended_pivot?: string;
}

export interface ExpertAnalysisPillars {
  observation: string;
  conclusion: string;
  justification: string;
  recommendation: string;
}

export interface DeepDiveDetail {
  chart_config: {
    type: 'bar_chart' | 'line_chart' | 'pie_chart' | 'area_chart' | 'funnel_chart' | 'stacked_bar';
    title: string;
    y_axis_label: string;
    x_axis_label?: string;
    value_format: 'currency' | 'percent' | 'number' | 'float';
    unit_symbol: string;
    data: { label: string; value: number; color?: string; is_benchmark?: boolean }[];
  };
  analysis_text: string;
  expert_pillars: ExpertAnalysisPillars;
  analysis_logic: {
    headline: string;
    formula: string;
    logic: string;
  };
}

export interface AuditPoint {
  title: string;
  text: string;
  impact?: string;
  confidence: 'High' | 'Medium' | 'Low';
  expert_pillars: ExpertAnalysisPillars;
  deep_dive: DeepDiveDetail;
}

export interface DeepDiveGrid {
  performance_drivers: AuditPoint[];
  watch_outs_risks: AuditPoint[];
  strategic_actions: AuditPoint[];
}

export interface ExpertVerdict {
  headline: string;
  description: string;
}

export interface AdPilotJson {
  primary_kpi: string;
  key_metrics: KeyMetrics;
  score: ScoreResult;
  suggested_questions: string[];
  detailed_verdict: {
    verdict: ExpertVerdict;
    grid: DeepDiveGrid;
    confidence: 'High' | 'Medium' | 'Low';
  };
  sources?: GroundingSource[];
}

export interface AnalysisResult {
  markdownReport: string;
  structuredData: AdPilotJson | null;
}

export interface DimensionFile {
  id: string;
  name: string;
  data: DataRow[];
  type: 'DAILY' | 'DEMOGRAPHIC' | 'PLACEMENT' | 'CREATIVE' | 'PLATFORM' | 'UNKNOWN';
}

export interface Dataset {
  name: string;
  files: DimensionFile[];
  source: 'CSV' | 'META' | 'GEN';
  currency?: string; // Explicit currency code (e.g., 'EUR')
  comparison?: {
      label: string;
      data: DataRow[];
  };
}

export interface SimulationInputs {
  product: string;
  location: string;
  businessType: string;
  goal: string;
  urgency: string;
  customerProfile: string;
  offer: string;
  avgPrice: string;
  budget: number;
  expectedResults: string;
  experience: string;
}

export interface SimulationResult {
  executive_summary: {
    headline: string;
    summary: string;
    strategic_verdict: string;
    expected_outcome_summary: string;
    recommended_mix: { channel: string; priority: number; role: string }[];
  };
  market_intelligence: {
    search_demand: string;
    search_demand_rating: 'Low' | 'Medium' | 'High';
    search_intent_split: { high: number; mid: number; info: number };
    seasonality: string;
    competition_level: string;
    interpretation: string;
    implication: string;
    benchmarks: { name: string; value: string; context: string }[];
    confidence_indicator: string;
  };
  strategic_approach: {
    logic: string;
    funnel_split_justification: string;
    dynamic_adjustment_scenario: string;
    risk_mitigation: string;
    funnel_balance: string;
    confidence_score: string;
  };
  channel_breakdown: {
    channel_name: string;
    budget_share: string;
    role_in_funnel: string;
    strategy: string;
    primary_kpi: string;
    key_risk: string;
    success_30d: string;
  }[];
  forecast: {
    conservative: { conversions: string; cpa: string; roas: string; logic: string; driver: string };
    expected: { conversions: string; cpa: string; roas: string; logic: string; driver: string };
    optimistic: { conversions: string; cpa: string; roas: string; logic: string; driver: string };
  };
  creative_strategy: {
    value_props: string[];
    messaging_by_funnel: { stage: string; angle: string; platform_context: string }[];
    anti_messaging: string[];
    visual_direction: string;
  };
  roadmap: { week: number; title: string; tasks: string[]; success_criteria: string; decision_gate?: string }[];
  syntheticData: DataRow[];
  sources?: GroundingSource[];
}

export interface InsightObject {
  type: 'info' | 'success' | 'warning' | 'error' | string;
  title: string;
  text: string;
}
