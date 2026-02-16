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
  const { hijri, loading, moonSighted, moonNotSighted, logAdminAction } = useHijriDate();
  const { toast } = useToast();
  const [logs, setLogs] = useState<AdminLogEntry[]>([]);

  useEffect(() => {
    supabase
      .from('hijri_admin_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        if (data) setLogs(data as AdminLogEntry[]);
      });
  }, []);

  if (loading) return <p className="text-muted-foreground mt-4">Loading...</p>;
  if (!hijri) return <p className="text-muted-foreground mt-4">No Hijri date record found.</p>;

  const isDay29 = hijri.hijri_day === 29;

  return (
    <div className="space-y-4 mt-4">
      <Card className="bg-card border-border">
        <CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Current Hijri Date</p>
          <p className="text-2xl font-bold text-primary">{formatHijriDate(hijri)}</p>
          <p className="text-xs text-muted-foreground mt-1">Last updated: {hijri.last_updated}</p>
        </CardContent>
      </Card>

      {isDay29 ? (
        <Alert className="border-secondary bg-secondary/10">
          <Moon className="h-4 w-4 text-secondary" />
          <AlertTitle className="text-secondary">Hijri Day 29 Reached</AlertTitle>
          <AlertDescription className="text-foreground">
            Moon sighting confirmation required. Choose an action:
          </AlertDescription>
          <div className="flex flex-col gap-2 mt-3">
            <Button size="sm" className="w-full" onClick={async () => {
              const err = await moonSighted();
              if (!err) {
                await logAdminAction('moon_sighted');
                toast({ title: '🌙 Moon Sighted — New month started' });
                const { data } = await supabase.from('hijri_admin_log').select('*').order('created_at', { ascending: false }).limit(10);
                if (data) setLogs(data as AdminLogEntry[]);
              } else {
                toast({ title: 'Error', variant: 'destructive' });
              }
            }}>
              🌙 Moon Sighted
            </Button>
            <Button size="sm" variant="outline" className="w-full" onClick={async () => {
              const err = await moonNotSighted();
              if (!err) {
                await logAdminAction('moon_not_sighted');
                toast({ title: '❌ Moon Not Sighted — Day 30 set' });
                const { data } = await supabase.from('hijri_admin_log').select('*').order('created_at', { ascending: false }).limit(10);
                if (data) setLogs(data as AdminLogEntry[]);
              } else {
                toast({ title: 'Error', variant: 'destructive' });
              }
            }}>
              ❌ Moon Not Sighted
            </Button>
            <Button size="sm" variant="ghost" className="w-full" onClick={async () => {
              await logAdminAction('decide_later');
              toast({ title: '⏳ Decision deferred — system will auto-increment tomorrow' });
              const { data } = await supabase.from('hijri_admin_log').select('*').order('created_at', { ascending: false }).limit(10);
              if (data) setLogs(data as AdminLogEntry[]);
            }}>
              ⏳ Decide Later
            </Button>
          </div>
        </Alert>
      ) : (
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Auto-increment active</p>
              <p className="text-xs text-muted-foreground">Admin action available on day 29.</p>
            </div>
          </CardContent>
        </Card>
      )}

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

function HadithTab() {
  const { toast } = useToast();
  const [hadithTamil, setHadithTamil] = useState('');
  const [hadithEnglish, setHadithEnglish] = useState('');
  const [reference, setReference] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentHadith, setCurrentHadith] = useState<{ id: string; hadith_tamil: string; hadith_english: string | null; reference: string | null } | null>(null);

  const fetchActive = useCallback(async () => {
    const { data, error } = await supabase
      .from('hadiths')
      .select('id, hadith_tamil, hadith_english, reference')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      toast({ title: 'Error loading active hadith', description: error.message, variant: 'destructive' });
      return;
    }

    setCurrentHadith(data as { id: string; hadith_tamil: string; hadith_english: string | null; reference: string | null } | null);
  }, [toast]);

  useEffect(() => { fetchActive(); }, [fetchActive]);

  const handleSave = async () => {
    if (!hadithTamil.trim()) {
      toast({ title: 'Tamil text is required', variant: 'destructive' });
      return;
    }
    setSaving(true);

    // Deactivate all if this one is active
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
      fetchActive();
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4 mt-4">
      {currentHadith && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-primary flex items-center gap-2">
              <BookOpen className="h-4 w-4" /> Current Active Hadith
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-sm text-foreground">{currentHadith.hadith_tamil}</p>
            {currentHadith.hadith_english && (
              <p className="text-xs text-muted-foreground mt-1 italic">{currentHadith.hadith_english}</p>
            )}
            {currentHadith.reference && (
              <p className="text-xs text-primary/70 mt-1 font-mono">— {currentHadith.reference}</p>
            )}
          </CardContent>
        </Card>
      )}

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
