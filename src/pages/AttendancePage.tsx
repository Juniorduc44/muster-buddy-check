
import React, { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
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
  Calendar
} from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type MusterSheet = Tables<'muster_sheets'>;

export const AttendancePage = () => {
  const { sheetId } = useParams<{ sheetId: string }>();
  const { toast } = useToast();
  const [sheet, setSheet] = useState<MusterSheet | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [errorTitle, setErrorTitle] = useState<string>('Sheet Not Found');

  useEffect(() => {
    if (sheetId) {
      fetchSheet();
    }
  }, [sheetId]);

  const fetchSheet = async () => {
    if (!sheetId) return;
    
    try {
      console.log('Fetching sheet with ID:', sheetId);
      const { data, error } = await supabase
        .from('muster_sheets')
        .select('*')
        .eq('id', sheetId)
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
        console.log('Sheet fetched successfully:', data);
        setSheet(data);
      }
    } catch (error) {
      console.error('Error in fetchSheet (network?):', error);
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

    setSubmitting(true);
    
    try {
      const now = new Date();
      const timeString = sheet.time_format === 'military' 
        ? now.toLocaleTimeString('en-US', { hour12: false })
        : now.toLocaleTimeString('en-US', { hour12: true });

      console.log('Submitting attendance record:', formData);

      const recordData = {
        sheet_id: sheetId,
        timestamp: now.toISOString(),
        first_name: formData.first_name || '',
        last_name: formData.last_name || '',
        email: formData.email || null,
        phone: formData.phone || null,
        rank: formData.rank || null,
        unit: formData.unit || null,
        badge_number: formData.badge_number || null,
        age: formData.age ? parseInt(formData.age) : null,
      };

      const { error } = await supabase
        .from('attendance_records')
        .insert([recordData]);

      if (error) {
        console.error('Error submitting attendance:', error);
        toast({
          title: "Error",
          description: "Failed to submit attendance. Please try again.",
          variant: "destructive",
        });
      } else {
        console.log('Attendance submitted successfully');
        setSubmitted(true);
        toast({
          title: "Success!",
          description: `Thank you ${formData.first_name}! Your attendance has been recorded.`,
        });
      }
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }
    setSubmitting(false);
  };

  const formatFieldLabel = (field: string) => {
    return field.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
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
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
