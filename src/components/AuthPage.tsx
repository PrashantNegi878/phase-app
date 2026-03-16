import React, { useState, useEffect } from 'react';
import { authService } from '../services/auth';

interface AuthPageProps {
  onAuthSuccess: () => void;
}

export function AuthPage({ onAuthSuccess }: AuthPageProps) {
  const [role, setRole] = useState<'tracker' | 'partner'>('tracker');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  // Check for magic link callback on component mount
  useEffect(() => {
    const handleMagicLink = async () => {
      try {
        const user = await authService.handleMagicLinkSignIn();
        if (user) {
          onAuthSuccess();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Magic link authentication failed');
      }
    };

    handleMagicLink();
  }, [onAuthSuccess]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      await authService.signInWithGoogle(role);
      onAuthSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google Sign-In failed');
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    if (!email) {
      setError('Please enter your email address');
      setLoading(false);
      return;
    }

    try {
      await authService.sendMagicLink(email, role);
      setMagicLinkSent(true);
      setEmail('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send magic link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-pink-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-8">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">
          Phase
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Your personal wellness companion
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        {magicLinkSent && (
          <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">
            Magic link sent! Please check your email and click the link to sign in.
          </div>
        )}

        <div className="space-y-6">
          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              What's your role?
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="tracker"
                  checked={role === 'tracker'}
                  onChange={(e) => setRole(e.target.value as 'tracker' | 'partner')}
                  className="mr-3"
                />
                <span className="text-gray-700">
                  <strong>Tracker</strong> - I'll track my cycle
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="partner"
                  checked={role === 'partner'}
                  onChange={(e) => setRole(e.target.value as 'tracker' | 'partner')}
                  className="mr-3"
                />
                <span className="text-gray-700">
                  <strong>Partner</strong> - I'll support my partner
                </span>
              </label>
            </div>
          </div>

          {/* Google Sign-In Button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50 flex items-center justify-center"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                fill="white"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="white"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="white"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="white"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Sign in with Google
          </button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">or</span>
            </div>
          </div>

          {/* Magic Link Form */}
          <form onSubmit={handleMagicLink} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                placeholder="Enter your email"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading || !email}
              className="w-full bg-pink-500 hover:bg-pink-600 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Magic Link'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-600">
            We'll send a secure link to your email. No password needed!
          </p>
        </div>
      </div>
    </div>
  );
}