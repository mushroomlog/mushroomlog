
import React, { useState, useEffect, useCallback } from 'react';
import { RecipeEntry, NoteEntry, UserConfigs } from '../types';
import { getRecipes, saveRecipe, deleteRecipe, getNotes, saveNote, deleteNote } from '../services/storageService';
import { Search, Plus, Trash2, Pencil, Save, X, Book, StickyNote, Loader2, Settings, Check, ListChecks, ChevronLeft, AlertCircle } from 'lucide-react';
import { useTranslation } from '../constants';

interface NotebookProps {
  userId: string;
  userConfigs: UserConfigs;
  onUpdateConfigs: (configs: UserConfigs) => void;
}

const Notebook: React.FC<NotebookProps> = ({ userId, userConfigs, onUpdateConfigs }) => {
  const [activeTab, setActiveTab] = useState<'recipe' | 'others'>('recipe');
  const [recipes, setRecipes] = useState<RecipeEntry[]>([]);
  const [notes, setNotes] = useState<NoteEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTypeEditOpen, setIsTypeEditOpen] = useState(false);
  
  // Form state
  const [editingItem, setEditingItem] = useState<any>(null);
  const [recipeName, setRecipeName] = useState('');
  const [recipeType, setRecipeType] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [directions, setDirections] = useState('');
  const [noteName, setNoteName] = useState('');
  const [noteContent, setNoteContent] = useState('');

  const t = useTranslation(userConfigs.language);

  const fetchData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
        if (activeTab === 'recipe') {
          const data = await getRecipes(userId);
          setRecipes(data || []);
        } else {
          const data = await getNotes(userId);
          setNotes(data || []);
        }
    } catch (err) {
        console.error("Notebook: Failed to fetch data:", err);
    } finally {
        setLoading(false);
    }
  }, [userId, activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddClick = () => {
    setEditingItem(null);
    setRecipeName('');
    const defaultType = userConfigs.recipeTypes.length > 0 ? userConfigs.recipeTypes[0] : 'Substrate';
    setRecipeType(userConfigs.recipeTypes.includes('Substrate') ? 'Substrate' : defaultType);
    setIngredients('');
    setDirections('');
    setNoteName('');
    setNoteContent('');
    setIsModalOpen(true);
    setIsTypeEditOpen(false);
    setShowSuccess(false);
    setShowError(false);
    setErrorMsg('');
  };

  const handleEditClick = (e: React.MouseEvent, item: any) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingItem(item);
    if (activeTab === 'recipe') {
      setRecipeName(item.name || '');
      setRecipeType(item.type || '');
      setIngredients(item.ingredients || '');
      setDirections(item.directions || '');
    } else {
      setNoteName(item.name || '');
      setNoteContent(item.notes || '');
    }
    setIsModalOpen(true);
    setIsTypeEditOpen(false);
    setShowSuccess(false);
    setShowError(false);
    setErrorMsg('');
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!userId || !id) return;

    if (window.confirm(t('confirm_q'))) {
      try {
        setLoading(true);
        if (activeTab === 'recipe') {
          await deleteRecipe(id, userId);
        } else {
          await deleteNote(id, userId);
        }
        await fetchData();
      } catch (err: any) {
        console.error("Delete failed:", err);
        alert(`删除失败: ${err.message || "Unknown error"}`);
        setLoading(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("--- Notebook Submission Start ---");
    
    if (!userId) {
        alert("会话已过期，请重新登录。");
        return;
    }

    if (activeTab === 'recipe' && !recipeName.trim()) { alert("配方名称不能为空"); return; }
    if (activeTab === 'others' && !noteName.trim()) { alert("标题不能为空"); return; }

    setIsSubmitting(true);
    setShowSuccess(false);
    setShowError(false);
    setErrorMsg('');
    
    try {
        const id = editingItem?.id || crypto.randomUUID();
        
        if (activeTab === 'recipe') {
          const entry: RecipeEntry = { 
            id, 
            name: recipeName.trim(), 
            type: recipeType || (userConfigs.recipeTypes[0] || 'Substrate'), 
            ingredients: ingredients.trim(), 
            directions: directions.trim() 
          };
          console.log("Saving Recipe Entry:", entry);
          await saveRecipe(userId, entry);
        } else {
          const entry: NoteEntry = { 
            id, 
            name: noteName.trim(), 
            notes: noteContent.trim() 
          };
          console.log("Saving Note Entry:", entry);
          await saveNote(userId, entry);
        }
        
        console.log("Save operation successful!");
        setShowSuccess(true);
        
        setTimeout(() => {
            setIsModalOpen(false); 
            setIsTypeEditOpen(false);
            setShowSuccess(false);
            fetchData(); 
            setIsSubmitting(false);
        }, 1000);
        
    } catch (err: any) {
        console.error("Notebook Save Exception:", err);
        setShowError(true);
        setIsSubmitting(false);
        
        const msg = err.message || JSON.stringify(err);
        setErrorMsg(msg);
        
        // 专门针对常见数据库错误的提示
        if (msg.includes("relation") && msg.includes("not found")) {
            alert("数据库错误：找不到相应的表。请检查 SQL 编辑器是否已运行建表脚本。");
        } else if (msg.includes("permission denied")) {
            alert("权限错误：RLS 策略禁止了此操作。请检查 Supabase 的 RLS 设置。");
        } else {
            alert(`保存失败: ${msg}`);
        }
    }
  };

  const filteredRecipes = (recipes || []).filter(r => 
    r.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.ingredients?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.directions?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredNotes = (notes || []).filter(n => 
    n.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    n.notes?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="pb-24 space-y-6">
      <div className="flex bg-earth-100 p-1.5 rounded-2xl">
        <button type="button" onClick={() => setActiveTab('recipe')} className={`flex-1 py-3 text-sm font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 ${activeTab === 'recipe' ? 'bg-white text-earth-900 shadow-sm' : 'text-earth-400'}`}><Book size={18}/> {t('recipe_tab')}</button>
        <button type="button" onClick={() => setActiveTab('others')} className={`flex-1 py-3 text-sm font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 ${activeTab === 'others' ? 'bg-white text-earth-900 shadow-sm' : 'text-earth-400'}`}><StickyNote size={18}/> {t('others_tab')}</button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-earth-400" size={20} />
        <input type="text" placeholder={t('search_placeholder')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-white border border-earth-200 rounded-2xl outline-none focus:ring-2 focus:ring-earth-800 shadow-sm font-medium" />
      </div>

      <button type="button" onClick={handleAddClick} className="w-full py-5 bg-earth-900 text-white rounded-[24px] font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-2 shadow-2xl active:scale-95 transition-transform"><Plus size={20} /> {activeTab === 'recipe' ? t('add_recipe') : t('add_note')}</button>

      {loading && !isModalOpen ? (
        <div className="flex flex-col items-center justify-center py-24 text-earth-300"><Loader2 className="animate-spin mb-3" size={32} /><span className="text-[10px] font-black uppercase tracking-widest">加载中...</span></div>
      ) : (
        <div className="space-y-4">
          {(activeTab === 'recipe' ? (filteredRecipes.length > 0 ? filteredRecipes : null) : (filteredNotes.length > 0 ? filteredNotes : null)) ? (
             (activeTab === 'recipe' ? filteredRecipes : filteredNotes).map((item: any) => (
                <div key={item.id} className="bg-white p-6 rounded-[32px] border border-earth-200 shadow-sm group hover:border-earth-800 transition-all duration-300">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-3">
                         <h3 className="font-black text-earth-900 text-lg truncate">{item.name}</h3>
                         {activeTab === 'recipe' && (
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-earth-800 text-white rounded-md">{item.type}</span>
                         )}
                      </div>
                      
                      {activeTab === 'recipe' && item.ingredients && (
                        <div className="mb-4">
                          <div className="flex items-center gap-1 text-[9px] font-black text-earth-400 uppercase tracking-widest mb-1"><ListChecks size={10}/> {t('recipe_ingredients')}</div>
                          <p className="text-xs text-earth-600 line-clamp-2 bg-earth-50 p-2 rounded-xl border border-earth-100 whitespace-pre-wrap">{item.ingredients}</p>
                        </div>
                      )}

                      <div className="text-sm font-medium text-earth-500 line-clamp-3 whitespace-pre-wrap leading-relaxed">
                        {activeTab === 'recipe' ? item.directions : item.notes}
                      </div>
                    </div>
                    
                    <div className="flex gap-2 ml-4 shrink-0">
                       <button type="button" onClick={(e) => handleEditClick(e, item)} className="p-2.5 bg-earth-50 text-earth-400 hover:text-earth-900 hover:bg-earth-100 rounded-xl transition-all"><Pencil size={18}/></button>
                       <button type="button" onClick={(e) => handleDelete(e, item.id)} className="p-2.5 bg-earth-50 text-earth-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={18}/></button>
                    </div>
                  </div>
                </div>
              ))
          ) : (
             <div className="py-20 text-center text-earth-300">
               <AlertCircle className="mx-auto mb-2 opacity-20" size={48} />
               <p className="text-xs font-black uppercase tracking-widest">暂无记录</p>
             </div>
          )}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end md:items-center justify-center p-4 backdrop-blur-md overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-[40px] p-8 shadow-2xl animate-in slide-in-from-bottom-8 duration-500 my-auto">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-earth-900 uppercase tracking-tight">{editingItem ? t('edit') : t('nav_new')}</h2>
              <button type="button" onClick={() => { setIsModalOpen(false); setIsTypeEditOpen(false); }} className="p-2.5 bg-earth-50 text-earth-400 rounded-full hover:bg-earth-100 transition-colors"><X size={24}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {activeTab === 'recipe' ? (
                <>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-earth-400 mb-2 ml-1">{t('recipe_name')}</label>
                    <input required value={recipeName} onChange={e => setRecipeName(e.target.value)} className="w-full p-4 bg-earth-50 border border-earth-200 rounded-2xl outline-none focus:ring-2 focus:ring-earth-800 font-bold" />
                  </div>
                  <div>
                    <label className="flex justify-between text-[10px] font-black uppercase tracking-[0.2em] text-earth-400 mb-2 ml-1">
                      {t('recipe_type')}
                      <button type="button" onClick={() => setIsTypeEditOpen(!isTypeEditOpen)} className="text-earth-900 hover:underline flex items-center gap-1">
                        {isTypeEditOpen ? <ChevronLeft size={12}/> : <Settings size={12}/>}
                        {isTypeEditOpen ? '返回' : '管理类别'}
                      </button>
                    </label>
                    {isTypeEditOpen ? (
                        <div className="space-y-3 p-5 bg-earth-50 rounded-2xl border border-earth-200 animate-in fade-in zoom-in-95 duration-200">
                            <p className="text-[9px] font-black text-earth-400 uppercase tracking-widest mb-1">正在编辑可用类别：</p>
                            {userConfigs.recipeTypes.map((type, idx) => (
                                <div key={idx} className="flex gap-2">
                                    <input className="flex-1 p-3 text-xs font-bold bg-white border border-earth-100 rounded-xl focus:ring-1 focus:ring-earth-800 outline-none" value={type} onChange={e => {
                                        const newTypes = [...userConfigs.recipeTypes];
                                        newTypes[idx] = e.target.value;
                                        onUpdateConfigs({ ...userConfigs, recipeTypes: newTypes });
                                    }} />
                                    <button type="button" onClick={() => onUpdateConfigs({ ...userConfigs, recipeTypes: userConfigs.recipeTypes.filter((_, i) => i !== idx) })} className="p-2 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                                </div>
                            ))}
                            <button type="button" onClick={() => onUpdateConfigs({ ...userConfigs, recipeTypes: [...userConfigs.recipeTypes, '新类别'] })} className="w-full py-3 border border-dashed border-earth-300 rounded-xl text-[10px] font-black uppercase tracking-widest text-earth-500 flex items-center justify-center gap-2 hover:bg-white hover:text-earth-800 transition-all"><Plus size={14}/> 添加类别</button>
                            
                            <button type="button" onClick={() => setIsTypeEditOpen(false)} className="w-full mt-4 py-3 bg-earth-800 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform">
                              <Check size={14}/> 完成管理
                            </button>
                        </div>
                    ) : (
                        <select value={recipeType} onChange={e => setRecipeType(e.target.value)} className="w-full p-4 bg-earth-50 border border-earth-200 rounded-2xl outline-none focus:ring-2 focus:ring-earth-800 font-bold appearance-none cursor-pointer">
                           {userConfigs.recipeTypes.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-earth-400 mb-2 ml-1">{t('recipe_ingredients')}</label>
                    <textarea value={ingredients} onChange={e => setIngredients(e.target.value)} placeholder="例如：水500ml, 琼脂10g, 葡萄糖10g..." className="w-full p-4 bg-earth-50 border border-earth-200 rounded-2xl outline-none focus:ring-2 focus:ring-earth-800 h-24 font-medium leading-relaxed" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-earth-400 mb-2 ml-1">{t('directions')}</label>
                    <textarea value={directions} onChange={e => setDirections(e.target.value)} className="w-full p-4 bg-earth-50 border border-earth-200 rounded-2xl outline-none focus:ring-2 focus:ring-earth-800 h-32 font-medium leading-relaxed" />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-earth-400 mb-2 ml-1">{t('note_name')}</label>
                    <input required value={noteName} onChange={e => setNoteName(e.target.value)} className="w-full p-4 bg-earth-50 border border-earth-200 rounded-2xl outline-none focus:ring-2 focus:ring-earth-800 font-bold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-earth-400 mb-2 ml-1">{t('note_content')}</label>
                    <textarea required value={noteContent} onChange={e => setNoteContent(e.target.value)} className="w-full p-4 bg-earth-50 border border-earth-200 rounded-2xl outline-none focus:ring-2 focus:ring-earth-800 h-48 font-medium leading-relaxed" />
                  </div>
                </>
              )}
              
              {!isTypeEditOpen && (
                <button 
                    disabled={isSubmitting} 
                    type="submit" 
                    className={`w-full py-5 rounded-2xl font-black uppercase tracking-[0.3em] text-xs flex items-center justify-center gap-3 shadow-xl transition-all duration-300 
                    ${showSuccess ? 'bg-green-600 text-white' : showError ? 'bg-red-600 text-white animate-shake' : 'bg-earth-900 text-white'}`}
                >
                    {isSubmitting ? <Loader2 className="animate-spin" /> : showSuccess ? <Check size={20}/> : showError ? <X size={20}/> : <Save size={20}/>} 
                    {isSubmitting ? '正在保存...' : showSuccess ? '已保存' : showError ? '保存失败' : t('save')}
                </button>
              )}
              
              {showError && errorMsg && (
                  <p className="text-[10px] text-red-500 font-bold text-center mt-2 px-4 line-clamp-2">{errorMsg}</p>
              )}
            </form>
          </div>
        </div>
      )}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
      `}</style>
    </div>
  );
};

export default Notebook;
