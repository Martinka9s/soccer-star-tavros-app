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
  /** Register user with team name; create users/{uid} with role 'user' */
  async register(email: string, password: string, teamName: string): Promise<User> {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const uid = cred.user.uid;

    const role: UserRole = 'user'; // default; promote manually in Console if needed

    await setDoc(
      doc(db, 'users', uid),
      {
        id: uid,
        email,
        role,
        teamName: teamName.trim(),
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );

    return {
      id: uid,
      email,
      role,
      teamName: teamName.trim(),
      createdAt: new Date(),
    };
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

    // 🔔 Fire notifications (best-effort, non-blocking)
    try {
      const b: any = bookingData;

      // SINGLE-TEAM booking (booked/approved immediately)
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

      // MATCH booking → notify both sides if userIds present
      const isMatch = Boolean(b.homeTeam && b.awayTeam);
      if (isMatch) {
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
    const qy = query(bookingsCollection, where('userId', '==', userId), orderBy('date', 'desc'));
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

  /** Get bookings where user is involved (as booker, by team name, or as team userId on a match) */
  async getBookingsByUserOrTeam(userId: string, teamName?: string): Promise<Booking[]> {
    // Direct user bookings
    const userQuery = query(bookingsCollection, where('userId', '==', userId), orderBy('date', 'desc'));

    // Participation via userId on matches
    const homeByUserId = query(bookingsCollection, where('homeTeamUserId', '==', userId), orderBy('date', 'desc'));
    const awayByUserId = query(bookingsCollection, where('awayTeamUserId', '==', userId), orderBy('date', 'desc'));

    // Optional team-name based participation
    const hasTeam = Boolean(teamName && teamName.trim());
    const homeByTeam = hasTeam
      ? query(bookingsCollection, where('homeTeam', '==', teamName!.trim()), orderBy('date', 'desc'))
      : null;
    const awayByTeam = hasTeam
      ? query(bookingsCollection, where('awayTeam', '==', teamName!.trim()), orderBy('date', 'desc'))
      : null;

    const snapshots = await Promise.all([
      getDocs(userQuery),
      getDocs(homeByUserId),
      getDocs(awayByUserId),
      ...(homeByTeam ? [getDocs(homeByTeam)] : []),
      ...(awayByTeam ? [getDocs(awayByTeam)] : []),
    ]);

    const allDocs = snapshots.flatMap((s) => s.docs);
    const all = allDocs.map((d) => ({
      id: d.id,
      ...(d.data() as any),
      createdAt: convertTimestamp((d.data() as any).createdAt),
      updatedAt: convertTimestamp((d.data() as any).updatedAt),
    })) as Booking[];

    // Deduplicate by ID
    const unique = Array.from(new Map(all.map((b) => [b.id, b])).values());

    // Sort by date desc (YYYY-MM-DD string)
    return unique.sort((a, b) => b.date.localeCompare(a.date));
  },

  /** Pseudo-realtime listener (poll) */
  listenBookingsByUserOrTeam(
    userId: string,
    teamName: string | undefined,
    callback: (bookings: Booking[]) => void
  ): () => void {
    const fetchAndNotify = async () => {
      try {
        const cleanTeamName = teamName && teamName.trim() ? teamName.trim() : undefined;
        const bookings = await this.getBookingsByUserOrTeam(userId, cleanTeamName);
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
    await updateDoc(bookingRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  },

  async deleteBooking(bookingId: string): Promise<void> {
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
