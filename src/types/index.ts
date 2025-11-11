export type UserRole = 'user' | 'admin';
export type BookingStatus = 'available' | 'pending' | 'booked' | 'blocked';
export type PitchType = 'Pitch A' | 'Pitch B';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  teamName?: string; // NEW: User's team name
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
  
  // NEW: Match between two teams (when admin creates)
  homeTeam?: string;
  awayTeam?: string;
  homeTeamUserId?: string;
  awayTeamUserId?: string;
  
  // Existing: Single user booking
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
  type: 'approved' | 'rejected' | 'cancelled' | 'match_scheduled'; // NEW type
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
