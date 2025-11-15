// src/hooks/useAuth.ts
import { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { authService } from '../services/firebaseService';

// 👑 Put your admin login email here (the one you use to log into the app)
const ADMIN_EMAILS = [
  'soccerstartavros@gmail.com',
];

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChange(async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // Try to load Firestore profile first
          const userData = await authService.getCurrentUser();

          // Figure out the best email we have
          const emailFromAuth = firebaseUser.email || '';
          const emailFromProfile = userData?.email || '';
          const finalEmail = (emailFromProfile || emailFromAuth).toLowerCase();

          // Is this email in our hard-coded admin list?
          const isAdminEmail = ADMIN_EMAILS
            .map((e) => e.toLowerCase())
            .includes(finalEmail);

          // Normalise role
          let finalRole: UserRole = 'user';

          if (isAdminEmail) {
            finalRole = 'admin';
          } else if (userData?.role === 'admin') {
            finalRole = 'admin';
          } else {
            finalRole = 'user';
          }

          if (userData) {
            // Use Firestore profile + our safe role + safe email
            const finalUser: User = {
              ...userData,
              email: finalEmail || userData.email || emailFromAuth,
              role: finalRole,
            };

            console.log('[useAuth] Loaded user from Firestore:', finalUser);
            setUser(finalUser);
          } else {
            // Fallback: user doc doesn't exist yet — use Firebase auth info
            const fallbackUser: User = {
              id: firebaseUser.uid,
              email: finalEmail || emailFromAuth,
              role: finalRole,
              createdAt: new Date(), // placeholder; real value comes from Firestore when available
            };

            console.log('[useAuth] Using fallback user:', fallbackUser);
            setUser(fallbackUser);
          }
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('Error fetching user data in useAuth:', err);

        // In case of error we still try to keep a basic auth user if available
        const fbUser = authService ? authService['auth']?.currentUser : null;

        if (fbUser) {
          const email = (fbUser.email || '').toLowerCase();
          const isAdminEmail = ADMIN_EMAILS
            .map((e) => e.toLowerCase())
            .includes(email);

          const fallbackUser: User = {
            id: fbUser.uid,
            email: email,
            role: isAdminEmail ? 'admin' : 'user',
            createdAt: new Date(),
          };

          setUser(fallbackUser);
        } else {
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return { user, loading };
};
