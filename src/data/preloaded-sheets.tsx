import { GraduationCap, Users, Briefcase, Plus, Building, Heart } from 'lucide-react';

export interface PreloadedSheetTemplate {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  fields: string[];
  timeFormat: 'standard' | 'military';
}

export const FIELD_OPTIONS = [
  { id: 'first_name', label: 'First Name', required: true },
  { id: 'last_name', label: 'Last Name', required: true },
  { id: 'email', label: 'Email Address', required: false },
  { id: 'phone', label: 'Phone Number', required: false },
  { id: 'rank', label: 'Rank/Position', required: false },
  { id: 'unit', label: 'Unit/Department', required: false },
  { id: 'badge_number', label: 'Badge/ID Number', required: false },
  { id: 'age', label: 'Age', required: false },
];

export const PRESET_TEMPLATES: PreloadedSheetTemplate[] = [
  {
    id: 'military',
    name: 'Military Formation',
    icon: <Building className="h-5 w-5" />,
    description: 'For military formations and inspections',
    fields: ['first_name', 'last_name', 'rank', 'unit', 'badge_number'],
    timeFormat: 'military',
  },
  {
    id: 'family',
    name: 'Family Reunion',
    icon: <Heart className="h-5 w-5" />,
    description: 'Perfect for family gatherings and reunions',
    fields: ['first_name', 'last_name', 'email', 'phone', 'age'],
    timeFormat: 'standard',
  },
  {
    id: 'class',
    name: 'Class Attendance',
    icon: <GraduationCap className="h-5 w-5" />,
    description: 'Track attendance for college or certification classes',
    fields: ['first_name', 'last_name', 'email', 'phone', 'badge_number'], // Added badge_number for student ID
    timeFormat: 'standard',
  },
  {
    id: 'corporate',
    name: 'Corporate Meeting',
    icon: <Building className="h-5 w-5" />,
    description: 'Professional meetings and conferences',
    fields: ['first_name', 'last_name', 'email', 'unit'],
    timeFormat: 'standard',
  },
  {
    id: 'event',
    name: 'General Event',
    icon: <Users className="h-5 w-5" />,
    description: 'Any type of gathering or event',
    fields: ['first_name', 'last_name', 'email'],
    timeFormat: 'standard',
  },
  {
    id: 'custom',
    name: 'Custom',
    icon: <Plus className="h-5 w-5" />,
    description: 'Create your own custom template',
    fields: ['first_name', 'last_name'],
    timeFormat: 'standard',
  },
];
