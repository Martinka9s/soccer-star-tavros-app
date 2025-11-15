// Team Service Functions for Firebase - WITH SUBGROUP SUPPORT

import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  query, 
  where,
  writeBatch,
  Timestamp
} from 'firebase/firestore';
import { db, notificationService } from './firebaseService';
import { Team, ChampionshipType, SubgroupType, SeasonArchive } from '../types';

export const teamService = {
  /**
   * Create a new team registration request
   */
  async createTeamRequest(
    userId: string, 
    userEmail: string, 
    teamName: string, 
    phoneNumber: string,
    teamLevel: 'beginner' | 'intermediate' | 'advanced',
    preferredDay: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday'
  ): Promise<string> {
    try {
      const existingTeam = await this.getTeamByUserId(userId);
      if (existingTeam) {
        throw new Error('You already have a team registration. Please wait for admin approval.');
      }

      const teamData = {
        userId,
        userEmail,
        name: teamName,
        phoneNumber,
        teamLevel,
        preferredDay,
        status: 'pending' as const,
        stats: {
          points: 0,
          played: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDifference: 0,
        },
        createdAt: Timestamp.now(),
        lastModified: Timestamp.now(),
      };

      const docRef = await addDoc(collection(db, 'teams'), teamData);
      
      await updateDoc(doc(db, 'users', userId), {
        teamName,
        phoneNumber,
        teamId: docRef.id,
      });

      // NEW: Notify all admins about new team registration
      try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const adminUsers = usersSnapshot.docs.filter(doc => doc.data().role === 'admin');
        
        for (const adminDoc of adminUsers) {
          await addDoc(collection(db, 'notifications'), {
            userId: adminDoc.id,
            type: 'team_registration',
            teamId: docRef.id,
            message: `New team registration: ${teamName} is waiting for approval`,
            read: false,
            createdAt: Timestamp.now(),
          });
        }
      } catch (notifError) {
        console.warn('Failed to send admin notifications:', notifError);
      }

      return docRef.id;
    } catch (error: any) {
      console.error('Error creating team request:', error);
      throw new Error(error.message || 'Failed to create team request');
    }
  },

  async getTeamByUserId(userId: string): Promise<Team | null> {
    try {
      const q = query(collection(db, 'teams'), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) return null;
      
      const docSnap = snapshot.docs[0];
      return {
        id: docSnap.id,
        ...docSnap.data(),
        createdAt: docSnap.data().createdAt?.toDate() || new Date(),
        approvedAt: docSnap.data().approvedAt?.toDate(),
        lastModified: docSnap.data().lastModified?.toDate() || new Date(),
      } as Team;
    } catch (error) {
      console.error('Error getting team by user ID:', error);
      return null;
    }
  },

  async getAllTeams(): Promise<Team[]> {
    try {
      const snapshot = await getDocs(collection(db, 'teams'));
      return snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
        createdAt: docSnap.data().createdAt?.toDate() || new Date(),
        approvedAt: docSnap.data().approvedAt?.toDate(),
        lastModified: docSnap.data().lastModified?.toDate() || new Date(),
      } as Team));
    } catch (error) {
      console.error('Error getting all teams:', error);
      throw new Error('Failed to load teams');
    }
  },

  async getPendingTeams(): Promise<Team[]> {
    try {
      const q = query(collection(db, 'teams'), where('status', '==', 'pending'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
        createdAt: docSnap.data().createdAt?.toDate() || new Date(),
        approvedAt: docSnap.data().approvedAt?.toDate(),
        lastModified: docSnap.data().lastModified?.toDate() || new Date(),
      } as Team));
    } catch (error) {
      console.error('Error getting pending teams:', error);
      throw new Error('Failed to load pending teams');
    }
  },

  async getTeamsByChampionship(championship: ChampionshipType): Promise<Team[]> {
    try {
      const q = query(
        collection(db, 'teams'),
        where('championship', '==', championship),
        where('status', '==', 'approved')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
        createdAt: docSnap.data().createdAt?.toDate() || new Date(),
        approvedAt: docSnap.data().approvedAt?.toDate(),
        lastModified: docSnap.data().lastModified?.toDate() || new Date(),
      } as Team));
    } catch (error) {
      console.error('Error getting teams by championship:', error);
      throw new Error('Failed to load teams');
    }
  },

  /**
   * NEW: Get teams by championship and subgroup
   */
  async getTeamsBySubgroup(championship: ChampionshipType, subgroup: SubgroupType): Promise<Team[]> {
    try {
      const q = query(
        collection(db, 'teams'),
        where('championship', '==', championship),
        where('subgroup', '==', subgroup),
        where('status', '==', 'approved')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
        createdAt: docSnap.data().createdAt?.toDate() || new Date(),
        approvedAt: docSnap.data().approvedAt?.toDate(),
        lastModified: docSnap.data().lastModified?.toDate() || new Date(),
      } as Team));
    } catch (error) {
      console.error('Error getting teams by subgroup:', error);
      throw new Error('Failed to load teams');
    }
  },

  /**
   * UPDATED: Approve team with championship AND optional subgroup
   */
  async approveTeam(
    teamId: string, 
    championship: ChampionshipType, 
    adminEmail: string,
    subgroup?: SubgroupType
  ): Promise<void> {
    try {
      const teamDoc = await getDoc(doc(db, 'teams', teamId));
      if (!teamDoc.exists()) throw new Error('Team not found');
      
      const team = teamDoc.data();

      const updateData: any = {
        status: 'approved',
        championship,
        approvedAt: Timestamp.now(),
        reviewedBy: adminEmail,
        lastModified: Timestamp.now(),
      };

      // Add subgroup if provided (for MSL A/B)
      if (subgroup) {
        updateData.subgroup = subgroup;
      }

      await updateDoc(doc(db, 'teams', teamId), updateData);

      await updateDoc(doc(db, 'users', team.userId), {
        teamId,
        teamName: team.name,
        phoneNumber: team.phoneNumber,
      });

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

  async declineTeam(teamId: string, adminEmail: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'teams', teamId), {
        status: 'declined',
        reviewedBy: adminEmail,
        lastModified: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error declining team:', error);
      throw new Error('Failed to decline team');
    }
  },

  /**
   * UPDATED: Move team with optional subgroup change
   */
  async moveTeam(
    teamId: string, 
    newChampionship: ChampionshipType,
    newSubgroup?: SubgroupType
  ): Promise<void> {
    try {
      const updateData: any = {
        championship: newChampionship,
        stats: {
          points: 0,
          played: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDifference: 0,
        },
        lastModified: Timestamp.now(),
      };

      // Update or remove subgroup based on new championship
      if (newSubgroup) {
        updateData.subgroup = newSubgroup;
      } else {
        updateData.subgroup = null;
      }

      await updateDoc(doc(db, 'teams', teamId), updateData);
    } catch (error) {
      console.error('Error moving team:', error);
      throw new Error('Failed to move team');
    }
  },

  async removeTeam(teamId: string): Promise<void> {
    try {
      const teamDoc = await getDoc(doc(db, 'teams', teamId));
      if (teamDoc.exists()) {
        const team = teamDoc.data();
        await updateDoc(doc(db, 'users', team.userId), {
          teamId: null,
          teamName: null,
        });
      }
      await deleteDoc(doc(db, 'teams', teamId));
    } catch (error) {
      console.error('Error removing team:', error);
      throw new Error('Failed to remove team');
    }
  },

  async deactivateTeam(teamId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'teams', teamId), {
        status: 'inactive',
        lastModified: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error deactivating team:', error);
      throw new Error('Failed to deactivate team');
    }
  },

  /**
   * NEW: Mark team as eliminated (for qualification phase)
   */
  async markTeamEliminated(teamId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'teams', teamId), {
        eliminated: true,
        lastModified: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error marking team as eliminated:', error);
      throw new Error('Failed to mark team as eliminated');
    }
  },

  /**
   * NEW: Restore eliminated team
   */
  async restoreEliminatedTeam(teamId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'teams', teamId), {
        eliminated: false,
        lastModified: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error restoring eliminated team:', error);
      throw new Error('Failed to restore team');
    }
  },

  async archiveTeam(teamId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'teams', teamId), {
        status: 'archived',
        lastModified: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error archiving team:', error);
      throw new Error('Failed to archive team');
    }
  },

  async restoreTeam(teamId: string, championship: ChampionshipType, subgroup?: SubgroupType): Promise<void> {
    try {
      const updateData: any = {
        status: 'approved',
        championship,
        lastModified: Timestamp.now(),
      };
      
      if (subgroup) {
        updateData.subgroup = subgroup;
      }
      
      await updateDoc(doc(db, 'teams', teamId), updateData);
    } catch (error) {
      console.error('Error restoring team:', error);
      throw new Error('Failed to restore team');
    }
  },

  async updateTeamStats(
    teamId: string,
    stats: {
      points: number;
      played: number;
      wins: number;
      draws: number;
      losses: number;
      goalsFor: number;
      goalsAgainst: number;
      goalDifference: number;
    }
  ): Promise<void> {
    try {
      await updateDoc(doc(db, 'teams', teamId), {
        stats,
        lastModified: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error updating team stats:', error);
      throw new Error('Failed to update team stats');
    }
  },

  /**
   * UPDATED: Reset championship with subgroup archiving
   */
  async resetChampionship(
  championship: ChampionshipType,
  adminEmail: string
): Promise<void> {
  try {
    const teams = await this.getTeamsByChampionship(championship);

    if (teams.length === 0) {
      throw new Error('No teams found in this championship');
    }

    // ------------------------------
    // 1️⃣ Create final standings
    // ------------------------------
    const finalStandings = teams
      .sort((a, b) => {
        if (b.stats.points !== a.stats.points) return b.stats.points - a.stats.points;
        if (b.stats.goalDifference !== a.stats.goalDifference) return b.stats.goalDifference - a.stats.goalDifference;
        return b.stats.goalsFor - a.stats.goalsFor;
      })
      .map((team, index) => ({
        rank: index + 1,
        teamName: team.name,
        teamId: team.id,
        points: team.stats.points,
        played: team.stats.played,
        wins: team.stats.wins,
        draws: team.stats.draws,
        losses: team.stats.losses,
        goalsFor: team.stats.goalsFor,
        goalsAgainst: team.stats.goalsAgainst,
        goalDifference: team.stats.goalDifference,
      }));

    // ------------------------------
    // 2️⃣ Archive subgroup standings (MSL A & MSL B)
    // ------------------------------
    const subgroupArchives: any[] = [];

    if (championship === 'MSL A' || championship === 'MSL B') {
      const subgroups =
        championship === 'MSL A'
          ? ['ΟΜΙΛΟΣ ΔΕΥΤΕΡΑΣ', 'ΟΜΙΛΟΣ ΤΡΙΤΗΣ', 'ΟΜΙΛΟΣ ΤΕΤΑΡΤΗΣ']
          : ['ΟΜΙΛΟΣ ΔΕΥΤΕΡΑΣ', 'ΟΜΙΛΟΣ ΤΡΙΤΗΣ', 'ΟΜΙΛΟΣ ΠΕΜΠΤΗΣ'];

      for (const subgroup of subgroups) {
        const subgroupTeams = teams.filter((t) => t.subgroup === subgroup);
        const subgroupStandings = subgroupTeams
          .sort((a, b) => {
            if (b.stats.points !== a.stats.points) return b.stats.points - a.stats.points;
            if (b.stats.goalDifference !== a.stats.goalDifference) return b.stats.goalDifference - a.stats.goalDifference;
            return b.stats.goalsFor - a.stats.goalsFor;
          })
          .map((team, index) => ({
            rank: index + 1,
            teamName: team.name,
            teamId: team.id,
            points: team.stats.points,
            played: team.stats.played,
            wins: team.stats.wins,
            draws: team.stats.draws,
            losses: team.stats.losses,
            goalsFor: team.stats.goalsFor,
            goalsAgainst: team.stats.goalsAgainst,
            goalDifference: team.stats.goalDifference,
          }));

        subgroupArchives.push({
          subgroup,
          standings: subgroupStandings,
        });
      }
    }

    // ------------------------------
    // 3️⃣ WRITE ARCHIVE DOCUMENT
    // ------------------------------
    const seasonYear = new Date().getFullYear().toString();

    await addDoc(collection(db, 'seasonArchives'), {
      championship,
      seasonYear,
      finalStandings,
      subgroupArchives,
      totalMatches: teams.reduce((sum, t) => sum + t.stats.played, 0),
      teams: teams.map((t) => ({
        ...t,
        createdAt: Timestamp.fromDate(t.createdAt),
        approvedAt: t.approvedAt ? Timestamp.fromDate(t.approvedAt) : null,
        lastModified: Timestamp.fromDate(t.lastModified),
      })),
      archivedAt: Timestamp.now(),
      archivedBy: adminEmail,
    });

    // ------------------------------
    // 4️⃣ RESET teams & set INACTIVE
    // ------------------------------
    const batch = writeBatch(db);

    teams.forEach((team) => {
      batch.update(doc(db, 'teams', team.id), {
        status: 'inactive',              // 👈 REQUIRED
        championship: null,              // 👈 Remove old championship
        subgroup: null,                  // 👈 Remove subgroup
        eliminated: false,
        lastModified: Timestamp.now(),
        stats: {
          points: 0,
          played: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDifference: 0,
        },
      });
    });

    await batch.commit();
  } catch (error: any) {
    console.error('Error resetting championship:', error);
    throw new Error(error.message || 'Failed to reset championship');
  }
}
