import { ArrowLeft, Palette, Layout, Check, Bell, Gem, Coffee, Trees, Factory, Grape, Flame, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useTheme, ThemeColor, DesignStyle } from '@/hooks/useTheme';
import { useNotifications } from '@/hooks/useNotifications';
import { useLocation, LocationOption } from '@/hooks/useLocation';
import { cn } from '@/lib/utils';

const COLORS: { value: ThemeColor; label: string; desc: string; preview: string; icon: typeof Sun }[] = [
  { value: 'black-gold', label: 'Black Gold Premium', desc: 'Luxury dark with gold accents', preview: 'bg-[hsl(43,75%,46%)]', icon: Gem },
  { value: 'mocha-stone', label: 'Mocha Stone', desc: 'Mocha grey and coffee-inspired palette', preview: 'bg-[#8C6A4F]', icon: Moon },
  { value: 'olive-ash', label: 'Olive Ash', desc: 'Olive drab paired with bone tones', preview: 'bg-[#6E7B52]', icon: Leaf },
  { value: 'concrete-dusk', label: 'Concrete Dusk', desc: 'Muted grey interior palette', preview: 'bg-[#7A7A74]', icon: Building2 },
  { value: 'plum-shadow', label: 'Plum Shadow', desc: 'Deep plum landscape-inspired dark theme', preview: 'bg-[#7B4A66]', icon: Palette },
  { value: 'espresso-black', label: 'Espresso Black', desc: 'Dark wood and espresso tones', preview: 'bg-[#5F4636]', icon: Sun },
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

export default function Settings() {
  const { color, style, isRamadan, setColor, setStyle } = useTheme();
  const { location, setLocation } = useLocation();
  const { enabled, permission, toggle, prefs, setPreference, busy, iosNeedsHomescreen } = useNotifications(location);

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

      <Card className="w-full bg-card border-border mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-primary flex items-center gap-2">
            <MapPin className="h-4 w-4" /> Location
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
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
        </CardContent>
      </Card>

      <Card className="w-full bg-card border-border mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-primary flex items-center gap-2">
            <Palette className="h-4 w-4" /> Choose your preferred color theme
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
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
        </CardContent>
      </Card>

      <Card className="w-full bg-card border-border mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-primary flex items-center gap-2">
            <Layout className="h-4 w-4" /> Design Style
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
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
        </CardContent>
      </Card>

      <Card className="w-full bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-primary flex items-center gap-2">
            <Bell className="h-4 w-4" /> Prayer Reminder Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-3">
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
        </CardContent>
      </Card>
    </div>
  );
}
