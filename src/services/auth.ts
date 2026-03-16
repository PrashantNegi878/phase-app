import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  signInWithPopup,
  GoogleAuthProvider,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { User, TrackerProfile, PartnerProfile } from '../types';
import { generatePartnerCode } from '../utils/codeGenerator';
import { getToday } from '../utils/dateUtils';

export const authService = {
  // Sign up with role selection
  async signup(email: string, password: string, role: 'tracker' | 'partner'): Promise<User> {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    const partnerCode = role === 'tracker' ? generatePartnerCode() : undefined;

    // Create user document
    const userData: User = {
      uid: firebaseUser.uid,
      email,
      role,
      ...(partnerCode && { partnerCode }), // Only include partnerCode if it exists
      createdAt: getToday(),
    };

    await setDoc(doc(db, 'users', firebaseUser.uid), userData);

    // Create role-specific profile
    if (role === 'tracker') {
      const trackerProfile: TrackerProfile = {
        userId: firebaseUser.uid,
        partnerCode: partnerCode!,
        trackedSymptoms: [],
        lastPeriodDate: null,
        nextPeriodDate: null,
        cycleLengthDays: 28, // Default 28-day cycle
        createdAt: getToday(),
        updatedAt: getToday(),
      };
      await setDoc(doc(db, 'trackerProfiles', firebaseUser.uid), trackerProfile);

      // Write to partnerCodes lookup collection so partners can find this tracker
      // This collection only stores { trackerId } — no personal data exposed
      await setDoc(doc(db, 'partnerCodes', partnerCode!), {
        trackerId: firebaseUser.uid,
        createdAt: getToday(),
      });
    } else {
      // Partner in manual mode also needs a trackerProfile to log symptoms
      const trackerProfile: TrackerProfile = {
        userId: firebaseUser.uid,
        partnerCode: '', // No partner code for manual mode
        trackedSymptoms: ['cervical-fluid', 'bbt', 'cramps', 'mood'], // All symptoms available
        lastPeriodDate: null,
        nextPeriodDate: null,
        cycleLengthDays: 28, // Default 28-day cycle
        createdAt: getToday(),
        updatedAt: getToday(),
      };
      await setDoc(doc(db, 'trackerProfiles', firebaseUser.uid), trackerProfile);

      const partnerProfile: PartnerProfile = {
        userId: firebaseUser.uid,
        createdAt: getToday(),
        updatedAt: getToday(),
      };
      await setDoc(doc(db, 'partnerProfiles', firebaseUser.uid), partnerProfile);
    }

    return userData;
  },

  // Login
  async login(email: string, password: string): Promise<FirebaseUser> {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  },

  // Logout
  async logout(): Promise<void> {
    await signOut(auth);
  },

  // Get current user
  getCurrentUser(): Promise<FirebaseUser | null> {
    return new Promise((resolve, reject) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe();
        resolve(user);
      }, reject);
    });
  },

  // Link Partner to Tracker via code
  // Uses the partnerCodes lookup collection — no broad user queries needed
  async linkPartnerToTracker(partnerId: string, trackerCode: string): Promise<void> {
    // Look up the tracker ID from the partnerCodes collection
    // This is a direct document read (not a query), so it works with strict security rules
    const partnerCodeRef = doc(db, 'partnerCodes', trackerCode);
    const partnerCodeSnap = await getDoc(partnerCodeRef);

    if (!partnerCodeSnap.exists()) {
      throw new Error('No tracker found with this code. Please check and try again.');
    }

    const trackerId = partnerCodeSnap.data().trackerId as string;

    if (!trackerId) {
      throw new Error('Invalid partner code data. Please try again.');
    }

    // Ensure partner profile exists first
    const partnerDocRef = doc(db, 'partnerProfiles', partnerId);
    const partnerDocSnap = await getDoc(partnerDocRef);

    if (!partnerDocSnap.exists()) {
      // Create partner profile if it doesn't exist
      await setDoc(partnerDocRef, {
        userId: partnerId,
        linkedTrackerId: trackerId,
        createdAt: getToday(),
        updatedAt: getToday(),
      });
    } else {
      // Update existing profile
      await setDoc(partnerDocRef, { linkedTrackerId: trackerId, updatedAt: getToday() }, { merge: true });
    }
  },

  // Get user data
  async getUserData(uid: string): Promise<User | null> {
    const docSnap = await getDoc(doc(db, 'users', uid));
    return docSnap.exists() ? (docSnap.data() as User) : null;
  },

  // Get tracker profile
  async getTrackerProfile(uid: string): Promise<TrackerProfile | null> {
    const docSnap = await getDoc(doc(db, 'trackerProfiles', uid));
    return docSnap.exists() ? (docSnap.data() as TrackerProfile) : null;
  },

  // Get partner profile
  async getPartnerProfile(uid: string): Promise<PartnerProfile | null> {
    const docSnap = await getDoc(doc(db, 'partnerProfiles', uid));
    return docSnap.exists() ? (docSnap.data() as PartnerProfile) : null;
  },

  // Google Sign-In
  async signInWithGoogle(role: 'tracker' | 'partner'): Promise<FirebaseUser> {
    const provider = new GoogleAuthProvider();
    
    try {
      const userCredential = await signInWithPopup(auth, provider);
      const firebaseUser = userCredential.user;

      // Check if user exists in Firestore, if not create new document
      await this.createUserIfNotExists(firebaseUser, role);
      
      return firebaseUser;
    } catch (error: any) {
      console.error('Google Sign-In error:', error);
      
      if (error.code === 'auth/popup-blocked') {
        throw new Error('Popup was blocked by browser. Please allow popups for this site and try again.');
      } else if (error.code === 'auth/unauthorized-domain') {
        throw new Error('Google Sign-In is not configured for this domain. Please contact support.');
      } else if (error.code === 'auth/operation-not-allowed') {
        throw new Error('Google Sign-In is not enabled in Firebase Console. Please contact support.');
      } else {
        throw new Error(error.message || 'Google Sign-In failed. Please try again.');
      }
    }
  },

  // Magic Link Sign-In
  async sendMagicLink(email: string, role: 'tracker' | 'partner'): Promise<void> {
    const actionCodeSettings = {
      url: window.location.href,
      handleCodeInApp: true,
    };

    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    
    // Store email and role in localStorage for when they return from email
    localStorage.setItem('emailForSignIn', email);
    localStorage.setItem('roleForSignIn', role);
  },

  // Handle Magic Link callback
  async handleMagicLinkSignIn(): Promise<FirebaseUser | null> {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      const email = localStorage.getItem('emailForSignIn');
      const role = localStorage.getItem('roleForSignIn') as 'tracker' | 'partner';

      if (!email) {
        throw new Error('Email not found in localStorage');
      }

      const userCredential = await signInWithEmailLink(auth, email, window.location.href);
      const firebaseUser = userCredential.user;

      // Check if user exists in Firestore, if not create new document
      await this.createUserIfNotExists(firebaseUser, role);

      // Clear localStorage
      localStorage.removeItem('emailForSignIn');
      localStorage.removeItem('roleForSignIn');

      return firebaseUser;
    }
    return null;
  },

  // Helper method to create user if not exists
  async createUserIfNotExists(firebaseUser: FirebaseUser, role: 'tracker' | 'partner'): Promise<void> {
    const userDocRef = doc(db, 'users', firebaseUser.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
      const partnerCode = role === 'tracker' ? generatePartnerCode() : undefined;

      // Create user document
      const userData: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        role,
        ...(partnerCode && { partnerCode }),
        createdAt: getToday(),
      };

      await setDoc(userDocRef, userData);

      // Create role-specific profile
      if (role === 'tracker') {
        const trackerProfile: TrackerProfile = {
          userId: firebaseUser.uid,
          partnerCode: partnerCode!,
          trackedSymptoms: [],
          lastPeriodDate: null,
          nextPeriodDate: null,
          cycleLengthDays: 28,
          createdAt: getToday(),
          updatedAt: getToday(),
        };
        await setDoc(doc(db, 'trackerProfiles', firebaseUser.uid), trackerProfile);

        // Write to partnerCodes lookup collection
        await setDoc(doc(db, 'partnerCodes', partnerCode!), {
          trackerId: firebaseUser.uid,
          createdAt: getToday(),
        });
      } else {
        // Partner in manual mode also needs a trackerProfile to log symptoms
        const trackerProfile: TrackerProfile = {
          userId: firebaseUser.uid,
          partnerCode: '',
          trackedSymptoms: ['cervical-fluid', 'bbt', 'cramps', 'mood'],
          lastPeriodDate: null,
          nextPeriodDate: null,
          cycleLengthDays: 28,
          createdAt: getToday(),
          updatedAt: getToday(),
        };
        await setDoc(doc(db, 'trackerProfiles', firebaseUser.uid), trackerProfile);

        const partnerProfile: PartnerProfile = {
          userId: firebaseUser.uid,
          createdAt: getToday(),
          updatedAt: getToday(),
        };
        await setDoc(doc(db, 'partnerProfiles', firebaseUser.uid), partnerProfile);
      }
    }
  },
};
