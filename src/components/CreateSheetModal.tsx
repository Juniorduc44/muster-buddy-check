
import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Clock, Calendar } from 'lucide-react';

interface CreateSheetModalProps {
  open: boolean;
  onClose: () => void;
  onSheetCreated: () => void;
}

const FIELD_OPTIONS = [
  { id: 'first_name', label: 'First Name', required: true },
  { id: 'last_name', label: 'Last Name', required: true },
  { id: 'email', label: 'Email Address', required: false },
  { id: 'phone', label: 'Phone Number', required: false },
  { id: 'rank', label: 'Rank/Position', required: false },
  { id: 'unit', label: 'Unit/Department', required: false },
  { id: 'badge_number', label: 'Badge Number', required: false },
  { id: 'age', label: 'Age', required: false },
];

export const CreateSheetModal = ({ open, onClose, onSheetCreated }: CreateSheetModalProps) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [timeFormat, setTimeFormat] = useState<'standard' | 'military'>('standard');
  const [selectedFields, setSelectedFields] = useState<string[]>(['first_name', 'last_name']);
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

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
    if (!user) return;

    setLoading(true);
    
    const sheetData = {
      creator_id: user.id,
      title,
      description,
      required_fields: selectedFields,
      time_format: timeFormat,
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      is_active: true,
    };

    const { error } = await supabase
      .from('muster_sheets')
      .insert([sheetData]);

    if (error) {
      console.error('Error creating sheet:', error);
    } else {
      onSheetCreated();
      // Reset form
      setTitle('');
      setDescription('');
      setSelectedFields(['first_name', 'last_name']);
      setTimeFormat('standard');
      setExpiresAt('');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl bg-gray-800 border-gray-700 max-h-[90vh] overflow-y-auto">
        <CardHeader className="border-b border-gray-700">
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl font-bold text-white">Create Muster Sheet</CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-400">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-white">Sheet Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Morning Muster - Alpha Company"
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
              <Label htmlFor="description" className="text-white">Description (Optional)</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Daily morning attendance check"
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

            <div className="space-y-3">
              <Label className="text-white">Required Information Fields</Label>
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

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="border-gray-600 text-gray-300"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || !title.trim()}
                className="bg-green-600 hover:bg-green-700"
              >
                {loading ? 'Creating...' : 'Create Sheet'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
