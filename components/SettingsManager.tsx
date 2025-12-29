
import React, { useState, useEffect } from 'react';
import { UserConfigs, SpeciesConfig, OperationConfig, StatusConfig, Batch, Language } from '../types';
import { saveUserConfigs, updateBatchesForSpeciesChange, deleteImagesBeforeDate, getBatches, checkStorageHealth, listAllBuckets } from '../services/storageService';
import { Trash2, Plus, Save, Loader2, X, Palette, Pencil, Check, FileDown, Database, ExternalLink, Table, Languages, Info, Activity, ShieldAlert, SearchCode, AlertCircle } from 'lucide-react';
import { useTranslation, getStylesForColor } from '../constants';

interface SettingsManagerProps {
  userId: string;
  configs: UserConfigs;
  onUpdate: (newConfigs: UserConfigs) => void;
  onClose: () => void;
  onRefresh: () => Promise<void>;
}

const SettingsManager: React.FC<SettingsManagerProps> = ({ userId, configs, onUpdate, onClose, onRefresh }) => {
  // 核心：使用深拷贝初始化本地状态，确保不受外部重新渲染干扰
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

  // Storage Health Check State
  const [storageStatus, setStorageStatus] = useState<{ checked: boolean; ok: boolean; msg: string }>({ checked: false, ok: false, msg: '' });
  const [allBuckets, setAllBuckets] = useState<string[]>([]);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  const handleCheckStorage = async () => {
      setIsCheckingHealth(true);
      const [health, buckets] = await Promise.all([
          checkStorageHealth(),
          listAllBuckets()
      ]);
      setStorageStatus({ checked: true, ok: health.success, msg: health.message });
      setAllBuckets(buckets);
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
      // 1. 处理菌种变动产生的级联更新
      for (const sp of localConfigs.species) {
          const original = configs.species.find(s => s.id === sp.id);
          if (original && (original.name !== sp.name || original.abbreviation !== sp.abbreviation)) {
              await updateBatchesForSpeciesChange(userId, original.name, sp.name, sp.abbreviation, original.abbreviation);
          }
      }

      // 2. 执行核心保存
      await saveUserConfigs(userId, localConfigs);
      
      // 3. 同步到 App 内存并强制重新加载
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
        nextConfigs.species = editingId 
            ? nextConfigs.species.map((i: any) => i.id === id ? newItem : i)
            : [...nextConfigs.species, newItem];
    } else if (activeTab === 'operations') {
        const newItem: OperationConfig = { id, name: name.trim(), colorHex: color };
        nextConfigs.operations = editingId 
            ? nextConfigs.operations.map((i: any) => i.id === id ? newItem : i)
            : [...nextConfigs.operations, newItem];
    } else if (activeTab === 'statuses') {
        const newItem: StatusConfig = { id, name: name.trim(), colorHex: color };
        nextConfigs.statuses = editingId 
            ? nextConfigs.statuses.map((i: any) => i.id === id ? newItem : i)
            : [...nextConfigs.statuses, newItem];
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
    <div className="pb-32">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-black text-earth-900 tracking-tight">{t('nav_config')}</h1>
        <div className="flex gap-2">
            <button onClick={onClose} className="p-2 text-earth-500 hover:bg-earth-100 rounded-full transition-colors"><X size={24} /></button>
        </div>
      </div>

      <div className="flex gap-1 mb-6 bg-earth-100 p-1.5 rounded-2xl overflow-x-auto scrollbar-hide">
        {(['species', 'operations', 'statuses', 'storage', 'data', 'prefs'] as const).map(tab => (
            <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 min-w-[70px] py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === tab ? 'bg-white text-earth-900 shadow-sm' : 'text-earth-400'}`}
            >
                {t(`${tab + '_tab'}` as any)}
            </button>
        ))}
      </div>

      <div className="min-h-[400px]">
        {activeTab === 'prefs' ? (
            <div className="bg-white rounded-[32px] border border-earth-200 p-8 space-y-6 shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-earth-50 rounded-2xl text-earth-600"><Languages size={24} /></div>
                        <div>
                            {localConfigs.language === 'en' && <p className="text-[10px] font-black uppercase tracking-widest text-earth-400 mb-0.5">Selection</p>}
                            <span className="font-black text-earth-900 text-lg">{t('lang_toggle')}</span>
                        </div>
                    </div>
                    <button onClick={toggleLanguage} className="bg-earth-900 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all">
                      {localConfigs.language === 'en' ? 'English' : '中文'}
                    </button>
                </div>
            </div>
        ) : activeTab === 'data' ? (
            <div className="space-y-4">
                <div className="bg-white rounded-[32px] border border-earth-200 p-8 space-y-6 shadow-sm">
                    <div className="flex items-center gap-4 text-earth-800">
                      <div className="p-3 bg-blue-50 rounded-2xl text-blue-500"><Table size={24} /></div>
                      <h3 className="text-xl font-black tracking-tight">{t('online_manage')}</h3>
                    </div>
                    <a href="https://supabase.com/dashboard" target="_blank" className="flex items-center justify-center gap-3 w-full py-5 bg-earth-900 text-white rounded-[24px] font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all">Supabase Dashboard <ExternalLink size={18}/></a>
                </div>
                <div className="bg-white rounded-[32px] border border-earth-200 p-8 space-y-6 shadow-sm">
                    <div className="flex items-center gap-4 text-earth-800">
                      <div className="p-3 bg-green-50 rounded-2xl text-green-500"><FileDown size={24} /></div>
                      <h3 className="text-xl font-black tracking-tight">{t('export_csv')}</h3>
                    </div>
                    <button onClick={handleExportCSV} disabled={isExporting} className="w-full py-5 bg-green-50 text-green-700 border-2 border-green-100 rounded-[24px] font-black uppercase tracking-widest text-xs flex justify-center items-center gap-3 active:scale-95 transition-all">
                      {isExporting ? <Loader2 className="animate-spin" size={18}/> : <FileDown size={18}/>} 
                      {isExporting ? 'Exporting...' : t('export_csv')}
                    </button>
                </div>
            </div>
        ) : activeTab === 'storage' ? (
            <div className="space-y-4">
                <div className="bg-white rounded-[32px] border border-earth-200 p-8 space-y-6 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-earth-800">
                            <div className="p-3 bg-blue-50 rounded-2xl text-blue-500"><Activity size={24} /></div>
                            <h3 className="text-xl font-black tracking-tight">存储状态预检</h3>
                        </div>
                        <button onClick={handleCheckStorage} disabled={isCheckingHealth} className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-4 py-2 rounded-xl transition-all active:scale-95">
                          {isCheckingHealth ? '检测中...' : '重新检测'}
                        </button>
                    </div>

                    {storageStatus.checked ? (
                        storageStatus.ok ? (
                            <div className="flex items-center gap-3 p-5 bg-green-50 border border-green-100 rounded-[24px]">
                                <Check className="text-green-600" size={20} />
                                <p className="text-sm font-black text-green-800">云端存储配置正常 (grow_images)</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-start gap-4 p-5 bg-red-50 border border-red-100 rounded-[24px]">
                                    <ShieldAlert className="text-red-600 mt-0.5 shrink-0" size={24} />
                                    <div className="text-sm text-red-800 flex-1">
                                        <p className="font-black mb-1">连接异常：{storageStatus.msg}</p>
                                    </div>
                                </div>
                            </div>
                        )
                    ) : (
                        <div className="p-5 bg-earth-50 rounded-[24px] border border-earth-100 flex items-center gap-3">
                            <AlertCircle size={20} className="text-earth-300" />
                            <p className="text-sm text-earth-400 font-medium italic">点击“检测”按钮诊断您的存储配置...</p>
                        </div>
                    )}
                </div>

                <div className="bg-white rounded-[32px] border border-earth-200 p-8 space-y-6 shadow-sm">
                    <div className="flex items-center gap-4 text-earth-800">
                      <div className="p-3 bg-earth-900 rounded-2xl text-white"><Database size={24} /></div>
                      <h3 className="text-xl font-black tracking-tight">{t('storage_tab')}</h3>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-earth-400 uppercase tracking-widest ml-1">{t('date')}</label>
                        <input type="date" value={cleanupDate} onChange={(e) => setCleanupDate(e.target.value)} className="w-full p-4 bg-earth-50 border border-earth-200 rounded-2xl outline-none focus:ring-2 focus:ring-earth-800 font-black text-sm" />
                    </div>
                    <button 
                      onClick={async () => { if(!cleanupDate) return; if(confirm(t('confirm_q'))) { setIsCleaning(true); await deleteImagesBeforeDate(userId, cleanupDate); setIsCleaning(false); } }} 
                      disabled={isCleaning || !cleanupDate} 
                      className="w-full bg-red-50 text-red-600 border-2 border-red-100 py-5 rounded-[24px] font-black uppercase tracking-widest text-xs flex justify-center items-center gap-3 active:scale-95 transition-all disabled:opacity-50"
                    >
                        {isCleaning ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />} 清理旧照片数据
                    </button>
                </div>
            </div>
        ) : (
            <div className="bg-white rounded-[40px] border border-earth-200 shadow-sm overflow-hidden mb-6">
              <div className="p-8 bg-earth-50 border-b border-earth-100">
                  <div className="flex gap-3 mb-4">
                      <div className="flex-[2]">
                          <label className="text-[10px] font-black text-earth-400 uppercase tracking-widest ml-1 block mb-1">Name</label>
                          <input placeholder={t('placeholder_add_name')} value={name} onChange={e => setName(e.target.value)} className="w-full p-4 bg-white border border-earth-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-earth-800 outline-none" />
                      </div>
                      {activeTab === 'species' && (
                          <div className="flex-1">
                              <label className="text-[10px] font-black text-earth-400 uppercase tracking-widest ml-1 block mb-1">Abbr</label>
                              <input placeholder="缩写" value={abbr} onChange={e => setAbbr(e.target.value)} className="w-full p-4 bg-white border border-earth-200 rounded-2xl text-sm font-black uppercase focus:ring-2 focus:ring-earth-800 outline-none" maxLength={10} />
                          </div>
                      )}
                  </div>
                  <div className="flex gap-4 items-center">
                      <div className="flex-1">
                          <label className="text-[10px] font-black text-earth-400 uppercase tracking-widest ml-1 block mb-1">Theme Color</label>
                          <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-earth-200">
                              <input type="color" value={color} onChange={e => setColor(e.target.value)} className="h-10 w-16 rounded-xl cursor-pointer border-none" />
                              <span className="text-[10px] font-mono font-black text-earth-400 uppercase">{color}</span>
                          </div>
                      </div>
                      <div className="flex items-end h-full pt-5">
                          <button onClick={handleListItemAction} disabled={!name} className="bg-earth-900 text-white px-8 py-4 rounded-[24px] font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50">
                              {editingId ? <Check size={18} /> : <Plus size={18} />} {editingId ? '确认更改' : '加入列表'}
                          </button>
                      </div>
                  </div>
              </div>
              <div className="divide-y divide-earth-100 max-h-[450px] overflow-y-auto">
                  {(activeTab==='species' ? localConfigs.species : activeTab==='operations' ? localConfigs.operations : localConfigs.statuses).map((item: any) => (
                      <div key={item.id} className="p-6 flex justify-between items-center group hover:bg-earth-50 transition-colors">
                          <div className="flex items-center gap-4">
                              <div className="w-4 h-10 rounded-full shadow-inner" style={{ backgroundColor: item.colorHex || '#ccc' }}></div>
                              <div>
                                  <div className="font-black text-earth-900 text-lg leading-tight">{item.name}</div>
                                  {activeTab === 'species' && <div className="text-[10px] font-black text-earth-400 uppercase tracking-widest">Code: {item.abbreviation}</div>}
                              </div>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                              <button onClick={() => { setEditingId(item.id); setName(item.name); setColor(item.colorHex||'#ccc'); if(activeTab==='species') setAbbr(item.abbreviation); }} className="p-3 text-earth-400 hover:text-earth-900 bg-white rounded-xl shadow-sm transition-all"><Pencil size={18} /></button>
                              <button onClick={() => { if(deleteConfirmId===item.id) handleDeleteItem(item.id); else setDeleteConfirmId(item.id); }} className={`p-3 rounded-xl shadow-sm transition-all ${deleteConfirmId === item.id ? 'bg-red-600 text-white' : 'text-earth-300 hover:text-red-500 bg-white'}`}>{deleteConfirmId === item.id ? <Check size={18} /> : <Trash2 size={18} />}</button>
                          </div>
                      </div>
                  ))}
              </div>
            </div>
        )}
      </div>

      <div className="mt-12 flex justify-center">
          <button 
              onClick={handleGlobalSave} 
              disabled={isSaving || !hasUnsavedChanges}
              className={`flex items-center gap-3 px-12 py-4 rounded-full font-black text-sm uppercase tracking-[0.2em] transition-all shadow-2xl ${hasUnsavedChanges ? 'bg-earth-800 text-white active:scale-95' : 'bg-earth-100 text-earth-300 cursor-not-allowed'}`}
          >
              {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
              {isSaving ? (localConfigs.language === 'en' ? 'Saving...' : '正在保存...') : t('save')}
          </button>
      </div>
    </div>
  );
};

export default SettingsManager;
