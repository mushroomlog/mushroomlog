
import React, { useState } from 'react';
import { UserConfigs, SpeciesConfig, OperationConfig, StatusConfig, Batch, Language } from '../types';
import { saveUserConfigs, updateBatchesForSpeciesChange, deleteImagesBeforeDate, getBatches } from '../services/storageService';
import { Trash2, Plus, Save, Loader2, X, Palette, Pencil, Check, FileDown, Database, ExternalLink, Table, Languages, Info } from 'lucide-react';
import { useTranslation } from '../constants';

interface SettingsManagerProps {
  userId: string;
  configs: UserConfigs;
  onUpdate: (newConfigs: UserConfigs) => void;
  onClose: () => void;
}

const SettingsManager: React.FC<SettingsManagerProps> = ({ userId, configs, onUpdate, onClose }) => {
  const [localConfigs, setLocalConfigs] = useState<UserConfigs>(configs);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'species' | 'operations' | 'statuses' | 'storage' | 'data' | 'prefs'>('species');

  const t = useTranslation(localConfigs.language || 'zh');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [abbr, setAbbr] = useState('');
  const [color, setColor] = useState<string>('#22c55e');

  const [cleanupDate, setCleanupDate] = useState('');
  const [isCleaning, setIsCleaning] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const batches = await getBatches();
      if (batches.length === 0) { alert("No data"); return; }
      const headers = ["ID", "Display ID", "Date", "Species", "Op", "Qty", "End Date", "Outcome", "Notes"];
      const csvRows = [headers.join(","), ...batches.map(b => [b.id, b.displayId, b.createdDate, `"${b.species}"`, `"${b.operationType}"`, b.quantity, b.endDate || "", `"${b.outcome || ""}"`, `"${(b.notes || "").replace(/\n/g, ' ')}"`].join(","))];
      const blob = new Blob([csvRows.join("\n")], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `mushroom_logs_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
    } catch (e) { alert("Fail"); } finally { setIsExporting(false); }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      for (const original of configs.species) {
        const updated = localConfigs.species.find(s => s.id === original.id);
        if (updated && (original.name !== updated.name || original.abbreviation !== updated.abbreviation)) {
          await updateBatchesForSpeciesChange(userId, original.name, updated.name, updated.abbreviation, original.abbreviation);
        }
      }
      await saveUserConfigs(userId, localConfigs);
      onUpdate(localConfigs);
    } catch (e) { alert('Save failed'); } finally { setIsSaving(false); }
  };

  const toggleLanguage = () => {
    const next: Language = localConfigs.language === 'en' ? 'zh' : 'en';
    setLocalConfigs(prev => ({ ...prev, language: next }));
  };

  return (
    <div className="pb-20">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-earth-900">{t('nav_config')}</h1>
        <button onClick={onClose} className="p-2 text-earth-500 hover:bg-earth-100 rounded-full"><X size={24} /></button>
      </div>

      <div className="flex gap-1 mb-6 bg-earth-100 p-1 rounded-lg overflow-x-auto scrollbar-hide">
        {(['species', 'operations', 'statuses', 'storage', 'data', 'prefs'] as const).map(tab => (
            <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 min-w-[70px] py-2 text-[10px] md:text-xs font-bold rounded-md transition-all capitalize ${activeTab === tab ? 'bg-white text-earth-800 shadow-sm' : 'text-earth-500'}`}
            >
                {t(`${tab === 'prefs' ? 'nav_config' : tab + '_tab'}` as any)}
            </button>
        ))}
      </div>

      {activeTab === 'prefs' ? (
          <div className="bg-white rounded-xl border border-earth-200 p-6 space-y-6 shadow-sm">
              <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                      <Languages className="text-earth-600" size={24} />
                      <span className="font-bold text-earth-800">{t('lang_toggle')}</span>
                  </div>
                  <button 
                    onClick={toggleLanguage}
                    className="flex items-center gap-2 bg-earth-50 px-4 py-2 rounded-full border border-earth-200 text-earth-700 font-bold hover:bg-earth-100 transition-colors"
                  >
                    {localConfigs.language === 'en' ? 'English' : '中文'}
                  </button>
              </div>
          </div>
      ) : activeTab === 'data' ? (
          <div className="space-y-4">
              <div className="bg-white rounded-xl border border-earth-200 p-6 space-y-4 shadow-sm">
                  <div className="flex items-center gap-3 text-earth-800"><Table className="text-blue-500" size={24} /><h3 className="text-lg font-bold">{t('online_manage')}</h3></div>
                  <a href="https://supabase.com/dashboard" target="_blank" className="flex items-center justify-center gap-2 w-full py-3 bg-earth-800 text-white rounded-xl font-bold">Supabase Dashboard <ExternalLink size={16}/></a>
              </div>
              <div className="bg-white rounded-xl border border-earth-200 p-6 space-y-4 shadow-sm">
                  <div className="flex items-center gap-3 text-earth-800"><FileDown className="text-green-500" size={24} /><h3 className="text-lg font-bold">{t('export_csv')}</h3></div>
                  <button onClick={handleExportCSV} disabled={isExporting} className="w-full py-3 bg-green-50 text-green-700 border border-green-200 rounded-xl font-bold">{isExporting ? <Loader2 className="animate-spin inline mr-2"/> : t('export_csv')}</button>
              </div>
          </div>
      ) : activeTab === 'storage' ? (
          <div className="bg-white rounded-xl border border-earth-200 p-6 space-y-6">
              <div className="flex items-center gap-3 text-earth-800"><Database size={24} /><h3 className="text-lg font-bold">{t('storage_tab')}</h3></div>
              
              <div className="flex gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                  <Info className="text-blue-500 shrink-0" size={20} />
                  <p className="text-sm text-blue-800">{t('storage_hint' as any)}</p>
              </div>

              <div className="space-y-2">
                  <label className="text-xs font-bold text-earth-500 uppercase tracking-wider">{t('date')}</label>
                  <input type="date" value={cleanupDate} onChange={(e) => setCleanupDate(e.target.value)} className="w-full p-3 border border-earth-200 rounded-lg outline-none focus:ring-2 focus:ring-earth-500" />
              </div>

              <button 
                onClick={async () => { if(!cleanupDate) return; if(confirm(t('confirm_q'))) { setIsCleaning(true); await deleteImagesBeforeDate(userId, cleanupDate); setIsCleaning(false); } }} 
                disabled={isCleaning || !cleanupDate} 
                className="w-full bg-red-50 text-red-600 border border-red-200 py-4 rounded-xl font-bold flex justify-center items-center gap-2 disabled:opacity-50"
              >
                  {isCleaning ? <Loader2 className="animate-spin" /> : <Trash2 size={20} />} 
                  {isCleaning ? 'Cleaning...' : t('delete')}
              </button>
          </div>
      ) : (
          <div className="bg-white rounded-xl border border-earth-200 shadow-sm overflow-hidden mb-6">
            <div className="p-4 bg-earth-50 border-b border-earth-100">
                <div className="flex gap-2">
                    <input placeholder={t('placeholder_add_name')} value={name} onChange={e => setName(e.target.value)} className="flex-[2] p-2 border border-earth-200 rounded-lg text-sm" />
                    {activeTab === 'species' && <input placeholder="Abbr" value={abbr} onChange={e => setAbbr(e.target.value)} className="flex-1 p-2 border border-earth-200 rounded-lg text-sm uppercase" maxLength={10} />}
                </div>
                <div className="flex gap-2 items-center mt-3">
                    <input type="color" value={color} onChange={e => setColor(e.target.value)} className="h-8 w-12 rounded cursor-pointer" />
                    <div className="flex-1"></div>
                    <button onClick={() => { if(!name) return; const id = editingId || crypto.randomUUID(); setLocalConfigs(prev => { const next = { ...prev }; if(activeTab==='species') next.species = editingId ? prev.species.map(i=>i.id===id?{id,name,abbreviation:abbr.toUpperCase(),colorHex:color}:i) : [...prev.species,{id,name,abbreviation:abbr.toUpperCase(),colorHex:color}]; else if(activeTab==='operations') next.operations = editingId ? prev.operations.map(i=>i.id===id?{id,name,colorHex:color}:i) : [...prev.operations,{id,name,colorHex:color}]; else if(activeTab==='statuses') next.statuses = editingId ? prev.statuses.map(i=>i.id===id?{id,name,colorHex:color}:i) : [...prev.statuses,{id,name,colorHex:color}]; return next; }); setEditingId(null); setName(''); setAbbr(''); }} className="bg-earth-600 text-white px-4 py-2 rounded-lg">{editingId ? <Check size={20} /> : <Plus size={20} />}</button>
                </div>
            </div>
            <div className="divide-y divide-earth-100 max-h-[400px] overflow-y-auto">
                {(activeTab==='species' ? localConfigs.species : activeTab==='operations' ? localConfigs.operations : localConfigs.statuses).map(item => (
                    <div key={item.id} className="p-4 flex justify-between items-center">
                        <div className="flex items-center gap-3"><div className="w-3 h-8 rounded-full" style={{ backgroundColor: item.colorHex || '#ccc' }}></div><div className="font-semibold text-earth-900">{item.name}</div></div>
                        <div className="flex gap-2">
                            <button onClick={() => { setEditingId(item.id); setName(item.name); setColor(item.colorHex||'#ccc'); if(activeTab==='species') setAbbr((item as any).abbreviation); }} className="p-2 text-earth-400 hover:text-blue-500"><Pencil size={18} /></button>
                            <button onClick={() => { if(deleteConfirmId===item.id) { setLocalConfigs(p=>{ const n={...p}; if(activeTab==='species') n.species=p.species.filter(i=>i.id!==item.id); else if(activeTab==='operations') n.operations=p.operations.filter(i=>i.id!==item.id); else n.statuses=p.statuses.filter(i=>i.id!==item.id); return n; }); setDeleteConfirmId(null); } else { setDeleteConfirmId(item.id); } }} className="p-2 text-earth-400">{deleteConfirmId === item.id ? <Check className="text-red-500" /> : <Trash2 size={18} />}</button>
                        </div>
                    </div>
                ))}
            </div>
          </div>
      )}

      {activeTab !== 'storage' && activeTab !== 'data' && (
          <button onClick={handleSave} disabled={isSaving} className="w-full bg-earth-600 text-white py-3 rounded-xl font-bold shadow-lg flex justify-center items-center gap-2">
            {isSaving ? <Loader2 className="animate-spin" /> : <Save size={20} />} {t('save')}
          </button>
      )}
    </div>
  );
};

export default SettingsManager;
