export type UserRole = 'user' | 'admin';
export type BookingStatus = 'available' | 'pending' | 'booked' | 'blocked';
export type PitchType = 'Pitch A' | 'Pitch B';
export type ChampionshipType = 'MSL DREAM LEAGUE' | 'MSL A' | 'MSL B';
export type TeamStatus = 'pending' | 'approved' | 'declined' | 'inactive';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  teamName?: string;
  phoneNumber?: string;
  teamId?: string; // Link to approved Team
  createdAt: Date;
}

export interface Booking {
  id: string;
  pitchType: PitchType;
  date: string; // YYYY-MM-DD format
  startTime: string; // HH:mm format
  duration: number; // in hours
  status: BookingStatus;
  
  // Match between two teams (when admin creates)
  homeTeam?: string;
  awayTeam?: string;
  homeTeamUserId?: string;
  awayTeamUserId?: string;
  
  // Match scores (entered by admin after match ends)
  homeTeamScore?: number;
  awayTeamScore?: number;
  matchCompleted?: boolean;
  
  // Championship assignment (for matches)
  championship?: ChampionshipType;
  
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
  type: 'approved' | 'rejected' | 'cancelled' | 'match_scheduled' | 'team_approved' | 'team_declined';
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

// Team with championship assignment and stats
export interface Team {
  id: string;
  name: string;
  userId: string;
  userEmail: string;
  phoneNumber: string;
  championship?: ChampionshipType; // Set when approved
  status: TeamStatus;
  stats: {
    points: number;        // Pts
    played: number;        // Pla
    wins: number;          // W
    draws: number;         // D
    losses: number;        // L
    goalsFor: number;      // GF
    goalsAgainst: number;  // GA
    goalDifference: number; // GD
  };
  createdAt: Date;
  approvedAt?: Date;
  reviewedBy?: string; // admin email who approved/declined
  lastModified: Date;
}

// Championship Standings (calculated view from Team stats)
export interface ChampionshipStanding {
  rank: number;
  teamName: string;
  points: number;        // Pts (Points)
  played: number;        // Pla
  wins: number;          // W
  draws: number;         // D
  losses: number;        // L
  goalsFor: number;      // GF
  goalsAgainst: number;  // GA
  goalDifference: number; // GD
}

// Historical season data (archived when championship is reset)
export interface SeasonArchive {
  id: string;
  championship: ChampionshipType;
  seasonYear: string; // "2024-2025"
  teams: Team[];
  finalStandings: ChampionshipStanding[];
  totalMatches: number;
  archivedAt: Date;
  archivedBy: string; // admin email
}
