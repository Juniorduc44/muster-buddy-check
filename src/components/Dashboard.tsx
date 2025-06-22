
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CreateSheetModal } from './CreateSheetModal';
import { MusterSheetCard } from './MusterSheetCard';
import { GuestModeAlert } from './GuestModeAlert';
import { DashboardHeader } from './DashboardHeader';
import { DashboardStats } from './DashboardStats';
import { EmptyState } from './EmptyState';
import type { Tables } from '@/integrations/supabase/types';

type MusterSheet = Tables<'mustersheets'>;

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
            .from('mustersheets')
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
          .from('mustersheets')
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
          <GuestModeAlert isGuest={isGuest} />
          
          <DashboardHeader 
            isGuest={isGuest}
            canCreateSheet={canCreateSheet}
            onCreateSheet={() => setShowCreateModal(true)}
          />

          <DashboardStats sheets={sheets} isGuest={isGuest} />
        </div>

        {/* Sheets Grid */}
        {sheets.length === 0 ? (
          <EmptyState 
            isGuest={isGuest}
            canCreateSheet={canCreateSheet}
            onCreateSheet={() => setShowCreateModal(true)}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sheets.map((sheet) => (
              <MusterSheetCard 
                key={sheet.id} 
                sheet={sheet} 
                onUpdate={fetchSheets}
              />
            ))}
          </div>
        )}

        <CreateSheetModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSheetCreated={handleSheetCreated}
        />
      </div>
    </div>
  );
};
