import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Batch, UserConfigs } from '../types';
import { addBatch, addBatchBulk, generateNextBatchIds, uploadBatchImage } from '../services/storageService';
import { ArrowLeft, Check, History, Sprout, Loader2, Info, Camera, Image as ImageIcon, X } from 'lucide-react';

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
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Image Upload State
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize selection
  useEffect(() => {
    // Only auto-select species, leave operation empty for user to choose
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
  
  // Logic checks
  const isHarvest = operationType === 'Harvest';
  const isFruiting = operationType === 'Fruiting'; // Check for Fruiting
  const showQuantity = !isFruiting; // Hide quantity if Fruiting

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
      alert("Please select operation and species");
      return;
    }

    setIsSubmitting(true);
    
    try {
        // 1. Prepare IDs and Structure first
        let createdBatchIds: string[] = [];
        let displayIds: string[] = [];
        const isBulk = showQuantity && quantity > 1 && !isHarvest;
        const count = isBulk ? quantity : 1;

        if (isBulk) {
             displayIds = await generateNextBatchIds(
                activeSpecies, 
                createdDate, 
                userConfigs.species, 
                count, 
                parentBatch?.displayId 
            );
        } else {
            displayIds = await generateNextBatchIds(activeSpecies, createdDate, userConfigs.species, 1);
            if (parentBatch && !isBulk) {
                // If continue 1-to-1, keep parent ID (unless it creates conflict, but standard logic is inherit)
                // Actually, standard logic for 1-to-1 is usually inherit. 
                // But let's stick to the generated one if we want strict tracking? 
                // No, requirement was "inherit ID if 1-to-1".
                displayIds = [parentBatch.displayId];
            }
        }

        for (let i = 0; i < count; i++) {
            createdBatchIds.push(crypto.randomUUID());
        }

        // 2. Upload Image (If exists) - Do this BEFORE saving to DB
        let uploadedImageUrl: string | null = null;
        if (selectedImage && createdBatchIds.length > 0) {
            // Use the first ID for the file path
            uploadedImageUrl = await uploadBatchImage(createdBatchIds[0], selectedImage, userId);
        }

        // 3. Construct and Save Batches
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
                    parentId: parentId || null,
                    notes: itemNote,
                    outcome: undefined,
                    endDate: undefined,
                    imageUrls: initialImages // Attach image here!
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
              quantity: showQuantity ? quantity : 1, 
              parentId: parentId || null,
              notes,
              outcome: undefined,
              endDate: undefined,
              imageUrls: initialImages // Attach image here!
            };
            await addBatch(newBatch, userId);
        }

        onSuccess();
    } catch (error) {
        console.error("Error submitting batch", error);
        alert("Failed to save. Check connection.");
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
          {parentBatch ? 'Continue Lineage' : 'New Log'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border border-earth-200 shadow-sm space-y-6">
        
        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-earth-700 mb-1">Date</label>
          <input
            type="date"
            required
            value={createdDate}
            onChange={(e) => setCreatedDate(e.target.value)}
            className="w-full p-3 border border-earth-200 rounded-lg focus:ring-2 focus:ring-earth-500 outline-none"
          />
        </div>

        {/* Operation Type */}
        <div>
          <label className="block text-sm font-medium text-earth-700 mb-1">Operation</label>
          <select
            value={operationType}
            onChange={(e) => setOperationType(e.target.value)}
            className="w-full p-3 border border-earth-200 rounded-lg focus:ring-2 focus:ring-earth-500 outline-none bg-white"
          >
            <option value="" disabled>Select Operation...</option>
            {userConfigs.operations.map(op => (
              <option key={op.id} value={op.name}>{op.name}</option>
            ))}
          </select>
        </div>

        {/* Context Info */}
        {parentBatch && (
          <div className="bg-earth-50 p-4 rounded-lg border border-earth-100 flex items-start gap-3">
            <History className="mt-1 text-earth-500" size={18} />
            <div>
              <label className="text-xs font-bold text-earth-400 uppercase tracking-wide block mb-0.5">Continuing Lineage</label>
              <div className="font-semibold text-earth-900 text-lg leading-tight">{parentBatch.displayId}</div>
              <div className="text-sm text-earth-600 mt-0.5">{parentBatch.species}</div>
            </div>
          </div>
        )}

        {!parentBatch && (
          <div>
            <label className="block text-sm font-medium text-earth-700 mb-1">Species</label>
            <div className="relative">
              <Sprout className="absolute left-3 top-1/2 -translate-y-1/2 text-earth-400" size={18} />
              <select
                value={selectedSpecies}
                onChange={(e) => setSelectedSpecies(e.target.value)}
                className="w-full pl-10 pr-3 py-3 border border-earth-200 rounded-lg focus:ring-2 focus:ring-earth-500 outline-none bg-white appearance-none"
              >
                {userConfigs.species.map(s => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Quantity - Hidden if Fruiting */}
        {showQuantity && (
          <div>
            <label className="block text-sm font-medium text-earth-700 mb-1">
              {isHarvest ? 'Harvest Weight (g)' : 'Quantity'}
            </label>
            <input
              type="number"
              min="1"
              required
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value))}
              className="w-full p-3 border border-earth-200 rounded-lg focus:ring-2 focus:ring-earth-500 outline-none"
            />
          </div>
        )}
        
        {/* Info Box for Bulk Creation */}
        {showQuantity && !isHarvest && quantity > 1 && (
            <div className="p-3 rounded-lg border bg-blue-50 border-blue-100 flex gap-3">
                <Info className="text-blue-500 mt-0.5" size={18} />
                <div className="text-sm text-blue-800">
                    <span className="font-semibold block mb-0.5">Expansion Detected</span>
                    Creating <strong>{quantity}</strong> unique entries for individual tracking. IDs will chain dates.
                </div>
            </div>
        )}

        {/* Notes */}
        <div>
           <label className="block text-sm font-medium text-earth-700 mb-1">Notes</label>
           <textarea 
             value={notes}
             onChange={(e) => setNotes(e.target.value)}
             className="w-full p-3 border border-earth-200 rounded-lg focus:ring-2 focus:ring-earth-500 outline-none h-20"
           />
        </div>

        {/* Image Upload */}
        <div>
            <label className="block text-sm font-medium text-earth-700 mb-2">Photo</label>
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
                        className="flex items-center gap-2 px-4 py-3 bg-earth-50 border border-earth-200 rounded-lg text-earth-600 hover:bg-earth-100 transition-colors w-full justify-center"
                    >
                        <Camera size={20} />
                        <span>Take / Upload Photo</span>
                    </button>
                ) : (
                    <div className="relative w-full">
                        <div className="flex items-center gap-3 p-2 border border-earth-200 rounded-lg bg-earth-50">
                            {previewUrl && (
                                <img src={previewUrl} alt="Preview" className="w-12 h-12 rounded object-cover border border-earth-200" />
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-earth-900 truncate">{selectedImage.name}</p>
                                <p className="text-xs text-earth-500">{(selectedImage.size / 1024).toFixed(0)} KB</p>
                            </div>
                            <button 
                                type="button" 
                                onClick={clearImage}
                                className="p-2 text-earth-400 hover:text-red-500"
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
            className="w-full bg-earth-600 text-white py-3 rounded-lg font-bold hover:bg-earth-700 shadow-md flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-wait"
          >
            {isSubmitting ? <Loader2 className="animate-spin" /> : <Check size={20} />}
            {isSubmitting ? 'Saving...' : ((showQuantity && quantity > 1 && !isHarvest) ? `Save ${quantity} Entries` : 'Save Entry')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default OperationForm;