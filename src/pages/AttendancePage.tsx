
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface MusterSheet {
  id: string;
  title: string;
  description: string;
  is_active: boolean;
  expires_at: string | null;
  time_format: string;
  required_fields: string[];
}

interface FormData {
  [key: string]: string | number;
}

const FIELD_LABELS: { [key: string]: string } = {
  first_name: 'First Name',
  last_name: 'Last Name',
  email: 'Email Address',
  phone: 'Phone Number',
  rank: 'Rank/Position',
  unit: 'Unit/Department',
  badge_number: 'Badge/ID Number',
  age: 'Age',
};

export const AttendancePage = () => {
  const { sheetId } = useParams();
  const { toast } = useToast();
  const [sheet, setSheet] = useState<MusterSheet | null>(null);
  const [formData, setFormData] = useState<FormData>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetchSheet();
  }, [sheetId]);

  const fetchSheet = async () => {
    if (!sheetId) return;
    
    try {
      const { data, error } = await supabase
        .from('muster_sheets' as any)
        .select('*')
        .eq('id', sheetId)
        .single();

      if (error) {
        console.error('Error fetching sheet:', error);
        toast({
          title: "Error",
          description: "Could not load attendance sheet",
          variant: "destructive",
        });
      } else {
        setSheet(data);
      }
    } catch (error) {
      console.error('Error in fetchSheet:', error);
    }
    setLoading(false);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: field === 'age' ? parseInt(value) || '' : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sheet || !sheetId) return;

    setSubmitting(true);
    
    try {
      const attendanceData = {
        sheet_id: sheetId,
        ...formData,
        timestamp: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('attendance_records' as any)
        .insert([attendanceData]);

      if (error) {
        console.error('Error submitting attendance:', error);
        toast({
          title: "Error",
          description: "Failed to submit attendance. Please try again.",
          variant: "destructive",
        });
      } else {
        setSubmitted(true);
        toast({
          title: "Success!",
          description: "Your attendance has been recorded.",
        });
      }
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    }
    setSubmitting(false);
  };

  const formatTime = (date: Date) => {
    if (sheet?.time_format === 'military') {
      return date.toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
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
            <p className="text-gray-400">This attendance sheet does not exist or has been removed.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isExpired = sheet.expires_at && new Date(sheet.expires_at) < new Date();
  const isInactive = !sheet.is_active;

  if (isExpired || isInactive) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Card className="bg-gray-800 border-gray-700 max-w-md">
          <CardContent className="p-8 text-center">
            <Clock className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              {isExpired ? 'Sheet Expired' : 'Sheet Inactive'}
            </h3>
            <p className="text-gray-400">
              {isExpired 
                ? 'This attendance sheet has expired and is no longer accepting responses.' 
                : 'This attendance sheet is currently inactive.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Card className="bg-gray-800 border-gray-700 max-w-md">
          <CardContent className="p-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Attendance Recorded!</h3>
            <p className="text-gray-400 mb-4">Thank you for checking in.</p>
            <div className="bg-gray-700 rounded-lg p-4">
              <p className="text-sm text-gray-300">
                Recorded at: {formatTime(new Date())}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="text-center border-b border-gray-700">
            <CardTitle className="text-2xl font-bold text-white mb-2">{sheet.title}</CardTitle>
            {sheet.description && (
              <p className="text-gray-400">{sheet.description}</p>
            )}
            <div className="flex justify-center space-x-2 mt-4">
              <Badge className="bg-green-600">Active</Badge>
              <Badge variant="outline" className="border-gray-600 text-gray-400">
                {sheet.time_format === 'military' ? '24-hour format' : '12-hour format'}
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sheet.required_fields.map((field) => (
                  <div key={field} className="space-y-2">
                    <Label htmlFor={field} className="text-white">
                      {FIELD_LABELS[field] || field.replace('_', ' ')}
                      <span className="text-red-400 ml-1">*</span>
                    </Label>
                    <Input
                      id={field}
                      type={field === 'email' ? 'email' : field === 'age' ? 'number' : 'text'}
                      value={formData[field] || ''}
                      onChange={(e) => handleInputChange(field, e.target.value)}
                      placeholder={`Enter your ${FIELD_LABELS[field]?.toLowerCase() || field.replace('_', ' ')}`}
                      className="bg-gray-700 border-gray-600 text-white"
                      required
                    />
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-gray-700">
                <div className="text-center mb-4">
                  <p className="text-sm text-gray-400">
                    Current time: {formatTime(new Date())}
                  </p>
                </div>
                
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  {submitting ? 'Recording Attendance...' : 'Record My Attendance'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
