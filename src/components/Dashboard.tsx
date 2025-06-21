
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Users, Clock, QrCode, Info } from 'lucide-react';
import { CreateSheetModal } from './CreateSheetModal';
import { MusterSheetCard } from './MusterSheetCard';
import type { Tables } from '@/integrations/supabase/types';

type MusterSheet = Tables<'muster_sheets'>;

export const Dashboard = () => {
  const { user, isGuest, convertGuestToUser } = useAuth();
  const [sheets, setSheets] = useState<MusterSheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchSheets();
  }, [user, isGuest]);

  const fetchSheets = async () => {
    if (isGuest) {
      // For guest users, check if they have a sheet in localStorage
      const guestSheetId = localStorage.getItem('guest_sheet_id');
      if (guestSheetId) {
        try {
          const { data, error } = await supabase
            .from('muster_sheets')
            .select('*')
            .eq('id', guestSheetId)
            .single();

          if (error) {
            console.error('Error fetching guest sheet:', error);
            setSheets([]);
          } else {
            setSheets([data]);
          }
        } catch (error) {
          console.error('Error in fetchSheets for guest:', error);
          setSheets([]);
        }
      } else {
        setSheets([]);
      }
    } else if (user) {
      try {
        const { data, error } = await supabase
          .from('muster_sheets')
          .select('*')
          .eq('creator_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching sheets:', error);
        } else {
          setSheets(data || []);
        }
      } catch (error) {
        console.error('Error in fetchSheets:', error);
      }
    }
    setLoading(false);
  };

  const handleSheetCreated = (newSheet?: MusterSheet) => {
    if (isGuest && newSheet) {
      // Store the guest sheet ID for later conversion
      localStorage.setItem('guest_sheet_id', newSheet.id);
    }
    fetchSheets();
    setShowCreateModal(false);
  };

  const handleConvertGuestAccount = async () => {
    if (user && isGuest) {
      await convertGuestToUser(user.id);
      fetchSheets();
    }
  };

  const canCreateSheet = !isGuest || sheets.length === 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          {/* Guest Mode Alert */}
          {isGuest && (
            <Alert className="mb-6 bg-pink-900/20 border-pink-800 text-pink-400">
              <Info className="h-4 w-4" />
              <AlertDescription>
                You're in Guest Mode. You can create 1 muster sheet. Sign up to unlock full features and save your data permanently.
              </AlertDescription>
            </Alert>
          )}

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
                onClick={() => setShowCreateModal(true)}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Plus className="h-5 w-5 mr-2" />
                Create New Sheet
              </Button>
            )}
          </div>

          {/* Stats Cards */}
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
        </div>

        {/* Sheets Grid */}
        {sheets.length === 0 ? (
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
                  onClick={() => setShowCreateModal(true)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  {isGuest ? 'Create Guest Sheet' : 'Create Your First Sheet'}
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sheets.map((sheet) => (
              <MusterSheetCard 
                key={sheet.id} 
                sheet={sheet} 
                onUpdate={fetchSheets}
                isGuest={isGuest}
              />
            ))}
          </div>
        )}

        <CreateSheetModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSheetCreated={handleSheetCreated}
          isGuest={isGuest}
        />
      </div>
    </div>
  );
};
