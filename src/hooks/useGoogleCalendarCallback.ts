import { useEffect } from 'react';
import { googleCalendarService } from '../services/googleCalendarService';

/**
 * Hook to automatically handle Google Calendar OAuth callback
 * Place this in your main App component
 */
export function useGoogleCalendarCallback() {
  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const error = params.get('error');

      // Only handle if we have a code or error parameter
      if (!code && !error) return;

      if (error) {
        console.error('Google Calendar auth error:', error);
        alert('Failed to connect Google Calendar');
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }

      if (code) {
        try {
          await googleCalendarService.handleCallback(code);
          alert('Google Calendar connected successfully! ✅\n\nBookings will now automatically sync to your calendar.');
          // Clean URL
          window.history.replaceState({}, document.title, window.location.pathname);
          // Reload to update UI
          window.location.reload();
        } catch (err) {
          console.error('Error handling callback:', err);
          alert('Failed to connect Google Calendar');
          // Clean URL
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    };

    handleCallback();
  }, []);
}
