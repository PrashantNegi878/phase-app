import './index.css';

import React, { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { AuthPage } from './components/AuthPage';
import { TrackerOnboarding } from './components/TrackerOnboarding';
import { PartnerOnboarding } from './components/PartnerOnboarding';
import { TrackerDashboard } from './components/TrackerDashboard';
import { PartnerDashboard } from './components/PartnerDashboard';
import { LogSymptoms } from './components/LogSymptoms';
import { LogPeriod } from './components/LogPeriod';
import { authService } from './services/auth';
import { cycleService } from './services/cycle';

type View =
  | 'auth'
  | 'tracker-onboarding'
  | 'partner-onboarding'
  | 'tracker-dashboard'
  | 'partner-dashboard'
  | 'log-symptoms'
  | 'log-period';

// Helper function to fetch partner profile with retry mechanism
async function fetchPartnerProfileWithRetry(userId: string, maxRetries: number = 3): Promise<any> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const profile = await cycleService.getPartnerProfile(userId);
      if (profile) {
        return profile;
      }
      // If profile is null, wait a bit before retrying
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 500 * (i + 1))); // Exponential backoff
      }
    } catch (err) {
      if (i === maxRetries - 1) {
        throw err;
      }
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
    }
  }
  return null;
}

function App() {
  const { currentUser, userData, loading } = useAuth();
  const [currentView, setCurrentView] = useState<View>('auth');
  const [partnerProfile, setPartnerProfile] = useState<any>(null);
  const [loadingPartnerProfile, setLoadingPartnerProfile] = useState(false);

  React.useEffect(() => {
    const initializeApp = async () => {
      if (!currentUser) {
        setCurrentView('auth');
        return;
      }

      try {
        const user = await authService.getUserData(currentUser.uid);
        console.log('User data:', user);

        if (!user) {
          console.warn('No user data found');
          setCurrentView('auth');
          return;
        }

        if (user.role === 'tracker') {
          const profile = await cycleService.getTrackerProfile(currentUser.uid);
          console.log('Tracker profile:', profile);
          
          if (profile && profile.trackedSymptoms && profile.trackedSymptoms.length > 0) {
            console.log('Going to tracker-dashboard');
            setCurrentView('tracker-dashboard');
          } else {
            console.log('Going to tracker-onboarding');
            setCurrentView('tracker-onboarding');
          }
        } else {
          // Partner role
          setLoadingPartnerProfile(true);
          try {
            // Try to fetch partner profile with retry mechanism
            const profile = await fetchPartnerProfileWithRetry(currentUser.uid);
            console.log('Partner profile:', profile);
            
            // Set partnerProfile state - use null if no profile exists
            setPartnerProfile(profile || null);

            if (profile?.supportStyle) {
              console.log('Going to partner-dashboard (completed onboarding)');
              setCurrentView('partner-dashboard');
            } else {
              console.log('Going to partner-onboarding (not completed)');
              setCurrentView('partner-onboarding');
            }
          } catch (err) {
            console.error('Error fetching partner profile:', err);
            setPartnerProfile(null);
            setCurrentView('auth');
          } finally {
            setLoadingPartnerProfile(false);
          }
        }
      } catch (err) {
        console.error('Error initializing app:', err);
        setCurrentView('auth');
      }
    };

    initializeApp();
  }, [currentUser]);

  // Effect to refetch partner profile after onboarding completion
  React.useEffect(() => {
    const refetchPartnerProfile = async () => {
      if (currentView === 'partner-dashboard' && currentUser) {
        setLoadingPartnerProfile(true);
        try {
          const profile = await fetchPartnerProfileWithRetry(currentUser.uid);
          console.log('Refetched partner profile:', profile);
          setPartnerProfile(profile || null);
        } catch (err) {
          console.error('Error refetching partner profile:', err);
          setPartnerProfile(null);
        } finally {
          setLoadingPartnerProfile(false);
        }
      }
    };

    refetchPartnerProfile();
  }, [currentView, currentUser]);

  const handleLogout = async () => {
    await authService.logout();
    setCurrentView('auth');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-earth-50 via-sage-50 to-earth-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-3 border-sage-200 border-t-sage-500 rounded-full animate-spin" />
          <p className="text-earth-600 font-light">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-earth-50 min-h-screen">
      {/* Top Navigation */}
      {currentUser && currentView !== 'auth' && (
        <div className="bg-white/80 backdrop-blur-lg border-b border-earth-100 sticky top-0 z-40">
          <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
            <h1 className="font-semibold text-slate-800 tracking-tight">Phase</h1>
            <button
              onClick={handleLogout}
              className="text-sm text-earth-500 hover:text-sage-600 transition-colors duration-200 font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      {currentView === 'auth' && <AuthPage onAuthSuccess={() => {}} />}

      {currentView === 'tracker-onboarding' && userData && (
        <TrackerOnboarding
          userId={currentUser!.uid}
          partnerCode={userData.partnerCode || ''}
          onComplete={() => setCurrentView('tracker-dashboard')}
        />
      )}

      {currentView === 'partner-onboarding' && (
        <PartnerOnboarding
          userId={currentUser!.uid}
          onComplete={() => setCurrentView('partner-dashboard')}
        />
      )}

      {(currentView === 'tracker-dashboard' || currentView === 'log-symptoms' || currentView === 'log-period') && userData && (
        <>
          <TrackerDashboard
            userId={currentUser!.uid}
            partnerCode={userData.partnerCode || ''}
            onLogSymptoms={() => setCurrentView('log-symptoms')}
            onLogPeriod={() => setCurrentView('log-period')}
          />
          {currentView === 'log-symptoms' && (
            <LogSymptoms
              userId={currentUser!.uid}
              onLogComplete={() => setCurrentView('tracker-dashboard')}
              onCancel={() => setCurrentView('tracker-dashboard')}
            />
          )}
          {currentView === 'log-period' && (
            <LogPeriod
              userId={currentUser!.uid}
              onLogComplete={() => setCurrentView('tracker-dashboard')}
              onCancel={() => setCurrentView('tracker-dashboard')}
            />
          )}
        </>
      )}

      {(currentView === 'partner-dashboard' || currentView === 'log-symptoms' || currentView === 'log-period') && partnerProfile !== null && (
        <>
          {loadingPartnerProfile ? (
            <div className="min-h-screen bg-earth-50 flex items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-3 border-sage-200 border-t-sage-500 rounded-full animate-spin" />
                <p className="text-earth-600 font-light">Loading partner data...</p>
              </div>
            </div>
          ) : (
            <PartnerDashboard
              userId={currentUser!.uid}
              linkedTrackerId={partnerProfile?.linkedTrackerId || undefined}
              isManualMode={!partnerProfile?.linkedTrackerId}
              onLogSymptoms={() => setCurrentView('log-symptoms')}
              onLogPeriod={() => setCurrentView('log-period')}
            />
          )}
          {currentView === 'log-symptoms' && (
            <LogSymptoms
              userId={currentUser!.uid}
              onLogComplete={() => setCurrentView('partner-dashboard')}
              onCancel={() => setCurrentView('partner-dashboard')}
            />
          )}
          {currentView === 'log-period' && (
            <LogPeriod
              userId={currentUser!.uid}
              onLogComplete={() => setCurrentView('partner-dashboard')}
              onCancel={() => setCurrentView('partner-dashboard')}
            />
          )}
        </>
      )}
    </div>
  );
}

export default App;
