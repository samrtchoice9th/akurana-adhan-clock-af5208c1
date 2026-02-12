import { ArrowLeft, Palette, Layout, Check, Bell, Sun, Moon, Building2, Gem, Leaf } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useTheme, ThemeColor, DesignStyle } from '@/hooks/useTheme.tsx';
import { useNotifications } from '@/hooks/useNotifications';
import { usePrayerTimes, getPrayerList } from '@/hooks/usePrayerTimes';
import { cn } from '@/lib/utils';

const COLORS: { value: ThemeColor; label: string; desc: string; preview: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Default Light', desc: 'Clean, professional light theme', preview: 'bg-[hsl(210,20%,98%)]', icon: Sun },
  { value: 'navy', label: 'Dark Navy', desc: 'Dark blue professional', preview: 'bg-[hsl(222,47%,6%)]', icon: Moon },
  { value: 'blue-finance', label: 'Blue Finance', desc: 'Corporate blue tones', preview: 'bg-[hsl(224,76%,48%)]', icon: Building2 },
  { value: 'black-gold', label: 'Black Gold Premium', desc: 'Luxury dark with gold accents', preview: 'bg-[hsl(43,75%,46%)]', icon: Gem },
  { value: 'teal', label: 'Teal Fresh', desc: 'Modern teal accents', preview: 'bg-[hsl(168,76%,36%)]', icon: Leaf },
];

const STYLES: { value: DesignStyle; label: string; desc: string }[] = [
  { value: 'modern', label: 'Modern', desc: 'Rounded corners, soft shadows' },
  { value: 'classic', label: 'Classic', desc: 'Clean flat design' },
  { value: 'glass', label: 'Glass', desc: 'Frosted glass effects' },
];

export default function Settings() {
  const { color, style, setColor, setStyle } = useTheme();
  const { merged } = usePrayerTimes();
  const prayers = getPrayerList(merged);
  const { enabled, permission, toggle } = useNotifications(prayers);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-4 py-6 max-w-md mx-auto">
      <header className="w-full flex items-center gap-3 mb-6">
        <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold text-primary tracking-wide">Settings</h1>
      </header>

      {/* Theme Color */}
      <Card className="w-full bg-card border-border mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-primary flex items-center gap-2">
            <Palette className="h-4 w-4" /> Choose your preferred color theme
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="space-y-2">
            {COLORS.map(c => {
              const Icon = c.icon;
              return (
                <button
                  key={c.value}
                  onClick={() => setColor(c.value)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-300 text-left',
                    color === c.value
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-muted-foreground bg-card'
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

      {/* Design Style */}
      <Card className="w-full bg-card border-border mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-primary flex items-center gap-2">
            <Layout className="h-4 w-4" /> Design Style
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="space-y-2">
            {STYLES.map(s => (
              <button
                key={s.value}
                onClick={() => setStyle(s.value)}
                className={cn(
                  'w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all duration-300 text-left',
                  style === s.value
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-muted-foreground bg-card'
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

      {/* Notifications */}
      <Card className="w-full bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-primary flex items-center gap-2">
            <Bell className="h-4 w-4" /> Prayer Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">5-minute reminder</p>
              <p className="text-xs text-muted-foreground">Get notified before each prayer</p>
            </div>
            <Switch checked={enabled} onCheckedChange={toggle} />
          </div>
          {permission === 'denied' && (
            <p className="text-xs text-destructive mt-2">
              Notifications are blocked. Please enable them in your browser settings.
            </p>
          )}
          {typeof Notification === 'undefined' && (
            <p className="text-xs text-muted-foreground mt-2">
              Install this app to your home screen to enable notifications.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
