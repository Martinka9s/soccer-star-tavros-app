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
  Timestamp,
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

      // Notify all admins about new team registration
      try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const adminUsers = usersSnapshot.docs.filter((doc) => doc.data().role === 'admin');

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
      return snapshot.docs.map(
        (docSnap) =>
          ({
            id: docSnap.id,
            ...docSnap.data(),
            createdAt: docSnap.data().createdAt?.toDate() || new Date(),
            approvedAt: docSnap.data().approvedAt?.toDate(),
            lastModified: docSnap.data().lastModified?.toDate() || new Date(),
          } as Team)
      );
    } catch (error) {
      console.error('Error getting all teams:', error);
      throw new Error('Failed to load teams');
    }
  },

  async getPendingTeams(): Promise<Team[]> {
    try {
      const q = query(collection(db, 'teams'), where('status', '==', 'pending'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(
        (docSnap) =>
          ({
            id: docSnap.id,
            ...docSnap.data(),
            createdAt: docSnap.data().createdAt?.toDate() || new Date(),
            approvedAt: docSnap.data().approvedAt?.toDate(),
            lastModified: docSnap.data().lastModified?.toDate() || new Date(),
          } as Team)
      );
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
      return snapshot.docs.map(
        (docSnap) =>
          ({
            id: docSnap.id,
            ...docSnap.data(),
            createdAt: docSnap.data().createdAt?.toDate() || new Date(),
            approvedAt: docSnap.data().approvedAt?.toDate(),
            lastModified: docSnap.data().lastModified?.toDate() || new Date(),
          } as Team)
      );
    } catch (error) {
      console.error('Error getting teams by championship:', error);
      throw new Error('Failed to load teams');
    }
  },

  /**
   * Get teams by championship and subgroup
   */
  async getTeamsBySubgroup(
    championship: ChampionshipType,
    subgroup: SubgroupType
  ): Promise<Team[]> {
    try {
      const q = query(
        collection(db, 'teams'),
        where('championship', '==', championship),
        where('subgroup', '==', subgroup),
        where('status', '==', 'approved')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(
        (docSnap) =>
          ({
            id: docSnap.id,
            ...docSnap.data(),
            createdAt: docSnap.data().createdAt?.toDate() || new Date(),
            approvedAt: docSnap.data().approvedAt?.toDate(),
            lastModified: docSnap.data().lastModified?.toDate() || new Date(),
          } as Team)
      );
    } catch (error) {
      console.error('Error getting teams by subgroup:', error);
      throw new Error('Failed to load teams');
    }
  },

  /**
   * Approve team with championship AND optional subgroup
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

      await notificationService.notifyTeamApproval(team.userId, team.name, championship);
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
   * Move team with optional subgroup change
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
   * Mark team as eliminated (for qualification phase)
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
   * Restore eliminated team
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

  async restoreTeam(
    teamId: string,
    championship: ChampionshipType,
    subgroup?: SubgroupType
  ): Promise<void> {
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
   * Reset championship:
   * - Save archive (by year)
   * - Reset stats to 0
   * - Mark teams as INACTIVE and clear championship/subgroup
   */
  async resetChampionship(championship: ChampionshipType, adminEmail: string): Promise<void> {
    try {
      const teams = await this.getTeamsByChampionship(championship);

      if (teams.length === 0) {
        throw new Error('No teams found in this championship');
      }

      // Final standings (merged)
      const finalStandings = teams
        .slice()
        .sort((a, b) => {
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
          eliminated: !!team.eliminated,
        }));

      // Archive subgroup standings separately for MSL A/B
      let subgroupArchives: any[] = [];
      if (championship === 'MSL A' || championship === 'MSL B') {
        const subgroups =
          championship === 'MSL A'
            ? (['ΟΜΙΛΟΣ ΔΕΥΤΕΡΑΣ', 'ΟΜΙΛΟΣ ΤΡΙΤΗΣ', 'ΟΜΙΛΟΣ ΤΕΤΑΡΤΗΣ'] as SubgroupType[])
            : (['ΟΜΙΛΟΣ ΔΕΥΤΕΡΑΣ', 'ΟΜΙΛΟΣ ΤΡΙΤΗΣ', 'ΟΜΙΛΟΣ ΠΕΜΠΤΗΣ'] as SubgroupType[]);

        for (const subgroup of subgroups) {
          const subgroupTeams = teams.filter((t) => t.subgroup === subgroup);
          if (subgroupTeams.length === 0) continue;

          const subgroupStandings = subgroupTeams
            .slice()
            .sort((a, b) => {
              if (b.stats.points !== a.stats.points) return b.stats.points - a.stats.points;

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
              eliminated: !!team.eliminated,
            }));

          subgroupArchives.push({
            subgroup,
            standings: subgroupStandings,
          });
        }
      }

      const seasonYear = new Date().getFullYear().toString();

      const archiveData: any = {
        championship,
        seasonYear,
        teams: teams.map((t) => ({
          ...t,
          createdAt: Timestamp.fromDate(t.createdAt),
          approvedAt: t.approvedAt ? Timestamp.fromDate(t.approvedAt) : null,
          lastModified: Timestamp.fromDate(t.lastModified),
        })),
        finalStandings,
        totalMatches: teams.reduce((sum, t) => sum + t.stats.played, 0),
        archivedAt: Timestamp.now(),
        archivedBy: adminEmail,
      };

      if (subgroupArchives.length > 0) {
        archiveData.subgroupArchives = subgroupArchives;
      }

      // Save archive document (for admin "archives" tab later)
      await addDoc(collection(db, 'seasonArchives'), archiveData);

      // Reset stats + move teams to INACTIVE and clear championship/subgroup
      const batch = writeBatch(db);
      teams.forEach((team) => {
        batch.update(doc(db, 'teams', team.id), {
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
          eliminated: false,
          status: 'inactive',
          championship: null,
          subgroup: null,
          lastModified: Timestamp.now(),
        });
      });
      await batch.commit();
    } catch (error: any) {
      console.error('Error resetting championship:', error);
      throw new Error(error.message || 'Failed to reset championship');
    }
  },

  async getSeasonArchives(championship?: ChampionshipType): Promise<SeasonArchive[]> {
    try {
      let qRef;
      if (championship) {
        qRef = query(collection(db, 'seasonArchives'), where('championship', '==', championship));
      } else {
        qRef = collection(db, 'seasonArchives');
      }

      const snapshot = await getDocs(qRef);
      return snapshot.docs.map(
        (docSnap) =>
          ({
            id: docSnap.id,
            ...docSnap.data(),
            archivedAt: docSnap.data().archivedAt?.toDate() || new Date(),
          } as SeasonArchive)
      );
    } catch (error) {
      console.error('Error getting season archives:', error);
      throw new Error('Failed to load season archives');
    }
  },

  /**
   * Kick off finals – highlight qualified teams and mark others as eliminated.
   * DREAM LEAGUE → top 8
   * MSL A / MSL B → top 16
   */
  async kickoffFinals(championship: ChampionshipType): Promise<void> {
    try {
      const teams = await this.getTeamsByChampionship(championship);
      if (teams.length === 0) {
        throw new Error('No teams found in this championship');
      }

      const qualifiersCount = championship === 'MSL DREAM LEAGUE' ? 8 : 16;

      const sorted = [...teams].sort((a, b) => {
        if (b.stats.points !== a.stats.points) return b.stats.points - a.stats.points;

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

      const cutoff = Math.min(qualifiersCount, sorted.length);
      const qualified = sorted.slice(0, cutoff);
      const eliminated = sorted.slice(cutoff);

      const batch = writeBatch(db);

      qualified.forEach((team) => {
        batch.update(doc(db, 'teams', team.id), {
          eliminated: false,
          lastModified: Timestamp.now(),
        });
      });

      eliminated.forEach((team) => {
        batch.update(doc(db, 'teams', team.id), {
          eliminated: true,
          lastModified: Timestamp.now(),
        });
      });

      await batch.commit();
    } catch (error: any) {
      console.error('Error kicking off finals:', error);
      throw new Error(error.message || 'Failed to kick off finals');
    }
  },
};
