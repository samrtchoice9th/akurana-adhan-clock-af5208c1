import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ArrowLeft, LogIn, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Tab = 'login' | 'register';

export default function Auth() {
  const [tab, setTab] = useState<Tab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [masjidName, setMasjidName] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [busy, setBusy] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await signIn(email, password);
    setBusy(false);
    if (error) {
      toast({ title: 'Login failed', description: error.message, variant: 'destructive' });
    } else {
      navigate('/ramadan-chart', { replace: true });
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast({ title: 'Full name is required', variant: 'destructive' });
      return;
    }
    setBusy(true);
    const { error } = await signUp(email, password, {
      full_name: fullName.trim(),
      masjid_name: masjidName.trim() || undefined,
      city: city.trim() || undefined,
      province: province.trim() || undefined,
    });
    setBusy(false);
    if (error) {
      toast({ title: 'Registration failed', description: error.message, variant: 'destructive' });
    } else {
      toast({
        title: 'Check your email',
        description: 'We sent you a verification link. Please verify your email before logging in.',
      });
      setTab('login');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-4 py-8 max-w-md mx-auto">
      <header className="w-full flex items-center gap-3 mb-6">
        <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold text-primary tracking-wide">
          {tab === 'login' ? 'Login' : 'Create Account'}
        </h1>
      </header>

      {/* Tab switcher */}
      <div className="w-full flex rounded-xl border border-border overflow-hidden mb-6">
        <button
          onClick={() => setTab('login')}
          className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
            tab === 'login' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:text-foreground'
          }`}
        >
          <LogIn className="inline h-4 w-4 mr-1.5 -mt-0.5" /> Login
        </button>
        <button
          onClick={() => setTab('register')}
          className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
            tab === 'register' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:text-foreground'
          }`}
        >
          <UserPlus className="inline h-4 w-4 mr-1.5 -mt-0.5" /> Register
        </button>
      </div>

      <Card className="w-full bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-primary">
            {tab === 'login' ? 'Sign in to your account' : 'Register a new account'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <form onSubmit={tab === 'login' ? handleLogin : handleRegister} className="space-y-4">
            {tab === 'register' && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="masjidName">Masjid Name</Label>
                  <Input id="masjidName" value={masjidName} onChange={(e) => setMasjidName(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="city">City</Label>
                    <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="province">Province</Label>
                    <Input id="province" value={province} onChange={(e) => setProvince(e.target.value)} />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>

            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? 'Please wait...' : tab === 'login' ? 'Sign In' : 'Create Account'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
