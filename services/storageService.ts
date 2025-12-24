
import { getSupabase } from './supabaseClient';
import { Batch, UserConfigs, SpeciesConfig, Language, RecipeEntry, NoteEntry } from '../types';
import { DEFAULT_SPECIES_LIST, DEFAULT_OPERATION_LIST, DEFAULT_STATUS_LIST, DEFAULT_RECIPE_TYPES } from '../constants';

// --- BATCHES ---
export const getBatches = async (): Promise<Batch[]> => {
  try {
    const { data, error } = await getSupabase()
      .from('batches')
      .select('*')
      .order('created_date', { ascending: false });

    if (error) return [];
    return (data || []).map((row: any) => ({
      id: row.id,
      displayId: row.display_id,
      createdDate: row.created_date,
      species: row.species,
      operationType: row.operation_type,
      quantity: Number(row.quantity),
      parentId: row.parent_id,
      endDate: row.end_date,
      outcome: row.outcome,
      notes: row.notes,
      imageUrls: row.image_urls || []
    }));
  } catch (e) { return []; }
};

export const addBatch = async (batch: Batch, userId: string): Promise<Batch | null> => {
  const dbRow = {
    id: batch.id, user_id: userId, display_id: batch.displayId, created_date: batch.createdDate,
    species: batch.species, operation_type: batch.operationType, quantity: batch.quantity,
    unit: '', parent_id: batch.parentId || null, notes: batch.notes, outcome: batch.outcome,
    end_date: batch.endDate, image_urls: batch.imageUrls || []
  };
  await getSupabase().from('batches').insert([dbRow]);
  return batch;
};

export const addBatchBulk = async (batches: Batch[], userId: string): Promise<void> => {
    const dbRows = batches.map(b => ({
        id: b.id, user_id: userId, display_id: b.displayId, created_date: b.createdDate,
        species: b.species, operation_type: b.operationType, quantity: b.quantity,
        unit: '', parent_id: b.parentId || null, notes: b.notes, outcome: b.outcome,
        end_date: b.endDate, image_urls: b.imageUrls || []
    }));
    await getSupabase().from('batches').insert(dbRows);
};

export const updateBatch = async (batch: Batch): Promise<void> => {
  const dbRow = {
    display_id: batch.displayId, created_date: batch.createdDate, species: batch.species,
    operation_type: batch.operationType, quantity: batch.quantity, parent_id: batch.parentId,
    end_date: batch.endDate, outcome: batch.outcome, notes: batch.notes, image_urls: batch.imageUrls || []
  };
  await getSupabase().from('batches').update(dbRow).eq('id', batch.id);
};

export const updateBatchGroup = async (
  originalBatches: Batch[], newSpeciesName: string, newDate: string, newTotalCount: number, userId: string, configs: UserConfigs
): Promise<void> => {
    const supabase = getSupabase();
    let activeBatches = [...originalBatches];
    const oldSpecies = activeBatches[0].species;
    const oldDate = activeBatches[0].createdDate;
    
    if (oldSpecies !== newSpeciesName || oldDate !== newDate) {
        const newSpConfig = configs.species.find(s => s.name === newSpeciesName);
        const newAbbr = newSpConfig ? newSpConfig.abbreviation : newSpeciesName.substring(0, 2).toUpperCase();
        const d = new Date(newDate);
        const yymmdd = `${d.getFullYear().toString().slice(-2)}${(d.getMonth() + 1).toString().padStart(2, '0')}${d.getDate().toString().padStart(2, '0')}`;

        const updates = activeBatches.map(b => {
             const parts = b.displayId.split('-');
             if (parts.length >= 3) {
                 const seq = parts[parts.length - 1];
                 const datePart = parts.length === 3 ? yymmdd : parts.slice(0, parts.length - 2).join('-');
                 return { ...b, species: newSpeciesName, createdDate: newDate, displayId: `${datePart}-${newAbbr}-${seq}` };
             }
             return { ...b, species: newSpeciesName, createdDate: newDate };
        });
        for (const b of updates) await updateBatch(b);
        activeBatches = updates;
    }

    if (newTotalCount > activeBatches.length) {
        const countToAdd = newTotalCount - activeBatches.length;
        const refBatch = activeBatches[0];
        const parts = refBatch.displayId.split('-');
        const prefix = `${parts.slice(0, parts.length - 2).join('-')}-${parts[parts.length-2]}-`;
        const { data } = await supabase.from('batches').select('display_id').ilike('display_id', `${prefix}%`);
        let maxSeq = 0;
        (data || []).forEach((row: any) => {
             const m = row.display_id.match(/-(\d+)$/);
             if (m) maxSeq = Math.max(maxSeq, parseInt(m[1], 10));
        });
        const newBatches = Array.from({length: countToAdd}, (_, i) => ({ ...refBatch, id: crypto.randomUUID(), displayId: `${prefix}${(maxSeq + i + 1).toString().padStart(2, '0')}`, quantity: 1, imageUrls: [] }));
        await addBatchBulk(newBatches, userId);
    } else if (newTotalCount < activeBatches.length) {
        const toRemove = [...activeBatches].sort((a, b) => b.displayId.localeCompare(a.displayId)).slice(0, activeBatches.length - newTotalCount);
        await deleteBatchGroup(toRemove.map(b => b.id));
    }
};

export const deleteBatch = async (batchId: string): Promise<void> => {
  await getSupabase().from('batches').delete().eq('id', batchId);
};

export const deleteBatchGroup = async (batchIds: string[]): Promise<void> => {
  await getSupabase().from('batches').delete().in('id', batchIds);
};

export const updateBatchesForSpeciesChange = async (userId: string, oldName: string, newName: string, newAbbr: string, oldAbbr: string) => {
  const { data: batches } = await getSupabase().from('batches').select('*').eq('user_id', userId).eq('species', oldName);
  if (!batches) return;
  for (const batch of batches) {
    const regex = new RegExp(`^(.*)-${oldAbbr}-(\\d+)$`);
    const match = batch.display_id.match(regex);
    const newDisplayId = match ? `${match[1]}-${newAbbr}-${match[2]}` : batch.display_id;
    await getSupabase().from('batches').update({ species: newName, display_id: newDisplayId }).eq('id', batch.id);
  }
};

export const generateNextBatchIds = async (speciesName: string, dateStr: string, speciesList: SpeciesConfig[], count: number = 1, parentDisplayId?: string): Promise<string[]> => {
    const d = new Date(dateStr);
    const dateCode = `${d.getFullYear().toString().slice(-2)}${(d.getMonth() + 1).toString().padStart(2, '0')}${d.getDate().toString().padStart(2, '0')}`;
    const spConfig = speciesList.find(s => s.name === speciesName);
    const abbr = spConfig?.abbreviation || speciesName.substring(0, 2).toUpperCase();
    let prefixDate = dateCode;
    if (parentDisplayId && count > 1) {
        const parts = parentDisplayId.split('-');
        if (parts.length >= 3) prefixDate = `${parts.slice(0, parts.length - 2).join('-')}-${dateCode.slice(2)}`;
    }
    const prefix = `${prefixDate}-${abbr}-`;
    const { data } = await getSupabase().from('batches').select('display_id').ilike('display_id', `${prefix}%`);
    let maxSeq = 0;
    (data || []).forEach((row: any) => {
      const match = row.display_id.match(/-(\d+)$/);
      if (match) maxSeq = Math.max(maxSeq, parseInt(match[1], 10));
    });
    return Array.from({length: count}, (_, i) => `${prefix}${(maxSeq + i + 1).toString().padStart(2, '0')}`);
};

// Add expandBatch export to split batches as requested in GrowDetail.tsx
export const expandBatch = async (batch: Batch, newQuantity: number, userId: string): Promise<void> => {
    const supabase = getSupabase();
    const { data: configData } = await supabase.from('user_configs').select('config_value').eq('user_id', userId).eq('config_key', 'species_list').single();
    const speciesList = configData?.config_value || DEFAULT_SPECIES_LIST;

    const displayIds = await generateNextBatchIds(
        batch.species, 
        batch.createdDate, 
        speciesList, 
        newQuantity, 
        batch.parentId || undefined 
    );

    const newBatches: Batch[] = displayIds.map((displayId, i) => ({
        ...batch,
        id: crypto.randomUUID(),
        displayId: displayId,
        quantity: 1,
        notes: `Expanded from ${batch.displayId}. ${batch.notes || ''}`,
        imageUrls: [...(batch.imageUrls || [])]
    }));

    await addBatchBulk(newBatches, userId);
    await deleteBatch(batch.id);
};

export const uploadBatchImage = async (batchId: string, file: File, userId: string): Promise<string | null> => {
    const fileName = `${userId}/${batchId}/${Date.now()}.jpg`;
    const { error } = await getSupabase().storage.from('grow_images').upload(fileName, file);
    if (error) return null;
    const { data } = getSupabase().storage.from('grow_images').getPublicUrl(fileName);
    return data.publicUrl;
};

export const deleteBatchImage = async (batch: Batch, urlToDelete: string): Promise<void> => {
    const path = urlToDelete.split('/grow_images/')[1];
    if (path) await getSupabase().storage.from('grow_images').remove([path]);
    const newUrls = (batch.imageUrls || []).filter(u => u !== urlToDelete);
    await getSupabase().from('batches').update({ image_urls: newUrls }).eq('id', batch.id);
};

export const deleteImagesBeforeDate = async (userId: string, dateLimit: string): Promise<number> => {
    const { data: batches } = await getSupabase().from('batches').select('id, image_urls').eq('user_id', userId).lt('created_date', dateLimit).not('image_urls', 'is', null);
    if (!batches || batches.length === 0) return 0;
    const paths: string[] = [];
    batches.forEach((b: any) => b.image_urls?.forEach((url: string) => { const p = url.split('/grow_images/')[1]; if(p) paths.push(p); }));
    if (paths.length) await getSupabase().storage.from('grow_images').remove(paths);
    await getSupabase().from('batches').update({ image_urls: [] }).in('id', batches.map((b:any)=>b.id));
    return paths.length;
};

// --- NOTEBOOK SERVICES ---
export const getRecipes = async (userId: string): Promise<RecipeEntry[]> => {
    const { data } = await getSupabase().from('recipes').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    return data || [];
};

export const saveRecipe = async (userId: string, recipe: RecipeEntry): Promise<void> => {
    await getSupabase().from('recipes').upsert({ ...recipe, user_id: userId });
};

export const deleteRecipe = async (id: string): Promise<void> => {
    await getSupabase().from('recipes').delete().eq('id', id);
};

export const getNotes = async (userId: string): Promise<NoteEntry[]> => {
    const { data } = await getSupabase().from('notes').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    return data || [];
};

export const saveNote = async (userId: string, note: NoteEntry): Promise<void> => {
    await getSupabase().from('notes').upsert({ ...note, user_id: userId });
};

export const deleteNote = async (id: string): Promise<void> => {
    await getSupabase().from('notes').delete().eq('id', id);
};

// --- CONFIGS ---
export const getUserConfigs = async (userId: string): Promise<UserConfigs> => {
  const supabase = getSupabase();
  const fetchC = async (k: string) => (await supabase.from('user_configs').select('config_value').eq('user_id', userId).eq('config_key', k).single()).data?.config_value;
  let [s, o, st, rt, l] = await Promise.all([fetchC('species_list'), fetchC('operations_list'), fetchC('status_list'), fetchC('recipe_types'), fetchC('language')]);
  return {
    species: s || DEFAULT_SPECIES_LIST, operations: o || DEFAULT_OPERATION_LIST,
    statuses: st || DEFAULT_STATUS_LIST, recipeTypes: rt || DEFAULT_RECIPE_TYPES,
    language: (l as Language) || 'zh'
  };
};

export const saveUserConfigs = async (userId: string, configs: UserConfigs): Promise<void> => {
    const supabase = getSupabase();
    const saveC = (k: string, v: any) => supabase.from('user_configs').upsert({ user_id: userId, config_key: k, config_value: v });
    await Promise.all([
        saveC('species_list', configs.species), saveC('operations_list', configs.operations),
        saveC('status_list', configs.statuses), saveC('recipe_types', configs.recipeTypes),
        saveC('language', configs.language || 'zh')
    ]);
};
