import { useEffect, useState } from 'react';
import { bookingService } from '../services/firebaseService';

export function useActiveBookings(userId?: string | null, teamName?: string) {
  const [activeCount, setActiveCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) {
      setActiveCount(0);
      return;
    }

    setLoading(true);

    // Set up listener for bookings
    const unsubscribe = bookingService.listenBookingsByUserOrTeam(
      userId,
      teamName,
      (bookings) => {
        // Get today's date in YYYY-MM-DD format (local timezone)
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;

        // Count bookings that are:
        // 1. Booked or pending (NOT 'available' or 'blocked')
        // 2. Date is today or in the future
        const active = bookings.filter((booking) => {
          const isActiveStatus = booking.status === 'booked' || booking.status === 'pending';
          const isFutureOrToday = booking.date >= todayStr;
          return isActiveStatus && isFutureOrToday;
        });

        setActiveCount(active.length);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [userId, teamName]);

  return { activeCount, loading };
}
