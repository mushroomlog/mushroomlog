
import React, { useState, useEffect } from 'react';
import { UserConfigs, SpeciesConfig, OperationConfig, StatusConfig, Batch, Language } from '../types';
import { saveUserConfigs, updateBatchesForSpeciesChange, deleteImagesBeforeDate, getBatches, checkStorageHealth } from '../services/storageService';
import { Trash2, Plus, Save, Loader2, X, Pencil, Check, FileDown, Database, ExternalLink, Table, Languages, Activity, ShieldAlert, AlertCircle, Smartphone, Download } from 'lucide-react';
import { useTranslation, getStylesForColor } from '../constants';

interface SettingsManagerProps {
  userId: string;
  configs: UserConfigs;
  onUpdate: (newConfigs: UserConfigs) => void;
  onClose: () => void;
  onRefresh: () => Promise<void>;
  installAvailable?: boolean;
  onInstall?: () => void;
}

const SettingsManager: React.FC<SettingsManagerProps> = ({ userId, configs, onUpdate, onClose, onRefresh, installAvailable, onInstall }) => {
  const [localConfigs, setLocalConfigs] = useState<UserConfigs>(() => JSON.parse(JSON.stringify(configs)));
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
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

  const [storageStatus, setStorageStatus] = useState<{ checked: boolean; ok: boolean; msg: string }>({ checked: false, ok: false, msg: '' });
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  const handleCheckStorage = async () => {
      setIsCheckingHealth(true);
      const [health] = await Promise.all([
          checkStorageHealth()
      ]);
      setStorageStatus({ checked: true, ok: health.success, msg: health.message });
      setIsCheckingHealth(false);
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const batches = await getBatches();
      if (batches.length === 0) { alert("没有可导出的数据"); return; }
      const headers = ["ID", "Display ID", "Date", "Species", "Op", "Qty", "End Date", "Outcome", "Notes"];
      const csvRows = [headers.join(","), ...batches.map(b => [b.id, b.displayId, b.createdDate, `"${b.species}"`, `"${b.operationType}"`, b.quantity, b.endDate || "", `"${b.outcome || ""}"`, `"${(b.notes || "").replace(/\n/g, ' ')}"`].join(","))];
      const blob = new Blob([csvRows.join("\n")], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `mushroom_logs_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
    } catch (e) { alert("导出失败"); } finally { setIsExporting(false); }
  };

  const handleGlobalSave = async () => {
    if (!userId || isSaving) return;
    setIsSaving(true);
    try {
      for (const sp of localConfigs.species) {
          const original = configs.species.find(s => s.id === sp.id);
          if (original && (original.name !== sp.name || original.abbreviation !== sp.abbreviation)) {
              await updateBatchesForSpeciesChange(userId, original.name, sp.name, sp.abbreviation, original.abbreviation);
          }
      }
      await saveUserConfigs(userId, localConfigs);
      onUpdate(localConfigs);
      await onRefresh();
      setHasUnsavedChanges(false);
      alert("配置保存成功！");
    } catch (e: any) {
      alert(e.message || "保存过程发生错误，请查看控制台。");
    } finally {
      setIsSaving(false);
    }
  };

  const handleListItemAction = () => {
    if (!name.trim()) return;
    const id = editingId || crypto.randomUUID();
    let nextConfigs = JSON.parse(JSON.stringify(localConfigs));
    if (activeTab === 'species') {
        const newItem: SpeciesConfig = { id, name: name.trim(), abbreviation: abbr.trim().toUpperCase() || name.substring(0, 2).toUpperCase(), colorHex: color };
        nextConfigs.species = editingId ? nextConfigs.species.map((i: any) => i.id === id ? newItem : i) : [...nextConfigs.species, newItem];
    } else if (activeTab === 'operations') {
        const newItem: OperationConfig = { id, name: name.trim(), colorHex: color };
        nextConfigs.operations = editingId ? nextConfigs.operations.map((i: any) => i.id === id ? newItem : i) : [...nextConfigs.operations, newItem];
    } else if (activeTab === 'statuses') {
        const newItem: StatusConfig = { id, name: name.trim(), colorHex: color };
        nextConfigs.statuses = editingId ? nextConfigs.statuses.map((i: any) => i.id === id ? newItem : i) : [...nextConfigs.statuses, newItem];
    }
    setLocalConfigs(nextConfigs);
    setHasUnsavedChanges(true);
    setEditingId(null);
    setName('');
    setAbbr('');
  };

  const handleDeleteItem = (itemId: string) => {
    let nextConfigs = JSON.parse(JSON.stringify(localConfigs));
    if (activeTab === 'species') nextConfigs.species = nextConfigs.species.filter((i: any) => i.id !== itemId);
    else if (activeTab === 'operations') nextConfigs.operations = nextConfigs.operations.filter((i: any) => i.id !== itemId);
    else if (activeTab === 'statuses') nextConfigs.statuses = nextConfigs.statuses.filter((i: any) => i.id !== itemId);
    setLocalConfigs(nextConfigs);
    setHasUnsavedChanges(true);
    setDeleteConfirmId(null);
  };

  const toggleLanguage = () => {
    const nextLang: Language = localConfigs.language === 'en' ? 'zh' : 'en';
    setLocalConfigs({ ...localConfigs, language: nextLang });
    setHasUnsavedChanges(true);
  };

  return (
    <div className="pb-32 max-w-full overflow-hidden">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-black text-earth-900 tracking-tight">{t('nav_config')}</h1>
        <button onClick={onClose} className="p-2 text-earth-500 hover:bg-earth-100 rounded-full transition-colors"><X size={24} /></button>
      </div>

      {/* 优化后的多行居中 Tab 布局 */}
      <div className="flex flex-wrap gap-2 mb-8 justify-center">
        {(['species', 'operations', 'statuses', 'storage', 'data', 'prefs'] as const).map(tab => (
            <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all border ${activeTab === tab ? 'bg-earth-800 text-white border-earth-800 shadow-md' : 'bg-earth-50 text-earth-400 border-earth-100 hover:bg-earth-100'}`}
            >
                {t(`${tab + '_tab'}` as any)}
            </button>
        ))}
      </div>

      <div className="space-y-6">
        {activeTab === 'prefs' ? (
            <div className="space-y-4">
                <div className="bg-white rounded-lg border border-earth-200 p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-earth-50 rounded-lg text-earth-600"><Languages size={20} /></div>
                            <span className="font-black text-earth-900">{t('lang_toggle')}</span>
                        </div>
                        <button onClick={toggleLanguage} className="bg-earth-900 text-white px-5 py-2.5 rounded-lg font-black text-[10px] uppercase tracking-widest shadow-md active:scale-95 transition-all">
                          {localConfigs.language === 'en' ? 'English' : '中文'}
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-lg border border-earth-200 p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-blue-50 rounded-lg text-blue-600"><Smartphone size={20} /></div>
                        <span className="font-black text-earth-900">添加到主屏幕</span>
                    </div>
                    
                    {installAvailable ? (
                        <button onClick={onInstall} className="w-full py-4 bg-blue-600 text-white rounded-lg font-black uppercase tracking-widest text-[10px] shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2">
                            <Download size={16} /> 立即安装到手机桌面
                        </button>
                    ) : (
                        <div className="p-4 bg-earth-50 border border-earth-100 rounded-lg">
                            <p className="text-[11px] text-earth-500 leading-relaxed font-medium">
                                <span className="font-black text-earth-900 block mb-1 uppercase tracking-tighter">未检测到安装提示</span>
                                1. 请确认您正在使用手机 Chrome 浏览器。<br/>
                                2. 您也可以点击浏览器右上角的 <span className="bg-earth-200 px-1 rounded">三个点</span> 菜单，选择 <span className="font-bold">“添加到主屏幕”</span>。
                            </p>
                        </div>
                    )}
                </div>
            </div>
        ) : activeTab === 'data' ? (
            <div className="space-y-4">
                <div className="bg-white rounded-lg border border-earth-200 p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2.5 bg-blue-50 rounded-lg text-blue-500"><Table size={20} /></div>
                      <h3 className="font-black text-earth-900">{t('online_manage')}</h3>
                    </div>
                    <a href="https://supabase.com/dashboard" target="_blank" className="flex items-center justify-center gap-2 w-full py-4 bg-earth-900 text-white rounded-lg font-black uppercase tracking-widest text-[10px] shadow-lg active:scale-95 transition-all">Supabase Dashboard <ExternalLink size={14}/></a>
                </div>
                <div className="bg-white rounded-lg border border-earth-200 p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2.5 bg-green-50 rounded-lg text-green-500"><FileDown size={20} /></div>
                      <h3 className="font-black text-earth-900">{t('export_csv')}</h3>
                    </div>
                    <button onClick={handleExportCSV} disabled={isExporting} className="w-full py-4 bg-green-50 text-green-700 border border-green-100 rounded-lg font-black uppercase tracking-widest text-[10px] flex justify-center items-center gap-2 active:scale-95 transition-all">
                      {isExporting ? <Loader2 className="animate-spin" size={16}/> : <FileDown size={16}/>} 
                      {isExporting ? 'Exporting...' : t('export_csv')}
                    </button>
                </div>
            </div>
        ) : activeTab === 'storage' ? (
            <div className="space-y-4">
                <div className="bg-white rounded-lg border border-earth-200 p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3 text-earth-800">
                            <div className="p-2.5 bg-blue-50 rounded-lg text-blue-500"><Activity size={20} /></div>
                            <h3 className="font-black">存储状态预检</h3>
                        </div>
                        <button onClick={handleCheckStorage} disabled={isCheckingHealth} className="text-[10px] font-black uppercase tracking-widest text-blue-600 px-3 py-1.5 bg-blue-50 rounded-lg active:scale-95 transition-all border border-blue-200">
                          {isCheckingHealth ? '...' : '检测'}
                        </button>
                    </div>

                    {storageStatus.checked && (
                        storageStatus.ok ? (
                            <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-100 rounded-lg">
                                <Check className="text-green-600 shrink-0" size={16} />
                                <p className="text-[11px] font-black text-green-800 uppercase tracking-tighter">云端存储配置正常</p>
                            </div>
                        ) : (
                            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-lg">
                                <ShieldAlert className="text-red-600 shrink-0" size={20} />
                                <p className="text-[11px] font-black text-red-800 uppercase tracking-tighter line-clamp-2">{storageStatus.msg}</p>
                            </div>
                        )
                    )}
                </div>

                <div className="bg-white rounded-lg border border-earth-200 p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2.5 bg-earth-900 rounded-lg text-white"><Database size={20} /></div>
                      <h3 className="font-black text-earth-900">{t('storage_tab')}</h3>
                    </div>
                    <div className="space-y-2 mb-6">
                        <label className="text-[10px] font-black text-earth-400 uppercase tracking-widest ml-1">{t('date')}</label>
                        <input type="date" value={cleanupDate} onChange={(e) => setCleanupDate(e.target.value)} className="w-full p-4 bg-earth-50 border border-earth-200 rounded-lg outline-none focus:ring-2 focus:ring-earth-800 font-bold text-sm" />
                    </div>
                    <button 
                      onClick={async () => { if(!cleanupDate) return; if(confirm(t('confirm_q'))) { setIsCleaning(true); await deleteImagesBeforeDate(userId, cleanupDate); setIsCleaning(false); } }} 
                      disabled={isCleaning || !cleanupDate} 
                      className="w-full bg-red-50 text-red-600 border border-red-100 py-4 rounded-lg font-black uppercase tracking-widest text-[10px] flex justify-center items-center gap-2 active:scale-95 transition-all disabled:opacity-50"
                    >
                        {isCleaning ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />} 清理照片
                    </button>
                </div>
            </div>
        ) : (
            <div className="space-y-6">
              <div className="bg-white rounded-lg border border-earth-200 shadow-sm p-6 space-y-5">
                  <div className="flex gap-3">
                      <div className="flex-[2]">
                          <label className="text-[10px] font-black text-earth-400 uppercase tracking-widest ml-1 block mb-1">Name</label>
                          <input placeholder={t('placeholder_add_name')} value={name} onChange={e => setName(e.target.value)} className="w-full p-3 bg-earth-50 border border-earth-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-earth-800 outline-none" />
                      </div>
                      {activeTab === 'species' && (
                          <div className="flex-1">
                              <label className="text-[10px] font-black text-earth-400 uppercase tracking-widest ml-1 block mb-1">Abbr</label>
                              <input placeholder="缩写" value={abbr} onChange={e => setAbbr(e.target.value)} className="w-full p-3 bg-earth-50 border border-earth-200 rounded-lg text-sm font-black uppercase focus:ring-2 focus:ring-earth-800 outline-none" maxLength={10} />
                          </div>
                      )}
                  </div>
                  <div className="flex gap-3 items-end">
                      <div className="flex-1">
                          <label className="text-[10px] font-black text-earth-400 uppercase tracking-widest ml-1 block mb-1">Color</label>
                          <div className="flex items-center gap-3 bg-earth-50 p-2 rounded-lg border border-earth-200">
                              <input type="color" value={color} onChange={e => setColor(e.target.value)} className="h-8 w-12 rounded-lg cursor-pointer border-none bg-transparent" />
                              <span className="text-[10px] font-mono font-black text-earth-400 uppercase tracking-tight">{color}</span>
                          </div>
                      </div>
                      <button onClick={handleListItemAction} disabled={!name} className="bg-earth-900 text-white px-6 py-3.5 rounded-lg font-black uppercase tracking-widest text-[10px] shadow-lg active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50">
                          {editingId ? <Check size={16} /> : <Plus size={16} />} {editingId ? '确认' : '添加'}
                      </button>
                  </div>
              </div>
              
              <div className="bg-white rounded-lg border border-earth-200 shadow-sm overflow-hidden">
                  <div className="divide-y divide-earth-100">
                      {(activeTab==='species' ? localConfigs.species : activeTab==='operations' ? localConfigs.operations : localConfigs.statuses).map((item: any) => (
                          <div key={item.id} className="p-4 flex justify-between items-center hover:bg-earth-50 transition-colors">
                              <div className="flex items-center gap-3">
                                  <div className="w-2.5 h-8 rounded-full shadow-inner" style={{ backgroundColor: item.colorHex || '#ccc' }}></div>
                                  <div>
                                      <div className="font-black text-earth-900 text-sm">{item.name}</div>
                                      {activeTab === 'species' && <div className="text-[9px] font-black text-earth-400 uppercase tracking-widest">Code: {item.abbreviation}</div>}
                                  </div>
                              </div>
                              <div className="flex gap-1">
                                  <button onClick={() => { setEditingId(item.id); setName(item.name); setColor(item.colorHex||'#ccc'); if(activeTab==='species') setAbbr(item.abbreviation); window.scrollTo({top: 0, behavior: 'smooth'}); }} className="p-2.5 text-earth-400 hover:text-earth-900"><Pencil size={18} /></button>
                                  <button onClick={() => { if(deleteConfirmId===item.id) handleDeleteItem(item.id); else setDeleteConfirmId(item.id); }} className={`p-2.5 rounded-lg transition-all ${deleteConfirmId === item.id ? 'bg-red-600 text-white shadow-sm' : 'text-earth-300'}`}>{deleteConfirmId === item.id ? <Check size={18} /> : <Trash2 size={18} />}</button>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
            </div>
        )}
      </div>

      <div className="fixed bottom-[96px] left-0 right-0 px-6 py-4 pointer-events-none">
          <div className="max-w-3xl mx-auto flex justify-center">
            <button 
                onClick={handleGlobalSave} 
                disabled={isSaving || !hasUnsavedChanges}
                className={`pointer-events-auto flex items-center gap-2 px-8 py-3.5 rounded-full font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-2xl ${hasUnsavedChanges ? 'bg-earth-800 text-white active:scale-95' : 'bg-earth-100 text-earth-300 opacity-0'}`}
            >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {isSaving ? 'Saving' : t('save')}
            </button>
          </div>
      </div>
    </div>
  );
};

export default SettingsManager;
