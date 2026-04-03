import { useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '../services/firebase';
import { authService } from '../services/auth';
import { User } from '../types';

export function useAuth() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        setCurrentUser(user);
        if (user) {
          const data = await authService.getUserData(user.uid);
          setUserData(data);
        } else {
          setUserData(null);
        }
      } catch (err) {
        setError('An error occurred during authentication. Please try again.');
        console.error('Authentication Error:', err);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  return { currentUser, userData, loading, error };
}
