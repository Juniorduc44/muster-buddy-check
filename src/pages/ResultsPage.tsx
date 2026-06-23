
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Users,
  Download,
  Calendar,
  AlertCircle,
  Copy,
  Eye,
  EyeOff,
  ShieldCheck,
  Camera,
  CheckCircle,
  XCircle
} from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import { formatHashForDisplay, isValidHashFormat } from '@/lib/hash-utils';
import { QrScannerModal } from '@/components/QrScannerModal';

// Corrected table types to match Supabase schema
type MusterSheet = Tables<'mustersheets'>;
type AttendanceRecord = Tables<'musterentries'>;

export const ResultsPage = () => {
  const { sheetId } = useParams();
  const { user } = useAuth();
  const [sheet, setSheet] = useState<MusterSheet | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [showHashes, setShowHashes] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [manualHash, setManualHash] = useState('');
  const [verifyResult, setVerifyResult] = useState<
    | { status: 'match'; record: AttendanceRecord }
    | { status: 'nomatch' | 'invalid'; message: string }
    | null
  >(null);

  useEffect(() => {
    fetchSheetAndRecords();
  }, [sheetId, user]);

  // Verify a scanned/entered receipt purely against this owner's already-loaded
  // records. Ownership + sheet scope are guaranteed by the page itself (RLS
  // Policy 5 loaded only this creator's entries), so a match here is proof the
  // receipt belongs to an attendee of this sheet — no extra query, no exposure.
  const verifyReceipt = (raw: string, decodedFromQr = false) => {
    const embedded = raw.replace(/\s/g, '').match(/[a-fA-F0-9]{64}/);
    const hash = embedded ? embedded[0] : raw.replace(/\s/g, '');

    if (!isValidHashFormat(hash)) {
      setVerifyResult({
        status: 'invalid',
        message: decodedFromQr
          ? 'QR decoded successfully, but it is not a MusterSheets receipt code.'
          : 'That code is not a valid receipt format.'
      });
      return;
    }

    const record = records.find(
      r => r.attendance_hash?.toLowerCase() === hash.toLowerCase()
    );

    setVerifyResult(
      record
        ? { status: 'match', record }
        : {
            status: 'nomatch',
            message: 'Receipt decoded successfully, but it does not match an attendance record for this sheet.'
          }
    );
  };

  const handleDecode = (text: string) => {
    setScannerOpen(false);
    setManualHash(text.trim());
    verifyReceipt(text, true);
  };

  const fetchSheetAndRecords = async () => {
    if (!sheetId || !user) {
      setLoading(false);
      return;
    }
    
    try {
      // Fetch sheet details
      const { data: sheetData, error: sheetError } = await supabase
        .from('mustersheets')
        .select('*')
        .eq('id', sheetId)
        .single();

      if (sheetError) {
        console.error('Error fetching sheet:', sheetError);
        setLoading(false);
        return;
      }

      // Check if user is the creator
      if (sheetData.creator_id !== user.id) {
        setUnauthorized(true);
        setLoading(false);
        return;
      }

      setSheet(sheetData);

      // Fetch attendance records
      const { data: recordsData, error: recordsError } = await supabase
        .from('musterentries')
        .select('*')
        .eq('sheet_id', sheetId)
        .order('timestamp', { ascending: true });

      if (recordsError) {
        console.error('Error fetching records:', recordsError);
      } else {
        console.log('[ResultsPage] Fetched records:', recordsData);
        console.log('[ResultsPage] Sample record with hash:', recordsData?.[0]);
        setRecords(recordsData || []);
      }
    } catch (error) {
      console.error('Error in fetchSheetAndRecords:', error);
    }
    setLoading(false);
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    
    return {
      date: date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }),
      time: sheet?.time_format === 'military' 
        ? date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
        : date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    };
  };

  const exportToCSV = () => {
    if (!sheet || !records.length) return;

    const headers = ['Name', ...sheet.required_fields.filter(f => f !== 'first_name' && f !== 'last_name'), 'Check-in Time', 'Receipt Code'];
    const csvData = records.map(record => {
      const row = [
        `${record.first_name} ${record.last_name}`,
        ...sheet.required_fields
          .filter(f => f !== 'first_name' && f !== 'last_name')
          .map(field => (record as any)[field] || ''),
        formatDateTime(record.timestamp).date + ' ' + formatDateTime(record.timestamp).time,
        record.attendance_hash || ''
      ];
      return row.join(',');
    });

    const csv = [headers.join(','), ...csvData].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `${sheet.title}-attendance.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  if (unauthorized) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Card className="bg-gray-800 border-gray-700 max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Access Denied</h3>
            <p className="text-gray-400">You don't have permission to view these results.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!sheet) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Card className="bg-gray-800 border-gray-700 max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Sheet Not Found</h3>
            <p className="text-gray-400">This attendance sheet does not exist.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <Card className="bg-gray-800 border-gray-700 mb-6">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl font-bold text-white mb-2">{sheet.title}</CardTitle>
                {sheet.description && (
                  <p className="text-gray-400 mb-4">{sheet.description}</p>
                )}
                <div className="flex items-center space-x-4 text-sm text-gray-400">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    Created {new Date(sheet.created_at).toLocaleDateString()}
                  </div>
                  <div className="flex items-center">
                    <Users className="h-4 w-4 mr-2" />
                    {records.length} attendees
                  </div>
                </div>
              </div>
              <Button
                onClick={exportToCSV}
                disabled={!records.length}
                className="bg-green-600 hover:bg-green-700"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </CardHeader>
        </Card>

        <Card className="bg-gray-800 border-gray-700 mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <ShieldCheck className="h-5 w-5 mr-2 text-green-400" />
              Verify a Receipt
            </CardTitle>
            <p className="text-sm text-gray-400">
              Scan or paste an attendee's receipt to confirm it belongs to this sheet.
              Only you, the creator, can verify your own sheets.
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                onClick={() => setScannerOpen(true)}
                className="bg-green-600 hover:bg-green-700 shrink-0"
              >
                <Camera className="h-4 w-4 mr-2" />
                Scan QR
              </Button>
              <Input
                type="text"
                placeholder="…or paste a receipt code"
                value={manualHash}
                onChange={(e) => setManualHash(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && manualHash.trim()) verifyReceipt(manualHash);
                }}
                className="flex-1 bg-gray-700 border-gray-600 text-white font-mono text-sm"
              />
              <Button
                type="button"
                variant="outline"
                disabled={!manualHash.trim()}
                onClick={() => verifyReceipt(manualHash)}
                className="border-gray-600 text-gray-300 hover:bg-gray-700 shrink-0"
              >
                Verify
              </Button>
            </div>

            {verifyResult && (
              <div className="mt-4">
                {verifyResult.status === 'match' ? (
                  <div className="rounded-lg border border-green-800 bg-green-900/20 p-4">
                    <div className="flex items-center mb-2">
                      <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
                      <h3 className="text-green-400 font-semibold">Valid receipt for this sheet</h3>
                    </div>
                    <p className="text-white font-medium">
                      {verifyResult.record.first_name} {verifyResult.record.last_name}
                    </p>
                    <p className="text-sm text-gray-300">
                      Checked in {formatDateTime(verifyResult.record.timestamp).date} at{' '}
                      {formatDateTime(verifyResult.record.timestamp).time}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-red-800 bg-red-900/20 p-4">
                    <div className="flex items-center">
                      <XCircle className="h-5 w-5 text-red-400 mr-2" />
                      <span className="text-red-300">{verifyResult.message}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-white flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Attendance Records
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHashes(!showHashes)}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                {showHashes ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                {showHashes ? 'Hide' : 'Show'} Attendance Hashes
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {records.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No Attendance Yet</h3>
                <p className="text-gray-400">People haven't started checking in yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-700">
                      <TableHead className="text-gray-300">Name</TableHead>
                      {sheet.required_fields
                        .filter(field => field !== 'first_name' && field !== 'last_name')
                        .map(field => (
                          <TableHead key={field} className="text-gray-300">
                            {field.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </TableHead>
                        ))}
                      <TableHead className="text-gray-300">Check-in Time</TableHead>
                      {showHashes && (
                        <TableHead className="text-gray-300">Receipt</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((record) => {
                      const dateTime = formatDateTime(record.timestamp);
                      return (
                        <TableRow key={record.id} className="border-gray-700">
                          <TableCell className="text-white font-medium">
                            {record.first_name} {record.last_name}
                          </TableCell>
                          {sheet.required_fields
                            .filter(field => field !== 'first_name' && field !== 'last_name')
                            .map(field => (
                              <TableCell key={field} className="text-gray-300">
                                {(record as any)[field] || '-'}
                              </TableCell>
                            ))}
                          <TableCell className="text-gray-300">
                            <div className="flex flex-col">
                              <span>{dateTime.date}</span>
                              <span className="text-sm text-gray-400">{dateTime.time}</span>
                            </div>
                          </TableCell>
                          {showHashes && (
                            <TableCell className="text-gray-300">
                              {record.attendance_hash ? (
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs font-mono text-green-400">
                                    {formatHashForDisplay(record.attendance_hash)}
                                  </span>
                                                                      <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={async () => {
                                        try {
                                          // Try modern clipboard API first
                                          if (navigator.clipboard && window.isSecureContext) {
                                            await navigator.clipboard.writeText(record.attendance_hash!);
                                          } else {
                                            // Fallback for older browsers or non-secure contexts
                                            const textArea = document.createElement('textarea');
                                            textArea.value = record.attendance_hash!;
                                            textArea.style.position = 'fixed';
                                            textArea.style.left = '-999999px';
                                            textArea.style.top = '-999999px';
                                            document.body.appendChild(textArea);
                                            textArea.focus();
                                            textArea.select();
                                            
                                            const successful = document.execCommand('copy');
                                            document.body.removeChild(textArea);
                                            
                                            if (!successful) {
                                              throw new Error('execCommand copy failed');
                                            }
                                          }
                                        } catch (error) {
                                          console.error('Failed to copy to clipboard:', error);
                                        }
                                      }}
                                      className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                                      title="Copy Receipt"
                                    >
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                </div>
                              ) : (
                                <span className="text-gray-500 text-xs">No hash</span>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <QrScannerModal
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onDecode={handleDecode}
      />
    </div>
  );
};
