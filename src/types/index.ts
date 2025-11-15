export type UserRole = 'user' | 'admin';
export type BookingStatus = 'available' | 'pending' | 'booked' | 'blocked';
export type PitchType = 'Pitch A' | 'Pitch B';
export type ChampionshipType = 'MSL DREAM LEAGUE' | 'MSL A' | 'MSL B';
export type TeamStatus = 'pending' | 'approved' | 'declined' | 'inactive';

// NEW: Subgroup types for MSL A and MSL B
export type SubgroupType =
  | 'ΟΜΙΛΟΣ ΔΕΥΤΕΡΑΣ'   // Monday Group
  | 'ΟΜΙΛΟΣ ΤΡΙΤΗΣ'     // Tuesday Group
  | 'ΟΜΙΛΟΣ ΤΕΤΑΡΤΗΣ'   // Wednesday Group
  | 'ΟΜΙΛΟΣ ΠΕΜΠΤΗΣ';   // Thursday Group

// NEW: Championship phase for managing tournament progression
export type ChampionshipPhase =
  | 'group_stage'        // Teams playing in subgroups
  | 'merged_standings'   // All subgroups merged into one table
  | 'qualification'      // Determining final 16 teams
  | 'finals';            // Knockout bracket (16 → 8 → 4 → 2 → 1)

// NEW: Knockout status for each team (for playoffs & finals)
export type KnockoutStatus = 'none' | 'playoff' | 'safe' | 'eliminated';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  teamName?: string;
  phoneNumber?: string;
  teamId?: string;
  createdAt: Date;
}

export interface Booking {
  id: string;
  pitchType: PitchType;
  date: string;
  startTime: string;
  duration: number;
  status: BookingStatus;

  // Match between two teams
  homeTeam?: string;
  awayTeam?: string;
  homeTeamUserId?: string;
  awayTeamUserId?: string;

  // Match scores
  homeTeamScore?: number;
  awayTeamScore?: number;
  matchCompleted?: boolean;

  // Championship assignment
  championship?: ChampionshipType;

  // NEW: Knockout bracket round tracking
  bracketRound?: 'round_of_16' | 'quarterfinals' | 'semifinals' | 'final';
  bracketMatchNumber?: number; // For organizing bracket display

  // Recurring booking fields
  isRecurring?: boolean;
  recurringPattern?: 'weekly';
  recurringGroupId?: string;
  recurringEndDate?: string;

  // Single user booking
  userId?: string;
  userEmail?: string;
  teamName?: string;
  phoneNumber?: string;
  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  type:
    | 'approved'
    | 'rejected'
    | 'cancelled'
    | 'match_scheduled'
    | 'team_approved'
    | 'team_declined'
    | 'team_registration'
    | 'booking'
    | 'general';
  bookingId?: string;
  teamId?: string;
  pitchType?: PitchType;
  date?: string;
  startTime?: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

export interface TimeSlot {
  time: string;
  hour: number;
  minute: number;
}

export type TeamLevel = 'beginner' | 'intermediate' | 'advanced';
export type PreferredDay = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';

export interface Team {
  id: string;
  name: string;
  userId: string;
  userEmail: string;
  phoneNumber: string;
  teamLevel: TeamLevel; // Team skill level
  preferredDay: PreferredDay; // Preferred playing day
  championship?: ChampionshipType;
  subgroup?: SubgroupType; // For MSL A/B teams
  status: TeamStatus;

  // OLD: visual-only flag used so far for top 8/16
  eliminated?: boolean;

  // NEW: knockout fields (for qualification + finals)
  knockoutStatus?: KnockoutStatus;  // 'none' | 'playoff' | 'safe' | 'eliminated'
  knockoutSeed?: number | null;     // 1..16 for ordering in bracket

  stats: {
    points: number;
    played: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDifference: number;
  };
  createdAt: Date;
  approvedAt?: Date;
  reviewedBy?: string;
  lastModified: Date;
}

export interface ChampionshipStanding {
  rank: number;
  teamName: string;
  teamId: string; // For tracking team reference
  points: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  eliminated?: boolean; // Visual indicator in merged table
}

// Championship configuration to track current phase
export interface ChampionshipConfig {
  id: string;
  championship: ChampionshipType;
  phase: ChampionshipPhase;
  seasonYear: string;
  finalistsCount?: number; // How many teams qualified for finals (8 for DL, 16 for A/B)
  lastModified: Date;
  modifiedBy?: string;
}

// Bracket match for knockout rounds
export interface BracketMatch {
  id: string;
  championship: ChampionshipType;
  round: 'round_of_16' | 'quarterfinals' | 'semifinals' | 'final';
  matchNumber: number;
  homeTeamId?: string;
  awayTeamId?: string;
  homeTeamName?: string;
  awayTeamName?: string;
  homeTeamScore?: number;
  awayTeamScore?: number;
  winnerId?: string;
  winnerName?: string;
  bookingId?: string; // Link to actual booking
  completed: boolean;
  nextMatchNumber?: number; // Which match does winner advance to
  createdAt: Date;
}

export interface SeasonArchive {
  id: string;
  championship: ChampionshipType;
  seasonYear: string;
  teams: Team[];
  finalStandings: ChampionshipStanding[];
  totalMatches: number;
  archivedAt: Date;
  archivedBy: string;
  subgroupArchives?: {
    // For MSL A/B with subgroups
    subgroup: SubgroupType;
    standings: ChampionshipStanding[];
  }[];
}
