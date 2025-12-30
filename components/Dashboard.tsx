
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
  
  const [filterMode, setFilterMode] = useState<'all' | 'month' | 'range'>('all');
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7)); 
  const [filterRangeStart, setFilterRangeStart] = useState(new Date().toISOString().slice(0, 10)); 
  const [filterRangeEnd, setFilterRangeEnd] = useState(new Date().toISOString().slice(0, 10)); 

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
      <div className="mb-8 space-y-4">
        <div className="flex bg-earth-100 p-1 rounded-lg border border-earth-200">
          <button 
            onClick={() => setFilterMode('all')}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded transition-all ${filterMode === 'all' ? 'bg-white text-earth-900 shadow-sm' : 'text-earth-400'}`}
          >
            All Logs
          </button>
          <button 
            onClick={() => setFilterMode('month')}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded transition-all ${filterMode === 'month' ? 'bg-white text-earth-900 shadow-sm' : 'text-earth-400'}`}
          >
            By Month
          </button>
          <button 
            onClick={() => setFilterMode('range')}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded transition-all ${filterMode === 'range' ? 'bg-white text-earth-900 shadow-sm' : 'text-earth-400'}`}
          >
            Period
          </button>
        </div>

        {filterMode !== 'all' && (
          <div className="animate-in fade-in slide-in-from-top-1 duration-200">
            {filterMode === 'month' ? (
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-earth-400" size={18} />
                <input 
                  type="month" 
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-white border border-earth-200 rounded-lg outline-none focus:ring-2 focus:ring-earth-800/20 font-black text-sm text-earth-900 shadow-sm" 
                />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <input 
                    type="date" 
                    value={filterRangeStart}
                    onChange={(e) => setFilterRangeStart(e.target.value)}
                    className="w-full px-4 py-3.5 bg-white border border-earth-200 rounded-lg outline-none focus:ring-2 focus:ring-earth-800/20 font-black text-sm text-earth-900 shadow-sm" 
                  />
                </div>
                <ArrowRight className="text-earth-300" size={16} />
                <div className="flex-1 relative">
                  <input 
                    type="date" 
                    value={filterRangeEnd}
                    onChange={(e) => setFilterRangeEnd(e.target.value)}
                    className="w-full px-4 py-3.5 bg-white border border-earth-200 rounded-lg outline-none focus:ring-2 focus:ring-earth-800/20 font-black text-sm text-earth-900 shadow-sm" 
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-between items-center mb-6 px-1">
        <h3 className="text-xs font-black text-earth-900 tracking-wider uppercase">
          {filterMode === 'all' ? 'Recent Activity' : filterMode === 'month' ? `Activity in ${filterMonth}` : `Selected Period`}
        </h3>
        <button 
          onClick={onNewOperation}
          className="bg-earth-800 text-white px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest shadow hover:bg-earth-900 active:scale-95 transition-all"
        >
          <Plus size={14} className="inline mr-1" /> Add New
        </button>
      </div>

      {filteredBatches.length === 0 ? (
        <div className="text-center py-20 px-6 bg-white rounded-lg border-2 border-dashed border-earth-200 shadow-inner">
          <div className="w-16 h-16 bg-earth-50 rounded-full flex items-center justify-center mx-auto mb-6 text-earth-200">
             <Sprout size={32} />
          </div>
          <p className="text-earth-800 font-black text-lg mb-2">Empty garden.</p>
          <p className="text-earth-400 text-xs font-medium mb-8">No logs found for the selected period.</p>
          <button 
            onClick={() => setFilterMode('all')}
            className="bg-earth-100 text-earth-700 px-6 py-3 rounded-lg font-black uppercase tracking-widest text-[10px] active:scale-95 transition-transform border border-earth-200"
          >
            Clear Filter
          </button>
        </div>
      ) : (
        <div className="space-y-10">
          {sortedDates.map((date) => (
            <div key={date}>
              <div className="flex items-center gap-3 mb-5 px-1">
                 <span className="text-[10px] font-black text-earth-400 uppercase tracking-widest whitespace-nowrap">{getDayLabel(date)}</span>
                 <div className="h-[1px] flex-1 bg-earth-100"></div>
              </div>
              
              <div className="space-y-6">
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
                    const isHarvestGroup = firstBatch.operationType.toLowerCase().includes('harvest');

                    return (
                        <div key={uniqueId} className="bg-white rounded-lg border border-earth-200 shadow-sm hover:shadow-md transition-all duration-300 group overflow-hidden">
                            <div className="p-6">
                                <div className="flex gap-4 mb-6 items-center">
                                    <div style={opStyles.bg} className="p-3.5 rounded-lg shrink-0 flex items-center justify-center border border-earth-100/50 w-14 h-14">
                                        <Icon size={24} />
                                    </div>
                                    
                                    {isEditing ? (
                                        <div className="flex-1 space-y-2">
                                            <select value={editSpecies} onChange={(e) => setEditSpecies(e.target.value)} className="w-full p-2 border border-earth-200 rounded-lg text-xs bg-earth-50 font-bold outline-none">{userConfigs.species.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}</select>
                                            <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="w-full p-2 border border-earth-200 rounded-lg text-xs bg-earth-50 font-bold outline-none"/>
                                        </div>
                                    ) : (
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-1 h-4 rounded-full" style={speciesStyles.solid}></div>
                                                    <span className="text-sm font-black text-earth-900 truncate max-w-[120px]">
                                                      {speciesConfig?.name || firstBatch.species}
                                                    </span>
                                                </div>
                                                <span className="px-2 py-0.5 rounded border text-[10px] font-black transition-colors" style={opStyles.badge}>
                                                    {opConfig?.name || firstBatch.operationType}
                                                </span>
                                            </div>
                                            {firstBatch.notes && (
                                              <p className="text-[10px] font-normal text-earth-900 line-clamp-1">
                                                {firstBatch.notes}
                                              </p>
                                            )}
                                        </div>
                                    )}

                                    <div className="flex gap-1 shrink-0">
                                        {isEditing ? (
                                            <div className="flex gap-1">
                                                <button onClick={() => handleSaveGroup(groupBatches)} disabled={isSavingGroup} className="p-2 bg-earth-800 text-white rounded-lg shadow active:scale-95 transition-transform">
                                                    {isSavingGroup ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                                                </button>
                                                <button onClick={() => setEditingGroupKey(null)} className="p-2 text-earth-400 bg-earth-50 rounded-lg hover:text-earth-900"><X size={16} /></button>
                                            </div>
                                        ) : (
                                            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                                                <button onClick={(e) => handleEditGroupClick(e, uniqueId, firstBatch.species, firstBatch.createdDate, totalQty)} className="p-2 text-earth-300 hover:text-earth-900 transition-colors"><Pencil size={16} /></button>
                                                <button onClick={(e) => handleDeleteGroupClick(e, uniqueId, batchIds)} className={`p-2 transition-all ${deleteGroupConfirmKey === uniqueId ? 'text-red-600' : 'text-earth-200 hover:text-red-500'}`}><Trash2 size={16} /></button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {!isEditing && (
                                    <>
                                        <div className="flex flex-wrap gap-2 mb-6">
                                            {groupBatches.map(batch => (
                                                <button
                                                    key={batch.id}
                                                    onClick={() => onSelectBatch(batch)}
                                                    className="flex items-center gap-2 rounded-lg border border-earth-100 bg-earth-50/30 px-3 py-2 text-[10px] font-black text-earth-700 hover:bg-white hover:border-earth-800 transition-all active:scale-95"
                                                >
                                                    <span className="opacity-50 font-mono">{batch.displayId}</span>
                                                    {batch.imageUrls && batch.imageUrls.length > 0 && <ImageIcon size={12} className="text-earth-400" />}
                                                </button>
                                            ))}
                                        </div>

                                        <div className="flex items-center justify-between text-[10px] font-black border-t border-earth-50 pt-4">
                                            <div className="flex items-center gap-2 text-earth-400 uppercase tracking-widest">
                                                <Layers size={14} className="text-earth-200"/>
                                                <span>{isHarvestGroup ? `${totalQty} g` : `数量: ${totalQty}`}</span>
                                            </div>
                                            <button 
                                              onClick={() => onSelectBatch(firstBatch)} 
                                              className="flex items-center gap-1 text-earth-800 hover:text-earth-600 transition-all"
                                            >
                                                {t('view_timeline')} <ChevronRight size={14} />
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
