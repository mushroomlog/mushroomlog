import React, { useState, useEffect } from 'react';
import { RecipeEntry, NoteEntry, UserConfigs } from '../types';
import { getRecipes, saveRecipe, deleteRecipe, getNotes, saveNote, deleteNote, saveUserConfigs } from '../services/storageService';
import { Search, Plus, Trash2, Pencil, Save, X, Book, StickyNote, Loader2, ChevronRight, Settings } from 'lucide-react';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTypeEditOpen, setIsTypeEditOpen] = useState(false);
  
  // Form state
  const [editingItem, setEditingItem] = useState<any>(null);
  const [recipeName, setRecipeName] = useState('');
  const [recipeType, setRecipeType] = useState('');
  const [directions, setDirections] = useState('');
  const [noteName, setNoteName] = useState('');
  const [noteContent, setNoteContent] = useState('');

  const t = useTranslation(userConfigs.language);

  useEffect(() => {
    fetchData();
  }, [userId, activeTab]);

  const fetchData = async () => {
    setLoading(true);
    if (activeTab === 'recipe') {
      const data = await getRecipes(userId);
      setRecipes(data);
    } else {
      const data = await getNotes(userId);
      setNotes(data);
    }
    setLoading(false);
  };

  const handleAddClick = () => {
    setEditingItem(null);
    setRecipeName('');
    setRecipeType(userConfigs.recipeTypes[0] || '');
    setDirections('');
    setNoteName('');
    setNoteContent('');
    setIsModalOpen(true);
  };

  const handleEditClick = (item: any) => {
    setEditingItem(item);
    if (activeTab === 'recipe') {
      setRecipeName(item.name);
      setRecipeType(item.type);
      setDirections(item.directions);
    } else {
      setNoteName(item.name);
      setNoteContent(item.notes);
    }
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm(t('confirm_q' as any))) {
      if (activeTab === 'recipe') await deleteRecipe(id);
      else await deleteNote(id);
      fetchData();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (activeTab === 'recipe') {
      const entry: RecipeEntry = { id: editingItem?.id || crypto.randomUUID(), name: recipeName, type: recipeType, directions };
      await saveRecipe(userId, entry);
    } else {
      const entry: NoteEntry = { id: editingItem?.id || crypto.randomUUID(), name: noteName, notes: noteContent };
      await saveNote(userId, entry);
    }
    setIsModalOpen(false);
    fetchData();
  };

  const filteredRecipes = recipes.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.directions.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredNotes = notes.filter(n => 
    n.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    n.notes.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="pb-24 space-y-4">
      <div className="flex bg-earth-100 p-1 rounded-xl">
        <button 
          onClick={() => setActiveTab('recipe')} 
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'recipe' ? 'bg-white text-earth-800 shadow-sm' : 'text-earth-500'}`}
        >
          <Book size={18}/> {t('recipe_tab')}
        </button>
        <button 
          onClick={() => setActiveTab('others')} 
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'others' ? 'bg-white text-earth-800 shadow-sm' : 'text-earth-500'}`}
        >
          <StickyNote size={18}/> {t('others_tab')}
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-earth-400" size={18} />
        <input 
          type="text" 
          placeholder={t('search_placeholder')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white border border-earth-200 rounded-xl outline-none focus:ring-2 focus:ring-earth-400"
        />
      </div>

      <button 
        onClick={handleAddClick}
        className="w-full py-4 bg-earth-800 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-earth-100"
      >
        <Plus size={20} /> {activeTab === 'recipe' ? t('add_recipe') : t('add_note')}
      </button>

      {loading && !isModalOpen ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-earth-400" /></div>
      ) : (
        <div className="space-y-3">
          {(activeTab === 'recipe' ? filteredRecipes : filteredNotes).map((item: any) => (
            <div key={item.id} className="bg-white p-4 rounded-2xl border border-earth-200 shadow-sm group">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                     <h3 className="font-bold text-earth-900 truncate">{item.name}</h3>
                     {activeTab === 'recipe' && (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-earth-50 text-earth-500 rounded-md border border-earth-100">{item.type}</span>
                     )}
                  </div>
                  <p className="text-sm text-earth-500 mt-1 line-clamp-2">{activeTab === 'recipe' ? item.directions : item.notes}</p>
                </div>
                <div className="flex gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button onClick={() => handleEditClick(item)} className="p-2 text-earth-400 hover:text-earth-800"><Pencil size={16}/></button>
                   <button onClick={() => handleDelete(item.id)} className="p-2 text-earth-400 hover:text-red-500"><Trash2 size={16}/></button>
                </div>
              </div>
            </div>
          ))}
          {(activeTab === 'recipe' ? filteredRecipes : filteredNotes).length === 0 && (
             <div className="text-center py-10 text-earth-400 text-sm">No entries found.</div>
          )}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-earth-900">{editingItem ? t('edit') : t('nav_new')}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-earth-50 text-earth-400 rounded-full"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {activeTab === 'recipe' ? (
                <>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-earth-400 mb-1">{t('recipe_name')}</label>
                    <input required value={recipeName} onChange={e => setRecipeName(e.target.value)} className="w-full p-3 bg-earth-50 border border-earth-200 rounded-xl outline-none focus:ring-2 focus:ring-earth-400" />
                  </div>
                  <div>
                    <label className="flex justify-between text-xs font-black uppercase tracking-widest text-earth-400 mb-1">
                      {t('recipe_type')}
                      <button type="button" onClick={() => setIsTypeEditOpen(!isTypeEditOpen)} className="text-earth-600 hover:underline"><Settings size={12} className="inline mr-1"/>Manage</button>
                    </label>
                    {isTypeEditOpen ? (
                        <div className="space-y-2 p-3 bg-earth-50 rounded-xl border border-earth-200">
                            {userConfigs.recipeTypes.map((type, idx) => (
                                <div key={idx} className="flex gap-2">
                                    <input className="flex-1 p-1 text-sm bg-white border rounded" value={type} onChange={e => {
                                        const newTypes = [...userConfigs.recipeTypes];
                                        newTypes[idx] = e.target.value;
                                        onUpdateConfigs({ ...userConfigs, recipeTypes: newTypes });
                                    }} />
                                    <button type="button" onClick={() => onUpdateConfigs({ ...userConfigs, recipeTypes: userConfigs.recipeTypes.filter((_, i) => i !== idx) })} className="text-red-400"><Trash2 size={14}/></button>
                                </div>
                            ))}
                            <button type="button" onClick={() => onUpdateConfigs({ ...userConfigs, recipeTypes: [...userConfigs.recipeTypes, 'New Type'] })} className="text-xs font-bold text-earth-600 flex items-center gap-1"><Plus size={12}/>Add Type</button>
                        </div>
                    ) : (
                        <select value={recipeType} onChange={e => setRecipeType(e.target.value)} className="w-full p-3 bg-earth-50 border border-earth-200 rounded-xl outline-none focus:ring-2 focus:ring-earth-400">
                           {userConfigs.recipeTypes.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-earth-400 mb-1">{t('directions')}</label>
                    <textarea required value={directions} onChange={e => setDirections(e.target.value)} className="w-full p-3 bg-earth-50 border border-earth-200 rounded-xl outline-none focus:ring-2 focus:ring-earth-400 h-32" />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-earth-400 mb-1">{t('note_name')}</label>
                    <input required value={noteName} onChange={e => setNoteName(e.target.value)} className="w-full p-3 bg-earth-50 border border-earth-200 rounded-xl outline-none focus:ring-2 focus:ring-earth-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-earth-400 mb-1">{t('note_content')}</label>
                    <textarea required value={noteContent} onChange={e => setNoteContent(e.target.value)} className="w-full p-3 bg-earth-50 border border-earth-200 rounded-xl outline-none focus:ring-2 focus:ring-earth-400 h-32" />
                  </div>
                </>
              )}
              
              <button disabled={loading} type="submit" className="w-full py-3 bg-earth-800 text-white rounded-xl font-bold flex items-center justify-center gap-2">
                {loading ? <Loader2 className="animate-spin" /> : <Save size={18}/>} {t('save')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notebook;