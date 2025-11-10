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

// --- helpers -----------------------------------------------------------------
const clean = (v: unknown) => String(v ?? '').trim();

const firebaseConfig = {
  apiKey: clean(import.meta.env.VITE_FIREBASE_API_KEY),
  authDomain: clean(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN),
  projectId: clean(import.meta.env.VITE_FIREBASE_PROJECT_ID),
  storageBucket: clean(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: clean(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID),
  appId: clean(import.meta.env.VITE_FIREBASE_APP_ID),
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
auth.useDeviceLanguage();

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

/** Ensure users/{uid} exists and return normalized User */
async function ensureUserDoc(uid: string, email: string | null | undefined): Promise<User> {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
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

    return { id: uid, email: email || '', role, createdAt: new Date() };
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

// --- AUTH --------------------------------------------------------------------

export const authService = {
  async register(email: string, password: string, teamName: string): Promise<User> {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const uid = cred.user.uid;

    const role: UserRole = 'user';
    await setDoc(
      doc(db, 'users', uid),
      { id: uid, email, role, teamName: teamName.trim(), createdAt: serverTimestamp() },
      { merge: true }
    );

    return { id: uid, email, role, teamName: teamName.trim(), createdAt: new Date() };
  },

  async login(email: string, password: string): Promise<User> {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    try {
      return await ensureUserDoc(cred.user.uid, cred.user.email || email);
    } catch {
      return { id: cred.user.uid, email: cred.user.email || email, role: 'user', createdAt: new Date() };
    }
  },

  async logout(): Promise<void> {
    await signOut(auth);
  },

  async getCurrentUser(): Promise<User | null> {
    const u = auth.currentUser;
    if (!u) return null;
    try {
      return await ensureUserDoc(u.uid, u.email);
    } catch {
      return { id: u.uid, email: u.email || '', role: 'user', createdAt: new Date() };
    }
  },

  onAuthStateChange(callback: (user: FirebaseUser | null) => void) {
    return onAuthStateChanged(auth, callback);
  },

  async sendReset(email: string) {
    await sendPasswordResetEmail(auth, email);
  },
};

// --- USERS -------------------------------------------------------------------

export const userService = {
  async getAllTeams(): Promise<{ userId: string; teamName: string; email: string }[]> {
    const q = query(usersCollection, where('teamName', '!=', ''));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return { userId: doc.id, teamName: data.teamName || '', email: data.email || '' };
    });
  },

  async getUserByTeamName(teamName: string) {
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
    } as User;
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

    // Notifications (best-effort, non-blocking)
    try {
      const b: any = bookingData;

      // Single team booking → notify if instantly booked
      if (b.userId && b.status === 'booked') {
        await notificationService.createNotification(
          b.userId,
          'approved',
          docRef.id,
          b.pitchType,
          b.date,
          b.startTime,
          `Your booking on ${b.date} at ${b.startTime} (${b.pitchType}) has been approved.`
        );
      }

      // Match booking → notify both sides if userIds present
      if (b.homeTeam && b.awayTeam) {
        if (b.homeTeamUserId) {
          await notificationService.createMatchNotification(
            b.homeTeamUserId,
            docRef.id,
            b.pitchType,
            b.date,
            b.startTime,
            b.homeTeam,
            b.awayTeam,
            true
          );
        }
        if (b.awayTeamUserId) {
          await notificationService.createMatchNotification(
            b.awayTeamUserId,
            docRef.id,
            b.pitchType,
            b.date,
            b.startTime,
            b.homeTeam,
            b.awayTeam,
            false
          );
        }
      }
    } catch (e) {
      console.warn('createBooking: notifications failed (non-blocking):', e);
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
    const qy = query(bookingsCollection, where('userId', '==', userId));
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

  /**
   * Get bookings where user is involved:
   * - direct user booking: userId == current user
   * - team participation by NAME: teamName == user's teamName
   * - match participation by NAME: homeTeam/awayTeam == user's teamName
   * - match participation by ID: homeTeamUserId/awayTeamUserId == userId
   * - guest bookings by phone: phoneNumber == user's phoneNumber
   *
   * NOTE: No orderBy in queries → no composite indexes required; sort client-side
   */
  async getBookingsByUserOrTeam(
    userId: string,
    teamName?: string,
    phoneNumber?: string
  ): Promise<Booking[]> {
    const queries = [
      query(bookingsCollection, where('userId', '==', userId)),
      query(bookingsCollection, where('homeTeamUserId', '==', userId)),
      query(bookingsCollection, where('awayTeamUserId', '==', userId)),
    ];

    if (teamName && teamName.trim()) {
      const tn = teamName.trim();
      queries.push(
        query(bookingsCollection, where('teamName', '==', tn)), // single-team admin bookings
        query(bookingsCollection, where('homeTeam', '==', tn)),
        query(bookingsCollection, where('awayTeam', '==', tn))
      );
    }

    if (phoneNumber && phoneNumber.trim()) {
      queries.push(query(bookingsCollection, where('phoneNumber', '==', phoneNumber.trim())));
    }

    // Run all, tolerate failures
    const results: Booking[] = [];
    await Promise.all(
      queries.map(async (qy) => {
        try {
          const snap = await getDocs(qy);
          snap.docs.forEach((d) => {
            results.push({
              id: d.id,
              ...(d.data() as any),
              createdAt: convertTimestamp((d.data() as any).createdAt),
              updatedAt: convertTimestamp((d.data() as any).updatedAt),
            } as Booking);
          });
        } catch (err) {
          console.warn('getBookingsByUserOrTeam: query failed (continuing):', err);
        }
      })
    );

    // Deduplicate by id & sort by date desc, then startTime asc
    const map = new Map(results.map((b) => [b.id, b]));
    const unique = Array.from(map.values());
    unique.sort((a, b) => {
      const byDate = b.date.localeCompare(a.date);
      if (byDate !== 0) return byDate;
      return (a.startTime || '').localeCompare(b.startTime || '');
    });
    return unique;
  },

  /** Poll-based listener */
  listenBookingsByUserOrTeam(
    userId: string,
    teamName: string | undefined,
    callback: (bookings: Booking[]) => void,
    phoneNumber?: string
  ): () => void {
    const fetchAndNotify = async () => {
      try {
        const cleanTeam = teamName && teamName.trim() ? teamName.trim() : undefined;
        const cleanPhone = phoneNumber && phoneNumber.trim() ? phoneNumber.trim() : undefined;
        const bookings = await this.getBookingsByUserOrTeam(userId, cleanTeam, cleanPhone);
        callback(bookings);
      } catch (error) {
        console.error('Error in listener:', error);
        callback([]);
      }
    };

    fetchAndNotify();
    const interval = setInterval(fetchAndNotify, 5000);
    return () => clearInterval(interval);
  },

  /** Admin: date range */
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
    const qy = query(bookingsCollection, where('status', '==', 'pending'), orderBy('createdAt', 'desc'));
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
    await updateDoc(bookingRef, { ...updates, updatedAt: serverTimestamp() });
  },

  async deleteBooking(bookingId: string): Promise<void> {
    const bookingRef = doc(db, 'bookings', bookingId);
    await deleteDoc(bookingRef);
  },

  async getBooking(bookingId: string): Promise<Booking | null> {
    const bookingRef = doc(db, 'bookings', bookingId);
    const bookingDoc = await getDoc(bookingRef);
    if (!bookingDoc.exists()) return null;

    const data = bookingDoc.data() as any;
    return {
      id: bookingDoc.id,
      ...data,
      createdAt: convertTimestamp(data.createdAt),
      updatedAt: convertTimestamp(data.updatedAt),
    } as Booking;
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
    const qy = query(notificationsCollection, where('userId', '==', userId), orderBy('createdAt', 'desc'));
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
    const qy = query(notificationsCollection, where('userId', '==', userId), where('read', '==', false));
    const snapshot = await getDocs(qy);
    const updatePromises = snapshot.docs.map((d: QueryDocumentSnapshot<DocumentData>) =>
      updateDoc(d.ref, { read: true })
    );
    await Promise.all(updatePromises);
  },

  getUnreadCount(notifications: Notification[]): number {
    return notifications.filter((n) => !n.read).length;
  },
};
