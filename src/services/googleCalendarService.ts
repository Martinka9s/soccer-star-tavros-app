import { Booking } from '../types';

interface GoogleCalendarConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  colorId?: string;
}

class GoogleCalendarService {
  private config: GoogleCalendarConfig;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    this.config = {
      clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
      clientSecret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET || '',
      redirectUri: import.meta.env.VITE_GOOGLE_REDIRECT_URI || 'http://localhost:5173',
    };

    // Load tokens from localStorage
    this.loadTokens();
  }

  private loadTokens() {
    try {
      this.accessToken = localStorage.getItem('google_access_token');
      this.refreshToken = localStorage.getItem('google_refresh_token');
    } catch (e) {
      console.warn('Failed to load Google tokens:', e);
    }
  }

  private saveTokens(accessToken: string, refreshToken?: string) {
    try {
      this.accessToken = accessToken;
      localStorage.setItem('google_access_token', accessToken);
      
      if (refreshToken) {
        this.refreshToken = refreshToken;
        localStorage.setItem('google_refresh_token', refreshToken);
      }
    } catch (e) {
      console.warn('Failed to save Google tokens:', e);
    }
  }

  clearTokens() {
    try {
      this.accessToken = null;
      this.refreshToken = null;
      localStorage.removeItem('google_access_token');
      localStorage.removeItem('google_refresh_token');
      localStorage.removeItem('google_calendar_email');
    } catch (e) {
      console.warn('Failed to clear Google tokens:', e);
    }
  }

  isConnected(): boolean {
    return !!this.accessToken;
  }

  getConnectedEmail(): string | null {
    try {
      return localStorage.getItem('google_calendar_email');
    } catch {
      return null;
    }
  }

  /**
   * Initiate OAuth flow - redirects user to Google login
   */
  async connect() {
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.append('client_id', this.config.clientId);
    authUrl.searchParams.append('redirect_uri', this.config.redirectUri);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', 'https://www.googleapis.com/auth/calendar');
    authUrl.searchParams.append('access_type', 'offline');
    authUrl.searchParams.append('prompt', 'consent');

    window.location.href = authUrl.toString();
  }

  /**
   * Handle OAuth callback - exchange code for tokens
   */
  async handleCallback(code: string): Promise<void> {
    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code,
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          redirect_uri: this.config.redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to exchange code for tokens');
      }

      const data = await response.json();
      this.saveTokens(data.access_token, data.refresh_token);

      // Get user email
      await this.fetchUserEmail();
    } catch (error) {
      console.error('Error handling OAuth callback:', error);
      throw error;
    }
  }

  private async fetchUserEmail() {
    if (!this.accessToken) return;

    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('google_calendar_email', data.email);
      }
    } catch (error) {
      console.warn('Failed to fetch user email:', error);
    }
  }

  /**
   * Refresh access token using refresh token
   */
  private async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) {
      return false;
    }

    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          refresh_token: this.refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      this.saveTokens(data.access_token);
      return true;
    } catch (error) {
      console.error('Error refreshing token:', error);
      return false;
    }
  }

  /**
   * Make authenticated request to Google Calendar API
   */
  private async makeRequest(url: string, options: RequestInit = {}): Promise<Response> {
    if (!this.accessToken) {
      throw new Error('Not connected to Google Calendar');
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    // If unauthorized, try to refresh token and retry
    if (response.status === 401) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        // Retry request with new token
        return fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        });
      }
    }

    return response;
  }

  /**
   * Create calendar event from booking
   */
  async createEvent(booking: Booking): Promise<string | null> {
    if (!this.isConnected()) {
      console.warn('Google Calendar not connected - skipping event creation');
      return null;
    }

    try {
      const event = this.bookingToCalendarEvent(booking);
      
      const response = await this.makeRequest(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        {
          method: 'POST',
          body: JSON.stringify(event),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to create event: ${response.statusText}`);
      }

      const data = await response.json();
      return data.id;
    } catch (error) {
      console.error('Error creating calendar event:', error);
      return null;
    }
  }

  /**
   * Update calendar event
   */
  async updateEvent(eventId: string, booking: Booking): Promise<boolean> {
    if (!this.isConnected()) {
      return false;
    }

    try {
      const event = this.bookingToCalendarEvent(booking);
      
      const response = await this.makeRequest(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
        {
          method: 'PUT',
          body: JSON.stringify(event),
        }
      );

      return response.ok;
    } catch (error) {
      console.error('Error updating calendar event:', error);
      return false;
    }
  }

  /**
   * Delete calendar event
   */
  async deleteEvent(eventId: string): Promise<boolean> {
    if (!this.isConnected()) {
      return false;
    }

    try {
      const response = await this.makeRequest(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
        {
          method: 'DELETE',
        }
      );

      return response.ok;
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      return false;
    }
  }

  /**
   * Convert booking to Google Calendar event format
   */
  private bookingToCalendarEvent(booking: Booking): CalendarEvent {
    // Parse date and time
    const [year, month, day] = booking.date.split('-').map(Number);
    const [hours, minutes] = booking.startTime.split(':').map(Number);
    
    const startDate = new Date(year, month - 1, day, hours, minutes);
    const endDate = new Date(startDate.getTime() + booking.duration * 60 * 60 * 1000);

    // Format title
    let summary = `${booking.pitchType}`;
    
    if (booking.homeTeam && booking.awayTeam) {
      summary += `: ${booking.homeTeam} vs ${booking.awayTeam}`;
    } else if (booking.teamName) {
      summary += `: ${booking.teamName}`;
    } else if (booking.userEmail) {
      summary += `: ${booking.userEmail}`;
    }

    // Build description
    const descriptionParts: string[] = [];
    descriptionParts.push(`Status: ${booking.status}`);
    
    if (booking.homeTeam && booking.awayTeam) {
      descriptionParts.push(`Match: ${booking.homeTeam} vs ${booking.awayTeam}`);
    }
    
    if (booking.teamName) {
      descriptionParts.push(`Team: ${booking.teamName}`);
    }
    
    if (booking.userEmail) {
      descriptionParts.push(`Email: ${booking.userEmail}`);
    }
    
    if (booking.phoneNumber) {
      descriptionParts.push(`Phone: ${booking.phoneNumber}`);
    }
    
    if (booking.notes) {
      descriptionParts.push(`Notes: ${booking.notes}`);
    }

    // Color: green for booked, yellow for pending, red for blocked
    let colorId = '9'; // blue default
    if (booking.status === 'booked') colorId = '10'; // green
    else if (booking.status === 'pending') colorId = '5'; // yellow
    else if (booking.status === 'blocked') colorId = '11'; // red

    return {
      summary,
      description: descriptionParts.join('\n'),
      start: {
        dateTime: startDate.toISOString(),
        timeZone: 'Europe/Athens', // Greek timezone
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: 'Europe/Athens',
      },
      colorId,
    };
  }
}

export const googleCalendarService = new GoogleCalendarService();
