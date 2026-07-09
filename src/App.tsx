import { useState, useEffect } from 'react';
import { FoodFixMain } from './components/FoodFixMain';
import { LoginPage } from './components/LoginPage';
import { supabase, initSupabaseFromServer } from './lib/supabase';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isPopup, setIsPopup] = useState(false);

  useEffect(() => {
    let active = true;
    let subscription: any = null;

    const handleOAuthMessage = async (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost') && !origin.includes('ai.studio')) {
        return;
      }

      if (event.data?.type === 'SUPABASE_AUTH_SUCCESS') {
        const sessionData = event.data.session;
        if (sessionData) {
          try {
            await supabase.auth.setSession({
              access_token: sessionData.access_token,
              refresh_token: sessionData.refresh_token,
            });
            if (active) setSession(sessionData);
          } catch (err) {
            console.error('Error setting session on client:', err);
            const { data: { session } } = await supabase.auth.getSession();
            if (active) setSession(session);
          }
        } else {
          const { data: { session } } = await supabase.auth.getSession();
          if (active) setSession(session);
        }
      }
    };

    window.addEventListener('message', handleOAuthMessage);

    const runInit = async () => {
      await initSupabaseFromServer();
      if (!active) return;

      // If we are running inside an OAuth callback popup
      if (typeof window !== 'undefined' && window.opener && window.opener !== window) {
        setIsPopup(true);
        // Wait a short moment to ensure Supabase has finished parsing the hash/query
        await new Promise((resolve) => setTimeout(resolve, 800));
        try {
          const { data: { session: popSession } } = await supabase.auth.getSession();
          window.opener.postMessage({ 
            type: 'SUPABASE_AUTH_SUCCESS', 
            session: popSession 
          }, '*');
          window.close();
        } catch (err) {
          console.error('Error fetching/sending session in popup:', err);
        }
        return;
      }

      // Check initial active session on main window/iframe
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        if (active) setSession(initialSession);
      } catch (err) {
        console.error('Error getting Supabase session:', err);
      } finally {
        if (active) setLoading(false);
      }

      // Listen for real-time authentication changes
      const { data } = supabase.auth.onAuthStateChange((_event, authSession) => {
        if (active) {
          setSession(authSession);
          setLoading(false);
        }
      });
      subscription = data.subscription;
    };

    runInit();

    return () => {
      active = false;
      window.removeEventListener('message', handleOAuthMessage);
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error signing out:', err);
    } finally {
      setLoading(false);
    }
  };

  if (isPopup) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6 text-center">
        <Loader2 className="animate-spin text-orange-500 w-12 h-12 mb-4" />
        <h2 className="text-xl font-bold text-slate-800 mb-2">Connecting to FoodFix</h2>
        <p className="text-slate-500 text-xs max-w-xs leading-relaxed">
          Successfully logged in! Returning you to the main application in a moment...
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="animate-spin text-orange-500 w-10 h-10 mb-4" />
        <p className="text-slate-500 text-sm font-semibold tracking-wide">Initializing FoodFix Auth...</p>
      </div>
    );
  }

  if (!session) {
    return <LoginPage />;
  }

  return <FoodFixMain user={session.user} onLogout={handleLogout} />;
}
