import React, { useState } from 'react';
import { Batch, UserConfigs } from '../types';
import { getIconForOp, getStylesForColor } from '../constants';
import { Plus, Layers, Trash2, X, Check, Image as ImageIcon, Pencil, Save, Loader2, Calendar, Sprout, TrendingUp, ChevronRight } from 'lucide-react';

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
  const [deleteGroupConfirmKey, setDeleteGroupConfirmKey] = useState<string | null>(null);
  
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

  const groupedData = batches.reduce((acc, batch) => {
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
    return `${dateObj.getFullYear()}年${dateObj.getMonth() + 1}月${dateObj.getDate()}日 ${dateObj.toLocaleDateString('zh-CN', { weekday: 'long' })}`;
  };

  const totalBatchesCount = batches.length;
  const activeBatchesCount = batches.filter(b => !b.endDate && !b.outcome?.includes('废弃')).length;

  return (
    <div className="pb-20">
      <div className="mb-8 bg-gradient-to-br from-earth-800 to-earth-900 p-6 rounded-3xl shadow-xl text-white relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-earth-300 font-bold uppercase tracking-widest text-[10px] mb-1">Mushroom Grower</h2>
          <h1 className="text-2xl font-black mb-4">Hello, Myco-Master! 👋</h1>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10">
              <div className="flex items-center gap-2 text-earth-200 mb-1">
                 <TrendingUp size={14} />
                 <span className="text-[10px] font-bold uppercase">Active</span>
              </div>
              <div className="text-xl font-black">{activeBatchesCount}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10">
              <div className="flex items-center gap-2 text-earth-200 mb-1">
                 <Layers size={14} />
                 <span className="text-[10px] font-bold uppercase">Total</span>
              </div>
              <div className="text-xl font-black">{totalBatchesCount}</div>
            </div>
          </div>
        </div>
        <Sprout className="absolute -bottom-6 -right-6 text-white/5 w-40 h-40 transform rotate-12" />
      </div>

      <div className="flex justify-between items-center mb-6 px-1">
        <h3 className="text-lg font-bold text-earth-900 tracking-tight">Recent Activity</h3>
        <button 
          onClick={onNewOperation}
          className="bg-earth-100 text-earth-700 px-3 py-1.5 rounded-full font-bold text-xs flex items-center gap-1 hover:bg-earth-200 transition-colors"
        >
          <Plus size={14} /> New
        </button>
      </div>

      {batches.length === 0 ? (
        <div className="text-center py-20 px-8 bg-white rounded-3xl border-2 border-dashed border-earth-100">
          <div className="w-16 h-16 bg-earth-50 rounded-full flex items-center justify-center mx-auto mb-4 text-earth-300">
             <Sprout size={32} />
          </div>
          <p className="text-earth-500 font-medium">Your log is empty. <br/>Start your cultivation journey today!</p>
          <button 
            onClick={onNewOperation}
            className="mt-6 bg-earth-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-earth-200"
          >
            Create First Batch
          </button>
        </div>
      ) : (
        <div className="space-y-10">
          {sortedDates.map((date) => (
            <div key={date}>
              <div className="flex items-center gap-2 mb-5 px-1">
                 <div className="w-2 h-2 rounded-full bg-earth-400"></div>
                 <span className="text-sm font-black text-earth-400 uppercase tracking-widest">{getDayLabel(date)}</span>
                 <div className="h-[1px] flex-1 bg-earth-200/50"></div>
              </div>
              
              <div className="space-y-5">
                {Object.entries(groupedData[date]).map(([groupKey, groupBatches]: [string, Batch[]]) => {
                    const firstBatch = groupBatches[0];
                    const uniqueId = `${date}|${groupKey}`;
                    const batchIds = groupBatches.map(b => b.id);
                    const isEditing = editingGroupKey === uniqueId;
                    
                    const opConfig = userConfigs.operations.find(op => op.name === firstBatch.operationType);
                    const opStyles = getStylesForColor(opConfig?.colorHex);
                    const Icon = getIconForOp(firstBatch.operationType);
                    const speciesConfig = userConfigs.species.find(s => s.name === firstBatch.species);
                    const speciesStyles = getStylesForColor(speciesConfig?.colorHex);
                    const totalQty = groupBatches.reduce((sum, b) => sum + b.quantity, 0);

                    return (
                        <div key={uniqueId} className="bg-white rounded-3xl border border-earth-200/60 shadow-sm hover:shadow-md transition-all duration-300 group">
                            <div className="p-5">
                                <div className={`flex gap-4 mb-5 ${isEditing ? 'items-start' : 'items-start'}`}>
                                    <div style={opStyles.bg} className="p-3 rounded-2xl shrink-0 shadow-sm border border-earth-100/50">
                                        <Icon size={22} />
                                    </div>
                                    
                                    {isEditing ? (
                                        <div className="flex-1 space-y-2">
                                            <select value={editSpecies} onChange={(e) => setEditSpecies(e.target.value)} className="w-full p-2.5 border border-earth-200 rounded-xl text-sm bg-earth-50 font-bold focus:ring-2 focus:ring-earth-400 outline-none">{userConfigs.species.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}</select>
                                            <div className="flex items-center gap-2"><span className="text-[10px] font-bold text-earth-500 uppercase w-12">Date:</span><input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="flex-1 p-2 border border-earth-200 rounded-xl text-sm bg-earth-50"/></div>
                                            <div className="flex items-center gap-2"><span className="text-[10px] font-bold text-earth-500 uppercase w-12">Qty:</span><input type="number" min="1" value={editQuantity} onChange={(e) => setEditQuantity(Number(e.target.value))} className="w-24 p-2 border border-earth-200 rounded-xl text-sm bg-earth-50"/></div>
                                        </div>
                                    ) : (
                                        <div className="min-w-0 flex-1 pt-1">
                                            <div className="flex flex-wrap gap-2 mb-2">
                                                <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border" style={opStyles.badge}>{firstBatch.operationType}</span>
                                                <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border" style={speciesStyles.badge}>{firstBatch.species}</span>
                                            </div>
                                            <h4 className="font-bold text-earth-900 text-lg leading-tight truncate">
                                                {firstBatch.notes || firstBatch.operationType}
                                            </h4>
                                        </div>
                                    )}

                                    <div className="flex gap-1 shrink-0">
                                        {isEditing ? (
                                            <div className="flex gap-1">
                                                <button onClick={() => handleSaveGroup(groupBatches)} disabled={isSavingGroup} className="p-2.5 bg-earth-800 text-white rounded-xl shadow-lg active:scale-95 transition-transform">
                                                    {isSavingGroup ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                                </button>
                                                <button onClick={() => setEditingGroupKey(null)} className="p-2.5 text-earth-400 bg-earth-50 rounded-xl hover:bg-earth-100 transition-colors"><X size={16} /></button>
                                            </div>
                                        ) : (
                                            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={(e) => handleEditGroupClick(e, uniqueId, firstBatch.species, firstBatch.createdDate, totalQty)} className="p-2 text-earth-400 hover:text-earth-800 hover:bg-earth-50 rounded-xl transition-colors"><Pencil size={18} /></button>
                                                <button onClick={(e) => handleDeleteGroupClick(e, uniqueId, batchIds)} className={`p-2 rounded-xl transition-all ${deleteGroupConfirmKey === uniqueId ? 'bg-red-500 text-white' : 'text-earth-400 hover:text-red-500 hover:bg-red-50'}`}>{deleteGroupConfirmKey === uniqueId ? <Check size={18} /> : <Trash2 size={18} />}</button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {!isEditing && (
                                    <>
                                        <div className="flex flex-wrap gap-2.5 mb-6">
                                            {groupBatches.map(batch => (
                                                <button
                                                    key={batch.id}
                                                    onClick={() => onSelectBatch(batch)}
                                                    className="flex items-center gap-2 rounded-xl border border-earth-200 bg-earth-50/50 px-3.5 py-2 text-xs font-bold text-earth-700 hover:bg-white hover:border-earth-400 hover:shadow-sm transition-all active:scale-95"
                                                >
                                                    <span className="opacity-70 font-mono tracking-tighter">{batch.displayId}</span>
                                                    {batch.imageUrls && batch.imageUrls.length > 0 && <ImageIcon size={12} className="text-earth-400" />}
                                                </button>
                                            ))}
                                        </div>

                                        <div className="flex items-center justify-between text-[10px] font-black border-t border-earth-100 pt-4">
                                            <div className="flex items-center gap-2 text-earth-400 uppercase tracking-widest">
                                                <div className="p-1 bg-earth-50 rounded-lg"><Layers size={12}/></div>
                                                <span>Collection: {totalQty} UNITS</span>
                                            </div>
                                            <button 
                                              onClick={() => onSelectBatch(firstBatch)} 
                                              className="flex items-center gap-1 text-earth-700 hover:text-black group/btn transition-colors"
                                            >
                                                VIEW DETAIL <ChevronRight size={14} className="group-hover/btn:translate-x-0.5 transition-transform" />
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