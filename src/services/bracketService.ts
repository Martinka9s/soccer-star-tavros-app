import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  writeBatch,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { db } from './firebaseService';
import { ChampionshipType, Team, BracketMatch, Booking } from '../types';
import { teamService } from './teamService';

const BRACKETS_COLLECTION = 'bracketMatches';

// Helper: same sorting as standings
const sortTeamsForSeeding = (teams: Team[]): Team[] => {
  return [...teams].sort((a, b) => {
    if (b.stats.points !== a.stats.points) {
      return b.stats.points - a.stats.points;
    }

    const gdA =
      typeof a.stats.goalDifference === 'number'
        ? a.stats.goalDifference
        : (a.stats.goalsFor || 0) - (a.stats.goalsAgainst || 0);
    const gdB =
      typeof b.stats.goalDifference === 'number'
        ? b.stats.goalDifference
        : (b.stats.goalsFor || 0) - (b.stats.goalsAgainst || 0);

    if (gdB !== gdA) return gdB - gdA;
    return (b.stats.goalsFor || 0) - (a.stats.goalsFor || 0);
  });
};

export const bracketService = {
  /**
   * Build / reset knockout bracket from current qualifiers.
   * Uses teams that are NOT eliminated (top 8 or 16 after kickoff).
   *
   * DREAM LEAGUE: 8-team bracket (QF → SF → Final)
   * MSL A / MSL B: 16-team bracket (R16 → QF → SF → Final)
   */
  async initializeBracket(championship: ChampionshipType): Promise<void> {
    const allTeams = await teamService.getTeamsByChampionship(championship);
    if (!allTeams.length) {
      throw new Error('No teams found in this championship');
    }

    // Qualifiers = teams with eliminated !== true
    const qualifiers = sortTeamsForSeeding(
      allTeams.filter((t) => !t.eliminated)
    );

    if (!qualifiers.length) {
      throw new Error('No qualified teams found (all are eliminated)');
    }

    const qualifiersCount = qualifiers.length;

    if (qualifiersCount !== 8 && qualifiersCount !== 16) {
      console.warn(
        `bracketService.initializeBracket: expected 8 or 16 qualified teams, got ${qualifiersCount}`
      );
    }

    // 1) Clear previous bracket for this championship
    const existingQ = query(
      collection(db, BRACKETS_COLLECTION),
      where('championship', '==', championship)
    );
    const existingSnap = await getDocs(existingQ);
    if (!existingSnap.empty) {
      const batch = writeBatch(db);
      existingSnap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }

    // 2) Update teams with seeds (optional but nice)
    const seedBatch = writeBatch(db);
    qualifiers.forEach((team, index) => {
      seedBatch.update(doc(db, 'teams', team.id), {
        knockoutSeed: index + 1,
        knockoutStatus: 'safe',
        lastModified: new Date(),
      });
    });
    await seedBatch.commit();

    const matchesCollection = collection(db, BRACKETS_COLLECTION);
    const createMatch = async (data: Omit<BracketMatch, 'id'>) => {
      await addDoc(matchesCollection, data);
    };

    const seed = (n: number) => qualifiers[n - 1];

    // Common helper to build an "empty" match
    const baseMatch = (
      round: BracketMatch['round'],
      matchNumber: number
    ): Omit<BracketMatch, 'id'> => ({
      championship,
      round,
      matchNumber,
      homeTeamId: undefined,
      awayTeamId: undefined,
      homeTeamName: undefined,
      awayTeamName: undefined,
      homeTeamScore: undefined,
      awayTeamScore: undefined,
      winnerId: undefined,
      winnerName: undefined,
      bookingId: undefined,
      nextMatchNumber: undefined,
      slotInNextMatch: undefined,
      completed: false,
      createdAt: new Date(),
    });

    // --- CASE 1: 16-team bracket (MSL A / MSL B) ---
    if (qualifiersCount >= 16) {
      // Round of 16 seeding:
      // 1 vs 16, 2 vs 15, 3 vs 14, 4 vs 13, 5 vs 12, 6 vs 11, 7 vs 10, 8 vs 9
      const pairs: [number, number, number][] = [
        [1, 16, 1],
        [2, 15, 2],
        [3, 14, 3],
        [4, 13, 4],
        [5, 12, 5],
        [6, 11, 6],
        [7, 10, 7],
        [8, 9, 8],
      ];

      // R16 ➜ QF mapping:
      // QF1: winners of R16-1 (home) & R16-8 (away)
      // QF2: winners of R16-2 (home) & R16-7 (away)
      // QF3: winners of R16-3 (home) & R16-6 (away)
      // QF4: winners of R16-4 (home) & R16-5 (away)
      const r16ToQf: Record<number, { nextMatchNumber: number; slot: 'home' | 'away' }> = {
        1: { nextMatchNumber: 1, slot: 'home' },
        8: { nextMatchNumber: 1, slot: 'away' },
        2: { nextMatchNumber: 2, slot: 'home' },
        7: { nextMatchNumber: 2, slot: 'away' },
        3: { nextMatchNumber: 3, slot: 'home' },
        6: { nextMatchNumber: 3, slot: 'away' },
        4: { nextMatchNumber: 4, slot: 'home' },
        5: { nextMatchNumber: 4, slot: 'away' },
      };

      // Create Round of 16 matches (1..8)
      for (const [seedA, seedB, matchNumber] of pairs) {
        const teamA = seed(seedA);
        const teamB = seed(seedB);
        const cfg = r16ToQf[matchNumber];

        await createMatch({
          ...baseMatch('round_of_16', matchNumber),
          homeTeamId: teamA.id,
          homeTeamName: teamA.name,
          awayTeamId: teamB.id,
          awayTeamName: teamB.name,
          nextMatchNumber: cfg.nextMatchNumber,
          slotInNextMatch: cfg.slot,
        });
      }

      // Create Quarterfinals (QF1..4) – no teams yet, just links to SF
      // Semifinal mapping:
      // SF1: winners of QF1 (home) & QF4 (away)
      // SF2: winners of QF2 (home) & QF3 (away)
      const qfToSf: Record<number, { nextMatchNumber: number; slot: 'home' | 'away' }> = {
        1: { nextMatchNumber: 1, slot: 'home' }, // QF1 winner → SF1 home
        4: { nextMatchNumber: 1, slot: 'away' }, // QF4 winner → SF1 away
        2: { nextMatchNumber: 2, slot: 'home' }, // QF2 winner → SF2 home
        3: { nextMatchNumber: 2, slot: 'away' }, // QF3 winner → SF2 away
      };

      for (let matchNumber = 1; matchNumber <= 4; matchNumber++) {
        const cfg = qfToSf[matchNumber];
        await createMatch({
          ...baseMatch('quarterfinals', matchNumber),
          nextMatchNumber: cfg.nextMatchNumber,
          slotInNextMatch: cfg.slot,
        });
      }

      // Create Semifinals (SF1..2) – winners go to Final
      // SF1 winner → Final (home), SF2 winner → Final (away)
      const sfToFinal: Record<number, { nextMatchNumber: number; slot: 'home' | 'away' }> = {
        1: { nextMatchNumber: 1, slot: 'home' },
        2: { nextMatchNumber: 1, slot: 'away' },
      };

      for (let matchNumber = 1; matchNumber <= 2; matchNumber++) {
        const cfg = sfToFinal[matchNumber];
        await createMatch({
          ...baseMatch('semifinals', matchNumber),
          nextMatchNumber: cfg.nextMatchNumber,
          slotInNextMatch: cfg.slot,
        });
      }

      // Final – single match, no nextMatchNumber, NO 3rd PLACE
      await createMatch(baseMatch('final', 1));

      return;
    }

    // --- CASE 2: 8-team bracket (DREAM LEAGUE) ---
    // Quarterfinals seeding:
    // 1 vs 8, 2 vs 7, 3 vs 6, 4 vs 5
    const qfPairs: [number, number, number][] = [
      [1, 8, 1],
      [2, 7, 2],
      [3, 6, 3],
      [4, 5, 4],
    ];

    // Same QF → SF mapping as above
    const qfToSfDL: Record<number, { nextMatchNumber: number; slot: 'home' | 'away' }> = {
      1: { nextMatchNumber: 1, slot: 'home' },
      4: { nextMatchNumber: 1, slot: 'away' },
      2: { nextMatchNumber: 2, slot: 'home' },
      3: { nextMatchNumber: 2, slot: 'away' },
    };

    // Quarterfinals
    for (const [seedA, seedB, matchNumber] of qfPairs) {
      const teamA = seed(seedA);
      const teamB = seed(seedB);
      const cfg = qfToSfDL[matchNumber];

      await createMatch({
        ...baseMatch('quarterfinals', matchNumber),
        homeTeamId: teamA.id,
        homeTeamName: teamA.name,
        awayTeamId: teamB.id,
        awayTeamName: teamB.name,
        nextMatchNumber: cfg.nextMatchNumber,
        slotInNextMatch: cfg.slot,
      });
    }

    // Semifinals
    const sfToFinalDL: Record<number, { nextMatchNumber: number; slot: 'home' | 'away' }> = {
      1: { nextMatchNumber: 1, slot: 'home' },
      2: { nextMatchNumber: 1, slot: 'away' },
    };

    for (let matchNumber = 1; matchNumber <= 2; matchNumber++) {
      const cfg = sfToFinalDL[matchNumber];
      await createMatch({
        ...baseMatch('semifinals', matchNumber),
        nextMatchNumber: cfg.nextMatchNumber,
        slotInNextMatch: cfg.slot,
      });
    }

    // Final – NO 3rd place
    await createMatch(baseMatch('final', 1));
  },

  /**
   * Called after an admin saves scores in BookingModal
   * for a finals match (with bracketRound + bracketMatchNumber).
   *
   * - Saves scores into the bracket match
   * - Calculates the winner
   * - Moves winner forward to the correct next match & slot (home/away)
   */
  async applyMatchResultFromBooking(booking: Booking): Promise<void> {
    try {
      if (
        !booking.championship ||
        !booking.bracketRound ||
        booking.bracketMatchNumber == null
      ) {
        return;
      }

      if (!booking.matchCompleted) return;
      if (
        typeof booking.homeTeamScore !== 'number' ||
        typeof booking.awayTeamScore !== 'number'
      ) {
        return;
      }

      const championship = booking.championship;
      const round = booking.bracketRound;
      const matchNumber = booking.bracketMatchNumber;

      const matchQ = query(
        collection(db, BRACKETS_COLLECTION),
        where('championship', '==', championship),
        where('round', '==', round),
        where('matchNumber', '==', matchNumber)
      );

      const matchSnap = await getDocs(matchQ);
      if (matchSnap.empty) {
        console.warn(
          'bracketService.applyMatchResultFromBooking: no bracket match found for',
          championship,
          round,
          matchNumber
        );
        return;
      }

      const matchDoc = matchSnap.docs[0];
      const matchData = matchDoc.data() as BracketMatch;

      const homeScore = booking.homeTeamScore!;
      const awayScore = booking.awayTeamScore!;

      let winnerId: string | undefined;
      let winnerName: string | undefined;

      if (homeScore > awayScore) {
        winnerId = matchData.homeTeamId;
        winnerName = matchData.homeTeamName;
      } else if (awayScore > homeScore) {
        winnerId = matchData.awayTeamId;
        winnerName = matchData.awayTeamName;
      } else {
        console.warn(
          'Draw in knockout match – scores saved but winner not auto-advanced. Handle penalties manually if needed.'
        );
      }

      // Save scores + winner on current bracket match
      await updateDoc(matchDoc.ref, {
        homeTeamScore: homeScore,
        awayTeamScore: awayScore,
        completed: true,
        bookingId: booking.id,
        ...(winnerId && winnerName
          ? { winnerId, winnerName }
          : {}),
      });

      // If no clear winner, stop here
      if (!winnerId || !winnerName) return;

      if (!matchData.nextMatchNumber || !matchData.slotInNextMatch) {
        // Final has no next match – OK
        return;
      }

      // Determine next round
      const nextRound =
        round === 'round_of_16'
          ? 'quarterfinals'
          : round === 'quarterfinals'
          ? 'semifinals'
          : round === 'semifinals'
          ? 'final'
          : null;

      if (!nextRound) return;

      // Find that next match doc
      const nextQ = query(
        collection(db, BRACKETS_COLLECTION),
        where('championship', '==', championship),
        where('round', '==', nextRound),
        where('matchNumber', '==', matchData.nextMatchNumber)
      );
      const nextSnap = await getDocs(nextQ);
      if (nextSnap.empty) {
        console.warn(
          'bracketService.applyMatchResultFromBooking: next bracket match not found'
        );
        return;
      }

      const nextDoc = nextSnap.docs[0];
      const update: Partial<BracketMatch> = {};

      if (matchData.slotInNextMatch === 'home') {
        update.homeTeamId = winnerId;
        update.homeTeamName = winnerName;
      } else {
        update.awayTeamId = winnerId;
        update.awayTeamName = winnerName;
      }

      await updateDoc(nextDoc.ref, update as any);
    } catch (error) {
      console.error('Error applying bracket result from booking:', error);
    }
  },
};
