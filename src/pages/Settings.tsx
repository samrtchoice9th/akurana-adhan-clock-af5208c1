import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Palette, Layout, Check, Bell, Gem, Coffee, Trees, Factory, Grape, Flame, MapPin, User, LogOut, Trash2, Shield, Volume2, ChevronDown, Star, MessageSquare, Send } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { useTheme, ThemeColor, DesignStyle } from '@/hooks/useTheme.tsx';
import { useNotifications } from '@/hooks/useNotifications';
import { useLocation, LocationOption } from '@/hooks/useLocation';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const COLORS: { value: ThemeColor; label: string; desc: string; preview: string; icon: typeof Gem }[] = [
  { value: 'black-gold', label: 'Black Gold Premium', desc: 'Luxury dark with gold accents', preview: 'bg-[hsl(43,75%,46%)]', icon: Gem },
  { value: 'mocha-stone', label: 'Mocha Stone', desc: 'Mocha grey and coffee-inspired palette', preview: 'bg-[#8C6A4F]', icon: Coffee },
  { value: 'olive-ash', label: 'Olive Ash', desc: 'Olive drab paired with bone tones', preview: 'bg-[#6E7B52]', icon: Trees },
  { value: 'concrete-dusk', label: 'Concrete Dusk', desc: 'Muted grey interior palette', preview: 'bg-[#7A7A74]', icon: Factory },
  { value: 'plum-shadow', label: 'Plum Shadow', desc: 'Deep plum landscape-inspired dark theme', preview: 'bg-[#7B4A66]', icon: Grape },
  { value: 'espresso-black', label: 'Espresso Black', desc: 'Dark wood and espresso tones', preview: 'bg-[#5F4636]', icon: Flame },
];

const STYLES: { value: DesignStyle; label: string; desc: string }[] = [
  { value: 'modern', label: 'Modern', desc: 'Rounded corners, soft shadows' },
  { value: 'classic', label: 'Classic', desc: 'Clean flat design' },
  { value: 'glass', label: 'Glass', desc: 'Frosted glass effects' },
];

const LOCATIONS: { value: LocationOption; label: string; desc: string }[] = [
  { value: 'central', label: 'Central Province', desc: 'Default — no offset' },
  { value: 'western', label: 'Western Province', desc: '+3 minutes to all Adhan times' },
  { value: 'eastern', label: 'Eastern Province', desc: '-3 minutes to all Adhan times' },
];

interface CollapsibleSectionProps {
  icon: React.ReactNode;
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function CollapsibleSection({ icon, title, defaultOpen = false, children }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="w-full mb-4">
      <Card className="w-full bg-card border-border">
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-2 cursor-pointer select-none">
            <CardTitle className="text-sm text-primary flex items-center gap-2">
              {icon}
              <span className="flex-1">{title}</span>
              <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", open && "rotate-180")} />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="p-4 pt-0">
            {children}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export default function Settings() {
  const { color, style, isRamadan, setColor, setStyle } = useTheme();
  const { location, setLocation } = useLocation();
  const { enabled, permission, toggle, prefs, setPreference, busy, iosNeedsHomescreen } = useNotifications(location);
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [deleting, setDeleting] = useState(false);
  const [adhanAlert, setAdhanAlert] = useState(() => localStorage.getItem('adhan-alert-enabled') !== 'false');

  const toggleAdhanAlert = (val: boolean) => {
    setAdhanAlert(val);
    localStorage.setItem('adhan-alert-enabled', val ? 'true' : 'false');
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth', { replace: true });
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: 'Not authenticated', variant: 'destructive' });
        return;
      }
      const res = await supabase.functions.invoke('delete-user-account', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.error) {
        toast({ title: 'Failed to delete account', description: res.error.message, variant: 'destructive' });
      } else {
        await supabase.auth.signOut();
        toast({ title: 'Account deleted successfully' });
        navigate('/', { replace: true });
      }
    } catch {
      toast({ title: 'Failed to delete account', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-4 py-6 max-w-md mx-auto">
      <header className="w-full flex items-center gap-3 mb-6">
        <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold text-primary tracking-wide">Settings</h1>
      </header>

      {isRamadan && (
        <Card className="w-full bg-primary/10 border-primary/30 mb-4">
          <CardContent className="p-3 text-center">
            <p className="text-sm font-medium text-primary">🌙 Ramadan theme is active</p>
            <p className="text-xs text-muted-foreground">Your preference will resume after Ramadan</p>
          </CardContent>
        </Card>
      )}

      {/* Account */}
      <CollapsibleSection icon={<User className="h-4 w-4" />} title="Account" defaultOpen>
        {user ? (
          <div className="space-y-2">
            <div className="text-sm text-foreground">
              <p className="font-semibold">{profile?.full_name || 'User'}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
              {profile?.masjid_name && (
                <p className="text-xs text-muted-foreground mt-1">{profile.masjid_name}</p>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout} className="w-full mt-2">
              <LogOut className="h-4 w-4 mr-2" /> Sign Out
            </Button>
          </div>
        ) : (
          <Link to="/auth">
            <Button variant="outline" size="sm" className="w-full">
              Sign in to track your Ibadah
            </Button>
          </Link>
        )}
      </CollapsibleSection>

      {/* Location */}
      <CollapsibleSection icon={<MapPin className="h-4 w-4" />} title="Location">
        <div className="space-y-2">
          {LOCATIONS.map((loc) => (
            <button
              key={loc.value}
              onClick={() => setLocation(loc.value)}
              className={cn(
                'w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all duration-300 text-left',
                location === loc.value
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-muted-foreground bg-card'
              )}
            >
              <div>
                <p className="text-sm font-semibold text-foreground">{loc.label}</p>
                <p className="text-xs text-muted-foreground">{loc.desc}</p>
              </div>
              {location === loc.value && <Check className="h-4 w-4 text-primary shrink-0" />}
            </button>
          ))}
        </div>
      </CollapsibleSection>

      {/* Color Theme */}
      <CollapsibleSection icon={<Palette className="h-4 w-4" />} title="Color Theme">
        <div className="space-y-2">
          {COLORS.map((c) => {
            const Icon = c.icon;
            return (
              <button
                key={c.value}
                onClick={() => setColor(c.value)}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-300 text-left',
                  color === c.value ? 'border-primary bg-primary/10' : 'border-border hover:border-muted-foreground bg-card'
                )}
              >
                <div className={cn('h-10 w-10 rounded-full shrink-0 flex items-center justify-center', c.preview)}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{c.label}</p>
                  <p className="text-xs text-muted-foreground">{c.desc}</p>
                </div>
                {color === c.value && <Check className="h-4 w-4 text-primary shrink-0" />}
              </button>
            );
          })}
        </div>
      </CollapsibleSection>

      {/* Design Style */}
      <CollapsibleSection icon={<Layout className="h-4 w-4" />} title="Design Style">
        <div className="space-y-2">
          {STYLES.map((s) => (
            <button
              key={s.value}
              onClick={() => setStyle(s.value)}
              className={cn(
                'w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all duration-300 text-left',
                style === s.value ? 'border-primary bg-primary/10' : 'border-border hover:border-muted-foreground bg-card'
              )}
            >
              <div>
                <p className="text-sm font-semibold text-foreground">{s.label}</p>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
              </div>
              {style === s.value && <Check className="h-4 w-4 text-primary shrink-0" />}
            </button>
          ))}
        </div>
      </CollapsibleSection>

      {/* Adhan Voice Alert */}
      <CollapsibleSection icon={<Volume2 className="h-4 w-4" />} title="Adhan Voice Alert">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Play Takbeer before prayer</p>
            <p className="text-xs text-muted-foreground">Short audio 5 minutes before each Adhan</p>
          </div>
          <Switch checked={adhanAlert} onCheckedChange={toggleAdhanAlert} />
        </div>
      </CollapsibleSection>

      {/* Notifications */}
      <CollapsibleSection icon={<Bell className="h-4 w-4" />} title="Prayer Reminder Settings">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Enable push reminders</p>
              <p className="text-xs text-muted-foreground">Uses Firebase Cloud Messaging in background</p>
            </div>
            <Switch checked={enabled} onCheckedChange={toggle} disabled={busy} />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-foreground">10 minutes before</p>
            <Switch checked={prefs.min10} onCheckedChange={(v) => setPreference('min10', v)} disabled={!enabled} />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-foreground">5 minutes before</p>
            <Switch checked={prefs.min5} onCheckedChange={(v) => setPreference('min5', v)} disabled={!enabled} />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-foreground">At Adhan</p>
            <Switch checked={prefs.adhan} onCheckedChange={(v) => setPreference('adhan', v)} disabled={!enabled} />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-foreground">At Iqamah</p>
            <Switch checked={prefs.iqamah} onCheckedChange={(v) => setPreference('iqamah', v)} disabled={!enabled} />
          </div>
          {permission === 'denied' && (
            <p className="text-xs text-destructive">Notifications are blocked. Please enable them in browser settings.</p>
          )}
          {iosNeedsHomescreen && (
            <p className="text-xs text-muted-foreground">For iPhone users, please add app to Home Screen to receive notifications.</p>
          )}
        </div>
      </CollapsibleSection>

      {/* Reviews & Feedback */}
      {user && <ReviewsSection userId={user.id} />}

      {/* Privacy & Data */}
      <CollapsibleSection icon={<Shield className="h-4 w-4" />} title="Privacy & Data">
        <div className="space-y-3">
          <Link to="/privacy-policy" className="block text-sm text-primary hover:underline">
            View Privacy Policy
          </Link>
          {user && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="w-full" disabled={deleting}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {deleting ? 'Deleting...' : 'Delete My Account'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your account,
                    profile, and all your Ibadah tracking data.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete Account
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CollapsibleSection>
    </div>
  );
}

/* ============ Reviews & Feedback Section ============ */

interface Review {
  id: string;
  message: string;
  rating: number;
  admin_reply: string | null;
  admin_replied_at: string | null;
  created_at: string;
}

function ReviewsSection({ userId }: { userId: string }) {
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);

  const fetchReviews = useCallback(async () => {
    const { data } = await supabase
      .from('user_reviews')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (data) setReviews(data as Review[]);
  }, [userId]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const handleSubmit = async () => {
    const trimmed = message.trim();
    if (!trimmed) {
      toast({ title: 'Please enter a message', variant: 'destructive' });
      return;
    }
    if (trimmed.length > 1000) {
      toast({ title: 'Message too long (max 1000 chars)', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('user_reviews').insert({
      user_id: userId,
      message: trimmed,
      rating,
    });
    if (error) {
      toast({ title: 'Failed to submit review', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Review submitted! Thank you.' });
      setMessage('');
      setRating(5);
      await fetchReviews();
    }
    setSubmitting(false);
  };

  return (
    <CollapsibleSection icon={<MessageSquare className="h-4 w-4" />} title="Reviews & Feedback">
      <div className="space-y-4">
        {/* Submit form */}
        <div className="space-y-3">
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground mr-1">Rating:</span>
            {[1, 2, 3, 4, 5].map((s) => (
              <button key={s} onClick={() => setRating(s)} className="p-0.5">
                <Star className={cn("h-5 w-5 transition-colors", s <= rating ? "text-primary fill-primary" : "text-muted-foreground")} />
              </button>
            ))}
          </div>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Share your feedback or suggestions..."
            className="bg-muted border-border text-foreground"
            rows={3}
            maxLength={1000}
          />
          <Button size="sm" className="w-full" onClick={handleSubmit} disabled={submitting}>
            <Send className="h-4 w-4 mr-2" />
            {submitting ? 'Submitting...' : 'Submit Review'}
          </Button>
        </div>

        {/* Past reviews */}
        {reviews.length > 0 && (
          <div className="space-y-3 pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground font-medium">Your Reviews</p>
            {reviews.map((r) => (
              <div key={r.id} className="rounded-lg bg-muted/50 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className={cn("h-3 w-3", s <= r.rating ? "text-primary fill-primary" : "text-muted-foreground")} />
                    ))}
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs text-foreground">{r.message}</p>
                {r.admin_reply && (
                  <div className="rounded-md bg-primary/10 p-2 mt-1">
                    <p className="text-[10px] font-semibold text-primary mb-0.5">Admin Reply</p>
                    <p className="text-xs text-foreground">{r.admin_reply}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </CollapsibleSection>
  );
}
