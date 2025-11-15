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
// ⭐ NEW: teams collection for standings updates
const teamsCollection = collection(db, 'teams');

// Helper: Firestore timestamp → Date
const convertTimestamp = (timestamp: any): Date => {
  if (timestamp instanceof Timestamp) return timestamp.toDate();
  return new Date(timestamp);
};

// ⭐ NEW: STANDINGS HELPERS ----------------------------------------------------

const defaultStats = {
  points: 0,
  played: 0,
  wins: 0,
  draws: 0,
  losses: 0,
  goalsFor: 0,
  goalsAgainst: 0,
  goalDifference: 0,
};

function ensureStats(stats: any | undefined) {
  return {
    ...defaultStats,
    ...(stats || {}),
  };
}

async function getTeamDocByName(teamName: string) {
  const qy = query(teamsCollection, where('name', '==', teamName));
  const snapshot = await getDocs(qy);
  if (snapshot.empty) return null;
  const docSnap = snapshot.docs[0];
  return { ref: docSnap.ref, data: docSnap.data() as any };
}

function applyResultToStats(
  stats: any,
  goalsFor: number,
  goalsAgainst: number,
  direction: 1 | -1
) {
  const s = ensureStats(stats);

  const played = (s.played || 0) + direction * 1;
  const gf = (s.goalsFor || 0) + direction * goalsFor;
  const ga = (s.goalsAgainst || 0) + direction * goalsAgainst;

  let wins = s.wins || 0;
  let draws = s.draws || 0;
  let losses = s.losses || 0;
  let points = s.points || 0;

  if (goalsFor > goalsAgainst) {
    wins += direction * 1;
    points += direction * 3;
  } else if (goalsFor === goalsAgainst) {
    draws += direction * 1;
    points += direction * 1;
  } else {
    losses += direction * 1;
  }

  const safePlayed = Math.max(0, played);
  const safeGF = Math.max(0, gf);
  const safeGA = Math.max(0, ga);

  return {
    played: safePlayed,
    wins: Math.max(0, wins),
    draws: Math.max(0, draws),
    losses: Math.max(0, losses),
    goalsFor: safeGF,
    goalsAgainst: safeGA,
    goalDifference: safeGF - safeGA,
    points: Math.max(0, points),
  };
}

/**
 * Update standings when match scores change.
 *
 * - If no scores before and scores now → add result.
 * - If scores before and removed now → remove result.
 * - If scores before and changed → remove old result + add new result.
 */
async function updateStandingsForMatchResultChange(
  currentBooking: Booking,
  updates: Partial<Booking>
): Promise<void> {
  // Only care about championship matches with two teams
  if (
    !currentBooking.championship ||
    !currentBooking.homeTeam ||
    !currentBooking.awayTeam
  ) {
    return;
  }

  const oldHomeScore = currentBooking.homeTeamScore;
  const oldAwayScore = currentBooking.awayTeamScore;

  const newHomeScore =
    updates.homeTeamScore !== undefined
      ? updates.homeTeamScore
      : oldHomeScore;
  const newAwayScore =
    updates.awayTeamScore !== undefined
      ? updates.awayTeamScore
      : oldAwayScore;

  const hadOldScores =
    typeof oldHomeScore === 'number' && typeof oldAwayScore === 'number';
  const hasNewScores =
    typeof newHomeScore === 'number' && typeof newAwayScore === 'number';

  // Nothing to do if both before and after have no scores
  if (!hadOldScores && !hasNewScores) return;

  // If scores unchanged, nothing to do
  if (
    hadOldScores &&
    hasNewScores &&
    oldHomeScore === newHomeScore &&
    oldAwayScore === newAwayScore
  ) {
    return;
  }

  const homeDoc = await getTeamDocByName(currentBooking.homeTeam);
  const awayDoc = await getTeamDocByName(currentBooking.awayTeam);

  if (!homeDoc || !awayDoc) {
    console.warn(
      'Could not find team docs for standings update:',
      currentBooking.homeTeam,
      currentBooking.awayTeam
    );
    return;
  }

  let homeStats = ensureStats(homeDoc.data.stats);
  let awayStats = ensureStats(awayDoc.data.stats);

  // 1) Remove old result, if there was one
  if (hadOldScores) {
    homeStats = applyResultToStats(
      homeStats,
      oldHomeScore as number,
      oldAwayScore as number,
      -1
    );
    awayStats = applyResultToStats(
      awayStats,
      oldAwayScore as number,
      oldHomeScore as number,
      -1
    );
  }

  // 2) Add new result, if there is one now
  if (hasNewScores) {
    homeStats = applyResultToStats(
      homeStats,
      newHomeScore as number,
      newAwayScore as number,
      1
    );
    awayStats = applyResultToStats(
      awayStats,
      newAwayScore as number,
      newHomeScore as number,
      1
    );
  }

  await Promise.all([
    updateDoc(homeDoc.ref, {
      stats: homeStats,
      lastModified: serverTimestamp(),
    }),
    updateDoc(awayDoc.ref, {
      stats: awayStats,
      lastModified: serverTimestamp(),
    }),
  ]);
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
      console.warn(
        'Firestore unavailable during registration; using provisional user',
        e
      );
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
      console.warn(
        'Firestore unavailable during login; using provisional user',
        e
      );
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
      console.warn(
        'Firestore unavailable in getCurrentUser; using provisional user',
        e
      );
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
  async getAllTeams(): Promise<
    { userId: string; teamName: string; email: string }[]
  > {
    const q = query(usersCollection, where('teamName', '!=', ''));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        userId: docSnap.id,
        teamName: data.teamName || '',
        email: data.email || '',
      };
    });
  },

  /** Get user by team name */
  async getUserByTeamName(teamName: string): Promise<User | null> {
    const q = query(
      usersCollection,
      where('teamName', '==', teamName.trim())
    );
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

      const calendarEventId =
        await googleCalendarService.createEvent(booking);

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
      if (
        bookingData.homeTeam &&
        bookingData.awayTeam &&
        bookingData.homeTeamUserId &&
        bookingData.awayTeamUserId
      ) {
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

  // ... (keep getBookingsByDate / getBookingsByUser / getBookingsByUserOrTeam /
  //      listenBookingsByUserOrTeam / getAllBookingsInRange / getPendingBookings
  //      exactly as you already have them)

  async updateBooking(
    bookingId: string,
    updates: Partial<Booking>
  ): Promise<void> {
    const bookingRef = doc(db, 'bookings', bookingId);

    let currentBooking: Booking | null = null;

    // Google Calendar Integration: Get current booking to find calendar event ID
    try {
      currentBooking = await this.getBooking(bookingId);

      if (currentBooking && (currentBooking as any).calendarEventId) {
        const updatedBooking = {
          ...currentBooking,
          ...updates,
        } as Booking;
        await googleCalendarService.updateEvent(
          (currentBooking as any).calendarEventId,
          updatedBooking
        );
      }
    } catch (e) {
      console.warn('Google Calendar update failed (non-blocking):', e);
    }

    // ⭐ NEW: update standings if match scores changed
    try {
      if (currentBooking) {
        await updateStandingsForMatchResultChange(currentBooking, updates);
      }
    } catch (e) {
      console.warn('Standings update failed (non-blocking):', e);
    }

    await updateDoc(bookingRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  },

  async deleteBooking(bookingId: string): Promise<void> {
    // Google Calendar Integration: Delete calendar event before deleting booking
    try {
      const booking = await this.getBooking(bookingId);

      if (booking && (booking as any).calendarEventId) {
        await googleCalendarService.deleteEvent(
          (booking as any).calendarEventId
        );
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

// (keep your notificationService exactly as is)

export * from './teamService';
export * from './recurringBookingService';
