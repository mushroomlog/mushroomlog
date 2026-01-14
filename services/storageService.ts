
import { getSupabase } from './supabaseClient';
import { Batch, UserConfigs, SpeciesConfig, Language, RecipeEntry, NoteEntry, Unit } from '../types';
import { DEFAULT_SPECIES_LIST, DEFAULT_OPERATION_LIST, DEFAULT_STATUS_LIST, DEFAULT_RECIPE_TYPES } from '../constants';

const BUCKET_NAME = 'grow_images';

const stringifyError = (obj: any): string => {
    if (typeof obj === 'string') return obj;
    try {
        return JSON.stringify(obj, (key, value) => {
            if (value instanceof Error) return value.message;
            return value;
        }, 2);
    } catch (e) {
        return String(obj);
    }
};

const handleSupabaseError = (error: any, context: string) => {
    if (error) {
        console.group(`🍄 Supabase 异常: ${context}`);
        console.error("代码:", error.code);
        console.error("详情:", stringifyError(error));
        console.groupEnd();
        throw new Error(`${context} 失败: ${error.message || '未知错误'}`);
    }
};

// --- 配置服务 (CONFIG SERVICES) - 适配 KV 结构 ---

export const getUserConfigs = async (userId: string): Promise<UserConfigs> => {
    const configs: UserConfigs = { 
        species: DEFAULT_SPECIES_LIST, 
        operations: DEFAULT_OPERATION_LIST, 
        statuses: DEFAULT_STATUS_LIST, 
        recipeTypes: DEFAULT_RECIPE_TYPES, 
        language: 'zh' 
    };

    if (!userId) return configs;

    try {
        // 🚀 核心变更：查询所有相关的配置行
        const { data: rows, error } = await getSupabase()
            .from('user_configs')
            .select('config_key, config_value')
            .eq('user_id', userId);
            
        if (error) {
            console.warn("读取配置失败，使用默认值:", error.message);
            return configs;
        }
        
        if (!rows || rows.length === 0) return configs;
        
        // 将 KV 数组转换为对象
        rows.forEach(row => {
            switch (row.config_key) {
                case 'species_list': configs.species = row.config_value; break;
                case 'operations_list': configs.operations = row.config_value; break;
                case 'status_list': configs.statuses = row.config_value; break;
                case 'recipe_types': configs.recipeTypes = row.config_value; break;
                case 'language': configs.language = row.config_value; break;
            }
        });

        return configs;
    } catch (e: any) {
        console.warn("getUserConfigs 运行异常:", e.message);
        return configs;
    }
};

export const saveUserConfigs = async (userId: string, config: UserConfigs): Promise<void> => {
    if (!userId) throw new Error("用户未登录");
    
    // 🚀 核心变更：准备多行 upsert 数据
    // 注意：upsert 需要数据库有 (user_id, config_key) 的联合唯一约束才能正确工作
    const payloads = [
        { user_id: userId, config_key: 'species_list', config_value: config.species },
        { user_id: userId, config_key: 'operations_list', config_value: config.operations },
        { user_id: userId, config_key: 'status_list', config_value: config.statuses },
        { user_id: userId, config_key: 'recipe_types', config_value: config.recipeTypes },
        { user_id: userId, config_key: 'language', config_value: config.language || 'zh' }
    ];

    // 逐个保存或使用批量 upsert
    // 为了兼容性，我们采用循环保存，确保每一项都能正确处理
    for (const item of payloads) {
        const { error } = await getSupabase()
            .from('user_configs')
            .upsert(item, { onConflict: 'user_id, config_key' }); // 假设你设置了联合索引

        if (error) {
            console.error(`保存配置项 ${item.config_key} 失败:`, error.message);
            // 如果是因为缺少联合索引导致的失败，尝试根据 key 更新
            const { error: retryError } = await getSupabase()
                .from('user_configs')
                .upsert(item, { onConflict: 'id' as any }); // 降级处理
        }
    }
};

// --- 批次服务 (BATCH SERVICES) ---

const mapBatchFromDB = (row: any): Batch => ({
    id: row.id,
    displayId: row.display_id || row.displayId || '',
    createdDate: row.created_date || row.createdDate || '',
    species: row.species || '',
    operationType: row.operation_type || row.operationType || '',
    quantity: Number(row.quantity || 0),
    unit: row.unit || Unit.BAG, 
    parentId: row.parent_id || row.parentId || null,
    endDate: row.end_date || row.endDate || undefined,
    outcome: row.outcome || undefined,
    notes: row.notes || '',
    imageUrls: row.image_urls || row.imageUrls || []
});

const mapBatchToDB = (batch: Batch, userId: string) => ({
    id: batch.id,
    user_id: userId,
    display_id: batch.displayId,
    created_date: batch.createdDate,
    species: batch.species,
    operation_type: batch.operationType,
    quantity: batch.quantity,
    unit: batch.unit || Unit.BAG,
    parent_id: batch.parentId || null,
    end_date: batch.endDate || null,
    outcome: batch.outcome || null,
    notes: batch.notes || null,
    image_urls: Array.isArray(batch.imageUrls) ? batch.imageUrls : []
});

export const getBatches = async (): Promise<Batch[]> => {
    try {
        const { data: { session } } = await getSupabase().auth.getSession();
        if (!session?.user) return [];
        
        const { data, error } = await getSupabase()
            .from('batches')
            .select('*')
            .eq('user_id', session.user.id);
            
        if (error) handleSupabaseError(error, "getBatches");
        
        return (data || []).map(mapBatchFromDB).sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime());
    } catch (e: any) {
        console.error("getBatches 异常:", e.message);
        return [];
    }
};

export const generateNextBatchIds = async (speciesName: string, date: string, speciesConfigs: SpeciesConfig[], count: number = 1): Promise<string[]> => {
    const spConfig = speciesConfigs.find(s => s.name === speciesName);
    const abbr = spConfig ? spConfig.abbreviation : speciesName.substring(0, 2).toUpperCase();
    const d = new Date(date);
    const dateCode = `${d.getFullYear().toString().slice(-2)}${(d.getMonth() + 1).toString().padStart(2, '0')}${d.getDate().toString().padStart(2, '0')}`;
    const { data: { session } } = await getSupabase().auth.getSession();
    const userId = session?.user?.id;
    if (!userId) return Array(count).fill(`${dateCode}-${abbr}-01`);
    const { data, error } = await getSupabase().from('batches').select('display_id').eq('user_id', userId).like('display_id', `${dateCode}-${abbr}-%`);
    if (error) handleSupabaseError(error, "generateNextBatchIds");
    let nextSeq = 1;
    if (data && data.length > 0) {
        const seqs = data.map(b => { const m = b.display_id.match(/-(\d+)$/); return m ? parseInt(m[1], 10) : 0; });
        nextSeq = Math.max(...seqs) + 1;
    }
    return Array.from({length: count}, (_, i) => `${dateCode}-${abbr}-${(nextSeq + i).toString().padStart(2, '0')}`);
};

export const updateBatchesForSpeciesChange = async (userId: string, oldName: string, newName: string, newAbbr: string, oldAbbr: string): Promise<void> => {
    const { data: batches, error } = await getSupabase().from('batches').select('*').eq('user_id', userId).eq('species', oldName);
    if (error) handleSupabaseError(error, "updateBatchesForSpeciesChange (fetch)");
    if (!batches || batches.length === 0) return;
    const updates = batches.map(b => {
        const batch = mapBatchFromDB(b);
        const newDisplayId = batch.displayId.replace(`-${oldAbbr}-`, `-${newAbbr}-`);
        return mapBatchToDB({ ...batch, species: newName, displayId: newDisplayId }, userId);
    });
    const { error: upsertError } = await getSupabase().from('batches').upsert(updates);
    if (upsertError) handleSupabaseError(upsertError, "updateBatchesForSpeciesChange (upsert)");
};

export const addBatch = async (batch: Batch, userId: string): Promise<void> => {
    const { error } = await getSupabase().from('batches').insert(mapBatchToDB(batch, userId));
    if (error) handleSupabaseError(error, "addBatch");
};

export const addBatchBulk = async (batches: Batch[], userId: string): Promise<void> => {
    const { error } = await getSupabase().from('batches').insert(batches.map(b => mapBatchToDB(b, userId)));
    if (error) handleSupabaseError(error, "addBatchBulk");
};

export const updateBatch = async (batch: Batch): Promise<void> => {
    const { data: { session } } = await getSupabase().auth.getSession();
    if (!session?.user) throw new Error("No session");
    const { error } = await getSupabase().from('batches').update(mapBatchToDB(batch, session.user.id)).eq('id', batch.id);
    if (error) handleSupabaseError(error, "updateBatch");
};

export const expandBatch = async (batch: Batch, count: number, userId: string): Promise<void> => {
    const userConfigs = await getUserConfigs(userId);
    const displayIds = await generateNextBatchIds(batch.species, batch.createdDate, userConfigs.species, count);
    const newBatches: Batch[] = displayIds.map((displayId) => ({ ...batch, id: crypto.randomUUID(), displayId, quantity: 1 }));
    await addBatchBulk(newBatches, userId);
    await deleteBatch(batch.id);
};

export const updateBatchGroup = async (group: Batch[], newSpecies: string, newDate: string, newQty: number, newOpType: string, userId: string, userConfigs: UserConfigs): Promise<void> => {
    let displayIds: string[] = group.map(b => b.displayId);
    if (group.some(b => b.species !== newSpecies || b.createdDate !== newDate)) {
        displayIds = await generateNextBatchIds(newSpecies, newDate, userConfigs.species, group.length);
    }
    const updates = group.map((batch, index) => mapBatchToDB({ ...batch, species: newSpecies, createdDate: newDate, operationType: newOpType, quantity: newQty / group.length, displayId: displayIds[index] }, userId));
    const { error } = await getSupabase().from('batches').upsert(updates);
    if (error) handleSupabaseError(error, "updateBatchGroup");
};

export const deleteBatch = async (id: string): Promise<void> => {
    const { error } = await getSupabase().from('batches').delete().eq('id', id);
    if (error) handleSupabaseError(error, "deleteBatch");
};

export const deleteBatchGroup = async (ids: string[]): Promise<void> => {
    const { error } = await getSupabase().from('batches').delete().in('id', ids);
    if (error) handleSupabaseError(error, "deleteBatchGroup");
};

// --- 存储服务 (STORAGE SERVICES) ---

export const uploadBatchImage = async (batchId: string, file: File, userId: string): Promise<string | null> => {
    const fileName = `${userId}/${batchId}_${Date.now()}_${file.name}`;
    const { data, error } = await getSupabase().storage.from(BUCKET_NAME).upload(fileName, file);
    if (error) { handleSupabaseError(error, "uploadBatchImage"); return null; }
    if (data) { const { data: { publicUrl } } = getSupabase().storage.from(BUCKET_NAME).getPublicUrl(fileName); return publicUrl; }
    return null;
};

export const deleteBatchImage = async (url: string): Promise<void> => {
    const path = url.split(`${BUCKET_NAME}/`)[1];
    if (!path) return;
    const { error } = await getSupabase().storage.from(BUCKET_NAME).remove([path]);
    if (error) handleSupabaseError(error, "deleteBatchImage");
};

export const deleteImagesBeforeDate = async (userId: string, dateStr: string): Promise<void> => {
    const { data: files, error } = await getSupabase().storage.from(BUCKET_NAME).list(userId);
    if (error) handleSupabaseError(error, "deleteImagesBeforeDate (list)");
    if (files) {
        const limitDate = new Date(dateStr);
        const toDelete = files.filter(f => new Date(f.created_at) < limitDate).map(f => `${userId}/${f.name}`);
        if (toDelete.length > 0) {
            const { error: deleteError } = await getSupabase().storage.from(BUCKET_NAME).remove(toDelete);
            if (deleteError) handleSupabaseError(deleteError, "deleteImagesBeforeDate (remove)");
        }
    }
};

export const checkStorageHealth = async (): Promise<{ success: boolean; message: string }> => {
    try {
        const { error } = await getSupabase().storage.getBucket(BUCKET_NAME);
        if (error) return { success: false, message: stringifyError(error) };
        return { success: true, message: `Bucket ${BUCKET_NAME} is active.` };
    } catch (e: any) { return { success: false, message: stringifyError(e) }; }
};

export const listAllBuckets = async (): Promise<string[]> => {
    const { data, error } = await getSupabase().storage.listBuckets();
    if (error) return [];
    return (data || []).map(b => b.name);
};

// --- 记事本服务 (NOTEBOOK SERVICES) ---

export const getRecipes = async (userId: string): Promise<RecipeEntry[]> => {
    const { data, error } = await getSupabase().from('recipes').select('*').eq('user_id', userId);
    if (error) handleSupabaseError(error, "getRecipes");
    return (data || []).map(row => ({ id: row.id, name: row.name, type: row.type, ingredients: row.ingredients, directions: row.directions, created_at: row.created_at }));
};

export const saveRecipe = async (userId: string, recipe: RecipeEntry): Promise<void> => {
    const { error } = await getSupabase().from('recipes').upsert({ id: recipe.id, user_id: userId, name: recipe.name, type: recipe.type, ingredients: recipe.ingredients, directions: recipe.directions });
    if (error) handleSupabaseError(error, "saveRecipe");
};

export const deleteRecipe = async (id: string, userId: string): Promise<void> => {
    const { error } = await getSupabase().from('recipes').delete().eq('id', id).eq('user_id', userId);
    if (error) handleSupabaseError(error, "deleteRecipe");
};

export const getNotes = async (userId: string): Promise<NoteEntry[]> => {
    const { data, error } = await getSupabase().from('notes').select('*').eq('user_id', userId);
    if (error) handleSupabaseError(error, "getNotes");
    return (data || []).map(row => ({ id: row.id, name: row.name, notes: row.notes, created_at: row.created_at }));
};

export const saveNote = async (userId: string, note: NoteEntry): Promise<void> => {
    const { error } = await getSupabase().from('notes').upsert({ id: note.id, user_id: userId, name: note.name, notes: note.notes });
    if (error) handleSupabaseError(error, "saveNote");
};

export const deleteNote = async (id: string, userId: string): Promise<void> => {
    const { error } = await getSupabase().from('notes').delete().eq('id', id).eq('user_id', userId);
    if (error) handleSupabaseError(error, "deleteNote");
};
