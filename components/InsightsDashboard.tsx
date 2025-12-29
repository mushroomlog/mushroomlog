
import React, { useState, useMemo } from 'react';
import { Batch, UserConfigs } from '../types';
import { DateFilter, TimeRange, filterBatches, calculateYieldStats, calculateHealthStats, calculatePipelineStats } from '../services/statsService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Calendar, Filter, Scale, AlertTriangle, Activity, Sprout, ArrowRight, TrendingUp, Layers } from 'lucide-react';
import { getStylesForColor } from '../constants';

interface InsightsDashboardProps {
  batches: Batch[];
  userConfigs: UserConfigs;
  onNavigateToBatch: (batch: Batch) => void;
}

const InsightsDashboard: React.FC<InsightsDashboardProps> = ({ batches, userConfigs, onNavigateToBatch }) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('YEAR');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<string>(''); // '' means All
  const [activeTab, setActiveTab] = useState<'yield' | 'health' | 'pipeline'>('yield');

  // Derived Filter
  const dateFilter: DateFilter = useMemo(() => ({
      type: timeRange,
      startDate: customStart,
      endDate: customEnd
  }), [timeRange, customStart, customEnd]);

  // Filter Data
  const filteredBatches = useMemo(() => 
    filterBatches(batches, dateFilter, selectedSpeciesId || undefined, userConfigs),
  [batches, dateFilter, selectedSpeciesId, userConfigs]);

  // Calculate Stats
  const yieldStats = useMemo(() => calculateYieldStats(filteredBatches), [filteredBatches]);
  const healthStats = useMemo(() => calculateHealthStats(filteredBatches), [filteredBatches]);
  const pipelineStats = useMemo(() => calculatePipelineStats(filteredBatches), [filteredBatches]);

  // Active/Total counts for the hero card
  const activeBatchesCount = batches.filter(b => !b.endDate && !b.outcome?.includes('废弃')).length;

  // Chart Data Preparation
  const chartData = useMemo(() => {
     return yieldStats.speciesStats.map(s => ({
         name: s.speciesName,
         weight: s.totalWeight,
         color: userConfigs.species.find(sp => sp.name === s.speciesName)?.colorHex || '#a3c271'
     }));
  }, [yieldStats, userConfigs]);

  return (
    <div className="pb-24 space-y-6">
      {/* Hero Summary Card (Moved from Dashboard) */}
      <div className="mb-8 bg-earth-900 p-8 rounded-[40px] shadow-2xl text-white relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-earth-400 font-black uppercase tracking-[0.2em] text-[10px] mb-2">Mycelium Tracker</h2>
          <h1 className="text-3xl font-black mb-6 leading-tight tracking-tight">Myco-Master <br/>Insights 👋</h1>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 backdrop-blur-xl p-5 rounded-[32px] border border-white/10 flex flex-col justify-between h-28 shadow-xl">
              <div className="flex items-center gap-2 text-earth-300">
                 <TrendingUp size={16} />
                 <span className="text-[10px] font-black uppercase tracking-widest">Active</span>
              </div>
              <div className="text-4xl font-black">{activeBatchesCount}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-xl p-5 rounded-[32px] border border-white/10 flex flex-col justify-between h-28 shadow-xl">
              <div className="flex items-center gap-2 text-earth-300">
                 <Layers size={16} />
                 <span className="text-[10px] font-black uppercase tracking-widest">Total</span>
              </div>
              <div className="text-4xl font-black">{batches.length}</div>
            </div>
          </div>
        </div>
        <Sprout className="absolute -bottom-10 -right-10 text-white/10 w-64 h-64 transform rotate-12" />
      </div>

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-earth-900 flex items-center gap-2">
            <Activity className="text-earth-600"/> Analytics
        </h1>
      </div>

      {/* --- FILTERS --- */}
      <div className="bg-white p-4 rounded-xl border border-earth-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-earth-700 font-semibold text-sm mb-1">
              <Filter size={16} /> Filters
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {(['ALL', 'YEAR', 'MONTH', 'WEEK'] as const).map(range => (
                  <button 
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-colors ${timeRange === range ? 'bg-earth-600 text-white shadow-md' : 'bg-earth-50 text-earth-600 hover:bg-earth-100'}`}
                  >
                      {range}
                  </button>
              ))}
          </div>

          <div className="flex gap-2">
             <div className="flex-1">
                 <select 
                    value={selectedSpeciesId}
                    onChange={(e) => setSelectedSpeciesId(e.target.value)}
                    className="w-full p-2 bg-earth-50 border border-earth-200 rounded-lg text-sm text-earth-700 outline-none focus:ring-2 focus:ring-earth-500"
                 >
                     <option value="">All Species</option>
                     {userConfigs.species.map(s => (
                         <option key={s.id} value={s.id}>{s.name}</option>
                     ))}
                 </select>
             </div>
          </div>
          
          {timeRange === 'CUSTOM' && (
              <div className="flex gap-2 items-center bg-earth-50 p-2 rounded-lg">
                  <Calendar size={16} className="text-earth-400"/>
                  <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="bg-transparent text-xs border-b border-earth-300 w-full outline-none" />
                  <span className="text-earth-400">-</span>
                  <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="bg-transparent text-xs border-b border-earth-300 w-full outline-none" />
              </div>
          )}
      </div>

      {/* --- TABS --- */}
      <div className="flex bg-earth-100 p-1 rounded-xl">
          <button 
            onClick={() => setActiveTab('yield')} 
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'yield' ? 'bg-white text-earth-800 shadow-sm' : 'text-earth-500 hover:text-earth-700'}`}
          >
              <Scale size={16}/> Yield
          </button>
          <button 
            onClick={() => setActiveTab('health')} 
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'health' ? 'bg-white text-earth-800 shadow-sm' : 'text-earth-500 hover:text-earth-700'}`}
          >
              <AlertTriangle size={16}/> Health
          </button>
          <button 
            onClick={() => setActiveTab('pipeline')} 
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'pipeline' ? 'bg-white text-earth-800 shadow-sm' : 'text-earth-500 hover:text-earth-700'}`}
          >
              <Sprout size={16}/> Active
          </button>
      </div>

      {/* --- CONTENT --- */}
      <div className="space-y-6 animate-in fade-in duration-300">
          
          {/* YIELD VIEW */}
          {activeTab === 'yield' && (
              <>
                 <div className="grid grid-cols-2 gap-4">
                     <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                         <div className="text-xs text-green-600 font-bold uppercase tracking-wider mb-1">Total Harvest</div>
                         <div className="text-2xl font-bold text-green-800">{yieldStats.totalWeight.toLocaleString()} <span className="text-sm font-normal">g</span></div>
                     </div>
                     <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                         <div className="text-xs text-blue-600 font-bold uppercase tracking-wider mb-1">Harvest Batches</div>
                         <div className="text-2xl font-bold text-blue-800">{yieldStats.harvestCount}</div>
                     </div>
                 </div>

                 {yieldStats.totalWeight > 0 ? (
                     <div className="bg-white p-4 rounded-xl border border-earth-200 shadow-sm h-64">
                         <h3 className="text-sm font-bold text-earth-700 mb-4">Yield by Species</h3>
                         <ResponsiveContainer width="100%" height="100%">
                             <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 20, left: 0 }}>
                                 <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                 <XAxis dataKey="name" tick={{fontSize: 10}} interval={0} />
                                 <YAxis tick={{fontSize: 10}} />
                                 <Tooltip 
                                    cursor={{fill: 'transparent'}}
                                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                                 />
                                 <Bar dataKey="weight" radius={[4, 4, 0, 0]}>
                                     {chartData.map((entry, index) => (
                                         <Cell key={`cell-${index}`} fill={entry.color} />
                                     ))}
                                 </Bar>
                             </BarChart>
                         </ResponsiveContainer>
                     </div>
                 ) : (
                     <div className="p-8 text-center text-earth-400 bg-earth-50 rounded-xl border border-dashed border-earth-200">
                         No harvest data in this period.
                     </div>
                 )}
              </>
          )}

          {/* HEALTH VIEW */}
          {activeTab === 'health' && (
              <>
                 <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex justify-between items-center">
                     <div>
                         <div className="text-xs text-red-600 font-bold uppercase tracking-wider mb-1">Contamination Rate</div>
                         <div className="text-2xl font-bold text-red-800">{healthStats.contaminationRate.toFixed(1)}%</div>
                     </div>
                     <div className="text-right">
                         <div className="text-xs text-red-400 font-bold uppercase tracking-wider mb-1">Failed / Total</div>
                         <div className="text-lg font-bold text-red-700">{healthStats.contaminatedBatches.length} / {healthStats.totalBatches}</div>
                     </div>
                 </div>

                 <div className="bg-white rounded-xl border border-earth-200 shadow-sm overflow-hidden">
                     <div className="p-4 bg-earth-50 border-b border-earth-100 font-bold text-earth-700 text-sm">
                         Contaminated Batches
                     </div>
                     {healthStats.contaminatedBatches.length === 0 ? (
                         <div className="p-6 text-center text-green-600 font-medium">
                             No contamination found! Great job! 🍄
                         </div>
                     ) : (
                         <div className="divide-y divide-earth-100">
                             {healthStats.contaminatedBatches.map(b => {
                                 const statusConfig = userConfigs.statuses.find(s => s.name.toLowerCase() === b.outcome?.toLowerCase());
                                 const statusStyle = getStylesForColor(statusConfig?.colorHex);
                                 
                                 return (
                                     <div 
                                        key={b.id} 
                                        onClick={() => onNavigateToBatch(b)}
                                        className="p-3 hover:bg-red-50 cursor-pointer flex justify-between items-center transition-colors"
                                     >
                                         <div>
                                             <div className="font-mono text-xs font-bold text-earth-600">{b.displayId}</div>
                                             <div className="text-sm font-semibold text-earth-900">{b.species}</div>
                                             <div className="text-xs text-earth-400">{b.operationType}</div>
                                         </div>
                                         <div 
                                            className="text-[10px] px-2 py-1 rounded-full font-bold border"
                                            style={statusStyle.badge}
                                         >
                                             {b.outcome}
                                         </div>
                                     </div>
                                 );
                             })}
                         </div>
                     )}
                 </div>
              </>
          )}

          {/* PIPELINE VIEW */}
          {activeTab === 'pipeline' && (
              <>
                <div className="bg-earth-600 text-white p-4 rounded-xl shadow-sm mb-4">
                     <div className="text-xs font-bold uppercase tracking-wider mb-1 opacity-80">Total Active Batches</div>
                     <div className="text-2xl font-bold">{pipelineStats.activeCount}</div>
                </div>

                <div className="space-y-4">
                    {Object.entries(pipelineStats.byStage).map(([stage, rawBatchList]) => {
                         const batchList = rawBatchList as Batch[];
                         const opConfig = userConfigs.operations.find(op => op.name.toLowerCase() === stage.toLowerCase());
                         const color = opConfig?.colorHex || '#666';
                         
                         return (
                             <div key={stage} className="bg-white rounded-xl border border-earth-200 shadow-sm overflow-hidden">
                                 <div className="p-3 border-b border-earth-100 flex justify-between items-center" style={{borderLeft: `4px solid ${color}`}}>
                                     <h3 className="font-bold text-earth-800">{stage}</h3>
                                     <span className="bg-earth-100 text-earth-600 text-xs font-bold px-2 py-1 rounded-full">{batchList.length}</span>
                                 </div>
                                 <div className="divide-y divide-earth-50 max-h-40 overflow-y-auto">
                                     {batchList.map(b => (
                                         <div 
                                            key={b.id}
                                            onClick={() => onNavigateToBatch(b)}
                                            className="p-3 hover:bg-earth-50 cursor-pointer flex justify-between items-center text-sm"
                                         >
                                             <span className="font-mono text-earth-600 text-xs">{b.displayId}</span>
                                             <div className="flex items-center gap-2">
                                                 <span className="text-earth-800 font-medium">{b.species}</span>
                                                 <ArrowRight size={14} className="text-earth-300"/>
                                             </div>
                                         </div>
                                     ))}
                                 </div>
                             </div>
                         );
                    })}
                    {Object.keys(pipelineStats.byStage).length === 0 && (
                        <div className="text-center p-8 text-earth-400">No active batches in pipeline.</div>
                    )}
                </div>
              </>
          )}

      </div>
    </div>
  );
};

export default InsightsDashboard;
