import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
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

  useEffect(() => {
    loadBookings();
  }, [user.id]);

  const loadBookings = async () => {
    setLoading(true);
    try {
      const userBookings = await bookingService.getBookingsByUser(user.id);
      setBookings(userBookings);
    } catch (error) {
      console.error('Error loading bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const isBookingFuture = (booking: Booking): boolean => {
    const bookingDateTime = parseISO(`${booking.date}T${booking.startTime}`);
    return isFuture(bookingDateTime);
  };

  const upcomingBookings = bookings.filter(
    (b) => isBookingFuture(b) && b.status !== 'blocked'
  );
  const pastBookings = bookings.filter(
    (b) => !isBookingFuture(b) && b.status !== 'blocked'
  );

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

  const renderBookingCard = (booking: Booking) => (
    <div
      key={booking.id}
      className="bg-dark-lighter border border-gray-700 rounded-lg p-4 hover:border-primary transition-colors"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-semibold text-white">{booking.pitchType}</h3>
          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-400">
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
          className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
            booking.status
          )}`}
        >
          {t(booking.status)}
        </span>
      </div>

      {booking.teamName && (
        <div className="mt-2">
          <span className="text-sm text-gray-400">Team: </span>
          <span className="text-sm text-white">{booking.teamName}</span>
        </div>
      )}

      {booking.phoneNumber && (
        <div className="mt-1">
          <span className="text-sm text-gray-400">Phone: </span>
          <span className="text-sm text-white">{booking.phoneNumber}</span>
        </div>
      )}

      {booking.notes && (
        <div className="mt-2 p-2 bg-dark rounded text-sm text-gray-300">
          {booking.notes}
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="text-center py-12 text-gray-400">
        Loading your bookings...
      </div>
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
            {upcomingBookings.map(renderBookingCard)}
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
            {pastBookings.map(renderBookingCard)}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyBookings;
