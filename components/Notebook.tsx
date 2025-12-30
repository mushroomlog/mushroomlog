
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
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [userId, activeTab]);

  useEffect(() => { fetchData(); }, [fetchData]);

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
    e.preventDefault(); e.stopPropagation();
    setEditingItem(item);
    if (activeTab === 'recipe') {
      setRecipeName(item.name || ''); setRecipeType(item.type || '');
      setIngredients(item.ingredients || ''); setDirections(item.directions || '');
    } else {
      setNoteName(item.name || ''); setNoteContent(item.notes || '');
    }
    setIsModalOpen(true); setIsTypeEditOpen(false); setShowSuccess(false);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault(); e.stopPropagation();
    if (window.confirm(t('confirm_q'))) {
      try {
        setLoading(true);
        if (activeTab === 'recipe') await deleteRecipe(id, userId);
        else await deleteNote(id, userId);
        await fetchData();
      } catch (err: any) { alert("删除失败"); setLoading(false); }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'recipe' && !recipeName.trim()) return;
    setIsSubmitting(true); setShowSuccess(false);
    try {
        const id = editingItem?.id || crypto.randomUUID();
        if (activeTab === 'recipe') {
          await saveRecipe(userId, { id, name: recipeName.trim(), type: recipeType, ingredients, directions });
        } else {
          await saveNote(userId, { id, name: noteName.trim(), notes: noteContent.trim() });
        }
        setShowSuccess(true);
        setTimeout(() => { setIsModalOpen(false); fetchData(); setIsSubmitting(false); }, 1000);
    } catch (err: any) { 
        setShowError(true); setIsSubmitting(false);
        setErrorMsg(err.message || "Save failed");
    }
  };

  const filteredRecipes = (recipes || []).filter(r => 
    r.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.ingredients?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredNotes = (notes || []).filter(n => 
    n.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    n.notes?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="pb-24 space-y-6">
      <div className="flex bg-earth-100 p-1 rounded-lg border border-earth-200">
        <button type="button" onClick={() => setActiveTab('recipe')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded transition-all flex items-center justify-center gap-2 ${activeTab === 'recipe' ? 'bg-white text-earth-900 shadow-sm' : 'text-earth-400'}`}><Book size={16}/> {t('recipe_tab')}</button>
        <button type="button" onClick={() => setActiveTab('others')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded transition-all flex items-center justify-center gap-2 ${activeTab === 'others' ? 'bg-white text-earth-900 shadow-sm' : 'text-earth-400'}`}><StickyNote size={16}/> {t('others_tab')}</button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-earth-400" size={18} />
        <input type="text" placeholder={t('search_placeholder')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3.5 bg-white border border-earth-200 rounded-lg outline-none focus:ring-2 focus:ring-earth-800 shadow-sm font-medium text-sm" />
      </div>

      <button type="button" onClick={handleAddClick} className="w-full py-4 bg-earth-900 text-white rounded-lg font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform"><Plus size={16} /> {activeTab === 'recipe' ? t('add_recipe') : t('add_note')}</button>

      {loading && !isModalOpen ? (
        <div className="flex flex-col items-center py-20 text-earth-200"><Loader2 className="animate-spin mb-2" size={32} /></div>
      ) : (
        <div className="space-y-4">
          {(activeTab === 'recipe' ? filteredRecipes : filteredNotes).map((item: any) => (
                <div key={item.id} className="bg-white p-5 rounded-lg border border-earth-200 shadow-sm group hover:border-earth-800 transition-all">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                         <h3 className="font-black text-earth-900 text-base truncate">{item.name}</h3>
                         {activeTab === 'recipe' && (
                            <span className="text-[8px] font-black uppercase px-1.5 py-0.5 bg-earth-800 text-white rounded">{item.type}</span>
                         )}
                      </div>
                      <div className="text-[11px] font-medium text-earth-500 line-clamp-3 whitespace-pre-wrap leading-relaxed italic">
                        {activeTab === 'recipe' ? item.directions : item.notes}
                      </div>
                    </div>
                    <div className="flex gap-1 ml-3 shrink-0">
                       <button type="button" onClick={(e) => handleEditClick(e, item)} className="p-2 text-earth-300 hover:text-earth-900"><Pencil size={16}/></button>
                       <button type="button" onClick={(e) => handleDelete(e, item.id)} className="p-2 text-earth-200 hover:text-red-600"><Trash2 size={16}/></button>
                    </div>
                  </div>
                </div>
              ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-lg p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-earth-900 uppercase tracking-tight">{editingItem ? t('edit') : t('nav_new')}</h2>
              <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 text-earth-400 hover:text-earth-900"><X size={24}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              {activeTab === 'recipe' ? (
                <>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-earth-400 mb-1 ml-1">{t('recipe_name')}</label>
                    <input required value={recipeName} onChange={e => setRecipeName(e.target.value)} className="w-full p-3 bg-earth-50 border border-earth-200 rounded-lg outline-none focus:ring-2 focus:ring-earth-800 font-bold text-sm" />
                  </div>
                  <div>
                    <label className="flex justify-between text-[10px] font-black uppercase tracking-widest text-earth-400 mb-1 ml-1">
                      {t('recipe_type')}
                      <button type="button" onClick={() => setIsTypeEditOpen(!isTypeEditOpen)} className="text-earth-900 flex items-center gap-1">
                        <Settings size={10}/> 管理
                      </button>
                    </label>
                    {isTypeEditOpen ? (
                        <div className="space-y-2 p-4 bg-earth-50 rounded-lg border border-earth-200">
                            {userConfigs.recipeTypes.map((type, idx) => (
                                <div key={idx} className="flex gap-1">
                                    <input className="flex-1 p-2 text-[11px] font-bold bg-white border border-earth-100 rounded-lg outline-none" value={type} onChange={e => {
                                        const newTypes = [...userConfigs.recipeTypes];
                                        newTypes[idx] = e.target.value;
                                        onUpdateConfigs({ ...userConfigs, recipeTypes: newTypes });
                                    }} />
                                    <button type="button" onClick={() => onUpdateConfigs({ ...userConfigs, recipeTypes: userConfigs.recipeTypes.filter((_, i) => i !== idx) })} className="p-1.5 text-red-400 hover:bg-red-50 rounded"><Trash2 size={14}/></button>
                                </div>
                            ))}
                            <button type="button" onClick={() => onUpdateConfigs({ ...userConfigs, recipeTypes: [...userConfigs.recipeTypes, 'New Type'] })} className="w-full py-2 border border-dashed border-earth-300 rounded-lg text-[10px] font-black uppercase tracking-widest text-earth-400">+ Add</button>
                        </div>
                    ) : (
                        <select value={recipeType} onChange={e => setRecipeType(e.target.value)} className="w-full p-3 bg-earth-50 border border-earth-200 rounded-lg outline-none font-bold text-sm">
                           {userConfigs.recipeTypes.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-earth-400 mb-1 ml-1">{t('directions')}</label>
                    <textarea value={directions} onChange={e => setDirections(e.target.value)} className="w-full p-3 bg-earth-50 border border-earth-200 rounded-lg outline-none focus:ring-2 focus:ring-earth-800 h-28 font-medium text-sm leading-relaxed" />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-earth-400 mb-1 ml-1">{t('note_name')}</label>
                    <input required value={noteName} onChange={e => setNoteName(e.target.value)} className="w-full p-3 bg-earth-50 border border-earth-200 rounded-lg outline-none focus:ring-2 focus:ring-earth-800 font-bold text-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-earth-400 mb-1 ml-1">{t('note_content')}</label>
                    <textarea required value={noteContent} onChange={e => setNoteContent(e.target.value)} className="w-full p-3 bg-earth-50 border border-earth-200 rounded-lg outline-none focus:ring-2 focus:ring-earth-800 h-40 font-medium text-sm leading-relaxed" />
                  </div>
                </>
              )}
              
              {!isTypeEditOpen && (
                <button disabled={isSubmitting} type="submit" className={`w-full py-4 rounded-lg font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 shadow-lg transition-all ${showSuccess ? 'bg-green-600 text-white' : 'bg-earth-900 text-white active:scale-95'}`}>
                    {isSubmitting ? <Loader2 className="animate-spin" size={16}/> : showSuccess ? <Check size={16}/> : <Save size={16}/>} 
                    {isSubmitting ? 'Saving...' : showSuccess ? 'Saved' : t('save')}
                </button>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notebook;
