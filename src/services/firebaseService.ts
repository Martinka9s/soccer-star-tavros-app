import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  type QueryDocumentSnapshot,
  type DocumentData,
} from 'firebase/firestore';
import { User, Booking, Notification, UserRole, PitchType } from '../types';
import { googleCalendarService } from './googleCalendarService';

// --- helpers -----------------------------------------------------------------
const clean = (v: unknown) => String(v ?? '').trim();

// Firebase configuration (trimmed to avoid stray whitespace/newlines)
const firebaseConfig = {
  apiKey: clean(import.meta.env.VITE_FIREBASE_API_KEY),
  authDomain: clean(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN),
  projectId: clean(import.meta.env.VITE_FIREBASE_PROJECT_ID),
  storageBucket: clean(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: clean(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID),
  appId: clean(import.meta.env.VITE_FIREBASE_APP_ID),
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
auth.useDeviceLanguage();

// ✅ Firestore with persistent local cache
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

// Collections
const bookingsCollection = collection(db, 'bookings');
const notificationsCollection = collection(db, 'notifications');
const usersCollection = collection(db, 'users');

// Helper: Firestore timestamp → Date
const convertTimestamp = (timestamp: any): Date => {
  if (timestamp instanceof Timestamp) return timestamp.toDate();
  return new Date(timestamp);
};

/** Ensures users/{uid} exists; returns normalized User */
async function ensureUserDoc(uid: string, email: string | null | undefined): Promise<User> {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    // Create a minimal profile with default role 'user'.
    const role: UserRole = 'user';

    await setDoc(
      ref,
      {
        id: uid,
        email: email || '',
        role,
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );

    return {
      id: uid,
      email: email || '',
      role,
      createdAt: new Date(),
    };
  }

  const data = snap.data();
  return {
    id: data.id,
    email: data.email,
    role: data.role,
    teamName: data.teamName,
    createdAt: convertTimestamp(data.createdAt),
    phoneNumber: data.phoneNumber,
  };
}

// --- AUTH SERVICE ------------------------------------------------------------

export const authService = {
  /** Register user WITHOUT team name - team registration is now optional via "Join Championship" */
  async register(email: string, password: string): Promise<User> {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const uid = cred.user.uid;

    const role: UserRole = 'user'; // default; promote manually in Console if needed

    await setDoc(
      doc(db, 'users', uid),
      {
        id: uid,
        email,
        role,
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );

    try {
      return await ensureUserDoc(cred.user.uid, cred.user.email || email);
    } catch (e) {
      console.warn('Firestore unavailable during registration; using provisional user', e);
      return {
        id: cred.user.uid,
        email: cred.user.email || email,
        role: 'user',
        createdAt: new Date(),
      };
    }
  },

  /** Login + ensure/fetch profile; if Firestore fails, return provisional user */
  async login(email: string, password: string): Promise<User> {
    console.log('TRY LOGIN', email);
    const cred = await signInWithEmailAndPassword(auth, email, password);
    console.log('LOGIN OK', cred.user.uid);

    try {
      return await ensureUserDoc(cred.user.uid, cred.user.email || email);
    } catch (e) {
      console.warn('Firestore unavailable during login; using provisional user', e);
      return {
        id: cred.user.uid,
        email: cred.user.email || email,
        role: 'user',
        createdAt: new Date(),
      };
    }
  },

  async logout(): Promise<void> {
    await signOut(auth);
  },

  /** Current user from auth; if Firestore fails, return provisional user */
  async getCurrentUser(): Promise<User | null> {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return null;

    try {
      return await ensureUserDoc(firebaseUser.uid, firebaseUser.email);
    } catch (e) {
      console.warn('Firestore unavailable in getCurrentUser; using provisional user', e);
      return {
        id: firebaseUser.uid,
        email: firebaseUser.email || '',
        role: 'user',
        createdAt: new Date(),
      };
    }
  },

  onAuthStateChange(callback: (user: FirebaseUser | null) => void) {
    return onAuthStateChanged(auth, callback);
  },

  /** Forgot password */
  async sendReset(email: string) {
    await sendPasswordResetEmail(auth, email);
  },
};

// --- USER SERVICE ------------------------------------------------------------

export const userService = {
  /** Get all teams (for admin dropdown) */
  async getAllTeams(): Promise<{ userId: string; teamName: string; email: string }[]> {
    const q = query(usersCollection, where('teamName', '!=', ''));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        userId: doc.id,
        teamName: data.teamName || '',
        email: data.email || '',
      };
    });
  },

  /** Get user by team name */
  async getUserByTeamName(teamName: string): Promise<User | null> {
    const q = query(usersCollection, where('teamName', '==', teamName.trim()));
    const snapshot = await getDocs(q);

    if (snapshot.empty) return null;

    const docSnap = snapshot.docs[0];
    const data = docSnap.data();
    return {
      id: docSnap.id,
      email: data.email,
      role: data.role,
      teamName: data.teamName,
      phoneNumber: data.phoneNumber,
      createdAt: convertTimestamp(data.createdAt),
    };
  },
};

// --- BOOKINGS ----------------------------------------------------------------

export const bookingService = {
  async createBooking(
    bookingData: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    const docRef = await addDoc(bookingsCollection, {
      ...bookingData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // ✅ Google Calendar Integration: Create event if connected
    try {
      const booking: Booking = {
        id: docRef.id,
        ...bookingData,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Booking;
      
      const calendarEventId = await googleCalendarService.createEvent(booking);
      
      // Store calendar event ID for future updates/deletes
      if (calendarEventId) {
        await updateDoc(docRef, { calendarEventId });
      }
    } catch (e) {
      console.warn('Google Calendar sync failed (non-blocking):', e);
    }

    // ✅ Send notifications
    try {
      // For match between two teams
      if (bookingData.homeTeam && bookingData.awayTeam && 
          bookingData.homeTeamUserId && bookingData.awayTeamUserId) {
        
        await notificationService.notifyMatchTeams(
          bookingData.homeTeamUserId,
          bookingData.awayTeamUserId,
          bookingData.homeTeam,
          bookingData.awayTeam,
          bookingData.date,
          bookingData.startTime,
          bookingData.pitchType,
          docRef.id
        );
      }
      // For single team training/booking
      else if (bookingData.userId && bookingData.teamName) {
        await notificationService.notifyTeamBooking(
          bookingData.userId,
          bookingData.teamName,
          'single',
          bookingData.date,
          bookingData.startTime,
          bookingData.pitchType,
          undefined,
          docRef.id
        );
      }
    } catch (e) {
      console.warn('Notification send failed (non-blocking):', e);
    }

    return docRef.id;
  },

  async getBookingsByDate(date: string): Promise<Booking[]> {
    const qy = query(bookingsCollection, where('date', '==', date));
    const snapshot = await getDocs(qy);

    return snapshot.docs.map(
      (d: QueryDocumentSnapshot<DocumentData>) =>
        ({
          id: d.id,
          ...d.data(),
          createdAt: convertTimestamp((d.data() as any).createdAt),
          updatedAt: convertTimestamp((d.data() as any).updatedAt),
        } as Booking)
    );
  },

  async getBookingsByUser(userId: string): Promise<Booking[]> {
    const qy = query(
      bookingsCollection,
      where('userId', '==', userId),
      orderBy('date', 'desc')
    );
    const snapshot = await getDocs(qy);

    return snapshot.docs.map(
      (d: QueryDocumentSnapshot<DocumentData>) =>
        ({
          id: d.id,
          ...d.data(),
          createdAt: convertTimestamp((d.data() as any).createdAt),
          updatedAt: convertTimestamp((d.data() as any).updatedAt),
        } as Booking)
    );
  },

  /** Get bookings where user is involved (either as single user or as one of the teams) */
  async getBookingsByUserOrTeam(userId: string, teamName?: string): Promise<Booking[]> {
    // Get bookings where user is the single booker
    const userQuery = query(
      bookingsCollection,
      where('userId', '==', userId),
      orderBy('date', 'desc')
    );
    const userSnapshot = await getDocs(userQuery);
    const userBookings = userSnapshot.docs.map(
      (d: QueryDocumentSnapshot<DocumentData>) =>
        ({
          id: d.id,
          ...d.data(),
          createdAt: convertTimestamp((d.data() as any).createdAt),
          updatedAt: convertTimestamp((d.data() as any).updatedAt),
        } as Booking)
    );

    // ✅ FIX: Only query by team if teamName exists and is not empty
    if (teamName && teamName.trim()) {
      try {
        const homeTeamQuery = query(
          bookingsCollection,
          where('homeTeam', '==', teamName),
          orderBy('date', 'desc')
        );
        const awayTeamQuery = query(
          bookingsCollection,
          where('awayTeam', '==', teamName),
          orderBy('date', 'desc')
        );

        const [homeSnapshot, awaySnapshot] = await Promise.all([
          getDocs(homeTeamQuery),
          getDocs(awayTeamQuery),
        ]);

        const homeBookings = homeSnapshot.docs.map(
          (d: QueryDocumentSnapshot<DocumentData>) =>
            ({
              id: d.id,
              ...d.data(),
              createdAt: convertTimestamp((d.data() as any).createdAt),
              updatedAt: convertTimestamp((d.data() as any).updatedAt),
            } as Booking)
        );

        const awayBookings = awaySnapshot.docs.map(
          (d: QueryDocumentSnapshot<DocumentData>) =>
            ({
              id: d.id,
              ...d.data(),
              createdAt: convertTimestamp((d.data() as any).createdAt),
              updatedAt: convertTimestamp((d.data() as any).updatedAt),
            } as Booking)
        );

        // Combine and deduplicate
        const allBookings = [...userBookings, ...homeBookings, ...awayBookings];
        const uniqueBookings = Array.from(
          new Map(allBookings.map((b) => [b.id, b])).values()
        );

        // Sort by date descending
        return uniqueBookings.sort((a, b) => b.date.localeCompare(a.date));
      } catch (error) {
        console.error('Error fetching team bookings (falling back to user bookings only):', error);
        // If team queries fail (e.g., missing index), just return user bookings
        return userBookings;
      }
    }

    // If no teamName, just return user bookings
    return userBookings;
  },

  /** Realtime listener for user bookings (for regular users and admin personal bookings) */
  listenBookingsByUserOrTeam(
    userId: string,
    teamName: string | undefined,
    callback: (bookings: Booking[]) => void
  ): () => void {
    // For simplicity, we'll poll every 5 seconds
    // A true realtime solution would use onSnapshot
    const fetchAndNotify = async () => {
      try {
        // ✅ FIX: Only pass teamName if it exists and is not empty
        const cleanTeamName = teamName && teamName.trim() ? teamName.trim() : undefined;
        const bookings = await this.getBookingsByUserOrTeam(userId, cleanTeamName);
        callback(bookings);
      } catch (error) {
        console.error('Error in listener:', error);
        // ✅ FIX: Don't let errors stop the UI - pass empty array instead
        callback([]);
      }
    };

    fetchAndNotify();
    const interval = setInterval(fetchAndNotify, 5000);

    return () => clearInterval(interval);
  },

  /** Get ALL bookings in a date range (for admin) */
  async getAllBookingsInRange(startDate: string, endDate: string): Promise<Booking[]> {
    const qy = query(
      bookingsCollection,
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      orderBy('date', 'desc')
    );
    const snapshot = await getDocs(qy);

    return snapshot.docs.map(
      (d: QueryDocumentSnapshot<DocumentData>) =>
        ({
          id: d.id,
          ...d.data(),
          createdAt: convertTimestamp((d.data() as any).createdAt),
          updatedAt: convertTimestamp((d.data() as any).updatedAt),
        } as Booking)
    );
  },

  async getPendingBookings(): Promise<Booking[]> {
    const qy = query(
      bookingsCollection,
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(qy);

    return snapshot.docs.map(
      (d: QueryDocumentSnapshot<DocumentData>) =>
        ({
          id: d.id,
          ...d.data(),
          createdAt: convertTimestamp((d.data() as any).createdAt),
          updatedAt: convertTimestamp((d.data() as any).updatedAt),
        } as Booking)
    );
  },

  async updateBooking(bookingId: string, updates: Partial<Booking>): Promise<void> {
    const bookingRef = doc(db, 'bookings', bookingId);
    
    // ✅ Google Calendar Integration: Get current booking to find calendar event ID
    try {
      const currentBooking = await this.getBooking(bookingId);
      
      if (currentBooking && (currentBooking as any).calendarEventId) {
        // Update the calendar event
        const updatedBooking = { ...currentBooking, ...updates } as Booking;
        await googleCalendarService.updateEvent((currentBooking as any).calendarEventId, updatedBooking);
      }
    } catch (e) {
      console.warn('Google Calendar update failed (non-blocking):', e);
    }
    
    await updateDoc(bookingRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  },

  async deleteBooking(bookingId: string): Promise<void> {
    // ✅ Google Calendar Integration: Delete calendar event before deleting booking
    try {
      const booking = await this.getBooking(bookingId);
      
      if (booking && (booking as any).calendarEventId) {
        await googleCalendarService.deleteEvent((booking as any).calendarEventId);
      }
    } catch (e) {
      console.warn('Google Calendar delete failed (non-blocking):', e);
    }
    
    const bookingRef = doc(db, 'bookings', bookingId);
    await deleteDoc(bookingRef);
  },

  async getBooking(bookingId: string): Promise<Booking | null> {
    const bookingRef = doc(db, 'bookings', bookingId);
    const bookingDoc = await getDoc(bookingRef);

    if (bookingDoc.exists()) {
      const data = bookingDoc.data() as any;
      return {
        id: bookingDoc.id,
        ...data,
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt),
      } as Booking;
    }

    return null;
  },
};

// --- NOTIFICATIONS -----------------------------------------------------------

export const notificationService = {
  async createNotification(
    userId: string,
    type: 'approved' | 'rejected' | 'cancelled',
    bookingId: string,
    pitchType: PitchType,
    date: string,
    startTime: string,
    message: string
  ): Promise<void> {
    await addDoc(notificationsCollection, {
      userId,
      type,
      bookingId,
      pitchType,
      date,
      startTime,
      message,
      read: false,
      createdAt: serverTimestamp(),
    });
  },

  /** Create notification for match between two teams */
  async createMatchNotification(
    userId: string,
    bookingId: string,
    pitchType: PitchType,
    date: string,
    startTime: string,
    homeTeam: string,
    awayTeam: string,
    isHomeTeam: boolean
  ): Promise<void> {
    const userTeam = isHomeTeam ? homeTeam : awayTeam;
    const opponent = isHomeTeam ? awayTeam : homeTeam;
    const message = `Match scheduled: ${userTeam} vs ${opponent} on ${date} at ${startTime} (${pitchType})`;

    await addDoc(notificationsCollection, {
      userId,
      type: 'match_scheduled',
      bookingId,
      pitchType,
      date,
      startTime,
      message,
      read: false,
      createdAt: serverTimestamp(),
    });
  },

  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    const qy = query(
      notificationsCollection,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(qy);

    return snapshot.docs.map(
      (d: QueryDocumentSnapshot<DocumentData>) =>
        ({
          id: d.id,
          ...d.data(),
          createdAt: convertTimestamp((d.data() as any).createdAt),
        } as Notification)
    );
  },

  async markAsRead(notificationId: string): Promise<void> {
    const notificationRef = doc(db, 'notifications', notificationId);
    await updateDoc(notificationRef, { read: true });
  },

  async markAllAsRead(userId: string): Promise<void> {
    const qy = query(
      notificationsCollection,
      where('userId', '==', userId),
      where('read', '==', false)
    );
    const snapshot = await getDocs(qy);
    const updatePromises = snapshot.docs.map((d: QueryDocumentSnapshot<DocumentData>) =>
      updateDoc(d.ref, { read: true })
    );
    await Promise.all(updatePromises);
  },

  getUnreadCount(notifications: Notification[]): number {
    return notifications.filter((n) => !n.read).length;
  },

  // ✅ NEW FUNCTIONS:
  
  async notifyTeamBooking(
    userId: string,
    teamName: string,
    bookingType: 'match' | 'single',
    date: string,
    startTime: string,
    pitchType: string,
    opponentName?: string,
    bookingId?: string
  ): Promise<void> {
    try {
      let message = '';

      if (bookingType === 'match' && opponentName) {
        message = `Match scheduled: ${teamName} vs ${opponentName} on ${date} at ${startTime} (${pitchType})`;
      } else {
        message = `Training session booked for ${teamName} on ${date} at ${startTime} (${pitchType})`;
      }

      await addDoc(notificationsCollection, {
        userId,
        type: 'booking',
        bookingId,
        pitchType,
        date,
        startTime,
        message,
        read: false,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error sending team booking notification:', error);
    }
  },

  async notifyMatchTeams(
    homeTeamUserId: string,
    awayTeamUserId: string,
    homeTeamName: string,
    awayTeamName: string,
    date: string,
    startTime: string,
    pitchType: string,
    bookingId: string
  ): Promise<void> {
    try {
      await this.notifyTeamBooking(
        homeTeamUserId,
        homeTeamName,
        'match',
        date,
        startTime,
        pitchType,
        awayTeamName,
        bookingId
      );

      await this.notifyTeamBooking(
        awayTeamUserId,
        awayTeamName,
        'match',
        date,
        startTime,
        pitchType,
        homeTeamName,
        bookingId
      );
    } catch (error) {
      console.error('Error sending match notifications:', error);
    }
  },

  async notifyTeamApproval(
    userId: string,
    teamName: string,
    championship: string
  ): Promise<void> {
    try {
      const message = `Congratulations! Your team "${teamName}" has been approved and assigned to ${championship}.`;

      await addDoc(notificationsCollection, {
        userId,
        type: 'team_approved',
        message,
        read: false,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error sending team approval notification:', error);
    }
  },
};

export * from './teamService';
export * from './recurringBookingService';
