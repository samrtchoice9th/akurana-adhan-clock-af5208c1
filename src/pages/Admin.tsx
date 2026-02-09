import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, ArrowLeft, Lock, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

const ADMIN_PASSWORD = 'akurana2026';

interface FormData {
  hijri_date: string;
  subah_adhan: string;
  subah_iqamath: string;
  sunrise: string;
  luhar_adhan: string;
  luhar_iqamath: string;
  asr_adhan: string;
  asr_iqamath: string;
  magrib_adhan: string;
  magrib_iqamath: string;
  isha_adhan: string;
  isha_iqamath: string;
}

const emptyForm: FormData = {
  hijri_date: '',
  subah_adhan: '',
  subah_iqamath: '',
  sunrise: '',
  luhar_adhan: '',
  luhar_iqamath: '',
  asr_adhan: '',
  asr_iqamath: '',
  magrib_adhan: '',
  magrib_iqamath: '',
  isha_adhan: '',
  isha_iqamath: '',
};

const prayerFields = [
  { label: 'Subah', adhan: 'subah_adhan', iqamath: 'subah_iqamath' },
  { label: 'Sunrise', adhan: 'sunrise', iqamath: null },
  { label: 'Luhar', adhan: 'luhar_adhan', iqamath: 'luhar_iqamath' },
  { label: 'Asr', adhan: 'asr_adhan', iqamath: 'asr_iqamath' },
  { label: 'Magrib', adhan: 'magrib_adhan', iqamath: 'magrib_iqamath' },
  { label: 'Isha', adhan: 'isha_adhan', iqamath: 'isha_iqamath' },
] as const;

export default function Admin() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [form, setForm] = useState<FormData>({ ...emptyForm });
  const [existingId, setExistingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Load existing data when date changes
  useEffect(() => {
    if (!selectedDate) return;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    supabase
      .from('prayer_times')
      .select('*')
      .eq('date', dateStr)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setExistingId(data.id);
          setForm({
            hijri_date: data.hijri_date || '',
            subah_adhan: data.subah_adhan || '',
            subah_iqamath: data.subah_iqamath || '',
            sunrise: data.sunrise || '',
            luhar_adhan: data.luhar_adhan || '',
            luhar_iqamath: data.luhar_iqamath || '',
            asr_adhan: data.asr_adhan || '',
            asr_iqamath: data.asr_iqamath || '',
            magrib_adhan: data.magrib_adhan || '',
            magrib_iqamath: data.magrib_iqamath || '',
            isha_adhan: data.isha_adhan || '',
            isha_iqamath: data.isha_iqamath || '',
          });
        } else {
          setExistingId(null);
          setForm({ ...emptyForm });
        }
      });
  }, [selectedDate]);

  const handleSave = async () => {
    if (!selectedDate) {
      toast({ title: 'Please select a date', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const payload = { date: dateStr, ...form };

    let error;
    if (existingId) {
      ({ error } = await supabase.from('prayer_times').update(payload).eq('id', existingId));
    } else {
      ({ error } = await supabase.from('prayer_times').insert(payload));
    }

    setSaving(false);
    if (error) {
      toast({ title: 'Error saving', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: existingId ? 'Updated successfully' : 'Saved successfully' });
      if (!existingId) {
        // Reload to get the ID
        const { data } = await supabase.from('prayer_times').select('id').eq('date', dateStr).maybeSingle();
        if (data) setExistingId(data.id);
      }
    }
  };

  const updateField = (key: keyof FormData, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  // Password gate
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="w-full max-w-sm bg-card border-border">
          <CardHeader className="text-center">
            <Lock className="h-10 w-10 text-primary mx-auto mb-2" />
            <CardTitle className="text-foreground">Admin Access</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && password === ADMIN_PASSWORD) setAuthenticated(true);
              }}
              className="bg-muted border-border text-foreground"
            />
            <Button
              className="w-full"
              onClick={() => {
                if (password === ADMIN_PASSWORD) {
                  setAuthenticated(true);
                } else {
                  toast({ title: 'Wrong password', variant: 'destructive' });
                }
              }}
            >
              Enter
            </Button>
            <Link to="/" className="block text-center text-sm text-muted-foreground hover:text-foreground transition-colors">
              ← Back to Prayer Times
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold text-primary">Admin — Prayer Time Entry</h1>
      </div>

      {/* Date Picker */}
      <div className="mb-6">
        <Label className="text-foreground mb-2 block">Select Date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-full justify-start text-left font-normal bg-muted border-border',
                !selectedDate && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDate ? format(selectedDate, 'PPP') : 'Pick a date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={date => date.getFullYear() !== 2026}
              defaultMonth={new Date(2026, 0)}
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
        {existingId && (
          <p className="text-xs text-secondary mt-2">✎ Editing existing entry</p>
        )}
      </div>

      {/* Hijri Date */}
      <div className="mb-6">
        <Label className="text-foreground mb-2 block">Hijri Date</Label>
        <Input
          placeholder="e.g. Sha'bān 12, 1447"
          value={form.hijri_date}
          onChange={e => updateField('hijri_date', e.target.value)}
          className="bg-muted border-border text-foreground"
        />
      </div>

      {/* Prayer Fields */}
      <div className="space-y-4 mb-8">
        {prayerFields.map(field => (
          <Card key={field.label} className="bg-card border-border">
            <CardContent className="p-4">
              <h3 className="text-primary font-semibold mb-3">{field.label}</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">
                    {field.iqamath ? 'Adhan' : 'Time'}
                  </Label>
                  <Input
                    placeholder="e.g. 5:10 AM"
                    value={form[field.adhan as keyof FormData]}
                    onChange={e => updateField(field.adhan as keyof FormData, e.target.value)}
                    className="bg-muted border-border text-foreground font-mono"
                  />
                </div>
                {field.iqamath && (
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Iqamath</Label>
                    <Input
                      placeholder="e.g. 5:40 AM"
                      value={form[field.iqamath as keyof FormData]}
                      onChange={e => updateField(field.iqamath as keyof FormData, e.target.value)}
                      className="bg-muted border-border text-foreground font-mono"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Save Button */}
      <Button className="w-full" size="lg" onClick={handleSave} disabled={saving || !selectedDate}>
        <Save className="mr-2 h-4 w-4" />
        {saving ? 'Saving...' : existingId ? 'Update' : 'Save'}
      </Button>
    </div>
  );
}
