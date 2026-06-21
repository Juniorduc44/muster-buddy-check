import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Shield, LogOut, ExternalLink, Heart, User } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';

export const Header = () => {
  const { user, signOut, isGuest } = useAuth();
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = React.useState(false);

  // Debug logging
  console.log({ isMobile, isGuest, user });

  const handleSignOut = async () => {
    await signOut();
  };

  const handleSignInClick = () => {
    window.location.href = '/';
  };

  return (
    <header className="bg-gray-800 border-b border-gray-700 px-6 py-4 overflow-x-hidden">
      <div className="max-w-7xl mx-auto flex items-center justify-between relative">
        <div className="flex items-center space-x-3">
          <Shield className="h-8 w-8 text-green-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">MusterSheets</h1>
            <p className="text-sm text-gray-400">Digital Attendance Logging</p>
          </div>
        </div>

        {isMobile ? (
          <div className="flex flex-col items-end ml-auto">
            <span className="text-gray-300 text-sm mb-1">
              {user && !isGuest ? user.email : 'Guest Mode'}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-6 w-6" />
            </Button>
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetContent side="right" className="bg-gray-800 text-white w-full max-w-[80vw] p-6 sm:w-64">
                <div className="flex flex-col gap-4">
                  {isGuest && (
                    <Button
                      onClick={handleSignInClick}
                      className="bg-green-600 hover:bg-green-700 text-white w-full"
                    >
                      <User className="h-4 w-4 mr-2" />
                      Sign In / Sign Up
                    </Button>
                  )}
                  <a
                    href="https://pay.zaprite.com/pl_iT3k7W4JRo"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-md transition-colors w-full justify-center"
                  >
                    <Heart className="h-4 w-4" />
                    <span>Donate</span>
                  </a>
                  <a
                    href="https://juniorduc44.crypto"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-md transition-colors w-full justify-center"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>Services</span>
                  </a>
                  {(user && !isGuest) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSignOut}
                      className="border-gray-600 text-gray-300 hover:bg-gray-700 w-full"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </Button>
                  )}
                  {isGuest && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSignOut}
                      className="border-pink-600 text-pink-400 hover:bg-pink-900/20 w-full"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Exit Guest
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        ) : (
          <div className="flex items-center space-x-4">
            {isGuest && (
              <Button
                onClick={handleSignInClick}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <User className="h-4 w-4 mr-2" />
                Sign In / Sign Up
              </Button>
            )}
            <a
              href="https://pay.zaprite.com/pl_iT3k7W4JRo"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-md transition-colors"
            >
              <Heart className="h-4 w-4" />
              <span>Donate</span>
            </a>
            <a
              href="https://juniorduc44.crypto"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-md transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              <span>Services</span>
            </a>
            {user && !isGuest && (
              <div className="flex items-center space-x-3">
                <span className="text-gray-300 text-sm">
                  {user.email}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignOut}
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            )}
            {isGuest && (
              <div className="flex items-center space-x-3">
                <span className="text-pink-400 text-sm font-medium">
                  Guest Mode
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignOut}
                  className="border-pink-600 text-pink-400 hover:bg-pink-900/20"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Exit Guest
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
