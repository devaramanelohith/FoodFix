import { useState, useEffect, FormEvent } from 'react';
import { supabase, isSupabaseConfigured, configureSupabase, getSupabaseConfigDetails, clearSupabaseConfig } from '../lib/supabase';
import { Mail, Lock, Chrome, Settings, Database, AlertCircle, CheckCircle2, ArrowRight, Eye, EyeOff, Loader2, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const LoginPage = () => {
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Connection settings state
  const [showSettings, setShowSettings] = useState(false);
  const [dbUrl, setDbUrl] = useState('');
  const [dbKey, setDbKey] = useState('');
  const config = getSupabaseConfigDetails();
  const configured = isSupabaseConfigured();
  const [copiedUrl, setCopiedUrl] = useState<'current' | 'dev' | 'pre' | null>(null);

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';

  useEffect(() => {
    if (config.url) {
      setDbUrl(config.url);
    }
  }, [config.url]);

  const copyToClipboard = (text: string, type: 'current' | 'dev' | 'pre') => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(type);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const handleOAuthLogin = async () => {
    if (!configured) {
      setErrorMsg('Supabase is not configured yet. Please use the connection form below first.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          skipBrowserRedirect: true,
        },
      });
      if (error) throw error;

      if (data?.url) {
        // Compute position to center the popup window
        const width = 600;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;

        const popup = window.open(
          data.url,
          'supabase_oauth_popup',
          `width=${width},height=${height},top=${top},left=${left},status=no,resizable=yes`
        );

        if (!popup) {
          setErrorMsg('Popup was blocked by your browser. Please allow popups for this site and try again.');
          setLoading(false);
        } else {
          setSuccessMsg('Opening Google sign-in window. Please log in there.');
          
          // Poll to restore loading state if they cancel/close the popup
          const pollTimer = setInterval(() => {
            if (popup.closed) {
              clearInterval(pollTimer);
              setLoading(false);
              setSuccessMsg(null);
            }
          }, 1000);
        }
      } else {
        throw new Error('No authentication URL returned from Supabase.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'OAuth login failed');
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: FormEvent) => {
    e.preventDefault();
    if (!configured) {
      setErrorMsg('Supabase is not configured yet. Please configure it below.');
      return;
    }

    if (!email || !password) {
      setErrorMsg('Please fill in all fields.');
      return;
    }

    if (mode === 'signUp' && password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (mode === 'signIn') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        setSuccessMsg('Successfully signed in!');
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setSuccessMsg('Sign-up successful! Please check your email for confirmation or log in.');
        setMode('signIn');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!dbUrl || !dbKey) {
      setErrorMsg('Please enter both Supabase URL and Anon Key.');
      return;
    }
    const success = configureSupabase(dbUrl.trim(), dbKey.trim());
    if (success) {
      setSuccessMsg('Supabase credentials successfully saved! Reloading client...');
      setShowSettings(false);
    } else {
      setErrorMsg('Failed to apply configuration. Check your values and try again.');
    }
  };

  const handleResetConfig = () => {
    clearSupabaseConfig();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 px-4 py-12">
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden"
      >
        {/* Banner Section */}
        <div className="bg-gradient-to-br from-orange-500 to-amber-600 px-8 py-10 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl transform translate-x-8 -translate-y-8" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-orange-600/20 rounded-full blur-xl transform -translate-x-4 translate-y-4" />
          
          <h1 className="text-4xl font-extrabold tracking-tight mb-2">Food<span className="text-amber-100 font-light">Fix</span></h1>
          <p className="text-orange-100 text-sm font-medium">Your personal companion for quick support & culinary fixes</p>
        </div>

        {/* Content Body */}
        <div className="p-8">
          
          {/* Notification Area */}
          <AnimatePresence mode="wait">
            {errorMsg && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 p-4 bg-rose-50 border border-rose-100 text-rose-700 rounded-2xl flex items-start gap-3 text-xs"
              >
                <AlertCircle className="shrink-0 mt-0.5" size={16} />
                <span>{errorMsg}</span>
              </motion.div>
            )}

            {successMsg && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 p-4 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-2xl flex items-start gap-3 text-xs"
              >
                <CheckCircle2 className="shrink-0 mt-0.5" size={16} />
                <span>{successMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tab Selection */}
          <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-2xl mb-8">
            <button
              onClick={() => { setMode('signIn'); setErrorMsg(null); }}
              className={`py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                mode === 'signIn' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Log In
            </button>
            <button
              onClick={() => { setMode('signUp'); setErrorMsg(null); }}
              className={`py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                mode === 'signUp' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 pl-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-slate-50 border border-slate-100 hover:border-slate-200 focus:border-orange-400 focus:bg-white rounded-2xl py-3 pl-11 pr-4 text-xs font-medium outline-none transition"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 pl-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'signIn' ? '••••••••' : 'Choose a secure password'}
                  className="w-full bg-slate-50 border border-slate-100 hover:border-slate-200 focus:border-orange-400 focus:bg-white rounded-2xl py-3 pl-11 pr-12 text-xs font-medium outline-none transition"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {mode === 'signUp' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 pl-1">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat your password"
                    className="w-full bg-slate-50 border border-slate-100 hover:border-slate-200 focus:border-orange-400 focus:bg-white rounded-2xl py-3 pl-11 pr-4 text-xs font-medium outline-none transition"
                    required
                  />
                </div>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 px-6 rounded-2xl text-xs tracking-wide transition shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:bg-slate-300 disabled:shadow-none"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <>
                  <span>{mode === 'signIn' ? 'Sign In' : 'Create Account'}</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6 text-center">
            <hr className="border-slate-100" />
            <span className="bg-white text-[10px] font-bold text-slate-400 px-3 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 uppercase tracking-wider">Or continue with</span>
          </div>

          {/* Social login buttons */}
          <button
            onClick={handleOAuthLogin}
            disabled={loading}
            className="w-full bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-bold py-3 px-6 rounded-2xl text-xs transition flex items-center justify-center gap-2 disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-100"
          >
            <Chrome size={16} className="text-red-500" />
            <span>Login with Google</span>
          </button>

          {/* Supabase status footer indicator */}
          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5 font-medium">
              <Database size={13} className="text-slate-400" />
              <span>Supabase Integration</span>
            </span>
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[9px] ${
              configured ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
            }`}>
              <span className={`w-1 h-1 rounded-full ${configured ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              {configured ? 'Connected' : 'Not Connected'}
            </span>
          </div>

          {/* Dev credentials toggler */}
          <div className="mt-4 text-center">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="text-orange-500 hover:text-orange-600 font-bold text-[11px] inline-flex items-center gap-1 hover:underline cursor-pointer"
            >
              <Settings size={12} />
              <span>{showSettings ? 'Hide' : 'Show'} Database Connection Setup</span>
            </button>
          </div>
        </div>

        {/* Dynamic connection settings form */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-slate-50 border-t border-slate-100 px-8 py-6"
            >
              <h3 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                <Settings size={14} className="text-orange-500" />
                <span>Developer Connection Panel</span>
              </h3>
              <p className="text-[10px] text-slate-400 leading-relaxed mb-4">
                Enter your Supabase credentials below. They are securely saved in your browser's local storage and used to initialize the client.
              </p>

              {/* Redirect URLs Help Section */}
              <div className="bg-slate-100/80 rounded-2xl p-4 border border-slate-200/50 mb-5 space-y-3">
                <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Database size={13} className="text-orange-500" />
                  <span>Required Redirect URLs</span>
                </h4>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Google OAuth blocks log ins inside frames. To work smoothly in AI Studio, configure these URLs in your Supabase Dashboard under <strong>Authentication &gt; URL Configuration &gt; Redirect URLs</strong>:
                </p>
                
                <div className="space-y-2">
                  <div className="bg-white rounded-xl border border-slate-200 p-2.5 flex items-center justify-between text-[11px] font-medium text-slate-700">
                    <div className="truncate pr-2">
                      <span className="text-[9px] font-bold text-orange-500 uppercase block">Current Environment</span>
                      <span className="font-mono">{currentOrigin || 'Loading...'}</span>
                    </div>
                    {currentOrigin && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(currentOrigin, 'current')}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 p-1.5 rounded-lg transition shrink-0 cursor-pointer"
                        title="Copy to clipboard"
                      >
                        {copiedUrl === 'current' ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                      </button>
                    )}
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 p-2.5 flex items-center justify-between text-[11px] font-medium text-slate-700">
                    <div className="truncate pr-2">
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">Development URL</span>
                      <span className="font-mono">https://ais-dev-4zctk3efizh5od6qty6mb4-930861248009.asia-east1.run.app</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard('https://ais-dev-4zctk3efizh5od6qty6mb4-930861248009.asia-east1.run.app', 'dev')}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 p-1.5 rounded-lg transition shrink-0 cursor-pointer"
                      title="Copy to clipboard"
                    >
                      {copiedUrl === 'dev' ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                    </button>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 p-2.5 flex items-center justify-between text-[11px] font-medium text-slate-700">
                    <div className="truncate pr-2">
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">Shared / Deployed URL</span>
                      <span className="font-mono">https://ais-pre-4zctk3efizh5od6qty6mb4-930861248009.asia-east1.run.app</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard('https://ais-pre-4zctk3efizh5od6qty6mb4-930861248009.asia-east1.run.app', 'pre')}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 p-1.5 rounded-lg transition shrink-0 cursor-pointer"
                      title="Copy to clipboard"
                    >
                      {copiedUrl === 'pre' ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                    </button>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSaveConfig} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">SUPABASE URL</label>
                  <input
                    type="url"
                    value={dbUrl}
                    onChange={(e) => setDbUrl(e.target.value)}
                    placeholder="https://your-project.supabase.co"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-[11px] focus:ring-1 focus:ring-orange-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">SUPABASE ANON KEY</label>
                  <input
                    type="password"
                    value={dbKey}
                    onChange={(e) => setDbKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-[11px] focus:ring-1 focus:ring-orange-500 outline-none"
                    required
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    className="flex-grow bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold py-2 rounded-xl transition"
                  >
                    Apply & Connect
                  </button>
                  {configured && (
                    <button
                      type="button"
                      onClick={handleResetConfig}
                      className="bg-rose-50 hover:bg-rose-100 text-rose-600 text-[10px] font-bold py-2 px-3 rounded-xl border border-rose-100 transition"
                    >
                      Clear Saved
                    </button>
                  )}
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
