
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Clock, QrCode } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type MusterSheet = Tables<'mustersheets'>;

interface DashboardStatsProps {
  sheets: MusterSheet[];
  isGuest: boolean;
}

export const DashboardStats = ({ sheets, isGuest }: DashboardStatsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-6">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-400" />
            <div className="ml-4">
              <p className="text-2xl font-bold text-white">{sheets.length}</p>
              <p className="text-gray-400">
                {isGuest ? 'Guest Sheet' : 'Total Sheets'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-6">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-green-400" />
            <div className="ml-4">
              <p className="text-2xl font-bold text-white">
                {sheets.filter(s => s.is_active).length}
              </p>
              <p className="text-gray-400">Active Sheets</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-6">
          <div className="flex items-center">
            <QrCode className="h-8 w-8 text-purple-400" />
            <div className="ml-4">
              <p className="text-2xl font-bold text-white">QR</p>
              <p className="text-gray-400">Code Ready</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
