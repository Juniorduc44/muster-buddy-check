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
} from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth

// NOTE:
// The table name is `mustersheets` (no underscore) and the attendance table is
// `musterentries`. These names are consistent with the Supabase schema and RLS
// policies.  Do not revert to the old `muster_sheets` / `attendance_records`
// names, or the queries will fail.

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
  const isDevMode = import.meta.env.MODE === 'development'; // Check for development mode

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
            variant: "warning",
          });
        }
        if (data.expires_at && new Date(data.expires_at) < new Date()) {
          console.warn('[RLS Debug] Sheet is expired. Public view policy requires not expired.');
          toast({
            title: "RLS Debug: Sheet Expired",
            description: "Sheet is expired. Public view policy requires not expired.",
            variant: "warning",
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
            <p className="text-sm text-gray-500">
              Your attendance has been successfully recorded at{' '}
              {new Date().toLocaleString()}
            </p>
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
