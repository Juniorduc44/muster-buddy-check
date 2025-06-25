import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { X, ArrowLeft, ArrowRight } from 'lucide-react';
import musterLogo from '@/assets/images/musterSheets_logo.png';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose }) => {
  // 0 = splash logo, 1-3 = informational slides
  const [currentStep, setCurrentStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  if (!isOpen) return null;

  const handleNext = () => {
    setCurrentStep(prev => prev + 1);
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem('onboarding_seen', 'true');
    }
    setCurrentStep(0); // Reset to first step on close
    onClose();
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="flex flex-col items-center justify-center text-center space-y-6">
            <img
              src={musterLogo}
              alt="MusterSheets Logo"
              className="mx-auto h-72 w-auto" /* larger logo */
            />
          </div>
        );
      case 1:
        return (
          <div className="text-center space-y-6">
            <h2 className="text-3xl font-bold text-white">Welcome to MusterSheets!</h2>
            <p className="text-gray-300 text-lg">
              Your effortless solution for digital attendance tracking.
            </p>
            <p className="text-gray-400">
              Say goodbye to paper sign-in sheets and manual data entry. MusterSheets helps you
              capture attendance quickly and securely for any event, class, or meeting.
            </p>
          </div>
        );
      case 2:
        return (
          <div className="text-center space-y-6">
            <h2 className="text-3xl font-bold text-white">How It Works</h2>
            <ul className="text-gray-300 text-left space-y-3 list-disc list-inside">
              <li>
                <strong>Create a Sheet:</strong> Easily set up a new attendance sheet with custom fields
                like name, email, student ID, or any other information you need.
              </li>
              <li>
                <strong>Share a QR Code/Link:</strong> Generate a unique QR code or share a direct link.
                Attendees simply scan or click to access the sign-in form.
              </li>
              <li>
                <strong>Effortless Sign-in:</strong> No accounts needed for attendees! They fill out the form
                and their attendance is instantly recorded.
              </li>
              <li>
                <strong>Track & Export:</strong> View real-time attendance data, manage your sheets, and
                export records for analysis.
              </li>
            </ul>
            <p className="text-gray-400">
              Perfect for college lectures, certification classes, team meetings, family reunions, and more!
            </p>
          </div>
        );
      case 3:
        return (
          <div className="text-center space-y-6">
            <h2 className="text-3xl font-bold text-white">Ready to Get Started?</h2>
            <p className="text-gray-300 text-lg">
              It's quick and easy to create your first attendance sheet.
            </p>
            <p className="text-gray-400">
              Sign in or create an account to unlock all features and keep your attendance records safe.
            </p>
            <div className="flex items-center justify-center space-x-2 mt-6">
              <Checkbox
                id="dontShowAgain"
                checked={dontShowAgain}
                onCheckedChange={setDontShowAgain}
                className="border-gray-400 data-[state=checked]:bg-green-600 data-[state=checked]:text-white"
              />
              <label htmlFor="dontShowAgain" className="text-sm text-gray-300 cursor-pointer">
                Don't show this again
              </label>
            </div>
            <Button onClick={handleClose} className="w-full bg-green-600 hover:bg-green-700 text-white mt-4">
              Let's Go!
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl bg-gray-800 border-gray-700 text-white shadow-lg">
        <CardHeader className="flex flex-row justify-between items-center border-b border-gray-700 pb-4">
          {currentStep > 0 ? (
            <CardTitle className="text-xl font-semibold">MusterSheets Onboarding</CardTitle>
          ) : (
            <div /> // Empty div to maintain spacing for the close button
          )}
          <Button variant="ghost" size="icon" onClick={handleClose} className="text-gray-400 hover:text-white">
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>
        <CardContent className="p-6">
          {renderStepContent()}
          <div className="flex justify-between mt-8">
            {currentStep > 0 && currentStep < 3 && (
              <Button onClick={handleBack} variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-700">
                <ArrowLeft className="h-4 w-4 mr-2" /> Back
              </Button>
            )}
            {currentStep === 0 && (
              <Button
                onClick={handleNext}
                className="mx-auto bg-green-600 hover:bg-green-700 text-white"
              >
                Get Started <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
            {currentStep > 0 && currentStep < 3 && (
              <Button onClick={handleNext} className="ml-auto bg-green-600 hover:bg-green-700 text-white">
                Next <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
            {currentStep === 3 && (
              // This button is handled within renderStepContent for step 3
              <div className="flex-grow"></div> 
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
