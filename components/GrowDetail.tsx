
import React, { useState, useEffect, useRef } from 'react';
import { Batch, UserConfigs, Unit } from '../types';
import { updateBatch, uploadBatchImage, deleteBatchImage } from '../services/storageService';
import { getIconForOp, getStylesForColor, useTranslation } from '../constants';
import { ArrowLeft, CheckCircle, Loader2, Check, GitBranch, Pencil, Trash2, X, Camera, Image as ImageIcon, AlertCircle, Clock, Save } from 'lucide-react';

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
    setLineage(ancestors);
  }, [batch, allBatches]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updated = {
        ...batch,
        ...editForm,
        outcome,
        endDate: endDate || undefined
      } as Batch;
      await updateBatch(updated);
      onUpdate(updated);
      setIsEditing(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    setIsUploading(true);
    setUploadError(null);
    try {
      const url = await uploadBatchImage(batch.id, e.target.files[0], userId);
      if (url) {
        const updated = { ...batch, imageUrls: [...(batch.imageUrls || []), url] };
        await updateBatch(updated);
        onUpdate(updated);
      }
    } catch (err: any) {
      setUploadError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteImage = async (url: string) => {
    if (!confirm(t('confirm_q'))) return;
    try {
      await deleteBatchImage(url);
      const updated = { ...batch, imageUrls: (batch.imageUrls || []).filter(u => u !== url) };
      await updateBatch(updated);
      onUpdate(updated);
    } catch (err: any) {
      alert("Delete failed");
    }
  };

  const getDiffDays = (d1: string, d2: string) => {
    const start = new Date(d1);
    const end = new Date(d2);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const opConfig = userConfigs.operations.find(op => op.name.toLowerCase() === batch.operationType.toLowerCase());
  const opStyles = getStylesForColor(opConfig?.colorHex);
  const Icon = getIconForOp(opConfig?.name || batch.operationType);

  const fullLineage = [...lineage, batch];

  return (
    <div className="pb-24">
      <div className="flex items-center justify-between mb-8">
        <button onClick={onBack} className="p-2 hover:bg-earth-100 rounded-full transition-colors text-earth-800">
          <ArrowLeft size={24} />
        </button>
        <div className="flex gap-2">
          {!isEditing && (
            <button onClick={() => setIsEditing(true)} className="p-2 text-earth-500 hover:text-earth-900 bg-white border border-earth-200 rounded-lg shadow-sm">
              <Pencil size={20} />
            </button>
          )}
          <button onClick={() => onContinue(batch.id)} className="flex items-center gap-2 bg-earth-800 text-white px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest shadow hover:bg-earth-900 active:scale-95 transition-all">
            <GitBranch size={16} /> 接续
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-earth-200 shadow-sm overflow-hidden mb-6">
        <div className="p-8">
          <div className="flex items-center gap-6 mb-8">
            <div style={opStyles.bg} className="p-5 rounded-3xl border border-earth-100/50">
              <Icon size={32} />
            </div>
            <div>
              <div className="text-[10px] font-black text-earth-600 uppercase tracking-widest mb-1">Batch ID</div>
              <h2 className="text-2xl font-black text-earth-900 font-mono tracking-tight">{batch.displayId}</h2>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-earth-500 uppercase block tracking-widest mb-1">菌种</label>
                <div className="font-bold text-earth-900">{batch.species}</div>
              </div>
              <div>
                <label className="text-[10px] font-black text-earth-500 uppercase block tracking-widest mb-1">创建日期</label>
                <div className="font-bold text-earth-900">{batch.createdDate}</div>
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-earth-500 uppercase block tracking-widest mb-1">步骤</label>
                <div className="font-bold text-earth-900">{batch.operationType}</div>
              </div>
              <div>
                <label className="text-[10px] font-black text-earth-500 uppercase block tracking-widest mb-1">数量</label>
                <div className="font-bold text-earth-900">{batch.quantity} {batch.unit}</div>
              </div>
            </div>
          </div>

          {batch.notes && !isEditing && (
            <div className="mt-8 pt-8 border-t border-earth-50">
               <label className="text-[10px] font-black text-earth-500 uppercase block tracking-widest mb-2">备注</label>
               <p className="text-sm text-earth-900 leading-relaxed">{batch.notes}</p>
            </div>
          )}

          {isEditing && (
            <div className="mt-8 pt-8 border-t border-earth-100 space-y-4 animate-in fade-in slide-in-from-top-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-earth-600 uppercase block tracking-widest mb-1">状态</label>
                  <select value={outcome} onChange={e => setOutcome(e.target.value)} className="w-full p-3 bg-earth-50 border border-earth-200 rounded-lg text-sm font-bold outline-none">
                    <option value="">进行中</option>
                    {userConfigs.statuses.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-earth-600 uppercase block tracking-widest mb-1">结束日期</label>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-3 bg-earth-50 border border-earth-200 rounded-lg text-sm font-bold outline-none" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-earth-600 uppercase block tracking-widest mb-1">备注</label>
                <textarea 
                  value={editForm.notes} 
                  onChange={e => setEditForm({...editForm, notes: e.target.value})}
                  className="w-full p-4 bg-earth-50 border border-earth-200 rounded-lg text-sm font-medium outline-none min-h-[100px]"
                />
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={handleSave} 
                  disabled={isSaving}
                  className="flex-1 bg-earth-800 text-white py-4 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg flex justify-center items-center gap-2 transition-all active:scale-95"
                >
                  {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                  {isSaving ? '保存中...' : '确认修改'}
                </button>
                <button onClick={() => setIsEditing(false)} className="px-6 bg-earth-50 text-earth-500 rounded-xl font-black uppercase tracking-widest text-[10px]">取消</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-earth-200 shadow-sm p-8 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-earth-900 font-black uppercase tracking-widest text-[10px]">
             <ImageIcon size={18} /> 图片记录
          </div>
          <button 
            onClick={() => fileInputRef.current?.click()} 
            disabled={isUploading}
            className="text-[10px] font-black uppercase tracking-widest text-earth-600 flex items-center gap-1.5 hover:text-earth-900 transition-colors"
          >
            {isUploading ? <Loader2 className="animate-spin" size={14}/> : <Camera size={14} />} 添加照片
          </button>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
        </div>

        {uploadError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg text-[10px] text-red-600 font-black uppercase tracking-tighter flex gap-2 items-center">
            <AlertCircle size={14} /> {uploadError}
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          {batch.imageUrls && batch.imageUrls.map((url, i) => (
            <div key={i} className="aspect-square relative group rounded-2xl overflow-hidden border border-earth-100 bg-earth-50 shadow-inner">
              <img src={url} className="w-full h-full object-cover cursor-pointer" onClick={() => setViewImage(url)} />
              <button 
                onClick={() => handleDeleteImage(url)} 
                className="absolute top-1.5 right-1.5 p-1.5 bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          {(!batch.imageUrls || batch.imageUrls.length === 0) && (
            <div className="col-span-3 py-10 flex flex-col items-center justify-center text-earth-400 border-2 border-dashed border-earth-100 rounded-2xl">
               <Clock size={32} className="mb-2 opacity-20" />
               <p className="text-[10px] font-black uppercase tracking-widest">暂无图片</p>
            </div>
          )}
        </div>
      </div>

      {fullLineage.length > 1 && (
        <div className="bg-white rounded-[32px] border border-earth-200 shadow-sm p-8">
           <div className="flex items-center gap-2 text-earth-900 font-black uppercase tracking-widest text-[10px] mb-8">
             <GitBranch size={18} /> 血统追踪
           </div>
           <div className="space-y-0">
              {fullLineage.map((item, i) => {
                const isCurrent = item.id === batch.id;
                const nextItem = fullLineage[i + 1];
                const daysDiff = nextItem ? getDiffDays(item.createdDate, nextItem.createdDate) : 0;
                
                return (
                  <div key={item.id} className="relative">
                    <div 
                      onClick={() => !isCurrent && onNavigateToBatch?.(item)} 
                      className={`flex items-start gap-4 group ${!isCurrent ? 'cursor-pointer' : ''}`}
                    >
                      <div className="flex flex-col items-center shrink-0">
                        <div className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-300 ${isCurrent ? 'bg-earth-800 border-earth-800 ring-4 ring-earth-800/10' : 'border-earth-300 bg-white group-hover:bg-earth-800 group-hover:border-earth-800'}`}></div>
                        {i < fullLineage.length - 1 && (
                          <div className="w-0.5 h-24 bg-earth-100 relative">
                             {daysDiff > 0 && (
                               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-earth-100 text-earth-700 px-2 py-0.5 rounded-full text-[9px] font-black border border-white whitespace-nowrap z-10">
                                 +{daysDiff}D
                               </div>
                             )}
                          </div>
                        )}
                      </div>
                      
                      <div className={`flex-1 p-5 rounded-2xl border transition-all duration-300 shadow-sm ${isCurrent ? 'bg-earth-800 text-white border-earth-800' : 'bg-earth-50 group-hover:bg-earth-100 border-transparent group-hover:border-earth-200'}`}>
                        <div className={`text-[10px] font-black font-mono mb-1 ${isCurrent ? 'opacity-60' : 'text-earth-600'}`}>
                          {item.displayId} {isCurrent && '(CURRENT)'}
                        </div>
                        <div className="text-sm font-black mb-2">{item.operationType}</div>
                        <div className="flex justify-between items-center text-[10px] font-bold">
                           <span className={isCurrent ? 'opacity-80' : 'text-earth-600'}>{item.createdDate}</span>
                           <span className={isCurrent ? 'opacity-80' : 'text-earth-600'}>数量: {item.quantity} {item.unit}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
           </div>
        </div>
      )}

      {viewImage && (
        <div className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4 backdrop-blur-xl animate-in fade-in duration-300" onClick={() => setViewImage(null)}>
           <button className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors"><X size={32}/></button>
           <img src={viewImage} className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" />
        </div>
      )}

      {showSuccess && (
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4">
           <div className="bg-green-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 font-black uppercase tracking-widest text-[10px]">
             <CheckCircle size={16} /> 保存成功
           </div>
        </div>
      )}
    </div>
  );
};

export default GrowDetail;
