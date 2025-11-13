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
  type: 'approved' | 'rejected' | 'cancelled' | 'match_scheduled' | 'team_approved' | 'team_declined' | 'booking' | 'general';
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

export interface Team {
  id: string;
  name: string;
  userId: string;
  userEmail: string;
  phoneNumber: string;
  championship?: ChampionshipType;
  status: TeamStatus;
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
  points: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
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
}
