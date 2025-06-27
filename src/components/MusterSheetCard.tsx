
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  Clock, 
  QrCode, 
  ExternalLink, 
  Calendar,
  Copy,
  Edit2,
  BarChart3
} from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Correct table type to align with Supabase schema
type MusterSheet = Tables<'mustersheets'>;

interface MusterSheetCardProps {
  sheet: MusterSheet;
  onUpdate: () => void;
}

export const MusterSheetCard = ({ sheet, onUpdate }: MusterSheetCardProps) => {
  const { toast } = useToast();
  const { user }   = useAuth();
  const attendanceUrl = `${window.location.origin}/attend/${sheet.id}`;
  const resultsUrl = `${window.location.origin}/results/${sheet.id}`;
  
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(attendanceUrl);
      toast({
        title: "Link copied!",
        description: "Attendance link has been copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Could not copy link to clipboard",
        variant: "destructive",
      });
    }
  };

  // --- Clone sheet ----------------------------------------------------
  const handleCloneSheet = async () => {
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to clone a sheet.',
        variant: 'destructive',
      });
      return;
    }

    const cloned = {
      creator_id: user.id,
      title: `Copy of ${sheet.title}`,
      description: sheet.description,
      required_fields: sheet.required_fields,
      time_format: sheet.time_format,
      expires_at: sheet.expires_at,
      is_active: true,
    };

    const { error } = await supabase.from('mustersheets').insert([cloned]);

    if (error) {
      console.error('Clone error', error);
      toast({
        title: 'Error',
        description: 'Unable to clone sheet. Please try again.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Sheet cloned!',
        description: `"${sheet.title}" duplicated successfully.`,
      });
      onUpdate(); // refresh list
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const isExpired = sheet.expires_at && new Date(sheet.expires_at) < new Date();
  const canEdit = sheet.is_active && !isExpired;

  // --- Edit sheet ----------------------------------------------------
  const handleEditSheet = () => {
    // Navigate to edit page in a new tab (adjust path as needed)
    window.open(`/edit/${sheet.id}`, '_blank');
  };

  return (
    <Card className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg text-white mb-2">{sheet.title}</CardTitle>
            {sheet.description && (
              <p className="text-sm text-gray-400 mb-3">{sheet.description}</p>
            )}
          </div>
          <div className="flex flex-col items-end space-y-2">
            <Badge 
              variant={sheet.is_active && !isExpired ? "default" : "secondary"}
              className={sheet.is_active && !isExpired ? "bg-green-600" : "bg-gray-600"}
            >
              {isExpired ? 'Expired' : (sheet.is_active ? 'Active' : 'Inactive')}
            </Badge>
            <Badge variant="outline" className="border-gray-600 text-gray-400">
              {sheet.time_format === 'military' ? '24h' : '12h'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center text-gray-400">
            <Calendar className="h-4 w-4 mr-2" />
            Created {formatDate(sheet.created_at)}
          </div>
          <div className="flex items-center text-gray-400">
            <Users className="h-4 w-4 mr-2" />
            {sheet.required_fields.length} fields
          </div>
        </div>

        {sheet.expires_at && (
          <div className="flex items-center text-sm text-gray-400">
            <Clock className="h-4 w-4 mr-2" />
            Expires {formatDate(sheet.expires_at)}
          </div>
        )}

        <div className="flex flex-wrap gap-1 mb-3">
          {sheet.required_fields.slice(0, 3).map((field) => (
            <Badge key={field} variant="outline" className="text-xs border-gray-600 text-gray-400">
              {field.replace('_', ' ')}
            </Badge>
          ))}
          {sheet.required_fields.length > 3 && (
            <Badge variant="outline" className="text-xs border-gray-600 text-gray-400">
              +{sheet.required_fields.length - 3} more
            </Badge>
          )}
        </div>

        <div className="flex space-x-2">
          <Button
            size="sm"
            onClick={handleCopyLink}
            className="flex-1 bg-green-600 hover:bg-green-700"
            disabled={isExpired}
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy Link
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
            onClick={() => window.open(`/qr/${sheet.id}`, '_blank')}
          >
            <QrCode className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
            onClick={handleEditSheet}
            disabled={!canEdit}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
            onClick={handleCloneSheet}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>

        <div className="pt-2 border-t border-gray-700 space-y-2">
          <a
            href={attendanceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center text-sm text-green-400 hover:text-green-300"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View Attendance Page
          </a>
          <a
            href={resultsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center text-sm text-blue-400 hover:text-blue-300"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            View Results & Analytics
          </a>
        </div>
      </CardContent>
    </Card>
  );
};
