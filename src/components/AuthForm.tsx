import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, Lock, Zap, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Github } from 'lucide-react';


export const AuthForm = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isMagicLink, setIsMagicLink] = useState(false);
  const [showGuestInfo, setShowGuestInfo] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp, signIn, signInWithMagicLink, setGuestMode, /* optional */ signInWithOAuth } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    let result;
    if (isMagicLink) {
      result = await signInWithMagicLink(email);
      if (!result.error) {
        setSuccess('Magic link sent! Check your email to sign in.');
      }
    } else {
      result = isSignUp 
        ? await signUp(email, password)
        : await signIn(email, password);
    }

    if (result.error) {
      setError(result.error.message);
    }
    setLoading(false);
  };

  const handleGithubSignIn = async () => {
    try {
      setLoading(true);
      setError('');

      let result:
        | { error: { message: string } | null }
        | { error: { message: string } | null | undefined } = { error: null };

      // Prefer the hook's helper if it exists; fall back to direct supabase call.
      if (typeof signInWithOAuth === 'function') {
        // @ts-ignore – signature depends on AuthContext implementation
        result = await signInWithOAuth('github');
      } else {
        result = await supabase.auth.signInWithOAuth({
          provider: 'github',
          options: {
            redirectTo: `${window.location.origin}/`,
          },
        });
      }

      if (result?.error) {
        setError(result.error.message);
      }
    } catch (err) {
      setError('Failed to sign in with GitHub');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError('');
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`
        }
      });
      
      if (error) {
        setError(error.message);
      }
    } catch (err) {
      setError('Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestMode = () => {
    setGuestMode();
  };

  if (showGuestInfo) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-gray-800 border-gray-700">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Users className="h-12 w-12 text-pink-400" />
            </div>
            <CardTitle className="text-2xl font-bold text-white">
              Guest Account
            </CardTitle>
            <p className="text-gray-400">
              Continue without creating an account
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-pink-900/20 border border-pink-800 rounded-lg p-4">
                <h3 className="text-pink-400 font-semibold mb-2">Guest Limitations:</h3>
                <ul className="text-gray-300 text-sm space-y-1">
                  <li>• Limited to 1 muster sheet only</li>
                  <li>• Cannot delete or create additional sheets</li>
                  <li>• Sheet data may be lost if not saved</li>
                  <li>• Full features available after sign-up</li>
                </ul>
              </div>
              
              <Button
                onClick={handleGuestMode}
                className="w-full bg-pink-600 hover:bg-pink-700 text-white font-semibold"
              >
                Continue as Guest
              </Button>
              
              <Button
                variant="outline"
                onClick={() => setShowGuestInfo(false)}
                className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Back to Sign In
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-gray-800 border-gray-700">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-white">
            {isMagicLink ? 'Magic Link Sign In' : (isSignUp ? 'Create Account' : 'Sign In')}
          </CardTitle>
          <p className="text-gray-400">
            {isMagicLink ? 'Get a secure link sent to your email' : (isSignUp ? 'Join MusterSheets to create attendance logs' : 'Access your muster sheets')}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <div className="relative">
                {!isMagicLink && <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />}
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`${!isMagicLink ? 'pl-10' : ''} bg-gray-700 border-gray-600 text-white placeholder-gray-400`}
                  required
                />
              </div>
            </div>
            
            {!isMagicLink && (
              <div className="space-y-2">
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                    required
                  />
                </div>
              </div>
            )}
            
            {error && (
              <Alert className="bg-red-900/20 border-red-900 text-red-400">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="bg-green-900/20 border-green-900 text-green-400">
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold"
            >
              {loading ? 'Processing...' : (
                isMagicLink ? 'Send Magic Link' : (isSignUp ? 'Create Account' : 'Sign In')
              )}
            </Button>
          </form>

          <div className="mt-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-600" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-gray-800 px-2 text-gray-400">Or continue with</span>
              </div>
            </div>

            <div className="space-y-2 mt-4">
              <Button
                type="button"
                onClick={() => setIsMagicLink(!isMagicLink)}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold"
              >
                <Zap className="h-4 w-4 mr-2" />
                {isMagicLink ? 'Use Email/Password' : 'Use Magic Link'}
              </Button>

              <Button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </Button>

              <Button
                type="button"
                onClick={handleGithubSignIn}
                disabled={loading}
                className="w-full bg-gray-800 hover:bg-gray-700 text-white font-semibold border border-gray-600"
              >
                <Github className="h-4 w-4 mr-2" />
                Continue with GitHub
              </Button>

              <Button
                type="button"
                onClick={() => setShowGuestInfo(true)}
                className="w-full bg-pink-600 hover:bg-pink-700 text-white font-semibold"
              >
                <Users className="h-4 w-4 mr-2" />
                Continue as Guest
              </Button>
            </div>
          </div>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setIsMagicLink(false);
              }}
              className="text-green-400 hover:text-green-300 text-sm"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
