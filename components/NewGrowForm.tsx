
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Batch, UserConfigs, Unit } from '../types';
import { addBatch, addBatchBulk, generateNextBatchIds, uploadBatchImage } from '../services/storageService';
import { ArrowLeft, Check, History, Sprout, Loader2, Info, Camera, Image as ImageIcon, X, CircleDot } from 'lucide-react';

interface OperationFormProps {
  onCancel: () => void;
  onSuccess: () => void;
  initialParentId?: string;
  existingBatches: Batch[];
  userId: string;
  userConfigs: UserConfigs;
}

const OperationForm: React.FC<OperationFormProps> = ({ onCancel, onSuccess, initialParentId, existingBatches, userId, userConfigs }) => {
  const [createdDate, setCreatedDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [operationType, setOperationType] = useState<string>('');
  const [selectedSpecies, setSelectedSpecies] = useState<string>('');
  
  const [parentId, setParentId] = useState<string>(initialParentId || '');
  const [quantity, setQuantity] = useState<number>(1);
  const [unit, setUnit] = useState<string>(Unit.BAG);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Image Upload State
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize selection
  useEffect(() => {
    if (!selectedSpecies && userConfigs.species.length > 0) {
      setSelectedSpecies(userConfigs.species[0].name);
    }
  }, [userConfigs, selectedSpecies]);

  // Update parentId if initialParentId changes
  useEffect(() => {
    if (initialParentId) {
      setParentId(initialParentId);
    }
  }, [initialParentId]);

  const parentBatch = useMemo(() => 
    existingBatches.find(b => b.id === parentId), 
  [parentId, existingBatches]);

  const activeSpecies = parentBatch ? parentBatch.species : selectedSpecies;
  
  const isHarvest = operationType === 'Harvest';
  const isFruiting = operationType === 'Fruiting' || operationType?.toLowerCase().includes('substrate'); 
  const showQuantity = true; // Most ops need a qty/weight

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!operationType || !activeSpecies) {
      alert("请选择操作类型和品种");
      return;
    }

    setIsSubmitting(true);
    
    try {
        let createdBatchIds: string[] = [];
        let displayIds: string[] = [];
        const isBulk = showQuantity && quantity > 1 && !isHarvest;
        const count = isBulk ? quantity : 1;

        if (isBulk) {
             displayIds = await generateNextBatchIds(
                activeSpecies, 
                createdDate, 
                userConfigs.species, 
                count
            );
        } else {
            displayIds = await generateNextBatchIds(activeSpecies, createdDate, userConfigs.species, 1);
        }

        for (let i = 0; i < count; i++) {
            createdBatchIds.push(crypto.randomUUID());
        }

        let uploadedImageUrl: string | null = null;
        if (selectedImage && createdBatchIds.length > 0) {
            uploadedImageUrl = await uploadBatchImage(createdBatchIds[0], selectedImage, userId);
        }

        const initialImages = uploadedImageUrl ? [uploadedImageUrl] : [];

        if (isBulk) {
            const newBatches: Batch[] = [];
            for (let i = 0; i < count; i++) {
                const itemNote = parentBatch ? `Batch ${i+1}/${count}. ${notes}` : notes;
                newBatches.push({
                    id: createdBatchIds[i],
                    displayId: displayIds[i],
                    createdDate,
                    operationType,
                    species: activeSpecies,
                    quantity: 1, 
                    unit: unit,
                    parentId: parentId || null,
                    notes: itemNote,
                    outcome: undefined,
                    endDate: undefined,
                    imageUrls: initialImages
                });
            }
            await addBatchBulk(newBatches, userId);

        } else {
            const newBatch: Batch = {
              id: createdBatchIds[0],
              displayId: displayIds[0],
              createdDate,
              operationType,
              species: activeSpecies,
              quantity: quantity, 
              unit: isHarvest ? 'g' : unit,
              parentId: parentId || null,
              notes,
              outcome: undefined,
              endDate: undefined,
              imageUrls: initialImages
            };
            await addBatch(newBatch, userId);
        }

        onSuccess();
    } catch (error: any) {
        console.error("Submission Failure:", error);
        const errorMsg = error.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
        alert(`保存失败: ${errorMsg}`);
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="pb-20">
      <div className="flex items-center space-x-4 mb-6">
        <button onClick={onCancel} className="p-2 hover:bg-earth-200 rounded-full transition-colors text-earth-800">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold text-earth-900">
          {parentBatch ? '接续记录' : '新建日志'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border border-earth-200 shadow-sm space-y-6">
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-earth-400 mb-1 ml-1">日期</label>
            <input
              type="date"
              required
              value={createdDate}
              onChange={(e) => setCreatedDate(e.target.value)}
              className="w-full p-3 border border-earth-200 rounded-lg focus:ring-2 focus:ring-earth-800 outline-none text-sm font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-earth-400 mb-1 ml-1">操作步骤</label>
            <select
              required
              value={operationType}
              onChange={(e) => setOperationType(e.target.value)}
              className="w-full p-3 border border-earth-200 rounded-lg focus:ring-2 focus:ring-earth-800 outline-none bg-white text-sm font-bold"
            >
              <option value="" disabled>选择操作...</option>
              {userConfigs.operations.map(op => (
                <option key={op.id} value={op.name}>{op.name}</option>
              ))}
            </select>
          </div>
        </div>

        {parentBatch && (
          <div className="bg-earth-50 p-4 rounded-lg border border-earth-100 flex items-start gap-3">
            <History className="mt-1 text-earth-500" size={18} />
            <div>
              <label className="text-xs font-bold text-earth-400 uppercase tracking-wide block mb-0.5">接续自</label>
              <div className="font-semibold text-earth-900 text-lg leading-tight">{parentBatch.displayId}</div>
              <div className="text-sm text-earth-600 mt-0.5">{parentBatch.species}</div>
            </div>
          </div>
        )}

        {!parentBatch && (
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-earth-400 mb-1 ml-1">菌种</label>
            <div className="relative">
              <Sprout className="absolute left-3 top-1/2 -translate-y-1/2 text-earth-400" size={18} />
              <select
                value={selectedSpecies}
                onChange={(e) => setSelectedSpecies(e.target.value)}
                className="w-full pl-10 pr-3 py-3 border border-earth-200 rounded-lg focus:ring-2 focus:ring-earth-800 outline-none bg-white appearance-none text-sm font-bold"
              >
                {userConfigs.species.map(s => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-earth-400 mb-1 ml-1">
              {isHarvest ? '采收重量 (g)' : '数量'}
            </label>
            <input
              type="number"
              min="1"
              step={isHarvest ? "0.1" : "1"}
              required
              value={quantity}
              onChange={(e) => setQuantity(parseFloat(e.target.value))}
              className="w-full p-3 border border-earth-200 rounded-lg focus:ring-2 focus:ring-earth-800 outline-none text-sm font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-earth-400 mb-1 ml-1">单位</label>
            <div className="relative">
              <CircleDot className="absolute left-3 top-1/2 -translate-y-1/2 text-earth-400" size={18} />
              <select
                disabled={isHarvest}
                value={isHarvest ? 'g' : unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full pl-10 pr-3 py-3 border border-earth-200 rounded-lg focus:ring-2 focus:ring-earth-800 outline-none bg-white appearance-none text-sm font-bold disabled:bg-earth-50"
              >
                {isHarvest ? (
                  <option value="g">克 (g)</option>
                ) : (
                  Object.values(Unit).map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))
                )}
              </select>
            </div>
          </div>
        </div>
        
        {quantity > 1 && !isHarvest && (
            <div className="p-3 rounded-lg border bg-blue-50 border-blue-100 flex gap-3">
                <Info className="text-blue-500 mt-0.5" size={18} />
                <div className="text-sm text-blue-800">
                    <span className="font-semibold block mb-0.5 text-xs uppercase tracking-widest">批量模式已启用</span>
                    系统将创建 <strong>{quantity}</strong> 条独立记录（每条数量为 1 {unit}）。
                </div>
            </div>
        )}

        <div>
           <label className="block text-xs font-black uppercase tracking-widest text-earth-400 mb-1 ml-1">备注</label>
           <textarea 
             value={notes}
             onChange={(e) => setNotes(e.target.value)}
             className="w-full p-3 border border-earth-200 rounded-lg focus:ring-2 focus:ring-earth-800 outline-none h-20 text-sm font-medium"
             placeholder="输入实验备注或环境观察..."
           />
        </div>

        <div>
            <label className="block text-xs font-black uppercase tracking-widest text-earth-400 mb-2 ml-1">现场照片</label>
            <div className="flex items-center gap-4">
                <input 
                    type="file" 
                    ref={fileInputRef}
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleImageSelect}
                />
                
                {!selectedImage ? (
                    <button 
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-4 bg-earth-50 border border-earth-200 rounded-2xl text-earth-600 hover:bg-earth-100 transition-colors w-full justify-center shadow-inner"
                    >
                        <Camera size={20} />
                        <span className="text-xs font-black uppercase tracking-widest">拍照 / 上传图片</span>
                    </button>
                ) : (
                    <div className="relative w-full">
                        <div className="flex items-center gap-3 p-3 border border-earth-200 rounded-2xl bg-earth-50 shadow-inner">
                            {previewUrl && (
                                <img src={previewUrl} alt="Preview" className="w-12 h-12 rounded-xl object-cover border border-earth-200" />
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-earth-900 truncate">{selectedImage.name}</p>
                                <p className="text-xs text-earth-500 font-mono">{(selectedImage.size / 1024).toFixed(0)} KB</p>
                            </div>
                            <button 
                                type="button" 
                                onClick={clearImage}
                                className="p-2 text-earth-400 hover:text-red-500 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-earth-800 text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] hover:bg-earth-900 shadow-xl flex justify-center items-center gap-3 disabled:opacity-70 disabled:cursor-wait transition-all active:scale-95"
          >
            {isSubmitting ? <Loader2 className="animate-spin" /> : <Check size={20} />}
            {isSubmitting ? '正在同步云端...' : '保存日志'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default OperationForm;
