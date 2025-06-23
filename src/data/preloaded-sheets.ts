import { GraduationCap, Users, Briefcase, Plus } from 'lucide-react';

export interface PreloadedSheetTemplate {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  fields: string[];
  timeFormat: 'standard' | 'military';
}

export const PRESET_TEMPLATES: PreloadedSheetTemplate[] = [
  {
    id: 'class',
    name: 'Class Attendance',
    icon: <GraduationCap className="h-5 w-5" />,
    description: 'Track attendance for college or certification classes',
    fields: ['first_name', 'last_name', 'email', 'phone'],
    timeFormat: 'standard',
  },
  {
    id: 'team_meeting',
    name: 'Team Meeting',
    icon: <Briefcase className="h-5 w-5" />,
    description: 'For internal team meetings and project stand-ups',
    fields: ['first_name', 'last_name', 'email', 'unit'],
    timeFormat: 'standard',
  },
  {
    id: 'general_event',
    name: 'General Event Check-in',
    icon: <Users className="h-5 w-5" />,
    description: 'Any type of gathering or event check-in',
    fields: ['first_name', 'last_name', 'email'],
    timeFormat: 'standard',
  },
  {
    id: 'custom',
    name: 'Custom Template',
    icon: <Plus className="h-5 w-5" />,
    description: 'Create your own custom attendance sheet',
    fields: ['first_name', 'last_name'], // Default minimal fields
    timeFormat: 'standard',
  },
];

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
