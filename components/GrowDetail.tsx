
import React, { useState, useEffect, useRef } from 'react';
import { Batch, UserConfigs, Unit } from '../types';
import { updateBatch, expandBatch, uploadBatchImage, deleteBatchImage } from '../services/storageService';
import { getIconForOp, getStylesForColor, useTranslation } from '../constants';
import { ArrowLeft, Save, CheckCircle, ArrowDown, Loader2, Check, GitBranch, Pencil, Trash2, X, Camera, Image as ImageIcon, Maximize2, AlertCircle } from 'lucide-react';

interface GrowDetailProps {
  userId: string;
  grow: Batch;
  allBatches: Batch[];
  userConfigs: UserConfigs;
  onBack: () => void;
  onUpdate: (batch: Batch) => void;
  onDelete: () => void;
  onContinue: (batchId: string) => void;
  onNavigateToBatch?: (batch: Batch) => void;
}

const GrowDetail: React.FC<GrowDetailProps> = ({ userId, grow: batch, allBatches, userConfigs, onBack, onUpdate, onDelete, onContinue, onNavigateToBatch }) => {
  const t = useTranslation(userConfigs.language);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const [viewImage, setViewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [outcome, setOutcome] = useState<string | undefined>(batch.outcome);
  const [endDate, setEndDate] = useState<string>(batch.endDate || '');
  const [editForm, setEditForm] = useState<Partial<Batch>>({});
  const [lineage, setLineage] = useState<Batch[]>([]);

  useEffect(() => {
    setOutcome(batch.outcome);
    setEndDate(batch.endDate || '');
    setEditForm({ 
        createdDate: batch.createdDate, 
        operationType: batch.operationType, 
        species: batch.species, 
        quantity: batch.quantity, 
        unit: batch.unit || Unit.BAG,
        notes: batch.notes || '' 
    });
    setIsEditing(false); 
  }, [batch]);

  useEffect(() => {
    const ancestors: Batch[] = [];
    let current = batch;
    let safety = 0;
    while (current.parentId && safety < 50) {
      const parent = allBatches.find(b => b.id === current.parentId);
      if (parent) { ancestors.unshift(parent); current = parent; } else break;
      safety++;
    }
    const getDescendants = (pid: string): Batch[] => {
        const children = allBatches.filter(b => b.parentId === pid);
        let res: Batch[] = [...children];
        for (const child of children) res = [...res, ...getDescendants(child.id)];
        return res;
    };
    const descendants = getDescendants(batch.id);
    const fullLineage = [...ancestors, batch, ...descendants].sort((a, b) => new Date(a.createdDate).getTime() - new Date(b.createdDate).getTime());
    setLineage(Array.from(new Set(fullLineage.map(b => b.id))).map(id => fullLineage.find(b => b.id === id)!));
  }, [batch, allBatches]);

  const handleFullSave = async () => {
    setIsSaving(true);
    let newDisplayId = batch.displayId;
    if (editForm.species && editForm.createdDate && (editForm.species !== batch.species || editForm.createdDate !== batch.createdDate)) {
        const spConfig = userConfigs.species.find(s => s.name === editForm.species);
        const newAbbr = spConfig ? spConfig.abbreviation : editForm.species.substring(0, 2).toUpperCase();
        const d = new Date(editForm.createdDate);
        const dateCode = `${d.getFullYear().toString().slice(-2)}${(d.getMonth() + 1).toString().padStart(2, '0')}${d.getDate().toString().padStart(2, '0')}`;
        const seqMatch = batch.displayId.match(/-(\d+)$/);
        newDisplayId = `${dateCode}-${newAbbr}-${seqMatch ? seqMatch[1] : '01'}`;
    }
    const updatedBatch: Batch = { ...batch, ...editForm, displayId: newDisplayId, outcome, endDate: endDate || undefined } as Batch;
    try {
      if (batch.quantity === 1 && (editForm.quantity || 1) > 1 && !editForm.operationType?.includes('Harvest')) {
          await expandBatch(updatedBatch, editForm.quantity!, userId);
          onDelete(); 
      } else {
          await updateBatch(updatedBatch);
          onUpdate(updatedBatch);
          setIsEditing(false);
          setShowSuccess(true);
          setTimeout(() => setShowSuccess(false), 2000);
      }
    } catch (e: any) { alert(`Failed: ${e.message}`); } finally { setIsSaving(false); }
  };

  const currentOpName = isEditing ? editForm.operationType : batch.operationType;
  const currentSpeciesName = isEditing ? editForm.species : batch.species;

  const opConfig = userConfigs.operations.find(op => op.name.toLowerCase() === currentOpName?.toLowerCase());
  const opStyles = getStylesForColor(opConfig?.colorHex);
  const OpIcon = getIconForOp(opConfig?.name || currentOpName);
  
  const speciesConfig = userConfigs.species.find(s => s.name.toLowerCase() === currentSpeciesName?.toLowerCase());
  const speciesStyles = getStylesForColor(speciesConfig?.colorHex);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    setIsUploading(true);
    setUploadError(null);
    try {
        const url = await uploadBatchImage(batch.id, file, userId);
        if (url) {
            const updatedBatch = { ...batch, imageUrls: [...(batch.imageUrls || []), url] };
            await updateBatch(updatedBatch);
            onUpdate(updatedBatch);
        }
    } catch (error: any) { setUploadError(error.message); } finally { 
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteImage = async (url: string) => {
    if (!window.confirm("确定删除吗？")) return;
    try {
        await deleteBatchImage(url);
        const updatedBatch = { ...batch, imageUrls: (batch.imageUrls || []).filter(imgUrl => imgUrl !== url) };
        await updateBatch(updatedBatch);
        onUpdate(updatedBatch);
    } catch (error: any) { alert("删除失败"); }
  };

  return (
    <div className="space-y-6 pb-20">
      {viewImage && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setViewImage(null)}>
           <img src={viewImage} alt="Full view" className="max-w-full max-h-[90vh] object-contain rounded-lg" />
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button onClick={onBack} className="p-2 hover:bg-earth-100 rounded-full transition-colors text-earth-800"><ArrowLeft size={24} /></button>
          <div>
            <h1 className="text-xl font-black text-earth-900 truncate tracking-tight">{batch.displayId}</h1>
            {!isEditing && <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border tracking-widest`} style={speciesStyles.badge}>{speciesConfig?.name || batch.species}</span>}
          </div>
        </div>
        <div className="flex gap-2 items-center">
           {!isEditing && (
               <>
                 <input type="file" ref={fileInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleImageUpload} />
                 <button onClick={() => { setUploadError(null); fileInputRef.current?.click(); }} className="p-2 bg-earth-800 text-white rounded-lg shadow active:scale-95 transition-all" disabled={isUploading}>
                    {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
                 </button>
               </>
           )}
          <button onClick={() => setIsEditing(!isEditing)} className="p-2 text-earth-500 bg-white border border-earth-200 rounded-lg shadow-sm hover:bg-earth-50">{isEditing ? <X size={18} /> : <Pencil size={18} />}</button>
        </div>
      </div>

      {uploadError && (
          <div className="bg-red-50 border border-red-100 p-4 rounded-lg flex items-start gap-3">
              <AlertCircle className="text-red-600 mt-0.5 shrink-0" size={16} />
              <div className="flex-1">
                  <p className="text-[10px] font-black text-red-800 uppercase tracking-widest">{uploadError}</p>
              </div>
          </div>
      )}

      <div className="bg-white p-6 rounded-lg border border-earth-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-3 rounded-bl-lg border-b border-l" style={opStyles.bg}><OpIcon size={24} style={{ color: opConfig?.colorHex }} /></div>
        <div className="space-y-6">
          {isEditing ? (
            <div className="space-y-4 pr-10">
               <div><label className="text-[10px] font-black text-earth-400 uppercase tracking-widest mb-1 ml-1 block">Stage</label><select value={editForm.operationType} onChange={(e) => setEditForm(prev => ({ ...prev, operationType: e.target.value }))} className="w-full p-3 bg-earth-50 border border-earth-200 rounded-lg text-sm font-bold outline-none">{userConfigs.operations.map(op => <option key={op.id} value={op.name}>{op.name}</option>)}</select></div>
               <div><label className="text-[10px] font-black text-earth-400 uppercase tracking-widest mb-1 ml-1 block">Species</label><select value={editForm.species} onChange={(e) => setEditForm(prev => ({ ...prev, species: e.target.value }))} className="w-full p-3 bg-earth-50 border border-earth-200 rounded-lg text-sm font-bold outline-none">{userConfigs.species.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}</select></div>
               <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-[10px] font-black text-earth-400 uppercase tracking-widest mb-1 ml-1 block">Date</label><input type="date" value={editForm.createdDate} onChange={(e) => setEditForm(prev => ({ ...prev, createdDate: e.target.value }))} className="w-full p-3 bg-earth-50 border border-earth-200 rounded-lg text-sm font-bold outline-none"/></div>
                  <div><label className="text-[10px] font-black text-earth-400 uppercase tracking-widest mb-1 ml-1 block">Qty</label><input type="number" value={editForm.quantity} onChange={(e) => setEditForm(prev => ({ ...prev, quantity: Number(e.target.value) }))} className="w-full p-3 bg-earth-50 border border-earth-200 rounded-lg text-sm font-bold outline-none"/></div>
               </div>
               <button onClick={handleFullSave} disabled={isSaving} className="w-full bg-earth-800 text-white py-4 rounded-lg font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform">{isSaving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18} />} {t('save')}</button>
            </div>
          ) : (
            <>
              <div className="pr-10">
                <label className="text-[10px] font-black text-earth-400 uppercase tracking-widest block mb-1">Growth Phase</label>
                <p className="text-xl font-black text-earth-900 tracking-tight leading-none mb-1">{opConfig?.name || batch.operationType}</p>
                <p className="text-xs font-bold text-earth-500">{new Date(batch.createdDate).toLocaleDateString()}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-[10px] font-black text-earth-400 uppercase tracking-widest block mb-1">Quantity</label>
                    <p className="text-lg font-black text-earth-900">
                      {batch.operationType.toLowerCase().includes('harvest') ? `${batch.quantity} g` : `数量: ${batch.quantity}`}
                    </p>
                </div>
                <div>
                    <label className="text-[10px] font-black text-earth-400 uppercase tracking-widest block mb-1">Display ID</label>
                    <p className="text-xs font-mono font-bold text-earth-600">{batch.displayId}</p>
                </div>
              </div>

              {batch.notes && <div className="bg-earth-50 p-4 rounded-lg text-xs text-earth-700 border border-earth-100 font-medium leading-relaxed italic">"{batch.notes}"</div>}
              
              <div className="pt-2 border-t border-earth-50">
                <button onClick={() => onContinue(batch.id)} className="w-full bg-white text-earth-800 border border-earth-200 p-3.5 rounded-lg font-black uppercase tracking-widest text-[10px] flex justify-center items-center gap-2 hover:bg-earth-50 transition-all active:scale-95"><GitBranch size={16} /> 接续记录</button>
              </div>
            </>
          )}
        </div>
      </div>
      
      {batch.imageUrls && batch.imageUrls.length > 0 && (
          <div className="space-y-3">
              <h2 className="text-[10px] font-black text-earth-900 flex items-center gap-1.5 px-1 uppercase tracking-widest"><ImageIcon size={14} className="text-earth-400"/> Mycelium Vision</h2>
              <div className="grid grid-cols-3 gap-2">
                  {batch.imageUrls.map((url, idx) => (
                      <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-earth-100 shadow-sm group">
                          <img src={url} alt={`Log ${idx}`} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center transition-all">
                             <div className="flex gap-2 opacity-0 group-hover:opacity-100">
                                <button onClick={() => setViewImage(url)} className="p-1.5 bg-white rounded text-earth-800 shadow-lg"><Maximize2 size={14} /></button>
                                <button onClick={(e) => { e.stopPropagation(); handleDeleteImage(url); }} className="p-1.5 bg-red-600 rounded text-white shadow-lg"><Trash2 size={14} /></button>
                             </div>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {batch.operationType !== 'Harvest' && (
          <div className="bg-white p-6 rounded-lg border border-earth-200 shadow-sm">
            <h2 className="text-[10px] font-black text-earth-900 uppercase tracking-widest mb-6 px-1">{t('contamination_title')}</h2>
            <div className="space-y-6">
               <div className="grid grid-cols-3 gap-2">
                 {userConfigs.statuses.map(s => {
                     const styles = getStylesForColor(s.colorHex);
                     return <button 
                                key={s.id} 
                                onClick={() => setOutcome(prev => prev === s.name ? undefined : s.name)} 
                                className={`py-3 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all ${outcome === s.name ? 'border-earth-800 ring-2 ring-earth-800/10' : 'opacity-40 grayscale hover:opacity-100 hover:grayscale-0'}`} 
                                style={outcome === s.name ? styles.solid : styles.badge}
                              >
                                {s.name}
                              </button>;
                 })}
               </div>
               <button onClick={async () => {
                   setIsSaving(true);
                   try {
                     const updated = { ...batch, outcome, endDate: endDate || undefined };
                     await updateBatch(updated);
                     onUpdate(updated);
                     setShowSuccess(true);
                     setTimeout(() => setShowSuccess(false), 2000);
                   } catch (e: any) { alert("更新失败"); } finally { setIsSaving(false); }
               }} disabled={isSaving} className={`w-full py-4 rounded-lg font-black uppercase tracking-widest text-[10px] transition-all shadow-md flex items-center justify-center gap-2 ${showSuccess ? 'bg-green-600 text-white' : 'bg-earth-800 text-white active:scale-95'}`}>
                 {isSaving ? <Loader2 size={16} className="animate-spin" /> : showSuccess ? <Check size={16} /> : <Save size={16} />} {isSaving ? 'Updating...' : showSuccess ? 'Success' : 'Update Status'}
               </button>
            </div>
          </div>
      )}

      <div className="pb-10">
        <h2 className="text-[10px] font-black text-earth-900 uppercase tracking-widest mb-6 px-1">{t('growing_timeline')}</h2>
        <div className="relative pl-6 space-y-0">
          <div className="absolute left-[1.45rem] top-4 bottom-4 w-0.5 bg-earth-100 -z-0"></div>
          {lineage.map((item, index) => {
             const isCurrent = item.id === batch.id;
             const itemStatus = item.outcome ? userConfigs.statuses.find(s => s.name === item.outcome) : null;
             const statusStyle = getStylesForColor(itemStatus?.colorHex);
             const prevItem = index > 0 ? lineage[index - 1] : null;
             const daysDiff = prevItem ? Math.ceil(Math.abs(new Date(item.createdDate).getTime() - new Date(prevItem.createdDate).getTime()) / (1000 * 60 * 60 * 24)) : null;
             const timelineOpConfig = userConfigs.operations.find(op => op.name.toLowerCase() === item.operationType.toLowerCase());

             return (
               <div key={item.id} className="relative pb-8 last:pb-0 group">
                 <div className={`absolute left-0 top-1.5 w-6 h-6 rounded-full flex items-center justify-center border-2 z-10 transition-all ${isCurrent ? 'bg-earth-800 border-white text-white scale-110 shadow-lg' : 'bg-white border-earth-100 text-earth-200 group-hover:border-earth-800'}`}>
                    {isCurrent ? <ArrowDown size={12} /> : <CheckCircle size={12} />}
                 </div>
                 <div onClick={() => !isCurrent && onNavigateToBatch?.(item)} className={`ml-10 p-4 rounded-lg border transition-all ${isCurrent ? 'bg-white border-earth-800 shadow-md ring-1 ring-earth-800/10' : 'bg-earth-50 border-earth-100 opacity-60 cursor-pointer hover:opacity-100 hover:bg-white'}`}>
                    <div className="flex justify-between items-start mb-1">
                       <div>
                         <span className="text-[8px] font-black text-earth-300 uppercase block tracking-widest">{item.displayId}</span>
                         <h4 className="font-black text-earth-900 text-sm tracking-tight">{timelineOpConfig?.name || item.operationType}</h4>
                       </div>
                       {itemStatus && <div className="text-[7px] px-1.5 py-0.5 rounded font-black uppercase tracking-widest border" style={statusStyle.badge}>{itemStatus.name}</div>}
                    </div>
                    <div className="flex items-center gap-2 text-[9px] font-black">
                        <span className="text-earth-400">{new Date(item.createdDate).toLocaleDateString()}</span>
                        {daysDiff !== null && <span className="text-earth-900">+{daysDiff}D</span>}
                        <span className="text-earth-300 ml-auto">
                          {item.operationType.toLowerCase().includes('harvest') ? `${item.quantity} g` : `数量: ${item.quantity}`}
                        </span>
                    </div>
                 </div>
               </div>
             );
          })}
        </div>
      </div>
    </div>
  );
};

export default GrowDetail;
