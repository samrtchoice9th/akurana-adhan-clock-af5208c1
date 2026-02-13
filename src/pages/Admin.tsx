import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowLeft, Lock, Upload, Moon, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { CsvChangeRow } from '@/lib/csvParser';
import { parseExcel } from '@/lib/excelParser';
import { useHijriDate, formatHijriDate } from '@/hooks/useHijriDate';
import { Label } from '@/components/ui/label';

const ADMIN_PASSWORD = 'akurana2026';

export default function Admin() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const { toast } = useToast();

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
            <Button className="w-full" onClick={() => {
              if (password === ADMIN_PASSWORD) setAuthenticated(true);
              else toast({ title: 'Wrong password', variant: 'destructive' });
            }}>
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
        </TabsList>

        <TabsContent value="csv">
          <CsvUploadTab />
        </TabsContent>
        <TabsContent value="hijri">
          <HijriControlTab />
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

  useState(() => {
    supabase.from('prayer_time_changes').select('id', { count: 'exact', head: true }).then(({ count }) => {
      setExistingCount(count ?? 0);
    });
  });

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = parseExcel(reader.result as ArrayBuffer);
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
      {/* Current display */}
      <Card className="bg-card border-border">
        <CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Current Hijri Date</p>
          <p className="text-2xl font-bold text-primary">{formatHijriDate(hijri)}</p>
          <p className="text-xs text-muted-foreground mt-1">Last updated: {hijri.last_updated}</p>
        </CardContent>
      </Card>

      {/* Day 29 Controls or Auto-increment message */}
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
                // Refresh logs
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

      {/* Admin Action Log */}
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
