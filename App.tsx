
import React, { useState, useEffect } from 'react';
import { getBatches, getUserConfigs, deleteBatch, deleteBatchGroup, updateBatchGroup } from './services/storageService';
import { getSupabase, isConfigured } from './services/supabaseClient';
import { Batch, TabView, UserConfigs, Language } from './types';
import { DEFAULT_SPECIES_LIST, DEFAULT_OPERATION_LIST, DEFAULT_STATUS_LIST, useTranslation } from './constants';
import Dashboard from './components/Dashboard';
import GrowDetail from './components/GrowDetail';
import OperationForm from './components/NewGrowForm';
import Auth from './components/Auth';
import Setup from './components/Setup';
import SettingsManager from './components/SettingsManager';
import InsightsDashboard from './components/InsightsDashboard';
import { LayoutDashboard, PlusCircle, LogOut, Loader2, Settings as SettingsIcon, PieChart } from 'lucide-react';

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
       const [batchData, configData] = await Promise.all([
         getBatches(),
         getUserConfigs(session.user.id)
       ]);
       setBatches(batchData);
       setUserConfigs(configData);
    }
    setLoadingData(false);
  };

  const handleSignOut = async () => {
    await getSupabase().auth.signOut();
  };

  const renderContent = () => {
    if (loadingData && batches.length === 0 && currentView === TabView.DASHBOARD) {
       return <div className="h-64 flex items-center justify-center text-earth-500"><Loader2 className="animate-spin mr-2"/> Loading...</div>;
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
      case TabView.NEW_OPERATION:
        return <OperationForm userId={session.user.id} userConfigs={userConfigs} onCancel={() => { setPreselectedParentId(undefined); setCurrentView(TabView.DASHBOARD); }} onSuccess={fetchData} initialParentId={preselectedParentId} existingBatches={batches} />;
      case TabView.BATCH_DETAIL:
        return selectedBatch ? <GrowDetail userId={session.user.id} grow={selectedBatch} allBatches={batches} userConfigs={userConfigs} onBack={() => setCurrentView(TabView.DASHBOARD)} onUpdate={(b) => { setSelectedBatch(b); fetchData(); }} onDelete={() => { setSelectedBatch(null); setCurrentView(TabView.DASHBOARD); fetchData(); }} onContinue={(id) => { setPreselectedParentId(id); setCurrentView(TabView.NEW_OPERATION); }} onNavigateToBatch={(b) => setSelectedBatch(b)} /> : <div>Error</div>;
      case TabView.SETTINGS:
        return <SettingsManager userId={session.user.id} configs={userConfigs} onUpdate={setUserConfigs} onClose={() => setCurrentView(TabView.DASHBOARD)} />;
      default:
        return <div>Not Found</div>;
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
          <div className="grid grid-cols-4 w-full gap-1">
            <button onClick={() => setCurrentView(TabView.DASHBOARD)} className={`flex flex-col items-center justify-center gap-1 py-2 rounded-lg transition-colors ${currentView === TabView.DASHBOARD ? 'text-earth-700 bg-earth-50' : 'text-earth-400'}`}>
              <LayoutDashboard size={24} /><span className="text-[10px] font-medium uppercase">{t('nav_log')}</span>
            </button>
            <button onClick={() => setCurrentView(TabView.STATS)} className={`flex flex-col items-center justify-center gap-1 py-2 rounded-lg transition-colors ${currentView === TabView.STATS ? 'text-earth-700 bg-earth-50' : 'text-earth-400'}`}>
              <PieChart size={24} /><span className="text-[10px] font-medium uppercase">{t('nav_stats')}</span>
            </button>
            <button onClick={() => { setPreselectedParentId(undefined); setCurrentView(TabView.NEW_OPERATION); }} className={`flex flex-col items-center justify-center gap-1 py-2 rounded-lg transition-colors ${currentView === TabView.NEW_OPERATION ? 'text-earth-700 bg-earth-50' : 'text-earth-400'}`}>
              <PlusCircle size={24} /><span className="text-[10px] font-medium uppercase">{t('nav_new')}</span>
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
