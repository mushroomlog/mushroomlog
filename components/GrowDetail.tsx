import React, { useState, useEffect, useRef } from 'react';
import { Batch, UserConfigs } from '../types';
import { updateBatch, deleteBatch, expandBatch, uploadBatchImage, deleteBatchImage } from '../services/storageService';
import { getIconForOp, getStylesForColor } from '../constants';
import { ArrowLeft, Save, CheckCircle, ArrowDown, Loader2, Check, GitBranch, Pencil, Trash2, X, Camera, Image as ImageIcon, Maximize2, ExternalLink, Scale } from 'lucide-react';

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
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const [viewImage, setViewImage] = useState<string | null>(null);
  const [deleteImageUrl, setDeleteImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [outcome, setOutcome] = useState<string | undefined>(batch.outcome);
  const [endDate, setEndDate] = useState<string>(batch.endDate || '');
  const [editForm, setEditForm] = useState<Partial<Batch>>({});
  const [lineage, setLineage] = useState<Batch[]>([]);

  useEffect(() => {
    setOutcome(batch.outcome);
    setEndDate(batch.endDate || '');
    setEditForm({ createdDate: batch.createdDate, operationType: batch.operationType, species: batch.species, quantity: batch.quantity, notes: batch.notes || '' });
    setShowDeleteConfirm(false);
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

  const totalYield = lineage.filter(item => item.operationType.toLowerCase().includes('harvest')).reduce((sum, item) => sum + (item.quantity || 0), 0);

  const calculateDuration = (start: string, end: string) => Math.ceil(Math.abs(new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24));

  const handleSaveResult = async () => {
    setIsSaving(true);
    const updatedBatch: Batch = { ...batch, outcome, endDate: endDate || undefined };
    try {
      await updateBatch(updatedBatch);
      onUpdate(updatedBatch); 
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (e) { alert("Failed to update."); } finally { setIsSaving(false); }
  };

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
    } catch (e) { alert("Failed to save changes."); } finally { setIsSaving(false); }
  };

  const handleDelete = async () => {
    try { setIsSaving(true); await deleteBatch(batch.id); onDelete(); } catch (e: any) { alert("Failed to delete."); setIsSaving(false); }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setIsUploading(true);
    try {
        const publicUrl = await uploadBatchImage(batch.id, e.target.files[0], userId);
        if (publicUrl) {
            const updatedBatch = { ...batch, imageUrls: [...(batch.imageUrls || []), publicUrl] };
            await updateBatch(updatedBatch);
            onUpdate(updatedBatch);
        }
    } catch (err) { console.error(err); } finally { setIsUploading(false); }
  };

  const handleDeleteImage = async (url: string) => {
      try { await deleteBatchImage(batch, url); onUpdate({ ...batch, imageUrls: (batch.imageUrls || []).filter(u => u !== url) }); setDeleteImageUrl(null); } catch (e) { alert("Failed to delete image."); }
  };

  const opConfig = userConfigs.operations.find(op => op.name === (isEditing ? editForm.operationType : batch.operationType));
  const opStyles = getStylesForColor(opConfig?.colorHex);
  const OpIcon = getIconForOp(isEditing ? editForm.operationType || '' : batch.operationType);
  const speciesConfig = userConfigs.species.find(s => s.name === (isEditing ? editForm.species : batch.species));
  const speciesStyles = getStylesForColor(speciesConfig?.colorHex);

  return (
    <div className="space-y-6 pb-20">
      {viewImage && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setViewImage(null)}>
           <img src={viewImage} alt="Full view" className="max-w-full max-h-[90vh] object-contain rounded-lg" />
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button onClick={onBack} className="p-2 hover:bg-earth-200 rounded-full text-earth-800"><ArrowLeft size={24} /></button>
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-bold text-earth-900 truncate">{batch.displayId}</h1>
            {!isEditing && <span className={`text-xs px-2 py-0.5 rounded-full inline-block border`} style={speciesStyles.badge}>{batch.species}</span>}
          </div>
        </div>
        <div className="flex gap-2 items-center">
           {!isEditing && (
               <>
                 <input type="file" ref={fileInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleImageUpload} />
                 <button onClick={() => fileInputRef.current?.click()} className="p-2 bg-earth-50 text-earth-600 rounded-full border border-earth-200 shadow-sm" disabled={isUploading}>
                    {isUploading ? <Loader2 size={20} className="animate-spin" /> : <Camera size={20} />}
                 </button>
               </>
           )}
          {!isEditing ? (
            <>
              {!showDeleteConfirm ? (
                  <>
                    <button onClick={() => setIsEditing(true)} className="p-2 text-earth-500 hover:bg-earth-100 rounded-full"><Pencil size={20} /></button>
                    <button onClick={() => setShowDeleteConfirm(true)} className="p-2 text-earth-400 hover:text-red-500 rounded-full"><Trash2 size={20} /></button>
                  </>
              ) : (
                  <div className="flex items-center bg-red-50 rounded-full pl-3 pr-1 py-1 border border-red-100 animate-in fade-in slide-in-from-right-4 duration-200">
                      <span className="text-xs font-bold text-red-600 mr-2">Confirm?</span>
                      <button onClick={handleDelete} className="p-1.5 bg-red-600 text-white rounded-full" disabled={isSaving}>{isSaving ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}</button>
                      <button onClick={() => setShowDeleteConfirm(false)} className="p-1.5 ml-1 text-red-400 hover:bg-red-100 rounded-full"><X size={14} /></button>
                  </div>
              )}
            </>
          ) : (
            <button onClick={() => setIsEditing(false)} className="p-2 text-earth-500 hover:bg-earth-100 rounded-full"><X size={20} /></button>
          )}
        </div>
      </div>

      <div className="bg-white p-5 rounded-xl border border-earth-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-2 rounded-bl-xl" style={opStyles.bg}><OpIcon size={20} style={{ color: opConfig?.colorHex }} /></div>
        <div className="space-y-4">
          {isEditing ? (
            <div className="space-y-4 pr-8">
               <div><label className="text-xs font-semibold text-earth-400 uppercase tracking-wide">Stages</label><select value={editForm.operationType} onChange={(e) => setEditForm(prev => ({ ...prev, operationType: e.target.value }))} className="w-full mt-1 p-2 border border-earth-200 rounded-md text-sm">{userConfigs.operations.map(op => <option key={op.id} value={op.name}>{op.name}</option>)}</select></div>
               <div><label className="text-xs font-semibold text-earth-400 uppercase tracking-wide">Species</label><select value={editForm.species} onChange={(e) => setEditForm(prev => ({ ...prev, species: e.target.value }))} className="w-full mt-1 p-2 border border-earth-200 rounded-md text-sm">{userConfigs.species.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}</select></div>
               <div className="flex gap-4">
                  <div className="flex-1"><label className="text-xs font-semibold text-earth-400 uppercase tracking-wide">Date</label><input type="date" value={editForm.createdDate} onChange={(e) => setEditForm(prev => ({ ...prev, createdDate: e.target.value }))} className="w-full mt-1 p-2 border border-earth-200 rounded-md text-sm"/></div>
                  <div className="flex-1"><label className="text-xs font-semibold text-earth-400 uppercase tracking-wide">Quantity</label><input type="number" value={editForm.quantity} onChange={(e) => setEditForm(prev => ({ ...prev, quantity: Number(e.target.value) }))} className="w-full mt-1 p-2 border border-earth-200 rounded-md text-sm"/></div>
               </div>
               <div><label className="text-xs font-semibold text-earth-400 uppercase tracking-wide">Notes</label><textarea value={editForm.notes} onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))} className="w-full mt-1 p-2 border border-earth-200 rounded-md text-sm"/></div>
               <button onClick={handleFullSave} disabled={isSaving} className="w-full bg-earth-600 text-white py-2 rounded-lg font-bold flex items-center justify-center gap-2 mt-4">{isSaving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18} />}Update Batch Info</button>
            </div>
          ) : (
            <>
              <div><label className="text-xs font-semibold text-earth-400 uppercase tracking-wide">Stages</label><p className="text-lg font-medium text-earth-900">{batch.operationType}</p><p className="text-sm text-earth-500">{new Date(batch.createdDate).toLocaleDateString()}</p></div>
              <div><label className="text-xs font-semibold text-earth-400 uppercase tracking-wide">Quantity</label><p className="text-earth-900">{batch.quantity}</p></div>
              {batch.notes && <div className="bg-earth-50 p-3 rounded-lg text-sm text-earth-700 italic border border-earth-100">"{batch.notes}"</div>}
              <div className="pt-2 border-t border-earth-100">
                <button onClick={() => onContinue(batch.id)} className="w-full bg-earth-50 text-earth-700 border border-earth-200 p-3 rounded-lg font-semibold flex justify-center items-center gap-2 transition-colors"><GitBranch size={18} />接续记录</button>
              </div>
            </>
          )}
        </div>
      </div>
      
      {batch.imageUrls && batch.imageUrls.length > 0 && (
          <div className="space-y-4">
              <h2 className="text-sm font-bold text-earth-900 flex items-center gap-2 px-1"><ImageIcon size={16} />Photos</h2>
              <div className="grid grid-cols-3 gap-2">
                  {batch.imageUrls.map((url, idx) => (
                      <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-earth-200 group">
                          <img src={url} alt={`Log ${idx}`} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center gap-2">
                             <button onClick={() => setViewImage(url)} className="opacity-0 group-hover:opacity-100 p-1.5 bg-white/90 rounded-full text-earth-800"><Maximize2 size={16} /></button>
                             <button onClick={() => setDeleteImageUrl(url)} className="opacity-0 group-hover:opacity-100 p-1.5 bg-red-500 rounded-full text-white"><Trash2 size={16} /></button>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {deleteImageUrl && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
              <div className="bg-white p-6 rounded-xl w-full max-w-xs space-y-4">
                  <h3 className="font-bold text-lg text-center">Delete Photo?</h3>
                  <div className="flex gap-2">
                      <button onClick={() => setDeleteImageUrl(null)} className="flex-1 py-2 border border-earth-200 rounded-lg">Cancel</button>
                      <button onClick={() => handleDeleteImage(deleteImageUrl!)} className="flex-1 py-2 bg-red-500 text-white rounded-lg">Delete</button>
                  </div>
              </div>
          </div>
      )}

      {batch.operationType !== 'Harvest' && (
          <div className="bg-white p-5 rounded-xl border border-earth-200 shadow-sm">
            <h2 className="text-lg font-bold text-earth-900 mb-4">Growth Status</h2>
            <div className="space-y-4">
               <div><label className="block text-sm font-medium text-earth-700 mb-2">End Date</label><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full p-2 border border-earth-200 rounded-lg text-sm" /></div>
               <div>
                 <label className="block text-sm font-medium text-earth-700 mb-2">Current Status</label>
                 <div className="grid grid-cols-2 gap-2">
                   {userConfigs.statuses.map(s => {
                       const styles = getStylesForColor(s.colorHex);
                       return <button key={s.id} onClick={() => setOutcome(s.name)} className={`p-2 rounded-lg border text-xs font-bold ${outcome === s.name ? 'ring-2 ring-offset-1 ring-earth-300' : ''}`} style={outcome === s.name ? styles.solid : styles.badge}>{s.name}</button>;
                   })}
                 </div>
               </div>
               <button onClick={handleSaveResult} disabled={isSaving} className={`w-full py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 ${showSuccess ? 'bg-green-600 text-white' : 'bg-earth-600 text-white'}`}>
                 {isSaving ? <Loader2 size={16} className="animate-spin" /> : showSuccess ? <Check size={16} /> : <Save size={16} />}{isSaving ? 'Saving...' : showSuccess ? 'Saved!' : 'Save Result'}
               </button>
            </div>
          </div>
      )}

      <div>
        <h2 className="text-lg font-bold text-earth-900 mb-4 px-1">Lineage Timeline</h2>
        <div className="relative pl-4 space-y-0">
          {lineage.map((item, index) => {
             const isCurrent = item.id === batch.id;
             const itemStatus = item.outcome ? userConfigs.statuses.find(s => s.name === item.outcome) : null;
             const statusStyle = getStylesForColor(itemStatus?.colorHex);
             const prevItem = index > 0 ? lineage[index - 1] : null;
             const daysDiff = prevItem ? calculateDuration(prevItem.createdDate, item.createdDate) : null;
             const ownDuration = item.endDate ? calculateDuration(item.createdDate, item.endDate) : null;
             return (
               <div key={item.id} className="relative pb-12 last:pb-0">
                 {index > 0 && <div className="absolute left-[19px] -top-10 bottom-10 w-0.5 bg-earth-300 -z-10"></div>}
                 {daysDiff !== null && <div className="absolute left-[20px] -translate-x-1/2 -top-6 z-20"><span className="bg-earth-800 text-earth-50 text-[10px] px-2 py-0.5 rounded-full">{daysDiff} Days</span></div>}
                 <div className="flex gap-4">
                   <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center border-2 ${isCurrent ? 'bg-earth-600 border-earth-600 text-white' : 'bg-white border-earth-200 text-earth-400'}`}>{isCurrent ? <ArrowDown size={20} /> : <CheckCircle size={20} />}</div>
                   <div onClick={() => !isCurrent && onNavigateToBatch?.(item)} className={`flex-1 p-3 rounded-xl border transition-all relative group ${isCurrent ? 'bg-white border-earth-300 shadow-md' : 'bg-earth-50 border-earth-100 opacity-80 cursor-pointer'}`}>
                     <div className="flex justify-between items-start">
                       <div><span className="text-xs font-bold text-earth-500 block mb-0.5">{item.displayId}</span><h4 className="font-semibold text-earth-900 text-sm">{item.operationType}</h4></div>
                       <div className="flex flex-col items-end gap-1">
                          {itemStatus && <div className="text-[10px] px-2 py-0.5 rounded-full font-bold border" style={statusStyle.badge}>{itemStatus.name}</div>}
                          {!isCurrent && <ExternalLink size={14} className="text-earth-300" />}
                       </div>
                     </div>
                     <p className="text-xs text-earth-500 mt-1">{new Date(item.createdDate).toLocaleDateString()}{item.endDate && ` - ${new Date(item.endDate).toLocaleDateString()}`} {ownDuration !== null && `(${ownDuration} Days)`}</p>
                   </div>
                 </div>
               </div>
             );
          })}
        </div>
      </div>

      {totalYield > 0 && (
          <div className="bg-earth-900 text-white p-5 rounded-2xl shadow-lg flex items-center justify-between border border-earth-800">
              <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-earth-300"><Scale size={24} /></div>
                  <div><h3 className="text-xs font-bold uppercase tracking-widest text-earth-400">累计收成</h3><p className="text-2xl font-black">{totalYield.toLocaleString()} <span className="text-sm font-normal text-earth-400">g</span></p></div>
              </div>
          </div>
      )}
    </div>
  );
};

export default GrowDetail;