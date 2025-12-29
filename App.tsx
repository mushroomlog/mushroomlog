
import React, { useState, useEffect } from 'react';
import { getBatches, getUserConfigs, deleteBatchGroup, updateBatchGroup, saveUserConfigs } from './services/storageService';
import { getSupabase, isConfigured } from './services/supabaseClient';
import { Batch, TabView, UserConfigs } from './types';
import { DEFAULT_SPECIES_LIST, DEFAULT_OPERATION_LIST, DEFAULT_STATUS_LIST, DEFAULT_RECIPE_TYPES, useTranslation } from './constants';
import Dashboard from './components/Dashboard';
import GrowDetail from './components/GrowDetail';
import OperationForm from './components/NewGrowForm';
import Auth from './components/Auth';
import Setup from './components/Setup';
import SettingsManager from './components/SettingsManager';
import InsightsDashboard from './components/InsightsDashboard';
import Notebook from './components/Notebook';
import { LayoutDashboard, PlusCircle, Loader2, Settings as SettingsIcon, PieChart, Notebook as NotebookIcon } from 'lucide-react';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [currentView, setCurrentView] = useState<TabView>(TabView.DASHBOARD);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [preselectedParentId, setPreselectedParentId] = useState<string | undefined>(undefined);
  const [loadingData, setLoadingData] = useState(false);
  const [hasDbConfig, setHasDbConfig] = useState(false);

  const [userConfigs, setUserConfigs] = useState<UserConfigs>({
    species: DEFAULT_SPECIES_LIST,
    operations: DEFAULT_OPERATION_LIST,
    statuses: DEFAULT_STATUS_LIST,
    recipeTypes: DEFAULT_RECIPE_TYPES,
    language: 'zh'
  });

  const t = useTranslation(userConfigs.language || 'zh');

  useEffect(() => {
    setHasDbConfig(isConfigured());
  }, []);

  useEffect(() => {
    if (!hasDbConfig) {
      setLoadingSession(false);
      return;
    }
    const supabase = getSupabase();
    setLoadingSession(true);
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoadingSession(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, [hasDbConfig]);

  useEffect(() => {
    if (session) fetchData();
  }, [session]);

  const fetchData = async () => {
    setLoadingData(true);
    if (session?.user?.id) {
       console.log("App: 正在拉取云端数据...");
       try {
         const [batchData, configData] = await Promise.all([
           getBatches(),
           getUserConfigs(session.user.id)
         ]);
         
         // 同步逻辑 (保持配置项完整性)
         let needsUpdate = false;
         let updatedRecipeTypes = [...(configData.recipeTypes || [])];

         DEFAULT_RECIPE_TYPES.forEach(type => {
           if (!updatedRecipeTypes.includes(type)) {
             updatedRecipeTypes.push(type);
             needsUpdate = true;
           }
         });

         if (needsUpdate) {
           try {
             configData.recipeTypes = updatedRecipeTypes;
             await saveUserConfigs(session.user.id, configData);
           } catch (syncError: any) {
             console.warn("后台配置同步失败:", syncError.message || JSON.stringify(syncError));
           }
         }

         setBatches(batchData);
         setUserConfigs(configData);
       } catch (err: any) {
         console.error("fetchData 全局异常:", err.message || JSON.stringify(err));
       }
    }
    setLoadingData(false);
  };

  const handleSignOut = async () => {
    await getSupabase().auth.signOut();
  };

  const renderContent = () => {
    if (loadingData && batches.length === 0 && currentView === TabView.DASHBOARD) {
       return <div className="h-64 flex items-center justify-center text-earth-500"><Loader2 className="animate-spin mr-2"/> 加载中...</div>;
    }

    switch (currentView) {
      case TabView.DASHBOARD:
        return (
          <Dashboard 
            batches={batches} 
            userConfigs={userConfigs}
            onSelectBatch={(b) => { setSelectedBatch(b); setCurrentView(TabView.BATCH_DETAIL); }} 
            onNewOperation={() => { setPreselectedParentId(undefined); setCurrentView(TabView.NEW_OPERATION); }} 
            onContinue={(id) => { setPreselectedParentId(id); setCurrentView(TabView.NEW_OPERATION); }}
            onDeleteBatchGroup={async (ids) => { setLoadingData(true); await deleteBatchGroup(ids); fetchData(); }}
            onUpdateBatchGroup={async (g, s, d, q) => { if(!session?.user?.id) return; setLoadingData(true); await updateBatchGroup(g, s, d, q, session.user.id, userConfigs); fetchData(); }}
          />
        );
      case TabView.STATS:
        return <InsightsDashboard batches={batches} userConfigs={userConfigs} onNavigateToBatch={(b) => { setSelectedBatch(b); setCurrentView(TabView.BATCH_DETAIL); }} />;
      case TabView.NOTEBOOK:
        return <Notebook userId={session?.user?.id} userConfigs={userConfigs} onUpdateConfigs={async (c) => { setUserConfigs(c); await saveUserConfigs(session.user.id, c); }} />;
      case TabView.NEW_OPERATION:
        return (
          <OperationForm 
            userId={session.user.id} 
            userConfigs={userConfigs} 
            onCancel={() => { setPreselectedParentId(undefined); setCurrentView(TabView.DASHBOARD); }} 
            onSuccess={() => {
                fetchData();
                setCurrentView(TabView.DASHBOARD);
            }} 
            initialParentId={preselectedParentId} 
            existingBatches={batches} 
          />
        );
      case TabView.BATCH_DETAIL:
        return selectedBatch ? <GrowDetail userId={session.user.id} grow={selectedBatch} allBatches={batches} userConfigs={userConfigs} onBack={() => setCurrentView(TabView.DASHBOARD)} onUpdate={(b) => { setSelectedBatch(b); fetchData(); }} onDelete={() => { setSelectedBatch(null); setCurrentView(TabView.DASHBOARD); fetchData(); }} onContinue={(id) => { setPreselectedParentId(id); setCurrentView(TabView.NEW_OPERATION); }} onNavigateToBatch={(b) => setSelectedBatch(b)} /> : <div>错误</div>;
      case TabView.SETTINGS:
        return <SettingsManager userId={session.user.id} configs={userConfigs} onUpdate={setUserConfigs} onRefresh={fetchData} onClose={() => setCurrentView(TabView.DASHBOARD)} />;
      default:
        return <div>未找到</div>;
    }
  };

  if (!loadingSession && !hasDbConfig) return <Setup onComplete={() => setHasDbConfig(true)} />;
  if (loadingSession) return <div className="h-screen flex items-center justify-center text-earth-600"><Loader2 className="animate-spin" size={32}/></div>;
  if (!session) return <Auth onResetConfig={() => setHasDbConfig(false)} />;

  return (
    <div className="min-h-screen bg-[#f6f9f0] text-earth-900 font-sans selection:bg-earth-200">
      <header className="bg-white border-b border-earth-100 sticky top-0 z-40 px-4 py-3 flex justify-between items-center md:hidden">
         <span className="font-bold text-earth-800">{t('header_title')}</span>
         <button onClick={handleSignOut} className="text-xs text-earth-500 hover:text-red-500">{t('sign_out')}</button>
      </header>
      <main className="max-w-3xl mx-auto p-4 md:p-6 min-h-[calc(100vh-80px)]">{renderContent()}</main>
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-earth-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-50">
        <div className="max-w-3xl mx-auto flex items-center p-2">
          <div className="grid grid-cols-5 w-full gap-1">
            <button onClick={() => setCurrentView(TabView.DASHBOARD)} className={`flex flex-col items-center justify-center gap-1 py-2 rounded-lg transition-colors ${currentView === TabView.DASHBOARD ? 'text-earth-700 bg-earth-50' : 'text-earth-400'}`}>
              <LayoutDashboard size={24} /><span className="text-[10px] font-medium uppercase">{t('nav_log')}</span>
            </button>
            <button onClick={() => setCurrentView(TabView.STATS)} className={`flex flex-col items-center justify-center gap-1 py-2 rounded-lg transition-colors ${currentView === TabView.STATS ? 'text-earth-700 bg-earth-50' : 'text-earth-400'}`}>
              <PieChart size={24} /><span className="text-[10px] font-medium uppercase">{t('nav_stats')}</span>
            </button>
            <button onClick={() => { setPreselectedParentId(undefined); setCurrentView(TabView.NEW_OPERATION); }} className={`flex flex-col items-center justify-center gap-1 py-2 rounded-lg transition-colors ${currentView === TabView.NEW_OPERATION ? 'text-earth-700 bg-earth-50' : 'text-earth-400'}`}>
              <PlusCircle size={28} className="text-earth-600" /><span className="text-[10px] font-medium uppercase">{t('nav_new')}</span>
            </button>
            <button onClick={() => setCurrentView(TabView.NOTEBOOK)} className={`flex flex-col items-center justify-center gap-1 py-2 rounded-lg transition-colors ${currentView === TabView.NOTEBOOK ? 'text-earth-700 bg-earth-50' : 'text-earth-400'}`}>
              <NotebookIcon size={24} /><span className="text-[10px] font-medium uppercase">{t('nav_notebook')}</span>
            </button>
            <button onClick={() => setCurrentView(TabView.SETTINGS)} className={`flex flex-col items-center justify-center gap-1 py-2 rounded-lg transition-colors ${currentView === TabView.SETTINGS ? 'text-earth-700 bg-earth-50' : 'text-earth-400'}`}>
              <SettingsIcon size={24} /><span className="text-[10px] font-medium uppercase">{t('nav_config')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
