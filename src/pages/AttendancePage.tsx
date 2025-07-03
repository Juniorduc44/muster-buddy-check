import React, { useState, useEffect } from 'react';
import { useParams, Navigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  Clock, 
  CheckCircle,
  AlertCircle,
  Calendar,
  Bug,
  Copy,
} from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth
import { formatHashForDisplay } from '@/lib/hash-utils';
import QRCode from 'qrcode';

// NOTE:
// The table name is `mustersheets` (no underscore) and the attendance table is
// `musterentries`. These names are consistent with the Supabase schema and RLS
// policies.  Do not revert to the old `muster_sheets` / `attendance_records`
// names, or the queries will fail.

type MusterSheet = Tables<'mustersheets'>;

export const AttendancePage = () => {
  const { sheetId } = useParams<{ sheetId: string }>();
  const { toast } = useToast();
  const { user } = useAuth(); // Get user from AuthContext
  const [sheet, setSheet] = useState<MusterSheet | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [errorTitle, setErrorTitle] = useState<string>('Sheet Not Found');
  const [attendanceHash, setAttendanceHash] = useState<string>('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const isDevMode = import.meta.env.MODE === 'development'; // Check for development mode

  // Server-side hash generation using Supabase Edge Function
  const generateHashServerSide = async (entryData: any) => {
    const { data, error } = await supabase.functions.invoke('generate-hash', {
      body: { entryData }
    })
    
    if (error) {
      console.error('[AttendancePage] Edge function error:', error)
      throw new Error(`Hash generation failed: ${error.message}`)
    }
    
    if (!data.success) {
      throw new Error(`Hash generation failed: ${data.error || 'Unknown error'}`)
    }
    
    return data.hash
  }

  useEffect(() => {
    if (sheetId) {
      fetchSheet();
    }
  }, [sheetId]);

  const fetchSheet = async () => {
    if (!sheetId) return;
    
    try {
      console.log('[AttendancePage] Fetching sheet with ID:', sheetId);
      const { data, error } = await supabase
        .from('mustersheets')
        .select('*')
        // using match to avoid query-string formatting issues
        .match({ id: sheetId })
        .single();

      if (error) {
        // Debugging details
        console.error(
          '[AttendancePage] Error fetching sheet:',
          { code: error.code, message: error.message, details: error.details },
        );

        // Map Supabase / PostgREST error codes to friendlier messages
        if (
          error.code === 'PGRST301' || // permission denied (anon)
          error.code === '42501' ||
          error.message.toLowerCase().includes('permission')
        ) {
          setErrorTitle('Access Restricted');
          setError(
            'This attendance sheet is currently restricted. ' +
              'Please check with the event organizer that the sheet is public and active.',
          );
        } else {
          setErrorTitle('Sheet Not Found');
          setError(
            'This attendance sheet could not be found or is no longer available.',
          );
        }
      } else {
        console.log('[AttendancePage] Sheet fetched successfully:', data);
        console.log('[AttendancePage] Sheet active status:', data.is_active);
        console.log('[AttendancePage] Sheet expiration:', data.expires_at);
        setSheet(data);
      }
    } catch (error) {
      console.error('[AttendancePage] Error in fetchSheet (network?):', error);
      setErrorTitle('Network Error');
      setError(
        'Failed to reach the server. Please check your internet connection and try again.',
      );
    }
    setLoading(false);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sheet || !sheetId) return;

    setSubmitting(true); // prevent double-clicks

    // Helper: map Supabase errors to UI-friendly text
    const parseDbError = (dbErr: any): { title: string; message: string } => {
      if (!dbErr) {
        return {
          title: 'Unknown Error',
          message: 'Something went wrong. Please try again.',
        };
      }

      // Common PostgREST / Supabase error codes we care about
      switch (dbErr.code) {
        case '23505': // unique_violation
          return {
            title: 'Already Checked-in',
            message: 'An entry for this attendee already exists.',
          };
        case 'PGRST301': // permission denied (anon)
        case '42501':
          return {
            title: 'Access Denied',
            message:
              'Public submissions are not allowed for this sheet. Please contact the event organizer.',
          };
        case '22P02': // invalid_text_representation (e.g., bad UUID)
          return {
            title: 'Invalid Link',
            message:
              'This attendance link is malformed or no longer valid.',
          };
        default:
          return {
            title: 'Submission Failed',
            message:
              dbErr.message ??
              'Failed to submit attendance. Please try again.',
          };
      }
    };

    try {
      const now = new Date();
      const timeString = sheet.time_format === 'military' 
        ? now.toLocaleTimeString('en-US', { hour12: false })
        : now.toLocaleTimeString('en-US', { hour12: true });

      console.log('[AttendancePage] Submitting attendance record:', {
        sheetId: sheetId,
        formData: formData,
        sheetDetails: {
          isActive: sheet.is_active,
          expiresAt: sheet.expires_at,
          currentTime: now.toISOString(),
        },
      });

      const recordData = {
        sheet_id: sheetId,
        timestamp: now.toISOString(),
        first_name: formData.first_name || '',
        last_name: formData.last_name || '',
        email: formData.email || null,
        phone: formData.phone || null,
        rank: formData.rank || null,
        badge_number: formData.badge_number || null,
        unit: formData.unit || null,
        age: formData.age ? parseInt(formData.age) : null,
      };

      const { error, data: insertData } = await supabase
        .from('musterentries')
        .insert([recordData])
        .select(); // Select to get the inserted data, useful for debugging

      if (error) {
        console.error('[AttendancePage] Supabase insert error:', error);
        console.error('[AttendancePage] Full error object:', JSON.stringify(error, null, 2));

        const friendly = parseDbError(error);
        toast({
          title: friendly.title,
          description: friendly.message,
          variant: "destructive",
        });
      } else {
        console.log('[AttendancePage] Attendance submitted successfully:', insertData);
        
        // Generate attendance hash with actual database ID
        if (insertData && insertData[0]) {
          const entry = insertData[0];
          
          // Generate hash with the actual database record data using server-side function
          const hash = await generateHashServerSide({
            id: entry.id,
            sheetId: entry.sheet_id,
            firstName: entry.first_name,
            lastName: entry.last_name,
            timestamp: entry.timestamp,
            createdAt: entry.created_at,
            email: entry.email || undefined,
            phone: entry.phone || undefined,
            rank: entry.rank || undefined,
            badgeNumber: entry.badge_number || undefined,
            unit: entry.unit || undefined,
            age: entry.age || undefined,
          });
          
          // Store the hash in the database
          const { error: updateError } = await supabase
            .from('musterentries')
            .update({ attendance_hash: hash })
            .eq('id', entry.id);
          
          if (updateError) {
            console.error('[AttendancePage] Error updating hash:', updateError);
          }
          
          setAttendanceHash(hash);
          
          // Generate QR code for the receipt
          try {
            const qrDataUrl = await QRCode.toDataURL(hash, {
              width: 200,
              margin: 2,
              color: {
                dark: '#10B981', // Green color
                light: '#1F2937' // Dark background
              }
            });
            setQrCodeDataUrl(qrDataUrl);
          } catch (err) {
            console.error('Error generating QR code:', err);
          }
        }
        
        setSubmitted(true);
        toast({
          title: "Success!",
          description: `Thank you ${formData.first_name}! Your attendance has been recorded.`,
        });
      }
    } catch (err: any) {
      console.error('[AttendancePage] Unexpected error in handleSubmit:', err);
      toast({
        title: "Error",
        description:
          err?.message ??
          'An unexpected network or server error occurred. Please try again.',
        variant: "destructive",
      });
    } finally {
      setSubmitting(false); // re-enable button
    }
  };

  const formatFieldLabel = (field: string) => {
    return field.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Debugging function for RLS policies
  const handleDebugRLS = async () => {
    if (!sheetId) {
      toast({
        title: "Debug Error",
        description: "No sheet ID available for RLS debug.",
        variant: "destructive",
      });
      return;
    }

    console.log('[RLS Debug] Running RLS policy checks for sheet:', sheetId);
    toast({
      title: "RLS Debug",
      description: "Checking RLS policies in console...",
    });

    // Test public SELECT policy for muster_sheets
    try {
      const { data, error } = await supabase
        .from('mustersheets')
        .select('id, title, is_active, expires_at')
        .match({ id: sheetId })
        .single();

      if (error) {
        console.error('[RLS Debug] Public SELECT on mustersheets failed:', error);
        toast({
          title: "RLS Debug: Public View Failed",
          description: `Error: ${error.message}. Check 'Public can view active muster sheets' policy.`,
          variant: "destructive",
        });
      } else {
        console.log('[RLS Debug] Public SELECT on mustersheets successful:', data);
        toast({
          title: "RLS Debug: Public View OK",
          description: "Public can view sheet metadata.",
        });
        if (!data.is_active) {
          console.warn('[RLS Debug] Sheet is not active. Public view policy requires is_active = true.');
          toast({
            title: "RLS Debug: Sheet Inactive",
            description: "Sheet is not active. Public view policy requires is_active = true.",
            variant: "destructive",
          });
        }
        if (data.expires_at && new Date(data.expires_at) < new Date()) {
          console.warn('[RLS Debug] Sheet is expired. Public view policy requires not expired.');
          toast({
            title: "RLS Debug: Sheet Expired",
            description: "Sheet is expired. Public view policy requires not expired.",
            variant: "destructive",
          });
        }
      }
    } catch (err) {
      console.error('[RLS Debug] Unexpected error during public SELECT test:', err);
      toast({
        title: "RLS Debug: Unexpected Error",
        description: "An unexpected error occurred during public SELECT test.",
        variant: "destructive",
      });
    }

    // Test public INSERT policy for muster_entries (simulated)
    // This is harder to test directly without actually inserting,
    // but we can check the policy definition in Supabase.
    console.log('[RLS Debug] To test INSERT policy, try submitting the form.');
    console.log('[RLS Debug] Ensure "Allow QR code sign-ins" policy is active and conditions are met.');
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading attendance sheet...</div>
      </div>
    );
  }

  if (error || !sheet) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-gray-800 border-gray-700">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">
              {errorTitle}
            </h2>
            <p className="text-gray-400">
              {error}
            </p>
            {isDevMode && (
              <Button onClick={handleDebugRLS} className="mt-4 bg-blue-600 hover:bg-blue-700">
                <Bug className="h-4 w-4 mr-2" /> Debug RLS
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const isExpired = sheet.expires_at && new Date(sheet.expires_at) < new Date();
  const isInactive = !sheet.is_active;

  if (isExpired || isInactive) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-gray-800 border-gray-700">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">
              {isExpired ? 'Event Expired' : 'Event Inactive'}
            </h2>
            <p className="text-gray-400">
              {isExpired 
                ? 'This attendance sheet has expired and is no longer accepting submissions.'
                : 'This attendance sheet is currently inactive.'
              }
            </p>
            {isDevMode && (
              <Button onClick={handleDebugRLS} className="mt-4 bg-blue-600 hover:bg-blue-700">
                <Bug className="h-4 w-4 mr-2" /> Debug RLS
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-gray-800 border-gray-700">
          <CardContent className="p-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Attendance Recorded!</h2>
            <p className="text-gray-400 mb-4">
              Thank you for checking in to <strong className="text-white">{sheet.title}</strong>
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Your attendance has been successfully recorded at{' '}
              {new Date().toLocaleString()}
            </p>
            
            {/* Attendance Hash Receipt */}
            {attendanceHash && (
              <div className="bg-gray-700 border border-gray-600 rounded-lg p-4 mb-4">
                <h3 className="text-sm font-semibold text-white mb-2">Proof of Attendance Receipt</h3>
                
                {/* QR Code */}
                {qrCodeDataUrl && (
                  <div className="flex justify-center mb-4">
                    <div className="bg-white p-2 rounded-lg">
                      <img 
                        src={qrCodeDataUrl} 
                        alt="Attendance Receipt QR Code" 
                        className="w-32 h-32"
                      />
                    </div>
                  </div>
                )}
                
                <div className="bg-gray-800 border border-gray-600 rounded p-3 mb-3">
                  <p className="text-xs text-gray-400 mb-1">Attendance Receipt Code:</p>
                  <p className="text-sm font-mono text-green-400 break-all">
                    {formatHashForDisplay(attendanceHash)}
                  </p>
                </div>
                
                <div className="flex justify-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        // Try modern clipboard API first
                        if (navigator.clipboard && window.isSecureContext) {
                          await navigator.clipboard.writeText(attendanceHash);
                          toast({
                            title: "Receipt Copied!",
                            description: "Attendance receipt copied to clipboard",
                          });
                        } else {
                          // Fallback for older browsers or non-secure contexts
                          const textArea = document.createElement('textarea');
                          textArea.value = attendanceHash;
                          textArea.style.position = 'fixed';
                          textArea.style.left = '-999999px';
                          textArea.style.top = '-999999px';
                          document.body.appendChild(textArea);
                          textArea.focus();
                          textArea.select();
                          
                          const successful = document.execCommand('copy');
                          document.body.removeChild(textArea);
                          
                          if (successful) {
                            toast({
                              title: "Receipt Copied!",
                              description: "Attendance receipt copied to clipboard",
                            });
                          } else {
                            throw new Error('execCommand copy failed');
                          }
                        }
                      } catch (error) {
                        console.error('Failed to copy to clipboard:', error);
                        toast({
                          title: "Copy Failed",
                          description: "Failed to copy receipt to clipboard. Please copy manually.",
                          variant: "destructive",
                        });
                      }
                    }}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Receipt
                  </Button>
                </div>
                
                <div className="text-center mt-3">
                  <p className="text-xs text-gray-500 mb-2">
                    📱 Screenshot or copy this receipt for verification
                  </p>
                  <p className="text-xs text-gray-400">
                    Present this QR code or receipt code to verify your attendance
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-2xl mx-auto">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="text-center border-b border-gray-700">
            <div className="flex justify-center mb-4">
              <Users className="h-12 w-12 text-green-400" />
            </div>
            <CardTitle className="text-2xl font-bold text-white mb-2">
              {sheet.title}
            </CardTitle>
            {sheet.description && (
              <p className="text-gray-400">{sheet.description}</p>
            )}
            <div className="flex justify-center space-x-4 mt-4">
              <Badge variant="outline" className="border-green-600 text-green-400">
                <Clock className="h-3 w-3 mr-1" />
                {sheet.time_format === 'military' ? '24-hour' : '12-hour'} format
              </Badge>
              {sheet.expires_at && (
                <Badge variant="outline" className="border-gray-600 text-gray-400">
                  <Calendar className="h-3 w-3 mr-1" />
                  Expires {new Date(sheet.expires_at).toLocaleDateString()}
                </Badge>
              )}
            </div>
          </CardHeader>
          
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {sheet.required_fields.map((field) => (
                <div key={field} className="space-y-2">
                  <Label htmlFor={field} className="text-white">
                    {formatFieldLabel(field)}
                    {(field === 'first_name' || field === 'last_name') && (
                      <span className="text-red-400 ml-1">*</span>
                    )}
                  </Label>
                  <Input
                    id={field}
                    type={field === 'email' ? 'email' : field === 'age' ? 'number' : 'text'}
                    value={formData[field] || ''}
                    onChange={(e) => handleInputChange(field, e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white"
                    required={field === 'first_name' || field === 'last_name'}
                    placeholder={`Enter your ${formatFieldLabel(field).toLowerCase()}`}
                  />
                </div>
              ))}
              
              <Button
                type="submit"
                disabled={submitting || !formData.first_name || !formData.last_name}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold"
              >
                {submitting ? 'Recording Attendance...' : 'Record My Attendance'}
              </Button>
            </form>
            
            <div className="mt-6 pt-4 border-t border-gray-700 text-center">
              <p className="text-sm text-gray-400">
                Your attendance will be recorded with the current timestamp
              </p>
              {isDevMode && (
                <Button onClick={handleDebugRLS} className="mt-4 bg-blue-600 hover:bg-blue-700">
                  <Bug className="h-4 w-4 mr-2" /> Debug RLS Policies
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
