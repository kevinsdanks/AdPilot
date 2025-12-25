
import React, { useState, useRef, useEffect } from 'react';
import { SimulationInputs, AnalysisLanguage } from '../types';
import { 
  ArrowLeft, ArrowRight, Sparkles, Building2, ShoppingCart, Users, MapPin, 
  Target, Zap, Scale, Clock, DollarSign, BarChart3, Rocket, Check, HelpCircle, Search, ChevronDown, Info, Lightbulb, TrendingUp, ShieldCheck, Wallet, PieChart, AlertCircle, BarChart, Compass
} from 'lucide-react';

interface SimulationWizardProps {
  onGenerate: (inputs: SimulationInputs) => void;
  onCancel: () => void;
  language: AnalysisLanguage;
}

const steps = [
  { id: 1, label: 'Step 1', title: "Business Context" },
  { id: 2, label: 'Step 2', title: "Strategic Objectives" },
  { id: 3, label: 'Step 3', title: 'Audience & Economics' },
  { id: 4, label: 'Step 4', title: 'Budget & Expectations' },
];

const SUGGESTIONS = {
  product: ["Organic Skincare", "Yoga Classes", "SaaS Software", "E-commerce Clothing", "Real Estate Services", "Digital Marketing", "Handmade Jewelry", "Online Courses", "Not sure - General E-commerce"],
  location: ["Latvia", "United Kingdom", "United States", "Germany", "Norway", "European Union", "Global / All Countries", "Estonia", "Lithuania", "Poland", "Nordics"],
  customerProfile: ["Women 25-45 interested in health", "Business Owners searching for efficiency", "Young Professionals in tech", "Parents looking for sustainable toys", "Pet owners who travel often", "Not sure - Broad interest"],
  offer: ["Free Consultation", "20% Discount on First Purchase", "Free Shipping", "Buy 1 Get 1 Free", "7-Day Free Trial", "Exclusive Webinar Access", "Not sure - Competitive offer"]
};

const BUSINESS_TYPE_HINTS: Record<string, string> = {
  'E-commerce': 'Typical e-commerce brands scale fastest using Meta Advantage+ and Google Performance Max for direct attribution.',
  'Lead Generation': 'Successful lead gen strategies prioritize high-intent Meta Forms and LinkedIn for professional services.',
  'Local Business': 'Local heroes dominate through localized Google Search and high-frequency Meta Reach campaigns within a 5-10km radius.',
  'App': 'Mobile-first growth relies on App Install campaigns with deep-link events for trial activations.',
  'Other': 'Custom models will be built based on your specific industry benchmarks and niche market behavior.'
};

const GOAL_HINTS: Record<string, string> = {
  'Sales': 'Prioritizes Google Shopping and Meta Retargeting. Focuses on ROAS and immediate checkout events.',
  'Leads': 'Favors high-intent Search keywords and native lead forms. Focuses on CPL and lead quality scoring.',
  'Bookings': 'Optimizes for calendar events and direct interactions. Ideal for service-based businesses.',
  'App Installs': 'Maximum focus on CPI and trial activations through mobile-optimized video creative.',
  'Brand Awareness': 'Broad reach, low CPM, and high frequency. Focuses on estimated ad recall lift.',
  'Not sure': 'We will simulate a balanced multi-objective campaign based on your business type.'
};

const getEconomicHint = (priceStr: string, businessType: string) => {
  if (!priceStr || priceStr === 'Not sure') return `Using market average prices for ${businessType} to estimate CPA benchmarks.`;
  const price = parseFloat(priceStr.replace(/[^0-9.-]/g, ''));
  if (isNaN(price) || price <= 0) return null;

  if (businessType === 'E-commerce') {
    const low = (price * 0.15).toFixed(2);
    const high = (price * 0.35).toFixed(2);
    return `For a €${price} product, a healthy CPA range is typically €${low} – €${high} (15-35% of revenue).`;
  }
  if (businessType === 'Lead Generation') {
    const low = (price * 0.05).toFixed(2);
    const high = (price * 0.12).toFixed(2);
    return `Based on a €${price} service value, target a CPL between €${low} – €${high} for sustainable growth.`;
  }
  return `Based on a €${price} unit value, AI will architect a plan targeting a 3.0x - 5.5x ROAS baseline.`;
};

const getBudgetFeasibility = (inputs: SimulationInputs) => {
  const notSureCount = Object.values(inputs).filter(v => v === 'Not sure' || v === '').length;
  let text = "";
  
  // Pivot to Discovery Mode if too many "Not sure"
  if (notSureCount >= 3) {
    return {
      text: "Universal Discovery Plan: Since several inputs are generic, we will architect a high-level strategy designed to discover your best customers through wide-funnel testing and audience validation.",
      isDiscovery: true
    };
  }

  if (inputs.budget < 500) {
    text = "Limited budget detected. The plan will strictly prioritize 1 core high-intent channel to reach statistical significance faster.";
  } else if (inputs.budget < 2000) {
    text = "Moderate budget. Strategy will focus on 1-2 primary channels with a lean testing phase to minimize early-stage waste.";
  } else {
    text = "Scaling budget. The architecture will include multi-channel diversification (e.g., Meta + Google) and more aggressive A/B testing cycles.";
  }

  if (inputs.experience === 'No') {
    text += " As a newcomer, we'll recommend a safer, 'learning-first' allocation to validate your offer before heavy scaling.";
  }

  return { text, isDiscovery: false };
};

const SearchableInput: React.FC<{
  label: string;
  subLabel: string;
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  suggestions: string[];
  isTextArea?: boolean;
}> = ({ label, subLabel, value, onChange, placeholder, suggestions, isTextArea }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = suggestions.filter(s => s.toLowerCase().includes(value.toLowerCase()));
  const isNotSure = value === 'Not sure';

  return (
    <div className="space-y-4 relative" ref={containerRef}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <label className="text-sm font-black text-slate-900 uppercase tracking-wider">{label}</label>
          <p className="text-[11px] text-slate-400 font-medium leading-relaxed max-w-sm">{subLabel}</p>
        </div>
        <button 
          onClick={() => onChange("Not sure")}
          className={`text-[10px] font-black uppercase tracking-widest transition-colors ${isNotSure ? 'text-emerald-500' : 'text-indigo-500 hover:text-indigo-700'}`}
        >
          {isNotSure ? 'Using Global Avg' : 'Not Sure'}
        </button>
      </div>
      
      <div className="relative group">
        {isTextArea ? (
          <textarea
            value={value}
            onFocus={() => setIsOpen(true)}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className={`w-full border p-5 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium min-h-[100px] text-lg ${isNotSure ? 'bg-emerald-50/50 border-emerald-100 italic text-emerald-700' : 'bg-slate-50 border-slate-200'}`}
          />
        ) : (
          <div className="relative">
            <input 
              type="text" 
              value={value} 
              onFocus={() => setIsOpen(true)}
              onChange={e => onChange(e.target.value)} 
              placeholder={placeholder}
              className={`w-full border p-6 pr-12 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-lg ${isNotSure ? 'bg-emerald-50/50 border-emerald-100 italic text-emerald-700' : 'bg-slate-50 border-slate-200'}`}
            />
            <ChevronDown className={`absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        )}
      </div>

      {isOpen && filtered.length > 0 && (
        <div className="absolute z-[100] w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-[220px] overflow-y-auto animate-in fade-in zoom-in-95 duration-200 overflow-x-hidden text-left">
          <div className="p-2 border-b border-slate-50 bg-slate-50/50">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3">Quick Select</span>
          </div>
          {filtered.map((item, i) => (
            <button
              key={i}
              onClick={() => { onChange(item); setIsOpen(false); }}
              className="w-full text-left px-5 py-4 text-sm font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors border-b border-slate-50 last:border-0"
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const SimulationWizard: React.FC<SimulationWizardProps> = ({ onGenerate, onCancel, language }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [inputs, setInputs] = useState<SimulationInputs>({
    product: '',
    location: '',
    businessType: 'Lead Generation',
    goal: 'Leads',
    urgency: 'Balanced',
    customerProfile: '',
    offer: '',
    avgPrice: '',
    budget: 2500,
    expectedResults: '',
    experience: 'No'
  });

  const update = (key: keyof SimulationInputs, val: any) => setInputs(prev => ({ ...prev, [key]: val }));

  const next = () => setCurrentStep(prev => Math.min(prev + 1, 4));
  const back = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const economicHint = getEconomicHint(inputs.avgPrice, inputs.businessType);
  const feasibility = getBudgetFeasibility(inputs);

  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-12 mb-16 relative max-w-4xl mx-auto">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md h-0.5 bg-slate-200 -z-10"></div>
      {steps.map((step) => (
        <div key={step.id} className="flex flex-col items-center gap-3 bg-slate-50 px-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-black transition-all duration-300 shadow-sm ${
            currentStep === step.id ? 'bg-indigo-600 text-white scale-110 shadow-indigo-200' : 
            currentStep > step.id ? 'bg-emerald-500 text-white' : 'bg-white text-slate-400 border border-slate-200'
          }`}>
            {currentStep > step.id ? <Check className="w-6 h-6" /> : step.id}
          </div>
          <span className={`text-[11px] font-black uppercase tracking-widest ${currentStep === step.id ? 'text-slate-900' : 'text-slate-400'}`}>{step.label}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="max-w-[1200px] mx-auto w-full animate-in fade-in duration-700 py-12 px-4">
      <StepIndicator />

      <div className="text-center mb-12 text-left">
        <h2 className="text-5xl font-black text-slate-900 mb-4 tracking-tight">{steps[currentStep - 1].title}</h2>
        <p className="text-slate-500 font-medium italic text-lg">AI will use these inputs to gather industry benchmarks and regional CPA targets.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-[4rem] p-10 md:p-20 shadow-2xl min-h-[650px] flex flex-col relative overflow-hidden">
        {/* Dynamic Light Background decoration */}
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-50/50 rounded-full blur-3xl -z-10"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-50/50 rounded-full blur-3xl -z-10"></div>

        <div className="flex-1">
          {currentStep === 1 && (
            <div className="space-y-14 text-left">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <SearchableInput 
                  label="What do you sell or offer?"
                  subLabel="Helps define industry benchmarks, typical CPA/ROAS ranges, and primary platform priorities."
                  value={inputs.product}
                  onChange={val => update('product', val)}
                  placeholder="e.g., Organic skincare products..."
                  suggestions={SUGGESTIONS.product}
                />

                <SearchableInput 
                  label="Where do you sell?"
                  subLabel="Essential for regional cost estimation (CPM/CPA) and localized platform availability."
                  value={inputs.location}
                  onChange={val => update('location', val)}
                  placeholder="Type to search countries or regions..."
                  suggestions={SUGGESTIONS.location}
                />
              </div>

              <div className="space-y-6">
                <div className="space-y-1">
                  <label className="text-sm font-black text-slate-900 uppercase tracking-wider">Business Model Configuration</label>
                  <p className="text-[11px] text-slate-400 font-medium leading-relaxed">Determines the optimal funnel structure and primary KPI weighting for the media plan.</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-5">
                  {[
                    { id: 'E-commerce', label: 'E-commerce', sub: 'Sales focused', icon: ShoppingCart },
                    { id: 'Lead Generation', label: 'Lead Gen', sub: 'B2B/Inquiries', icon: Users },
                    { id: 'Local Business', label: 'Local', sub: 'Store visits', icon: MapPin },
                    { id: 'App', label: 'App Growth', sub: 'Installs', icon: Rocket },
                    { id: 'Other', label: 'Other', sub: 'Niche focus', icon: HelpCircle }
                  ].map(type => (
                    <button 
                      key={type.id}
                      onClick={() => update('businessType', type.id)}
                      className={`p-6 rounded-[2rem] border text-left transition-all group relative overflow-hidden ${
                        inputs.businessType === type.id ? 'bg-indigo-600 border-indigo-600 shadow-xl shadow-indigo-100 text-white' : 'bg-white border-slate-100 hover:border-indigo-100 text-slate-900'
                      }`}
                    >
                      <type.icon className={`w-10 h-10 mb-5 ${inputs.businessType === type.id ? 'text-white' : 'text-indigo-500'}`} />
                      <div className="font-black text-sm mb-1">{type.label}</div>
                      <div className={`text-[10px] font-bold uppercase tracking-tighter opacity-70 ${inputs.businessType === type.id ? 'text-indigo-100' : 'text-slate-400'}`}>{type.sub}</div>
                    </button>
                  ))}
                </div>

                {/* Strategy Preview Hint */}
                {inputs.businessType && (
                  <div className="mt-8 animate-in slide-in-from-bottom-4 duration-500 bg-slate-50 border border-slate-100 p-8 rounded-[2.5rem] flex gap-5 items-center">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm shrink-0">
                      <Lightbulb className="w-6 h-6 text-indigo-500" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest block mb-1 text-left">Strategic Hint</span>
                      <p className="text-slate-600 font-bold text-base leading-relaxed text-left">{BUSINESS_TYPE_HINTS[inputs.businessType]}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-14 text-left">
              <div className="space-y-8">
                <div className="space-y-1">
                  <label className="text-sm font-black text-slate-900 uppercase tracking-wider">1. Primary Business Objective</label>
                  <p className="text-[11px] text-slate-400 font-medium leading-relaxed max-w-2xl">Defines the core optimization goal. This choice determines the internal weighting of channel mix and budget allocation strategy.</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                  {[
                    { id: 'Sales', label: 'More Sales', sub: 'Direct purchases', icon: ShoppingCart },
                    { id: 'Leads', label: 'More Leads', sub: 'Contact forms, inquiries', icon: Users },
                    { id: 'Bookings', label: 'More Bookings', sub: 'Appointments, reservations', icon: Clock },
                    { id: 'App Installs', label: 'App Installs', sub: 'Mobile or web app', icon: Rocket },
                    { id: 'Brand Awareness', label: 'Brand Awareness', sub: 'Visibility & recognition', icon: Zap },
                    { id: 'Not sure', label: 'Not Sure', sub: 'General growth', icon: HelpCircle }
                  ].map(item => (
                    <button 
                      key={item.id}
                      onClick={() => update('goal', item.id)}
                      className={`p-8 rounded-[2rem] border text-left transition-all relative overflow-hidden group ${
                        inputs.goal === item.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100' : 'bg-white border-slate-100 hover:border-indigo-100 text-slate-900'
                      }`}
                    >
                      <item.icon className={`w-10 h-10 mb-6 transition-transform group-hover:scale-110 ${inputs.goal === item.id ? 'text-white' : 'text-indigo-500'}`} />
                      <div className="font-black text-xl mb-2">{item.label}</div>
                      <div className={`text-xs font-bold uppercase tracking-tight ${inputs.goal === item.id ? 'text-indigo-100' : 'text-slate-400'}`}>{item.sub}</div>
                    </button>
                  ))}
                </div>

                {inputs.goal && (
                  <div className="animate-in slide-in-from-left-4 duration-500 flex items-center gap-4 bg-indigo-50/50 p-6 rounded-[2rem] border border-indigo-100">
                    <Info className="w-5 h-5 text-indigo-500 shrink-0" />
                    <p className="text-indigo-900 text-sm font-bold">{GOAL_HINTS[inputs.goal]}</p>
                  </div>
                )}
              </div>

              <div className="space-y-8">
                <div className="space-y-1">
                  <label className="text-sm font-black text-slate-900 uppercase tracking-wider">2. Growth Horizon & Risk Profile</label>
                  <p className="text-[11px] text-slate-400 font-medium leading-relaxed max-w-2xl">Determines the balance between immediate demand capture (high risk/fast impact) and long-term brand equity (low risk/sustainable growth).</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                  {[
                    { id: 'Fast', label: 'Fast Impact', sub: 'Immediate demand capture', icon: TrendingUp },
                    { id: 'Balanced', label: 'Balanced', sub: 'Sustainable scaling', icon: Scale },
                    { id: 'Long-term', label: 'Long-term', sub: 'Building brand value', icon: Clock },
                    { id: 'Not sure', label: 'Not Sure', sub: 'Standard model', icon: HelpCircle }
                  ].map(item => (
                    <button 
                      key={item.id}
                      onClick={() => update('urgency', item.id)}
                      className={`p-7 rounded-[2rem] border text-left transition-all ${
                        inputs.urgency === item.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100' : 'bg-white border-slate-100 hover:border-indigo-100 text-slate-900'
                      }`}
                    >
                      <item.icon className={`w-8 h-8 mb-4 ${inputs.urgency === item.id ? 'text-white' : 'text-indigo-500'}`} />
                      <div className="font-black text-lg mb-1">{item.label}</div>
                      <div className={`text-[10px] font-bold uppercase tracking-tight ${inputs.urgency === item.id ? 'text-indigo-100' : 'text-slate-400'}`}>{item.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-8 bg-slate-950 rounded-[3rem] text-white flex gap-6 items-center shadow-2xl">
                 <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-8 h-8 text-indigo-400" />
                 </div>
                 <div className="text-left">
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-1">Architecture Insight</span>
                    <p className="text-slate-300 font-bold text-base leading-relaxed">Choosing <b>{inputs.goal}</b> with a <b>{inputs.urgency}</b> horizon will bias the media plan towards {inputs.urgency === 'Fast' ? 'Google Search and Meta Retargeting' : inputs.urgency === 'Long-term' ? 'Brand Awareness and Social Proof' : 'a balanced mix of Search and Broad Social Targeting'}.</p>
                 </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-12 text-left">
              <div className="grid grid-cols-1 gap-12">
                <SearchableInput 
                  label="Who is your ideal customer?"
                  subLabel="Customer demographics and psychological triggers determine messaging nuance and optimal channel selection (e.g. TikTok for GenZ vs LinkedIn for B2B)."
                  value={inputs.customerProfile}
                  onChange={val => update('customerProfile', val)}
                  placeholder="Or describe your own customer type..."
                  suggestions={SUGGESTIONS.customerProfile}
                  isTextArea
                />

                <SearchableInput 
                  label="What is your main offer?"
                  subLabel="High-value incentives significantly impact predicted conversion rates and 'Offer-to-Market' resonance scores."
                  value={inputs.offer}
                  onChange={val => update('offer', val)}
                  placeholder="Or describe your own offer..."
                  suggestions={SUGGESTIONS.offer}
                  isTextArea
                />

                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <label className="text-sm font-black text-slate-900 uppercase tracking-wider">Average Product Price (€)</label>
                      <p className="text-[11px] text-slate-400 font-medium leading-relaxed max-w-sm">Crucial for calculating potential ROAS (Return on Ad Spend) and identifying the maximum sustainable CPA ceiling.</p>
                    </div>
                  </div>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={inputs.avgPrice} 
                      onChange={e => update('avgPrice', e.target.value)} 
                      placeholder="e.g., 49.99"
                      className={`w-full border p-6 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-lg ${inputs.avgPrice === 'Not sure' ? 'bg-emerald-50/50 border-emerald-100 italic text-emerald-700' : 'bg-slate-50 border-slate-200'}`}
                    />
                    <div className="absolute right-6 top-1/2 -translate-y-1/2">
                       <Wallet className="w-6 h-6 text-slate-300" />
                    </div>
                  </div>
                  
                  {/* Dynamic Economic Feedback */}
                  {economicHint && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-500 bg-indigo-50/50 p-6 rounded-[1.5rem] border border-indigo-100 flex gap-4 items-center">
                       <PieChart className="w-5 h-5 text-indigo-600 shrink-0" />
                       <p className="text-indigo-900 text-sm font-bold leading-relaxed">{economicHint}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-8 bg-emerald-50 rounded-[2.5rem] border border-emerald-100 flex gap-6 items-center">
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm shrink-0">
                   <Sparkles className="w-8 h-8 text-emerald-600" />
                </div>
                <p className="text-base text-emerald-800 font-bold leading-relaxed"><b>Intelligence Tip:</b> The relationship between your offer and your audience's profile is the primary driver of 'Creative Resonance' in our forecasting model.</p>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-14 text-left">
              <div className="space-y-10">
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <label className="text-sm font-black text-slate-900 uppercase tracking-wider">Monthly advertising budget</label>
                    <p className="text-[11px] text-slate-400 font-medium leading-relaxed max-w-md">The total spend used to model channel distribution. Higher budgets allow for faster data significance and channel diversification.</p>
                  </div>
                  <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-4 rounded-3xl group focus-within:ring-2 focus-within:ring-indigo-500 transition-all">
                    <span className="text-3xl font-black text-indigo-600">€</span>
                    <input 
                      type="number"
                      value={inputs.budget}
                      onChange={e => update('budget', parseInt(e.target.value) || 0)}
                      className="bg-transparent border-none outline-none text-4xl font-black text-indigo-600 w-36"
                    />
                  </div>
                </div>
                <input 
                  type="range" 
                  min="100" 
                  max="10000" 
                  step="100"
                  value={inputs.budget} 
                  onChange={e => update('budget', parseInt(e.target.value))} 
                  className="w-full h-3 bg-slate-100 rounded-full appearance-none cursor-pointer accent-indigo-600 shadow-inner"
                />
                <div className="flex justify-between text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  <span>€100</span>
                  <span>€10,000</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <label className="text-sm font-black text-slate-900 uppercase tracking-wider">Expected results per month</label>
                    <p className="text-[11px] text-slate-400 font-medium leading-relaxed max-w-md">Your desired outcome count. This acts as a 'Reality Anchor' for our simulation logic.</p>
                  </div>
                  <button 
                    onClick={() => update('expectedResults', inputs.expectedResults === 'Not sure' ? '' : 'Not sure')}
                    className={`text-[10px] font-black uppercase tracking-widest transition-colors ${inputs.expectedResults === 'Not sure' ? 'text-emerald-500' : 'text-indigo-500'}`}
                  >
                    {inputs.expectedResults === 'Not sure' ? 'Using Benchmarks' : 'Not Sure'}
                  </button>
                </div>
                <div className="relative">
                  <input 
                    type="text" 
                    value={inputs.expectedResults} 
                    onChange={e => update('expectedResults', e.target.value)} 
                    placeholder="e.g., 50"
                    className={`w-full border p-6 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-lg ${inputs.expectedResults === 'Not sure' ? 'bg-emerald-50/50 border-emerald-100 italic text-emerald-700' : 'bg-slate-50 border-slate-200'}`}
                  />
                  <div className="absolute right-6 top-1/2 -translate-y-1/2">
                    <BarChart className="w-6 h-6 text-slate-300" />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-1">
                  <label className="text-sm font-black text-slate-900 uppercase tracking-wider">Historical Experience</label>
                  <p className="text-[11px] text-slate-400 font-medium leading-relaxed max-w-md">Determines the risk profile of the suggested strategy. Newcomers get safer, learning-oriented plans.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {[
                    { id: 'Yes', label: 'Experienced', sub: 'Have run ads before' },
                    { id: 'No', label: "Newcomer", sub: "First time advertiser" },
                    { id: 'Not sure', label: 'Uncertain', sub: 'Trial phase only' }
                  ].map(opt => (
                    <button 
                      key={opt.id}
                      onClick={() => update('experience', opt.id as any)}
                      className={`p-7 rounded-[2rem] border flex flex-col items-center gap-2 transition-all text-center ${
                        inputs.experience === opt.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100' : 'bg-white border-slate-100 hover:bg-slate-50'
                      }`}
                    >
                      <span className="font-black text-lg">{opt.label}</span>
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${inputs.experience === opt.id ? 'text-indigo-200' : 'text-slate-400'}`}>{opt.sub}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Reality Check / Feasibility Block */}
              <div className={`mt-10 animate-in slide-in-from-bottom-6 duration-700 p-10 rounded-[3.5rem] flex gap-6 items-center shadow-2xl relative overflow-hidden group border ${feasibility.isDiscovery ? 'bg-emerald-950 border-emerald-500/20' : 'bg-slate-950 border-white/5'}`}>
                <div className={`absolute -top-10 -right-10 w-40 h-40 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-1000 ${feasibility.isDiscovery ? 'bg-emerald-500/5' : 'bg-indigo-500/5'}`}></div>
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 border ${feasibility.isDiscovery ? 'bg-white/10 border-white/5' : 'bg-white/10 border-white/5'}`}>
                  {feasibility.isDiscovery ? <Compass className="w-10 h-10 text-emerald-400" /> : <AlertCircle className="w-10 h-10 text-indigo-400" />}
                </div>
                <div className="text-left relative z-10">
                   <span className={`text-[10px] font-black uppercase tracking-widest block mb-2 ${feasibility.isDiscovery ? 'text-emerald-400' : 'text-indigo-400'}`}>
                     {feasibility.isDiscovery ? 'Universal Discovery Mode Active' : 'Simulation Feasibility Check'}
                   </span>
                   <p className="text-slate-300 font-bold text-lg leading-relaxed">{feasibility.text}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-6 pt-16 mt-auto">
          {currentStep === 1 ? (
             <button onClick={onCancel} className="flex-1 py-6 bg-slate-50 text-slate-500 font-black rounded-3xl uppercase tracking-[0.2em] text-xs hover:bg-slate-100 transition-all">Cancel</button>
          ) : (
            <button onClick={back} className="flex-1 py-6 bg-slate-50 text-slate-500 font-black rounded-3xl uppercase tracking-[0.2em] text-xs hover:bg-slate-100 transition-all">Back</button>
          )}

          {currentStep < 4 ? (
            <button onClick={next} className="flex-[2] py-6 bg-indigo-100 text-indigo-700 font-black rounded-3xl uppercase tracking-[0.2em] text-xs hover:bg-indigo-200 transition-all">Continue to Next Phase</button>
          ) : (
            <button 
              onClick={() => onGenerate(inputs)} 
              className="flex-[2] py-6 bg-slate-900 text-white font-black rounded-3xl uppercase tracking-[0.2em] text-xs shadow-2xl shadow-slate-200 hover:bg-indigo-600 transition-all flex items-center justify-center gap-4"
            >
              <Sparkles className="w-5 h-5" /> Architect My Strategy
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
