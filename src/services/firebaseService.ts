// ============================================================================
// ADDITIONS TO YOUR EXISTING firebaseService.ts
// ============================================================================

// ADD THESE 3 FUNCTIONS TO YOUR notificationService OBJECT
// (Around line 455, inside the notificationService object)

export const notificationService = {
  // ... your existing functions (createNotification, createMatchNotification, etc.) ...

  /**
   * ✅ NEW: Send booking notification to team when admin creates/approves booking
   */
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
      // Don't throw - notification failure shouldn't break booking creation
    }
  },

  /**
   * ✅ NEW: Send booking notification to both teams in a match
   */
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
      // Notify home team
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

      // Notify away team
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

  /**
   * ✅ NEW: Send team approval notification
   */
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

// ============================================================================
// UPDATE bookingService.createBooking() FUNCTION
// (Around line 310, replace the existing createBooking function)
// ============================================================================

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

  // ✅ NEW: Send notifications
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

// ============================================================================
// UPDATE teamService.approveTeam() IN teamService.ts
// (Find this function in your teamService.ts file)
// ============================================================================

async approveTeam(teamId: string, championship: ChampionshipType, adminEmail: string): Promise<void> {
  try {
    const teamDoc = await getDoc(doc(db, 'teams', teamId));
    if (!teamDoc.exists()) throw new Error('Team not found');
    
    const team = teamDoc.data();
    
    // Update team
    await updateDoc(doc(db, 'teams', teamId), {
      status: 'approved',
      championship,
      approvedBy: adminEmail,
      approvedAt: serverTimestamp(),
      lastModified: serverTimestamp(),
    });

    // Update user
    await updateDoc(doc(db, 'users', team.userId), {
      teamId,
      teamName: team.name,
    });

    // ✅ NEW: Send notification
    await notificationService.notifyTeamApproval(
      team.userId,
      team.name,
      championship
    );
  } catch (error) {
    console.error('Error approving team:', error);
    throw new Error('Failed to approve team');
  }
},
