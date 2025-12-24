import React, { useState } from 'react';
import { saveSupabaseConfig, checkConnection } from '../services/supabaseClient';
import { Database, Save, AlertCircle, Wifi, CheckCircle2, Loader2 } from 'lucide-react';

interface SetupProps {
  onComplete: () => void;
}

const Setup: React.FC<SetupProps> = ({ onComplete }) => {
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [status, setStatus] = useState<{ type: 'idle' | 'testing' | 'success' | 'error', msg: string }>({ type: 'idle', msg: '' });

  const handleTest = async () => {
    // 1. Basic formatting checks
    if (url.includes('supabase.com/dashboard')) {
      setStatus({ type: 'error', msg: 'Incorrect URL. Do not use the Dashboard URL. Use the Project URL from Data API settings.' });
      return;
    }
    if (!url.includes('supabase.co')) {
      setStatus({ type: 'error', msg: 'Invalid URL format. Should contain ".supabase.co"' });
      return;
    }
    
    setStatus({ type: 'testing', msg: 'Testing connection...' });
    
    // 2. Real connection check
    const result = await checkConnection(url, key);
    
    if (result.success) {
      setStatus({ type: 'success', msg: 'Connection Successful! You can now save.' });
    } else {
      setStatus({ type: 'error', msg: `Connection failed: ${result.message || 'Check your URL and Key.'}` });
    }
  };

  const handleSave = () => {
    if (status.type !== 'success') return;
    
    const success = saveSupabaseConfig(url, key);
    if (success) {
      // Notify parent to switch views instead of reloading
      onComplete();
    } else {
      setStatus({ type: 'error', msg: 'Failed to save to local storage.' });
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f9f0] flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg border border-earth-200 w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 bg-earth-100 rounded-full flex items-center justify-center mb-4 text-earth-600">
            <Database size={32} />
          </div>
          <h1 className="text-2xl font-bold text-earth-900">Connect Database</h1>
          <p className="text-earth-500 text-center mt-2 text-sm">
            Enter your Supabase credentials to enable cloud sync.
          </p>
        </div>

        {status.msg && (
          <div className={`mb-4 p-3 rounded-lg text-sm flex items-start gap-2 ${
            status.type === 'error' ? 'bg-red-50 text-red-600' : 
            status.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'
          }`}>
            {status.type === 'error' && <AlertCircle size={16} className="mt-0.5 shrink-0" />}
            {status.type === 'success' && <CheckCircle2 size={16} className="mt-0.5 shrink-0" />}
            {status.type === 'testing' && <Loader2 size={16} className="mt-0.5 shrink-0 animate-spin" />}
            <span>{status.msg}</span>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-earth-700 mb-1">Project URL</label>
            <input
              type="text"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setStatus({ type: 'idle', msg: '' }); 
              }}
              placeholder="https://your-id.supabase.co"
              className="w-full p-3 border border-earth-200 rounded-lg focus:ring-2 focus:ring-earth-500 outline-none text-sm font-mono"
            />
            <p className="text-xs text-earth-400 mt-1">Found in Supabase Settings &gt; Data API</p>
          </div>

          <div>
            <label className="block text-sm font-bold text-earth-700 mb-1">Project API Key (anon/public)</label>
            <input
              type="password"
              value={key}
              onChange={(e) => {
                setKey(e.target.value);
                setStatus({ type: 'idle', msg: '' });
              }}
              placeholder="ey..."
              className="w-full p-3 border border-earth-200 rounded-lg focus:ring-2 focus:ring-earth-500 outline-none text-sm font-mono"
            />
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={handleTest}
              disabled={!url || !key || status.type === 'testing'}
              className="flex-1 bg-white border border-earth-300 text-earth-700 py-3 rounded-lg font-bold hover:bg-earth-50 transition-colors flex justify-center items-center gap-2"
            >
              <Wifi size={18} />
              Test
            </button>
            
            <button
              onClick={handleSave}
              disabled={status.type !== 'success'}
              className="flex-[2] bg-earth-600 text-white py-3 rounded-lg font-bold hover:bg-earth-700 transition-colors flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={18} />
              Save & Connect
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Setup;