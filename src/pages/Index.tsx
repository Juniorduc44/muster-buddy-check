
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthForm } from '@/components/AuthForm';
import { Header } from '@/components/Header';
import { Dashboard } from '@/components/Dashboard';
import { OnboardingModal } from '@/components/OnboardingModal';

const Index = () => {
  const { user, loading, isGuest, convertGuestToUser } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    // If user just signed in and was previously a guest, convert their data
    if (user && !isGuest && localStorage.getItem('guest_sheet_id')) {
      convertGuestToUser(user.id);
    }
  }, [user, isGuest, convertGuestToUser]);

  // Show onboarding only on first visit
  useEffect(() => {
    if (!localStorage.getItem('onboarding_seen')) {
      setShowOnboarding(true);
    }
  }, [user, isGuest, convertGuestToUser]);

  const handleCloseOnboarding = () => {
    localStorage.setItem('onboarding_seen', 'true');
    setShowOnboarding(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  if (!user && !isGuest) {
    return (
      <>
        <AuthForm />
        <OnboardingModal isOpen={showOnboarding} onClose={handleCloseOnboarding} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />
      <Dashboard />
      <OnboardingModal isOpen={showOnboarding} onClose={handleCloseOnboarding} />
    </div>
  );
};

export default Index;
