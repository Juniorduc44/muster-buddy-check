
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

interface GuestModeAlertProps {
  isGuest: boolean;
}

export const GuestModeAlert = ({ isGuest }: GuestModeAlertProps) => {
  if (!isGuest) return null;

  return (
    <Alert className="mb-6 bg-pink-900/20 border-pink-800 text-pink-400">
      <Info className="h-4 w-4" />
      <AlertDescription>
        You're in Guest Mode. You can create 1 muster sheet. Sign up to unlock full features and save your data permanently.
      </AlertDescription>
    </Alert>
  );
};
