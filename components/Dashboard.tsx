
import React, { useState } from 'react';
import { Batch, UserConfigs } from '../types';
import { getIconForOp, getStylesForColor, useTranslation } from '../constants';
import { Plus, Layers, Trash2, X, Check, Image as ImageIcon, Pencil, Save, Loader2, Sprout, ChevronRight, Calendar, ArrowRight } from 'lucide-react';

interface DashboardProps {
  batches: Batch[];
  userConfigs: UserConfigs;
  onSelectBatch: (batch: Batch) => void;
  onNewOperation: () => void;
  onContinue: (batchId: string) => void;
  onDeleteBatchGroup: (batchIds: string[]) => void;
  onUpdateBatchGroup?: (batches: Batch[], newSpecies: string, newDate: string, newQty: number) => Promise<void>;
}

const Dashboard: React.FC<DashboardProps> = ({ batches, userConfigs, onSelectBatch, onNewOperation, onContinue, onDeleteBatchGroup, onUpdateBatchGroup }) => {
  const t = useTranslation(userConfigs.language);
  const [deleteGroupConfirmKey, setDeleteGroupConfirmKey] = useState<string | null>(null);
  
  // Filter states
  const [filterMode, setFilterMode] = useState<'all' | 'month' | 'range'>('all');
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [filterRangeStart, setFilterRangeStart] = useState(new Date().toISOString().slice(0, 10)); // YYYY-MM-DD
  const [filterRangeEnd, setFilterRangeEnd] = useState(new Date().toISOString().slice(0, 10)); // YYYY-MM-DD

  const [editingGroupKey, setEditingGroupKey] = useState<string | null>(null);
  const [editSpecies, setEditSpecies] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editQuantity, setEditQuantity] = useState(1);
  const [isSavingGroup, setIsSavingGroup] = useState(false);

  const handleEditGroupClick = (e: React.MouseEvent, key: string, species: string, date: string, qty: number) => {
    e.stopPropagation();
    setEditingGroupKey(key);
    setEditSpecies(species);
    setEditDate(date);
    setEditQuantity(qty);
  };

  const handleDeleteGroupClick = (e: React.MouseEvent, key: string, ids: string[]) => {
    e.stopPropagation();
    if (deleteGroupConfirmKey === key) {
      onDeleteBatchGroup(ids);
      setDeleteGroupConfirmKey(null);
    } else {
      setDeleteGroupConfirmKey(key);
      setTimeout(() => setDeleteGroupConfirmKey(null), 3000);
    }
  };

  const handleSaveGroup = async (group: Batch[]) => {
    if (!onUpdateBatchGroup) return;
    setIsSavingGroup(true);
    try {
      await onUpdateBatchGroup(group, editSpecies, editDate, editQuantity);
      setEditingGroupKey(null);
    } catch (e) {
      console.error("Failed to update group", e);
    } finally {
      setIsSavingGroup(false);
    }
  };

  // Logic to filter batches based on user selection
  const filteredBatches = batches.filter(batch => {
    if (filterMode === 'all') return true;
    if (filterMode === 'month') return batch.createdDate.startsWith(filterMonth);
    if (filterMode === 'range') {
      return batch.createdDate >= filterRangeStart && batch.createdDate <= filterRangeEnd;
    }
    return true;
  });

  const groupedData = filteredBatches.reduce((acc, batch) => {
    const date = batch.createdDate;
    if (!acc[date]) acc[date] = {};
    const groupKey = `${batch.species}::${batch.operationType}`;
    if (!acc[date][groupKey]) acc[date][groupKey] = [];
    acc[date][groupKey].push(batch);
    return acc;
  }, {} as Record<string, Record<string, Batch[]>>);

  const sortedDates = Object.keys(groupedData).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  const getDayLabel = (dateStr: string) => {
    if (!dateStr) return '';
    const dateObj = new Date(dateStr);
    return userConfigs.language === 'en' 
      ? dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })
      : `${dateObj.getFullYear()}年${dateObj.getMonth() + 1}月${dateObj.getDate()}日 ${dateObj.toLocaleDateString('zh-CN', { weekday: 'long' })}`;
  };

  return (
    <div className="pb-20">
      {/* Search and Filter Panel */}
      <div className="mb-8 space-y-4">
        <div className="flex bg-earth-100 p-1.5 rounded-[24px]">
          <button 
            onClick={() => setFilterMode('all')}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-[20px] transition-all ${filterMode === 'all' ? 'bg-white text-earth-900 shadow-md' : 'text-earth-400'}`}
          >
            All Logs
          </button>
          <button 
            onClick={() => setFilterMode('month')}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-[20px] transition-all ${filterMode === 'month' ? 'bg-white text-earth-900 shadow-md' : 'text-earth-400'}`}
          >
            By Month
          </button>
          <button 
            onClick={() => setFilterMode('range')}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-[20px] transition-all ${filterMode === 'range' ? 'bg-white text-earth-900 shadow-md' : 'text-earth-400'}`}
          >
            Period
          </button>
        </div>

        {filterMode !== 'all' && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300">
            {filterMode === 'month' ? (
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-earth-400" size={18} />
                <input 
                  type="month" 
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-white border border-earth-200 rounded-[24px] outline-none focus:ring-4 focus:ring-earth-800/10 transition-all font-black text-sm text-earth-900 shadow-sm" 
                />
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <input 
                    type="date" 
                    value={filterRangeStart}
                    onChange={(e) => setFilterRangeStart(e.target.value)}
                    className="w-full px-5 py-4 bg-white border border-earth-200 rounded-[24px] outline-none focus:ring-4 focus:ring-earth-800/10 transition-all font-black text-sm text-earth-900 shadow-sm" 
                  />
                  <span className="absolute -top-2.5 left-4 bg-white px-1.5 text-[8px] font-black text-earth-400 uppercase tracking-widest">From</span>
                </div>
                <ArrowRight className="text-earth-300" size={20} />
                <div className="flex-1 relative">
                  <input 
                    type="date" 
                    value={filterRangeEnd}
                    onChange={(e) => setFilterRangeEnd(e.target.value)}
                    className="w-full px-5 py-4 bg-white border border-earth-200 rounded-[24px] outline-none focus:ring-4 focus:ring-earth-800/10 transition-all font-black text-sm text-earth-900 shadow-sm" 
                  />
                  <span className="absolute -top-2.5 left-4 bg-white px-1.5 text-[8px] font-black text-earth-400 uppercase tracking-widest">To</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-between items-center mb-8 px-2">
        <h3 className="text-xs font-black text-earth-900 tracking-[0.2em] uppercase">
          {filterMode === 'all' ? 'Recent Activity' : filterMode === 'month' ? `Activity in ${filterMonth}` : `Selected Period`}
        </h3>
        <button 
          onClick={onNewOperation}
          className="bg-earth-800 text-white px-5 py-2.5 rounded-full font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all"
        >
          <Plus size={14} className="inline mr-1" /> Add New
        </button>
      </div>

      {filteredBatches.length === 0 ? (
        <div className="text-center py-24 px-8 bg-white rounded-[40px] border-2 border-dashed border-earth-200 shadow-inner">
          <div className="w-24 h-24 bg-earth-50 rounded-full flex items-center justify-center mx-auto mb-8 text-earth-300">
             <Sprout size={48} />
          </div>
          <p className="text-earth-800 font-black text-xl mb-3 tracking-tight">
            {filterMode === 'all' ? 'No active mushrooms.' : 'Empty garden.'}
          </p>
          <p className="text-earth-400 text-sm font-medium mb-10">
            {filterMode === 'all' ? 'Start your mycological journey today!' : 'No logs found for the selected period.'}
          </p>
          {filterMode === 'all' ? (
            <button 
              onClick={onNewOperation}
              className="bg-earth-800 text-white px-10 py-5 rounded-[24px] font-black uppercase tracking-widest text-xs shadow-2xl active:scale-95 transition-transform"
            >
              Create First Batch
            </button>
          ) : (
            <button 
              onClick={() => setFilterMode('all')}
              className="bg-earth-100 text-earth-700 px-8 py-4 rounded-[20px] font-black uppercase tracking-widest text-xs active:scale-95 transition-transform"
            >
              Clear Filter
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-12">
          {sortedDates.map((date) => (
            <div key={date}>
              <div className="flex items-center gap-4 mb-6 px-2">
                 <span className="text-[11px] font-black text-earth-400 uppercase tracking-[0.2em] whitespace-nowrap">{getDayLabel(date)}</span>
                 <div className="h-[1px] flex-1 bg-earth-200"></div>
              </div>
              
              <div className="space-y-8">
                {Object.entries(groupedData[date]).map(([groupKey, groupBatches]: [string, Batch[]]) => {
                    const firstBatch = groupBatches[0];
                    const uniqueId = `${date}|${groupKey}`;
                    const batchIds = groupBatches.map(b => b.id);
                    const isEditing = editingGroupKey === uniqueId;
                    
                    const opConfig = userConfigs.operations.find(op => op.name.toLowerCase() === firstBatch.operationType.toLowerCase());
                    const opStyles = getStylesForColor(opConfig?.colorHex);
                    const Icon = getIconForOp(opConfig?.name || firstBatch.operationType);
                    
                    const speciesConfig = userConfigs.species.find(s => s.name.toLowerCase() === firstBatch.species.toLowerCase());
                    const speciesStyles = getStylesForColor(speciesConfig?.colorHex);
                    
                    const totalQty = groupBatches.reduce((sum, b) => sum + b.quantity, 0);

                    return (
                        <div key={uniqueId} className="bg-white rounded-[40px] border border-earth-200 shadow-sm hover:shadow-2xl transition-all duration-500 group overflow-hidden">
                            <div className="p-8">
                                <div className="flex gap-6 mb-8 items-center">
                                    <div style={opStyles.bg} className="p-5 rounded-[28px] shrink-0 shadow-sm flex items-center justify-center border border-earth-100/50 w-20 h-20">
                                        <Icon size={32} />
                                    </div>
                                    
                                    {isEditing ? (
                                        <div className="flex-1 space-y-3">
                                            <select value={editSpecies} onChange={(e) => setEditSpecies(e.target.value)} className="w-full p-3 border border-earth-200 rounded-2xl text-sm bg-earth-50 font-bold outline-none">{userConfigs.species.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}</select>
                                            <div className="flex items-center gap-3"><span className="text-[10px] font-black text-earth-400 uppercase w-12 tracking-widest">Date:</span><input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="flex-1 p-3 border border-earth-200 rounded-2xl text-sm bg-earth-50 font-bold outline-none"/></div>
                                            <div className="flex items-center gap-3"><span className="text-[10px] font-black text-earth-400 uppercase w-12 tracking-widest">Qty:</span><input type="number" min="1" value={editQuantity} onChange={(e) => setEditQuantity(Number(e.target.value))} className="w-32 p-3 border border-earth-200 rounded-2xl text-sm bg-earth-50 font-bold outline-none"/></div>
                                        </div>
                                    ) : (
                                        <div className="min-w-0 flex-1 flex flex-col justify-center">
                                            <div className="flex flex-wrap items-center gap-3 mb-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-1.5 h-6 rounded-full shadow-sm" style={speciesStyles.solid}></div>
                                                    <span className="text-base font-black text-earth-900 tracking-tight">
                                                      {speciesConfig?.name || firstBatch.species}
                                                    </span>
                                                </div>
                                                <span className="px-3 py-1 rounded-xl text-base font-black border shadow-sm transition-colors" style={opStyles.badge}>
                                                    {opConfig?.name || firstBatch.operationType}
                                                </span>
                                            </div>
                                            {firstBatch.notes && (
                                              <p className="text-[11px] font-medium text-earth-500 line-clamp-1 leading-none ml-3.5">
                                                {firstBatch.notes}
                                              </p>
                                            )}
                                        </div>
                                    )}

                                    <div className="flex gap-1 shrink-0">
                                        {isEditing ? (
                                            <div className="flex gap-2">
                                                <button onClick={() => handleSaveGroup(groupBatches)} disabled={isSavingGroup} className="p-3 bg-earth-800 text-white rounded-2xl shadow-xl active:scale-95 transition-transform">
                                                    {isSavingGroup ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                                                </button>
                                                <button onClick={() => setEditingGroupKey(null)} className="p-3 text-earth-400 bg-earth-50 rounded-2xl transition-colors hover:text-earth-900"><X size={20} /></button>
                                            </div>
                                        ) : (
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                <button onClick={(e) => handleEditGroupClick(e, uniqueId, firstBatch.species, firstBatch.createdDate, totalQty)} className="p-3 text-earth-400 hover:text-earth-900 bg-earth-50 rounded-[18px] transition-colors"><Pencil size={20} /></button>
                                                <button onClick={(e) => handleDeleteGroupClick(e, uniqueId, batchIds)} className={`p-3 rounded-[18px] transition-all ${deleteGroupConfirmKey === uniqueId ? 'bg-red-600 text-white shadow-lg' : 'text-earth-300 hover:text-red-500 bg-earth-50'}`}>{deleteGroupConfirmKey === uniqueId ? <Check size={20} /> : <Trash2 size={20} />}</button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {!isEditing && (
                                    <>
                                        <div className="flex flex-wrap gap-3 mb-10">
                                            {groupBatches.map(batch => (
                                                <button
                                                    key={batch.id}
                                                    onClick={() => onSelectBatch(batch)}
                                                    className="flex items-center gap-3 rounded-[20px] border-2 border-earth-100 bg-earth-50/30 px-5 py-3 text-xs font-black text-earth-700 hover:bg-white hover:border-earth-800 hover:shadow-xl transition-all active:scale-95 group/btn"
                                                >
                                                    <span className="opacity-50 font-mono tracking-tighter text-[11px]">{batch.displayId}</span>
                                                    {batch.imageUrls && batch.imageUrls.length > 0 && <ImageIcon size={16} className="text-earth-400 group-hover/btn:text-earth-800" />}
                                                </button>
                                            ))}
                                        </div>

                                        <div className="flex items-center justify-between text-[11px] font-black border-t border-earth-100 pt-6">
                                            <div className="flex items-center gap-3 text-earth-400 uppercase tracking-[0.2em]">
                                                <Layers size={16} className="text-earth-300"/>
                                                <span>{totalQty} {firstBatch.unit || 'UNITS'}</span>
                                            </div>
                                            <button 
                                              onClick={() => onSelectBatch(firstBatch)} 
                                              className="flex items-center gap-2 text-earth-800 hover:scale-105 active:scale-95 transition-all group/view"
                                            >
                                                {t('view_timeline')} <ChevronRight size={18} className="group-hover/view:translate-x-1 transition-transform" />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
