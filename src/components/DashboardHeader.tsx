
import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface DashboardHeaderProps {
  isGuest: boolean;
  canCreateSheet: boolean;
  onCreateSheet: () => void;
}

export const DashboardHeader = ({ isGuest, canCreateSheet, onCreateSheet }: DashboardHeaderProps) => {
  return (
    <div className="flex justify-between items-center mb-6">
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">
          {isGuest ? 'Your Guest Sheet' : 'Your Attendance Sheets'}
        </h2>
        <p className="text-gray-400">
          {isGuest 
            ? 'Limited to 1 sheet in guest mode' 
            : 'Create and manage attendance for any event or meeting'
          }
        </p>
      </div>
      {canCreateSheet && (
        <Button
          onClick={onCreateSheet}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <Plus className="h-5 w-5 mr-2" />
          Create New Sheet
        </Button>
      )}
    </div>
  );
};
