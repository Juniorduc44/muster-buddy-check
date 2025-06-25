import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, Calendar, Users, Clock, Save } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import { FIELD_OPTIONS } from '@/data/preloaded-sheets'; // Assuming this is available

type MusterSheet = Tables<'mustersheets'>;

export const EditSheetPage = () => {
  const { sheetId } = useParams<{ sheetId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [sheet, setSheet] = useState<MusterSheet | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [timeFormat, setTimeFormat] = useState<'standard' | 'military'>('standard');
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [expiresAt, setExpiresAt] = useState('');
  const [location, setLocation] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventType, setEventType] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (sheetId && user) {
      fetchSheet();
    } else if (!authLoading && !user) {
      setUnauthorized(true); // Not logged in
      setLoading(false);
    }
  }, [sheetId, user, authLoading]);

  const fetchSheet = async () => {
    setLoading(true);
    setUnauthorized(false);
    try {
      const { data, error } = await supabase
        .from('mustersheets')
        .select('*')
        .match({ id: sheetId })
        .single();

      if (error) {
        console.error('Error fetching sheet for edit:', error);
        setSheet(null);
        setLoading(false);
        return;
      }

      if (data.creator_id !== user?.id) {
        setUnauthorized(true);
        setLoading(false);
        return;
      }

      setSheet(data);
      setTitle(data.title);
      setDescription(data.description || '');
      setTimeFormat(data.time_format);
      setSelectedFields(data.required_fields);
      setExpiresAt(data.expires_at ? new Date(data.expires_at).toISOString().slice(0, 16) : '');
      setLocation(data.location || '');
      setEventDate(data.event_date || '');
      setEventType(data.event_type || '');
      setIsActive(data.is_active);

    } catch (error) {
      console.error('Unexpected error fetching sheet:', error);
      setSheet(null);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldToggle = (fieldId: string) => {
    const field = FIELD_OPTIONS.find(f => f.id === fieldId);
    if (field?.required) return; // Can't remove required fields

    setSelectedFields(prev =>
      prev.includes(fieldId)
        ? prev.filter(id => id !== fieldId)
        : [...prev, fieldId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sheetId || !user || !sheet) return;

    setSubmitting(true);

    try {
      const updatedSheetData: Tables<'mustersheets'>['Update'] = {
        title,
        description: description || null,
        time_format: timeFormat,
        required_fields: selectedFields,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        is_active: isActive,
        location: location || null,
        event_date: eventDate || null,
        event_type: eventType || null,
      };

      const { error } = await supabase
        .from('mustersheets')
        .update(updatedSheetData)
        .eq('id', sheetId)
        .eq('creator_id', user.id); // Ensure only creator can update

      if (error) {
        console.error('Error updating sheet:', error);
        toast({
          title: 'Error',
          description: error.message || 'Failed to update sheet. Please try again.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Sheet Updated!',
          description: `"${title}" has been successfully updated.`,
        });
        navigate(`/results/${sheetId}`); // Navigate back to results or dashboard
      }
    } catch (error) {
      console.error('Unexpected error during sheet update:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred while updating the sheet.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-lg">Loading sheet details...</div>
      </div>
    );
  }

  if (unauthorized) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-gray-800 border-gray-700">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Access Denied</h3>
            <p className="text-gray-400">You don't have permission to edit this sheet.</p>
            <Button onClick={() => navigate('/')} className="mt-4 bg-blue-600 hover:bg-blue-700">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!sheet) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-gray-800 border-gray-700">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Sheet Not Found</h3>
            <p className="text-gray-400">The attendance sheet you are trying to edit does not exist.</p>
            <Button onClick={() => navigate('/')} className="mt-4 bg-blue-600 hover:bg-blue-700">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="border-b border-gray-700 pb-4">
            <CardTitle className="text-2xl font-bold text-white">Edit Muster Sheet</CardTitle>
            <p className="text-gray-400">Modify the details of your attendance sheet.</p>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-white">Event Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter event name"
                    className="bg-gray-700 border-gray-600 text-white"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timeFormat" className="text-white">Time Format</Label>
                  <select
                    id="timeFormat"
                    value={timeFormat}
                    onChange={(e) => setTimeFormat(e.target.value as 'standard' | 'military')}
                    className="w-full h-10 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                  >
                    <option value="standard">Standard (12-hour)</option>
                    <option value="military">Military (24-hour)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-white">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your event..."
                  className="bg-gray-700 border-gray-600 text-white"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location" className="text-white">Location (Optional)</Label>
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g., Room 101, Online"
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="eventDate" className="text-white">Event Date (Optional)</Label>
                  <Input
                    id="eventDate"
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="eventType" className="text-white">Event Type (Optional)</Label>
                  <Input
                    id="eventType"
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value)}
                    placeholder="e.g., Lecture, Workshop"
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expires" className="text-white flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    Expiration Date (Optional)
                  </Label>
                  <Input
                    id="expires"
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-white">Information to Collect</Label>
                <div className="grid grid-cols-2 gap-2">
                  {FIELD_OPTIONS.map((field) => (
                    <div
                      key={field.id}
                      onClick={() => handleFieldToggle(field.id)}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedFields.includes(field.id)
                          ? 'bg-green-600/20 border-green-600 text-green-400'
                          : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-500'
                      } ${field.required ? 'cursor-not-allowed opacity-75' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{field.label}</span>
                        {field.required && (
                          <Badge variant="secondary" className="text-xs bg-gray-600">
                            Required
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-gray-400">
                  Click to toggle fields. First and Last Name are always required.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="form-checkbox h-4 w-4 text-green-600 transition duration-150 ease-in-out bg-gray-700 border-gray-600 rounded"
                />
                <Label htmlFor="isActive" className="text-white">Sheet is Active</Label>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/')}
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {submitting ? 'Saving...' : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EditSheetPage;
