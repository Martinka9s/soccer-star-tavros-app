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
        // Get today's date in YYYY-MM-DD format
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];

        // Count bookings that are:
        // 1. Confirmed or pending
        // 2. Date is today or in the future
        const active = bookings.filter((booking) => {
          const isActiveStatus = booking.status === 'confirmed' || booking.status === 'pending';
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
