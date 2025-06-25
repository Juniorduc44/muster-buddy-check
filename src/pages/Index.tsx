
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthForm } from '@/components/AuthForm';
import { Header } from '@/components/Header';
import { Dashboard } from '@/components/Dashboard';

const Index = () => {
  const { user, loading, isGuest, convertGuestToUser } = useAuth();

  useEffect(() => {
    // If user just signed in and was previously a guest, convert their data
    if (user && !isGuest && localStorage.getItem('guest_sheet_id')) {
      convertGuestToUser(user.id);
    }
  }, [user, isGuest, convertGuestToUser]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  if (!user && !isGuest) {
    return (
      <AuthForm />
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />
      <Dashboard />
    </div>
  );
};

export default Index;
