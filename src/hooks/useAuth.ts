import { useState, useEffect } from 'react';
import { User } from '../types';
import { authService } from '../services/firebaseService';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChange(async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // Try to load Firestore profile first
          const userData = await authService.getCurrentUser();

          if (userData) {
            setUser(userData);
          } else {
            // Fallback: user doc doesn't exist yet — use Firebase auth info
            setUser({
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              role: 'user',          // safe default so UI updates immediately
              createdAt: new Date(), // placeholder; real value comes from Firestore when available
            });
          }
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return { user, loading };
};
