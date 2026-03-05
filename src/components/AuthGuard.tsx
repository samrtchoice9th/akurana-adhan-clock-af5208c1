import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setAuthenticated(false);
        navigate('/auth', { replace: true });
      } else {
        setAuthenticated(true);
      }
      setChecking(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/auth', { replace: true });
      } else {
        setAuthenticated(true);
      }
      setChecking(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (checking) {
    return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Loading...</div>;
  }

  return authenticated ? <>{children}</> : null;
}
