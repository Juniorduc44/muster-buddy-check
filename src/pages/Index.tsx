
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthForm } from '@/components/AuthForm';
import { Header } from '@/components/Header';
import { Dashboard } from '@/components/Dashboard';
import { OnboardingModal } from '@/components/OnboardingModal';

const Index = () => {
  const { user, loading, isGuest, convertGuestToUser } = useAuth();
  // Show onboarding unless the user has explicitly opted-out
  const [showOnboarding, setShowOnboarding] = useState(
    () => !localStorage.getItem('onboarding_seen')
  );

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
      <>
        <AuthForm />
        <OnboardingModal
          isOpen={showOnboarding}
          onClose={() => setShowOnboarding(false)}
        />
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-900">
        <Header />
        <Dashboard />
      </div>
      <OnboardingModal
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
      />
    </>
  );
};

export default Index;
