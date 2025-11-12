export type UserRole = 'user' | 'admin';
export type BookingStatus = 'available' | 'pending' | 'booked' | 'blocked';
export type PitchType = 'Pitch A' | 'Pitch B';
export type ChampionshipType = 'MSL DREAM LEAGUE' | 'MSL A' | 'MSL B';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  teamName?: string;
  phoneNumber?: string;
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
  type: 'approved' | 'rejected' | 'cancelled' | 'match_scheduled';
  bookingId: string;
  pitchType: PitchType;
  date: string;
  startTime: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

export interface TimeSlot {
  time: string;
  hour: number;
  minute: number;
}

// Championship Team interface (for future team management)
export interface Team {
  id: string;
  name: string;
  championship: ChampionshipType;
  createdAt: Date;
}

// Championship Standings interface (calculated from match results)
export interface ChampionshipStanding {
  rank: number;
  teamName: string;
  points: number;        // Pts
  played: number;        // Pla
  wins: number;          // W
  draws: number;         // D
  losses: number;        // L
  goalsFor: number;      // GF
  goalsAgainst: number;  // GA
  goalDifference: number; // GD
}
