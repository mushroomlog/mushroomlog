import React, { useState, useEffect } from 'react';
import { getSupabase, resetSupabaseConfig } from '../services/supabaseClient';
import { Loader2, Sprout, Settings, RefreshCw, Zap } from 'lucide-react';

interface AuthProps {
  onResetConfig: () => void;
}

// --- 开发便捷设置：防止每次刷新都要输入账号密码 ---
// 请在下方引号内填入您的测试账号和密码
const HARDCODED_EMAIL = 'celia.weichen.wu@gmail.com'; 
const HARDCODED_PASSWORD = '424116';
// ------------------------------------------------

const Auth: React.FC<AuthProps> = ({ onResetConfig }) => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState(HARDCODED_EMAIL); // 默认填入
  const [password, setPassword] = useState(HARDCODED_PASSWORD); // 默认填入
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

  // 自动尝试登录（可选：如果您希望打开页面直接登录，可以解开下面注释）
  /*
  useEffect(() => {
    if (HARDCODED_EMAIL && HARDCODED_PASSWORD && !loading) {
       handleAuth(new Event('submit') as any);
    }
  }, []);
  */

  const handleReset = () => {
    resetSupabaseConfig();
    onResetConfig(); // Notify parent to switch view
  };

  const handleAuth = async (e: React.FormEvent) => {
    e?.preventDefault();
    if (!email || !password) return;
    
    setLoading(true);
    setMessage(null);

    try {
      const supabase = getSupabase();
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setMessage({ type: 'success', text: 'Registration successful! Please check your email or log in.' });
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'An error occurred' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f9f0] flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg border border-earth-200 w-full max-w-md relative">
        
        <button 
          onClick={handleReset}
          className="absolute top-4 right-4 text-earth-300 hover:text-earth-600 transition-colors"
          title="Reset Database Connection"
        >
          <Settings size={18} />
        </button>

        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-earth-100 rounded-full flex items-center justify-center mb-4 text-earth-600">
            <Sprout size={32} />
          </div>
          <h1 className="text-2xl font-bold text-earth-900">Mushroom Log</h1>
          <p className="text-earth-500">Cloud Sync Enabled</p>
        </div>

        {message && (
          <div className="mb-6 space-y-2">
            <div className={`p-3 rounded-lg text-sm ${message.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
              {message.text}
            </div>
            
            {message.type === 'error' && (
               <button 
                 onClick={handleReset}
                 className="w-full py-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
               >
                 <RefreshCw size={14} />
                 Wrong Database Settings? Reset Configuration
               </button>
            )}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-earth-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border border-earth-200 rounded-lg focus:ring-2 focus:ring-earth-500 outline-none"
              placeholder="grower@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-earth-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-earth-200 rounded-lg focus:ring-2 focus:ring-earth-500 outline-none"
              placeholder="••••••••"
              minLength={6}
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-earth-600 text-white py-3 rounded-lg font-bold hover:bg-earth-700 transition-colors flex justify-center items-center"
          >
            {loading ? <Loader2 className="animate-spin" /> : (isSignUp ? 'Sign Up' : 'Log In')}
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          <button 
            onClick={() => { setIsSignUp(!isSignUp); setMessage(null); }}
            className="text-earth-600 hover:text-earth-800 font-medium"
          >
            {isSignUp ? 'Already have an account? Log In' : 'Need an account? Sign Up'}
          </button>
        </div>
        
        {/* Quick Dev Login Helper */}
        {HARDCODED_EMAIL && !isSignUp && (
            <div className="mt-4 pt-4 border-t border-earth-100 text-center">
                <button 
                    onClick={(e) => handleAuth(e)}
                    className="text-xs text-blue-500 hover:text-blue-700 flex items-center justify-center gap-1 mx-auto"
                >
                    <Zap size={12} /> Auto-Login with Code Credentials
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default Auth;