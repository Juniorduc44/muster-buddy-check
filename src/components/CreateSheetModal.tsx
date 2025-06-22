
import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { X, Plus, Clock, Calendar, Users, GraduationCap, Heart, Building } from 'lucide-react';

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
  { id: 'badge_number', label: 'Badge/ID Number', required: false },
  { id: 'age', label: 'Age', required: false },
];

const PRESET_TEMPLATES = [
  {
    id: 'military',
    name: 'Military Formation',
    icon: <Building className="h-5 w-5" />,
    description: 'For military formations and inspections',
    fields: ['first_name', 'last_name', 'rank', 'unit', 'badge_number'],
    timeFormat: 'military' as const
  },
  {
    id: 'family',
    name: 'Family Reunion',
    icon: <Heart className="h-5 w-5" />,
    description: 'Perfect for family gatherings and reunions',
    fields: ['first_name', 'last_name', 'email', 'phone', 'age'],
    timeFormat: 'standard' as const
  },
  {
    id: 'class',
    name: 'Class Reunion',
    icon: <GraduationCap className="h-5 w-5" />,
    description: 'Track attendance for class reunions',
    fields: ['first_name', 'last_name', 'email', 'phone'],
    timeFormat: 'standard' as const
  },
  {
    id: 'corporate',
    name: 'Corporate Meeting',
    icon: <Building className="h-5 w-5" />,
    description: 'Professional meetings and conferences',
    fields: ['first_name', 'last_name', 'email', 'unit'],
    timeFormat: 'standard' as const
  },
  {
    id: 'event',
    name: 'General Event',
    icon: <Users className="h-5 w-5" />,
    description: 'Any type of gathering or event',
    fields: ['first_name', 'last_name', 'email'],
    timeFormat: 'standard' as const
  },
  {
    id: 'custom',
    name: 'Custom',
    icon: <Plus className="h-5 w-5" />,
    description: 'Create your own custom template',
    fields: ['first_name', 'last_name'],
    timeFormat: 'standard' as const
  }
];

export const CreateSheetModal = ({ open, onClose, onSheetCreated }: CreateSheetModalProps) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [timeFormat, setTimeFormat] = useState<'standard' | 'military'>('standard');
  const [selectedFields, setSelectedFields] = useState<string[]>(['first_name', 'last_name']);
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  if (!open) return null;

  const handleTemplateSelect = (templateId: string) => {
    const template = PRESET_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      setSelectedFields(template.fields);
      setTimeFormat(template.timeFormat);
      if (templateId !== 'custom') {
        setTitle(template.name);
        setDescription(template.description);
      }
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
    if (!user) return;

    setLoading(true);
    
    try {
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
        .from('mustersheets' as any)
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
        setSelectedTemplate(null);
      }
    } catch (error) {
      console.error('Error in handleSubmit:', error);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-4xl bg-gray-800 border-gray-700 max-h-[90vh] overflow-y-auto">
        <CardHeader className="border-b border-gray-700">
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl font-bold text-white">Create Attendance Sheet</CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-400">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {!selectedTemplate ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Choose a Template</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {PRESET_TEMPLATES.map((template) => (
                    <Card
                      key={template.id}
                      className="bg-gray-700 border-gray-600 cursor-pointer hover:border-green-500 transition-colors"
                      onClick={() => handleTemplateSelect(template.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="text-green-400">{template.icon}</div>
                          <h4 className="font-semibold text-white">{template.name}</h4>
                        </div>
                        <p className="text-sm text-gray-400">{template.description}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="border-green-600 text-green-400">
                  {PRESET_TEMPLATES.find(t => t.id === selectedTemplate)?.name} Template
                </Badge>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setSelectedTemplate(null)}
                  className="text-gray-400 text-sm"
                >
                  Change Template
                </Button>
              </div>

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
          )}
        </CardContent>
      </Card>
    </div>
  );
};
