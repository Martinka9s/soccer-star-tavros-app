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
const teamsCollection = collection(db, 'teams');

// Helper: Firestore timestamp → Date
const convertTimestamp = (timestamp: any): Date => {
  if (timestamp instanceof Timestamp) return timestamp.toDate();
  return new Date(timestamp);
};

/** Ensures users/{uid} exists; returns normalized User */
async function ensureUserDoc(
  uid: string,
  email: string | null | undefined
): Promise<User> {
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

// --- STANDINGS HELPERS -------------------------------------------------------

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
 * - Only for real match games: both teams must exist AND be in the same championship.
 * - If no scores before and scores now → add result.
 * - If scores before and removed now → remove result.
 * - If scores before and changed → remove old result + add new result.
 */
async function updateStandingsForMatchResultChange(
  currentBooking: Booking,
  updates: Partial<Booking>
): Promise<void> {
  // Need two teams
  if (!currentBooking.homeTeam || !currentBooking.awayTeam) return;

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

  const homeData = homeDoc.data;
  const awayData = awayDoc.data;

  const homeChamp = homeData.championship;
  const awayChamp = awayData.championship;

  // ✅ Only update if both teams belong to the same championship
  if (!homeChamp || !awayChamp || homeChamp !== awayChamp) {
    return;
  }

  // If booking has a championship set and it doesn't match, also skip
  if (
    currentBooking.championship &&
    currentBooking.championship !== homeChamp
  ) {
    return;
  }

  let homeStats = ensureStats(homeData.stats);
  let awayStats = ensureStats(awayData.stats);

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

// --- BOOKINGS ----------------------------------------------------------------

export const bookingService = {
  async createBooking(
    bookingData: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    // 🔮 Try to auto-attach championship based on the two teams
    let dataToSave: any = { ...bookingData };

    if (
      !dataToSave.championship &&
      bookingData.homeTeam &&
      bookingData.awayTeam
    ) {
      try {
        const [homeDoc, awayDoc] = await Promise.all([
          getTeamDocByName(bookingData.homeTeam),
          getTeamDocByName(bookingData.awayTeam),
        ]);

        const homeChamp = homeDoc?.data.championship;
        const awayChamp = awayDoc?.data.championship;

        if (homeChamp && homeChamp === awayChamp) {
          dataToSave.championship = homeChamp;
        }
      } catch (e) {
        console.warn('Could not auto-detect championship for match booking:', e);
      }
    }

    const docRef = await addDoc(bookingsCollection, {
      ...dataToSave,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // ✅ Google Calendar Integration: Create event if connected
    try {
      const booking: Booking = {
        id: docRef.id,
        ...dataToSave,
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
        dataToSave.homeTeam &&
        dataToSave.awayTeam &&
        dataToSave.homeTeamUserId &&
        dataToSave.awayTeamUserId
      ) {
        await notificationService.notifyMatchTeams(
          dataToSave.homeTeamUserId,
          dataToSave.awayTeamUserId,
          dataToSave.homeTeam,
          dataToSave.awayTeam,
          dataToSave.date,
          dataToSave.startTime,
          dataToSave.pitchType,
          docRef.id
        );
      }
      // For single team training/booking
      else if (dataToSave.userId && dataToSave.teamName) {
        await notificationService.notifyTeamBooking(
          dataToSave.userId,
          dataToSave.teamName,
          'single',
          dataToSave.date,
          dataToSave.startTime,
          dataToSave.pitchType,
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
  async getBookingsByUserOrTeam(
    userId: string,
    teamName?: string
  ): Promise<Booking[]> {
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

    // Only query by team if teamName exists and is not empty
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
        const allBookings = [
          ...userBookings,
          ...homeBookings,
          ...awayBookings,
        ];
        const uniqueBookings = Array.from(
          new Map(allBookings.map((b) => [b.id, b])).values()
        );

        // Sort by date descending
        return uniqueBookings.sort((a, b) =>
          b.date.localeCompare(a.date)
        );
      } catch (error) {
        console.error(
          'Error fetching team bookings (falling back to user bookings only):',
          error
        );
        // If team queries fail (e.g., missing index), just return user bookings
        return userBookings;
      }
    }

    // If no teamName, just return user bookings
    return userBookings;
  },

  /** "Realtime" listener (polling) for user bookings */
  listenBookingsByUserOrTeam(
    userId: string,
    teamName: string | undefined,
    callback: (bookings: Booking[]) => void
  ): () => void {
    // For simplicity, we'll poll every 5 seconds
    const fetchAndNotify = async () => {
      try {
        const cleanTeamName =
          teamName && teamName.trim() ? teamName.trim() : undefined;
        const bookings = await this.getBookingsByUserOrTeam(
          userId,
          cleanTeamName
        );
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
  async getAllBookingsInRange(
    startDate: string,
    endDate: string
  ): Promise<Booking[]> {
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

    // ⭐ Update standings if match scores changed
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

  async getNotificationsByUser(
    userId: string
  ): Promise<Notification[]> {
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
    const updatePromises = snapshot.docs.map(
      (d: QueryDocumentSnapshot<DocumentData>) =>
        updateDoc(d.ref, { read: true })
    );
    await Promise.all(updatePromises);
  },

  getUnreadCount(notifications: Notification[]): number {
    return notifications.filter((n) => !n.read).length;
  },

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
        message = `You got a new booking for the Championship. Check the date and time, and don't be late! ${teamName} vs ${opponentName} on ${date} at ${startTime} (${pitchType})`;
      } else {
        message = `Training session booked! Check the date and time, and don't be late. ${teamName} on ${date} at ${startTime} (${pitchType})`;
      }

      await addDoc(notificationsCollection, {
        userId,
        type: bookingType === 'match' ? 'match_scheduled' : 'booking',
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
