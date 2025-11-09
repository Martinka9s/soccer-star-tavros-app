import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar as CalendarIcon, Clock, Users } from 'lucide-react';
import { format, parseISO, isFuture } from 'date-fns';
import { Booking, User } from '../types';
import { bookingService } from '../services/firebaseService';

interface MyBookingsProps {
  user: User;
}

const MyBookings: React.FC<MyBookingsProps> = ({ user }) => {
  const { t } = useTranslation();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // 🔄 Realtime subscription: user's own bookings + team matches
  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);

    const unsubscribe = bookingService.listenBookingsByUserOrTeam(
      user.id,
      user.teamName,
      (all) => {
        // Hide only blocked; show pending + booked
        const visible = all.filter((b) => b.status !== 'blocked');
        setBookings(visible);
        setLoading(false);
      }
    );

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id, user.teamName]);

  const isBookingFuture = (booking: Booking): boolean => {
    const bookingDateTime = parseISO(`${booking.date}T${booking.startTime}`);
    return isFuture(bookingDateTime);
  };

  const upcomingBookings = bookings.filter((b) => isBookingFuture(b));
  const pastBookings = bookings.filter((b) => !isBookingFuture(b));

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'pending':
        return 'bg-amber-500 text-white';
      case 'booked':
        return 'bg-green-500 text-white';
      case 'blocked':
        return 'bg-slate-600 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const isMatchBooking = (booking: Booking): boolean =>
    !!(booking.homeTeam && booking.awayTeam);

  const renderBookingCard = (booking: Booking) => {
    const isMatch = isMatchBooking(booking);

    return (
      <div
        key={booking.id}
        className={`bg-dark-lighter border rounded-lg p-4 hover:border-primary transition-colors ${
          isMatch ? 'border-purple-600' : 'border-gray-700'
        }`}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold text-white">{booking.pitchType}</h3>
              {isMatch && (
                <span className="text-xs bg-purple-600 text-white px-2 py-1 rounded-full flex items-center gap-1">
                  <Users size={12} />
                  Match
                </span>
              )}
            </div>

            {isMatch ? (
              <div className="mt-2 text-white">
                <div className="flex items-center gap-2 text-base font-medium">
                  <span className={user.teamName === booking.homeTeam ? 'text-primary font-bold' : ''}>
                    {booking.homeTeam}
                  </span>
                  <span className="text-gray-400">vs</span>
                  <span className={user.teamName === booking.awayTeam ? 'text-primary font-bold' : ''}>
                    {booking.awayTeam}
                  </span>
                </div>
              </div>
            ) : booking.teamName ? (
              <div className="mt-2">
                <span className="text-sm text-gray-400">Team: </span>
                <span className="text-sm text-white">{booking.teamName}</span>
              </div>
            ) : null}

            <div className="flex items-center space-x-4 mt-3 text-sm text-gray-400">
              <div className="flex items-center space-x-1">
                <CalendarIcon size={16} />
                <span>{format(parseISO(booking.date), 'MMM d, yyyy')}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock size={16} />
                <span>
                  {booking.startTime} ({booking.duration}h)
                </span>
              </div>
            </div>
          </div>

          <span
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(
              booking.status
            )}`}
          >
            {t(booking.status)}
          </span>
        </div>

        {!isMatch && booking.phoneNumber ? (
          <div className="mt-2">
            <span className="text-sm text-gray-400">Phone: </span>
            <span className="text-sm text-white">{booking.phoneNumber}</span>
          </div>
        ) : null}

        {booking.notes ? (
          <div className="mt-3 p-2 bg-dark rounded text-sm text-gray-300">
            <span className="text-gray-400">Notes: </span>
            {booking.notes}
          </div>
        ) : null}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="text-center py-12 text-gray-400">Loading your bookings...</div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Upcoming Bookings */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">{t('upcomingBookings')}</h2>
        {upcomingBookings.length === 0 ? (
          <div className="bg-dark-lighter border border-gray-700 rounded-lg p-8 text-center text-gray-400">
            {t('noBookings')}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingBookings.map((b) => renderBookingCard(b))}
          </div>
        )}
      </div>

      {/* Past Bookings */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">{t('pastBookings')}</h2>
        {pastBookings.length === 0 ? (
          <div className="bg-dark-lighter border border-gray-700 rounded-lg p-8 text-center text-gray-400">
            {t('noBookings')}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pastBookings.map((b) => renderBookingCard(b))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyBookings;
