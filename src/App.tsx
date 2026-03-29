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
import { ReloadPrompt } from './components/ReloadPrompt';
import { InstallPrompt } from './components/InstallPrompt';
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
  /** Set from Firestore in initializeApp — avoids blank dashboard when useAuth.userData lags behind auth. */
  const [sessionRole, setSessionRole] = useState<'tracker' | 'partner' | null>(null);
  const [partnerProfile, setPartnerProfile] = useState<any>(null);
  const [loadingPartnerProfile, setLoadingPartnerProfile] = useState(false);
  const [trackerProfile, setTrackerProfile] = useState<any>(null);
  const [loadingTrackerProfile, setLoadingTrackerProfile] = useState(false);

  const trackerPartnerCode = userData?.partnerCode ?? trackerProfile?.partnerCode ?? '';

  React.useEffect(() => {
    const initializeApp = async () => {
      if (!currentUser) {
        setSessionRole(null);
        setCurrentView('auth');
        return;
      }

      try {
        const user = await authService.getUserData(currentUser.uid);
        console.log('User data:', user);

        if (!user) {
          console.warn('No user data found - this is a new user');
          // For new users, we need to wait for the user document to be created
          // Retry fetching user data a few times with delays
          let retryCount = 0;
          const maxRetries = 5;
          
          while (retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
            const userData = await authService.getUserData(currentUser.uid);
            console.log(`Retry ${retryCount + 1}: User data:`, userData);
            
            if (userData) {
              // User data created, restart the initialization with the new data
              console.log('User data created, restarting initialization');
              initializeApp();
              return;
            }
            retryCount++;
          }
          
          // If we still don't have user data after retries, show error
          console.error('User data not created after multiple retries');
          setSessionRole(null);
          setCurrentView('auth');
          return;
        }

        setSessionRole(user.role);

        if (user.role === 'tracker') {
          setLoadingTrackerProfile(true);
          try {
            const profile = await cycleService.getTrackerProfile(currentUser.uid);
            console.log('Tracker profile:', profile);
            setTrackerProfile(profile || null);
            
            if (profile && profile.lastPeriodDate) {
              console.log('Going to tracker-dashboard');
              setCurrentView('tracker-dashboard');
            } else {
              console.log('Going to tracker-onboarding');
              setCurrentView('tracker-onboarding');
            }
          } catch (err) {
            console.error('Error fetching tracker profile:', err);
            setTrackerProfile(null);
            setSessionRole(null);
            setCurrentView('auth');
          } finally {
            setLoadingTrackerProfile(false);
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

            if (!profile?.supportStyles?.length) {
              console.log('Going to partner-onboarding');
              setCurrentView('partner-onboarding');
            } else if (!profile?.linkedTrackerId) {
              // Manual Mode Partner: Also needs Cycle Basics onboarding
              const tProfile = await cycleService.getTrackerProfile(currentUser.uid);
              setTrackerProfile(tProfile || null);
              if (tProfile?.lastPeriodDate) {
                console.log('Manual Partner: Cycle Basics completed. Going to dashboard.');
                setCurrentView('partner-dashboard');
              } else {
                console.log('Manual Partner: Cycle Basics missing. Going to tracker-onboarding.');
                setCurrentView('tracker-onboarding');
              }
            } else {
              console.log('Going to partner-dashboard');
              setCurrentView('partner-dashboard');
            }
          } catch (err) {
            console.error('Error fetching partner profile:', err);
            setPartnerProfile(null);
            setSessionRole(null);
            setCurrentView('auth');
          } finally {
            setLoadingPartnerProfile(false);
          }
        }
      } catch (err) {
        console.error('Error initializing app:', err);
        setSessionRole(null);
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

  // Effect to refetch tracker profile after onboarding completion
  React.useEffect(() => {
    const refetchTrackerProfile = async () => {
      if (currentView === 'tracker-dashboard' && currentUser) {
        setLoadingTrackerProfile(true);
        try {
          const profile = await cycleService.getTrackerProfile(currentUser.uid);
          console.log('Refetched tracker profile:', profile);
          setTrackerProfile(profile || null);
        } catch (err) {
          console.error('Error refetching tracker profile:', err);
          setTrackerProfile(null);
        } finally {
          setLoadingTrackerProfile(false);
        }
      }
    };

    refetchTrackerProfile();
  }, [currentView, currentUser]);

  // Effect to listen for tracker profile changes in real-time
  React.useEffect(() => {
    if (currentUser) {
      const unsubscribe = cycleService.onTrackerProfileChange(currentUser.uid, (profile) => {
        console.log('Real-time tracker profile update:', profile);
        setTrackerProfile(profile || null);
        
        // If we're on tracker dashboard and profile has period date, stay on dashboard
        // If we're on tracker onboarding and profile has period date, switch to dashboard
        if (profile && profile.lastPeriodDate) {
          if (currentView === 'tracker-onboarding') {
            console.log('Profile updated with period date, switching to tracker-dashboard');
            setCurrentView('tracker-dashboard');
          }
        }
      });

      return () => {
        // Cleanup function - unsubscribe from real-time listener
        unsubscribe();
      };
    }
  }, [currentView, currentUser]);

  const handleLogout = async () => {
    await authService.logout();
    setSessionRole(null);
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
            <div className="flex items-center gap-2">
              <img src="/pwa-192x192.png" alt="Phase" className="w-6 h-6 rounded-md shadow-sm" />
              <h1 className="font-semibold text-slate-800 tracking-tight text-lg">Phase</h1>
            </div>
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

      {currentView === 'tracker-onboarding' && (
        <>
          {console.log('Rendering tracker onboarding with partnerCode:', trackerPartnerCode)}
          <TrackerOnboarding
            userId={currentUser!.uid}
            partnerCode={trackerPartnerCode}
            isPartner={sessionRole === 'partner'}
            onComplete={() => setCurrentView(sessionRole === 'partner' ? 'partner-dashboard' : 'tracker-dashboard')}
          />
        </>
      )}

      {currentView === 'partner-onboarding' && (
        <PartnerOnboarding
          userId={currentUser!.uid}
          onComplete={async () => {
            // After partner onboarding, check if they need tracker onboarding (Manual Mode)
            const profile = await cycleService.getPartnerProfile(currentUser!.uid);
            if (!profile?.linkedTrackerId) {
              const tProfile = await cycleService.getTrackerProfile(currentUser!.uid);
              if (!tProfile?.lastPeriodDate) {
                setCurrentView('tracker-onboarding');
                return;
              }
            }
            setCurrentView('partner-dashboard');
          }}
        />
      )}

      {(currentView === 'tracker-dashboard' || currentView === 'log-symptoms' || currentView === 'log-period') &&
        currentUser &&
        sessionRole === 'tracker' && (
        <>
          {loadingTrackerProfile ? (
            <div className="min-h-screen bg-earth-50 flex items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-3 border-sage-200 border-t-sage-500 rounded-full animate-spin" />
                <p className="text-earth-600 font-light">Loading tracker data...</p>
              </div>
            </div>
          ) : (
            <TrackerDashboard
              userId={currentUser.uid}
              partnerCode={trackerPartnerCode}
              onLogSymptoms={() => setCurrentView('log-symptoms')}
              onLogPeriod={() => setCurrentView('log-period')}
            />
          )}
          {currentView === 'log-symptoms' && (
            <LogSymptoms
              userId={currentUser.uid}
              onLogComplete={() => setCurrentView('tracker-dashboard')}
              onCancel={() => setCurrentView('tracker-dashboard')}
            />
          )}
          {currentView === 'log-period' && (
            <LogPeriod
              userId={currentUser.uid}
              trackerProfile={trackerProfile}
              onLogComplete={() => setCurrentView('tracker-dashboard')}
              onCancel={() => setCurrentView('tracker-dashboard')}
            />
          )}
        </>
      )}

      {(currentView === 'partner-dashboard' || currentView === 'log-symptoms' || currentView === 'log-period') &&
        currentUser &&
        partnerProfile !== null &&
        sessionRole === 'partner' && (
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
              userId={currentUser.uid}
              linkedTrackerId={partnerProfile?.linkedTrackerId || undefined}
              isManualMode={!partnerProfile?.linkedTrackerId}
              onLogSymptoms={() => setCurrentView('log-symptoms')}
              onLogPeriod={() => setCurrentView('log-period')}
            />
          )}
          {currentView === 'log-symptoms' && (
            <LogSymptoms
              userId={currentUser.uid}
              onLogComplete={() => setCurrentView('partner-dashboard')}
              onCancel={() => setCurrentView('partner-dashboard')}
            />
          )}
          {currentView === 'log-period' && (
            <LogPeriod
              userId={currentUser.uid}
              trackerProfile={trackerProfile}
              onLogComplete={() => setCurrentView('partner-dashboard')}
              onCancel={() => setCurrentView('partner-dashboard')}
            />
          )}
        </>
      )}
      <InstallPrompt />
      <ReloadPrompt />
    </div>
  );
}

export default App;
