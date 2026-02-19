import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Lock, Upload, Moon, AlertTriangle, Clock, CheckCircle, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { CsvChangeRow } from '@/lib/csvParser';
import { parseExcel } from '@/lib/excelParser';
import { useHijriDate, formatHijriDate } from '@/hooks/useHijriDate';
import { Label } from '@/components/ui/label';

const ADMIN_PASSWORD_HASH = import.meta.env.VITE_ADMIN_PASSWORD_HASH;

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export default function Admin() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authenticating, setAuthenticating] = useState(false);
  const { toast } = useToast();

  const authenticate = useCallback(async () => {
    if (!ADMIN_PASSWORD_HASH) {
      toast({ title: 'Admin password hash is not configured', variant: 'destructive' });
      return;
    }

    setAuthenticating(true);
    try {
      const passwordHash = await sha256Hex(password);
      if (passwordHash === ADMIN_PASSWORD_HASH.toLowerCase()) {
        setAuthenticated(true);
        return;
      }
      toast({ title: 'Wrong password', variant: 'destructive' });
    } finally {
      setAuthenticating(false);
    }
  }, [password, toast]);

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
                if (e.key === 'Enter') void authenticate();
              }}
              className="bg-muted border-border text-foreground"
            />
            <Button className="w-full" onClick={() => void authenticate()} disabled={authenticating}>
              {authenticating ? 'Checking...' : 'Enter'}
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
      <div className="flex items-center gap-3 mb-6">
        <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold text-primary">Admin Panel</h1>
      </div>

      <Tabs defaultValue="csv" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="csv" className="flex-1">Excel Upload</TabsTrigger>
          <TabsTrigger value="hijri" className="flex-1">Hijri Control</TabsTrigger>
          <TabsTrigger value="hadith" className="flex-1">Hadith</TabsTrigger>
        </TabsList>

        <TabsContent value="csv">
          <CsvUploadTab />
        </TabsContent>
        <TabsContent value="hijri">
          <HijriControlTab />
        </TabsContent>
        <TabsContent value="hadith">
          <HadithTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* =================== CSV Upload Tab =================== */

function CsvUploadTab() {
  const [parsedRows, setParsedRows] = useState<CsvChangeRow[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [existingCount, setExistingCount] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;
    supabase
      .from('prayer_time_changes')
      .select('id', { count: 'exact', head: true })
      .then(({ count, error }) => {
        if (!mounted) return;
        if (error) {
          toast({ title: 'Failed to load existing record count', description: error.message, variant: 'destructive' });
          return;
        }
        setExistingCount(count ?? 0);
      });

    return () => {
      mounted = false;
    };
  }, [toast]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/\.(xlsx|xls)$/i.test(file.name)) {
      setParsedRows(null);
      setParseError('Please upload a valid Excel file (.xlsx or .xls).');
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => {
      setParsedRows(null);
      setParseError('Failed to read the selected file. Please try again.');
    };

    reader.onload = () => {
      if (!(reader.result instanceof ArrayBuffer)) {
        setParsedRows(null);
        setParseError('Invalid file data. Please try again.');
        return;
      }

      const result = parseExcel(reader.result);
      if (result.success) {
        setParsedRows(result.rows);
        setParseError(null);
      } else {
        setParsedRows(null);
        setParseError(result.error);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSave = async () => {
    if (!parsedRows) return;
    setSaving(true);

    const { error: delErr } = await supabase.from('prayer_time_changes').delete().gte('effective_from', '1900-01-01');
    if (delErr) {
      toast({ title: 'Error clearing existing data', description: delErr.message, variant: 'destructive' });
      setSaving(false);
      return;
    }

    for (let i = 0; i < parsedRows.length; i += 50) {
      const batch = parsedRows.slice(i, i + 50).map(r => ({
        effective_from: r.effective_from,
        subah_adhan: r.subah_adhan || null,
        sunrise: r.sunrise || null,
        luhar_adhan: r.luhar_adhan || null,
        asr_adhan: r.asr_adhan || null,
        magrib_adhan: r.magrib_adhan || null,
        isha_adhan: r.isha_adhan || null,
      }));
      const { error } = await supabase.from('prayer_time_changes').insert(batch);
      if (error) {
        toast({ title: 'Error saving data', description: error.message, variant: 'destructive' });
        setSaving(false);
        return;
      }
    }

    toast({ title: `Saved ${parsedRows.length} records successfully` });
    setExistingCount(parsedRows.length);
    setParsedRows(null);
    setParseError(null);
    if (fileRef.current) fileRef.current.value = '';
    setSaving(false);
  };

  return (
    <div className="space-y-4 mt-4">
      <Card className="bg-card border-border">
        <CardContent className="p-4 space-y-4">
          <div>
            <Label className="text-foreground mb-2 block">Upload Excel File (.xlsx)</Label>
            <Input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFile} className="bg-muted border-border text-foreground" />
          </div>
          {existingCount !== null && (
            <p className="text-xs text-muted-foreground">Current records in database: {existingCount}</p>
          )}
        </CardContent>
      </Card>

      {parseError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Validation Error</AlertTitle>
          <AlertDescription className="whitespace-pre-wrap font-mono text-xs">{parseError}</AlertDescription>
        </Alert>
      )}

      {parsedRows && (
        <>
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-primary">Preview — {parsedRows.length} rows</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-64 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Date</TableHead>
                      <TableHead className="text-xs">Subah</TableHead>
                      <TableHead className="text-xs">Sunrise</TableHead>
                      <TableHead className="text-xs">Luhar</TableHead>
                      <TableHead className="text-xs">Asr</TableHead>
                      <TableHead className="text-xs">Magrib</TableHead>
                      <TableHead className="text-xs">Isha</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedRows.map(row => (
                      <TableRow key={row.effective_from}>
                        <TableCell className="text-xs font-mono">{row.effective_from}</TableCell>
                        <TableCell className="text-xs">{row.subah_adhan || '—'}</TableCell>
                        <TableCell className="text-xs">{row.sunrise || '—'}</TableCell>
                        <TableCell className="text-xs">{row.luhar_adhan || '—'}</TableCell>
                        <TableCell className="text-xs">{row.asr_adhan || '—'}</TableCell>
                        <TableCell className="text-xs">{row.magrib_adhan || '—'}</TableCell>
                        <TableCell className="text-xs">{row.isha_adhan || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Button className="w-full" size="lg" onClick={handleSave} disabled={saving}>
            <Upload className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : `Confirm & Save ${parsedRows.length} Records`}
          </Button>
        </>
      )}
    </div>
  );
}

/* =================== Hijri Control Tab =================== */

interface AdminLogEntry {
  id: string;
  action: string;
  hijri_date_snapshot: string;
  created_at: string;
}

function HijriControlTab() {
  const { hijri, loading, updateHijri, moonSighted, moonNotSighted, logAdminAction } = useHijriDate();
  const { toast } = useToast();
  const [logs, setLogs] = useState<AdminLogEntry[]>([]);
  const [manualYear, setManualYear] = useState('');
  const [manualMonth, setManualMonth] = useState('');
  const [manualDay, setManualDay] = useState('');
  const [saving, setSaving] = useState(false);

  const refreshLogs = async () => {
    const { data } = await supabase.from('hijri_admin_log').select('*').order('created_at', { ascending: false }).limit(10);
    if (data) setLogs(data as AdminLogEntry[]);
  };

  useEffect(() => { void refreshLogs(); }, []);

  // Pre-fill manual fields whenever hijri loads
  useEffect(() => {
    if (hijri) {
      setManualYear(String(hijri.hijri_year));
      setManualMonth(String(hijri.hijri_month));
      setManualDay(String(hijri.hijri_day));
    }
  }, [hijri?.hijri_year, hijri?.hijri_month, hijri?.hijri_day]);

  if (loading) return <p className="text-muted-foreground mt-4">Loading...</p>;
  if (!hijri) return <p className="text-muted-foreground mt-4">No Hijri date record found.</p>;

  const handleManualSave = async () => {
    const y = parseInt(manualYear, 10);
    const m = parseInt(manualMonth, 10);
    const d = parseInt(manualDay, 10);
    if (!y || !m || !d || m < 1 || m > 12 || d < 1 || d > 30) {
      toast({ title: 'Invalid date — check year, month (1-12), day (1-30)', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const snapshot = formatHijriDate(hijri);
    const err = await updateHijri(y, m, d);
    if (!err) {
      await logAdminAction(`manual_set:${d}/${m}/${y}`, snapshot);
      toast({ title: `✅ Hijri date set to ${d}/${m}/${y}` });
      await refreshLogs();
    } else {
      toast({ title: 'Error saving date', description: String(err), variant: 'destructive' });
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4 mt-4">
      {/* Current date display */}
      <Card className="bg-card border-border">
        <CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Current Hijri Date</p>
          <p className="text-2xl font-bold text-primary">{formatHijriDate(hijri)}</p>
          <p className="text-xs text-muted-foreground mt-1">Last updated: {hijri.last_updated}</p>
        </CardContent>
      </Card>

      {/* Manual date override — always visible */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-primary">✏️ Manual Date Override</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Day (1-30)</Label>
              <Input
                type="number" min={1} max={30}
                value={manualDay}
                onChange={e => setManualDay(e.target.value)}
                className="bg-muted border-border text-foreground text-center"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Month (1-12)</Label>
              <Input
                type="number" min={1} max={12}
                value={manualMonth}
                onChange={e => setManualMonth(e.target.value)}
                className="bg-muted border-border text-foreground text-center"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Year</Label>
              <Input
                type="number"
                value={manualYear}
                onChange={e => setManualYear(e.target.value)}
                className="bg-muted border-border text-foreground text-center"
              />
            </div>
          </div>
          <Button className="w-full" onClick={handleManualSave} disabled={saving}>
            {saving ? 'Saving...' : '💾 Save Date'}
          </Button>
        </CardContent>
      </Card>

      {/* Moon sighting — always visible */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-primary flex items-center gap-2">
            <Moon className="h-4 w-4" /> Moon Sighting
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-2">
          <Button size="sm" className="w-full" onClick={async () => {
            const snapshot = formatHijriDate(hijri);
            const err = await moonSighted();
            if (!err) {
              await logAdminAction('moon_sighted', snapshot);
              toast({ title: '🌙 Moon Sighted — New month started' });
              await refreshLogs();
            } else {
              toast({ title: 'Error', description: String(err), variant: 'destructive' });
            }
          }}>
            🌙 Moon Sighted (start new month)
          </Button>
          <Button size="sm" variant="outline" className="w-full" onClick={async () => {
            const snapshot = formatHijriDate(hijri);
            const err = await moonNotSighted();
            if (!err) {
              await logAdminAction('moon_not_sighted', snapshot);
              toast({ title: '❌ Moon Not Sighted — Day 30 set' });
              await refreshLogs();
            } else {
              toast({ title: 'Error', description: String(err), variant: 'destructive' });
            }
          }}>
            ❌ Moon Not Sighted (set day 30)
          </Button>
        </CardContent>
      </Card>

      {/* Admin action log */}
      {logs.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-primary flex items-center gap-2">
              <Clock className="h-4 w-4" /> Admin Action Log
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-48 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Action</TableHead>
                    <TableHead className="text-xs">Date Snapshot</TableHead>
                    <TableHead className="text-xs">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map(log => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs font-mono">{log.action}</TableCell>
                      <TableCell className="text-xs">{log.hijri_date_snapshot}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(log.created_at).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* =================== Hadith Tab =================== */

interface HadithRow {
  id: string;
  hadith_tamil: string;
  hadith_english: string | null;
  reference: string | null;
  is_active: boolean;
  created_at: string;
}

function HadithTab() {
  const { toast } = useToast();
  const [hadithTamil, setHadithTamil] = useState('');
  const [hadithEnglish, setHadithEnglish] = useState('');
  const [reference, setReference] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hadiths, setHadiths] = useState<HadithRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoadingList(true);
    const { data, error } = await supabase
      .from('hadiths')
      .select('id, hadith_tamil, hadith_english, reference, is_active, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Error loading hadiths', description: error.message, variant: 'destructive' });
    } else {
      setHadiths((data as HadithRow[]) ?? []);
    }
    setLoadingList(false);
  }, [toast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSetActive = async (id: string) => {
    setActionBusy(id);
    // Deactivate all
    const { error: deactivateErr } = await supabase
      .from('hadiths')
      .update({ is_active: false })
      .eq('is_active', true);

    if (deactivateErr) {
      toast({ title: 'Error updating hadith', description: deactivateErr.message, variant: 'destructive' });
      setActionBusy(null);
      return;
    }

    // Activate selected
    const { error: activateErr } = await supabase
      .from('hadiths')
      .update({ is_active: true })
      .eq('id', id);

    if (activateErr) {
      toast({ title: 'Error activating hadith', description: activateErr.message, variant: 'destructive' });
    } else {
      toast({ title: '✅ Hadith set as active' });
      await fetchAll();
    }
    setActionBusy(null);
  };

  const handleDelete = async (id: string) => {
    setActionBusy(id + '-del');
    const { error } = await supabase.from('hadiths').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error deleting hadith', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Hadith deleted' });
      await fetchAll();
    }
    setActionBusy(null);
  };

  const handleSave = async () => {
    if (!hadithTamil.trim()) {
      toast({ title: 'Tamil text is required', variant: 'destructive' });
      return;
    }
    setSaving(true);

    if (isActive) {
      const { error: deactivateError } = await supabase
        .from('hadiths')
        .update({ is_active: false })
        .eq('is_active', true);

      if (deactivateError) {
        toast({ title: 'Error updating previous hadith', description: deactivateError.message, variant: 'destructive' });
        setSaving(false);
        return;
      }
    }

    const { error } = await supabase.from('hadiths').insert({
      hadith_tamil: hadithTamil.trim(),
      hadith_english: hadithEnglish.trim() || null,
      reference: reference.trim() || null,
      is_active: isActive,
    });

    if (error) {
      toast({ title: 'Error saving hadith', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Hadith saved successfully' });
      setHadithTamil('');
      setHadithEnglish('');
      setReference('');
      await fetchAll();
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4 mt-4">
      {/* All Hadiths List */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-primary flex items-center gap-2">
            <BookOpen className="h-4 w-4" /> All Hadiths ({hadiths.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loadingList ? (
            <p className="text-muted-foreground text-xs p-4">Loading...</p>
          ) : hadiths.length === 0 ? (
            <p className="text-muted-foreground text-xs p-4">No hadiths added yet.</p>
          ) : (
            <div className="max-h-72 overflow-auto divide-y divide-border">
              {hadiths.map((h) => (
                <div key={h.id} className={`p-3 ${h.is_active ? 'bg-primary/5' : ''}`}>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex-1 min-w-0">
                      {h.is_active && (
                        <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-primary/20 text-primary px-1.5 py-0.5 rounded mb-1">
                          Active
                        </span>
                      )}
                      <p className="text-xs text-foreground leading-relaxed line-clamp-2">{h.hadith_tamil}</p>
                      {h.reference && (
                        <p className="text-[10px] text-primary/70 font-mono mt-0.5">— {h.reference}</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      {!h.is_active && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-[10px] px-2"
                          disabled={actionBusy === h.id}
                          onClick={() => handleSetActive(h.id)}
                        >
                          {actionBusy === h.id ? '...' : 'Set Active'}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-[10px] px-2 text-destructive hover:text-destructive"
                        disabled={actionBusy === h.id + '-del'}
                        onClick={() => handleDelete(h.id)}
                      >
                        {actionBusy === h.id + '-del' ? '...' : 'Delete'}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add New Hadith */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-primary">Add New Hadith</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-3">
          <div>
            <Label className="text-foreground text-xs mb-1 block">Hadith (Tamil/Main) *</Label>
            <Textarea
              value={hadithTamil}
              onChange={e => setHadithTamil(e.target.value)}
              placeholder="Enter hadith text..."
              className="bg-muted border-border text-foreground"
              rows={3}
            />
          </div>
          <div>
            <Label className="text-foreground text-xs mb-1 block">Hadith (English)</Label>
            <Textarea
              value={hadithEnglish}
              onChange={e => setHadithEnglish(e.target.value)}
              placeholder="English translation (optional)"
              className="bg-muted border-border text-foreground"
              rows={2}
            />
          </div>
          <div>
            <Label className="text-foreground text-xs mb-1 block">Reference</Label>
            <Input
              value={reference}
              onChange={e => setReference(e.target.value)}
              placeholder="e.g. Sahih Bukhari 1234"
              className="bg-muted border-border text-foreground"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm text-foreground">Set as Active</Label>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
          <Button className="w-full" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Hadith'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

