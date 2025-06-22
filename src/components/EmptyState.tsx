
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Plus } from 'lucide-react';

interface EmptyStateProps {
  isGuest: boolean;
  canCreateSheet: boolean;
  onCreateSheet: () => void;
}

export const EmptyState = ({ isGuest, canCreateSheet, onCreateSheet }: EmptyStateProps) => {
  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardContent className="p-12 text-center">
        <Users className="h-16 w-16 text-gray-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">
          {isGuest ? 'No Guest Sheet Yet' : 'No Attendance Sheets Yet'}
        </h3>
        <p className="text-gray-400 mb-6">
          {isGuest 
            ? 'Create your guest attendance sheet for any event'
            : 'Create your first attendance sheet for any event or meeting'
          }
        </p>
        {canCreateSheet && (
          <Button
            onClick={onCreateSheet}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="h-5 w-5 mr-2" />
            {isGuest ? 'Create Guest Sheet' : 'Create Your First Sheet'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
