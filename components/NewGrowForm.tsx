
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Batch, UserConfigs, Unit } from '../types';
import { addBatch, addBatchBulk, generateNextBatchIds, uploadBatchImage } from '../services/storageService';
import { ArrowLeft, Check, History, Sprout, Loader2, Info, Camera, X, CircleDot, Image as ImageIcon } from 'lucide-react';

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

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // 分别定义相机和图库的引用
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!selectedSpecies && userConfigs.species.length > 0) {
      setSelectedSpecies(userConfigs.species[0].name);
    }
  }, [userConfigs, selectedSpecies]);

  const parentBatch = useMemo(() => existingBatches.find(b => b.id === parentId), [parentId, existingBatches]);
  const activeSpecies = parentBatch ? parentBatch.species : selectedSpecies;
  const isHarvest = operationType.toLowerCase().includes('harvest');

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!operationType || !activeSpecies) {
      alert("请填写完整表单（选择步骤和菌种）");
      return;
    }

    setIsSubmitting(true);
    try {
        // 增加数值安全性处理
        const safeQuantity = isNaN(quantity) || quantity <= 0 ? 1 : quantity;
        const isBulk = safeQuantity > 1 && !isHarvest;
        const count = isBulk ? Math.floor(safeQuantity) : 1;

        console.log(`[菌丝网络] 准备保存记录: ${activeSpecies}, 数量: ${count}`);

        // 1. 生成显示 ID
        const displayIds = await generateNextBatchIds(activeSpecies, createdDate, userConfigs.species, count);
        const createdBatchIds = Array.from({ length: count }, () => crypto.randomUUID());

        // 2. 上传图片（如果有）
        let uploadedImageUrl: string | null = null;
        if (selectedImage) {
            console.log("[菌丝网络] 正在上传图片...");
            uploadedImageUrl = await uploadBatchImage(createdBatchIds[0], selectedImage, userId);
        }

        const initialImages = uploadedImageUrl ? [uploadedImageUrl] : [];

        // 3. 写入数据库
        if (isBulk) {
            const newBatches: Batch[] = displayIds.map((id, i) => ({
                id: createdBatchIds[i], 
                displayId: id, 
                createdDate, 
                operationType,
                species: activeSpecies, 
                quantity: 1, 
                unit, 
                parentId: parentId || null,
                notes, 
                outcome: undefined, 
                endDate: undefined, 
                imageUrls: initialImages
            }));
            await addBatchBulk(newBatches, userId);
        } else {
            await addBatch({
                id: createdBatchIds[0], 
                displayId: displayIds[0], 
                createdDate, 
                operationType,
                species: activeSpecies, 
                quantity: safeQuantity, 
                unit: isHarvest ? 'g' : unit,
                parentId: parentId || null, 
                notes, 
                imageUrls: initialImages
            }, userId);
        }
        
        console.log("[菌丝网络] 保存成功，触发刷新。");
        onSuccess();
    } catch (error: any) { 
        console.error("[菌丝网络] 保存失败:", error);
        alert("保存失败: " + (error.message || "未知错误")); 
    } finally { 
        setIsSubmitting(false); 
    }
  };

  return (
    <div className="pb-20">
      <div className="flex items-center space-x-3 mb-6">
        <button onClick={onCancel} className="p-2 hover:bg-earth-100 rounded-full transition-colors text-earth-800"><ArrowLeft size={24} /></button>
        <h1 className="text-xl font-black text-earth-900">{parentBatch ? '接续记录' : '新建日志'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg border border-earth-200 shadow-sm space-y-6">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-earth-400 mb-1 ml-1">日期</label>
            <input type="date" required value={createdDate} onChange={(e) => setCreatedDate(e.target.value)} className="w-full p-3 border border-earth-200 rounded-lg outline-none text-sm font-bold" />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-earth-400 mb-1 ml-1">步骤</label>
            <select required value={operationType} onChange={(e) => setOperationType(e.target.value)} className="w-full p-3 border border-earth-200 rounded-lg outline-none bg-white text-sm font-bold">
              <option value="" disabled>选择...</option>
              {userConfigs.operations.map(op => <option key={op.id} value={op.name}>{op.name}</option>)}
            </select>
          </div>
        </div>

        {parentBatch && (
          <div className="bg-earth-50 p-4 rounded-lg border border-earth-100 flex items-start gap-2">
            <History className="mt-0.5 text-earth-400" size={16} />
            <div>
              <label className="text-[10px] font-black text-earth-300 uppercase block tracking-widest">源自</label>
              <div className="font-bold text-earth-900 text-sm leading-tight">{parentBatch.displayId}</div>
            </div>
          </div>
        )}

        {!parentBatch && (
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-earth-400 mb-1 ml-1">菌种</label>
            <select value={selectedSpecies} onChange={(e) => setSelectedSpecies(e.target.value)} className="w-full p-3 border border-earth-200 rounded-lg outline-none bg-white text-sm font-bold">
              {userConfigs.species.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className={isHarvest ? 'col-span-1' : 'col-span-2'}>
            <label className="block text-[10px] font-black uppercase tracking-widest text-earth-400 mb-1 ml-1">
              {isHarvest ? '收获克重' : '数量'}
            </label>
            <input type="number" min="0.1" step={isHarvest ? "0.1" : "1"} required value={quantity} onChange={(e) => setQuantity(parseFloat(e.target.value))} className="w-full p-3 border border-earth-200 rounded-lg outline-none text-sm font-bold" />
          </div>
          {isHarvest && (
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-earth-400 mb-1 ml-1">单位</label>
              <div className="w-full p-3 bg-earth-50 border border-earth-200 rounded-lg text-sm font-black text-earth-400 uppercase tracking-widest">
                克 (g)
              </div>
            </div>
          )}
        </div>
        
        {quantity > 1 && !isHarvest && (
            <div className="p-3 rounded-lg border bg-blue-50 border-blue-100 flex gap-2">
                <Info className="text-blue-500 mt-0.5 shrink-0" size={14} />
                <p className="text-[10px] text-blue-800 font-black uppercase tracking-tight">将自动创建 {Math.floor(quantity)} 条独立记录</p>
            </div>
        )}

        <div>
           <label className="block text-[10px] font-black uppercase tracking-widest text-earth-400 mb-1 ml-1">备注</label>
           <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full p-3 border border-earth-200 rounded-lg outline-none h-20 text-sm font-medium" />
        </div>

        <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-earth-400 mb-2 ml-1">现场照片</label>
            <div className="space-y-3">
                {/* 隐藏的文件输入框 */}
                <input type="file" ref={cameraInputRef} accept="image/*" capture="environment" className="hidden" onChange={handleImageSelect} />
                <input type="file" ref={galleryInputRef} accept="image/*" className="hidden" onChange={handleImageSelect} />

                {!selectedImage ? (
                    <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => cameraInputRef.current?.click()} className="flex items-center gap-2 px-4 py-3 bg-earth-50 border border-earth-200 rounded-xl text-earth-600 justify-center transition-all active:scale-95 hover:bg-earth-100">
                            <Camera size={18} />
                            <span className="text-[10px] font-black uppercase tracking-widest">拍照记录</span>
                        </button>
                        <button type="button" onClick={() => galleryInputRef.current?.click()} className="flex items-center gap-2 px-4 py-3 bg-earth-50 border border-earth-200 rounded-xl text-earth-600 justify-center transition-all active:scale-95 hover:bg-earth-100">
                            <ImageIcon size={18} />
                            <span className="text-[10px] font-black uppercase tracking-widest">添加照片</span>
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 p-2 border border-earth-200 rounded-lg bg-earth-50 w-full animate-in fade-in slide-in-from-bottom-2">
                        <img src={previewUrl!} className="w-10 h-10 rounded object-cover shadow-sm" />
                        <span className="text-[10px] font-black text-earth-900 truncate flex-1">{selectedImage.name}</span>
                        <button type="button" onClick={() => { setSelectedImage(null); setPreviewUrl(null); }} className="p-1 text-earth-300 hover:text-red-500"><X size={16} /></button>
                    </div>
                )}
            </div>
        </div>

        <button type="submit" disabled={isSubmitting} className="w-full bg-earth-800 text-white py-4 rounded-lg font-black uppercase tracking-widest text-[10px] shadow-lg flex justify-center items-center gap-2 disabled:opacity-50 transition-all active:scale-95">
            {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
            {isSubmitting ? '同步中...' : '保存日志'}
        </button>
      </form>
    </div>
  );
};

export default OperationForm;
