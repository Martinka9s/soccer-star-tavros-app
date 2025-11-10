import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar as CalendarIcon, Clock, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, parseISO, isFuture, subMonths, addMonths } from 'date-fns';
import { Booking, User } from '../types';
import { bookingService } from '../services/firebaseService';
import BookingModal from './BookingModal';

interface MyBookingsProps {
  user: User;
}

const MyBookings: React.FC<MyBookingsProps> = ({ user }) => {
  const { t } = useTranslation();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Admin filters for past bookings
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 4;

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);

  const isAdmin = user.role === 'admin';

  // Fetch bookings
  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);

    if (isAdmin) {
      // Admin: fetch ALL bookings from past 6 months to future 1 month
      const startDate = format(subMonths(new Date(), 6), 'yyyy-MM-dd');
      const endDate = format(addMonths(new Date(), 1), 'yyyy-MM-dd');
      
      bookingService.getAllBookingsInRange(startDate, endDate)
        .then((all) => {
          const visible = all.filter((b) => b.status !== 'blocked');
          setBookings(visible);
          setLoading(false);
        })
        .catch((error) => {
          console.error('Error loading bookings:', error);
          setBookings([]);
          setLoading(false);
        });
    } else {
      // Regular user: realtime subscription
      const unsubscribe = bookingService.listenBookingsByUserOrTeam(
        user.id,
        user.teamName,
        (all) => {
          const visible = all.filter((b) => b.status !== 'blocked');
          setBookings(visible);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id, user.teamName, isAdmin]);

  const isBookingFuture = (booking: Booking): boolean => {
    const bookingDateTime = parseISO(`${booking.date}T${booking.startTime}`);
    return isFuture(bookingDateTime);
  };

  const upcomingBookings = bookings.filter((b) => isBookingFuture(b));
  let pastBookings = bookings.filter((b) => !isBookingFuture(b));

  // Filter by date if admin selected a date
  if (isAdmin && selectedDate) {
    pastBookings = pastBookings.filter((b) => b.date === selectedDate);
  }

  // Pagination for past bookings
  const totalPages = Math.ceil(pastBookings.length / ITEMS_PER_PAGE);
  const paginatedPastBookings = pastBookings.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDate]);

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

  const handleEditBooking = (booking: Booking) => {
    setEditingBooking(booking);
    setShowEditModal(true);
  };

  const handleBookingUpdate = async (bookingData: any) => {
    if (!editingBooking) return;

    try {
      if (bookingData.delete) {
        await bookingService.deleteBooking(editingBooking.id);
      } else {
        await bookingService.updateBooking(editingBooking.id, bookingData);
      }
      
      setShowEditModal(false);
      setEditingBooking(null);
      
      // Refresh bookings list
      if (isAdmin) {
        const startDate = format(subMonths(new Date(), 6), 'yyyy-MM-dd');
        const endDate = format(addMonths(new Date(), 1), 'yyyy-MM-dd');
        const all = await bookingService.getAllBookingsInRange(startDate, endDate);
        const visible = all.filter((b) => b.status !== 'blocked');
        setBookings(visible);
      }
    } catch (error) {
      console.error('Error updating booking:', error);
      throw error;
    }
  };

  const renderBookingCard = (booking: Booking) => {
    const isMatch = isMatchBooking(booking);
    const canEdit = isAdmin; // Admin can edit all bookings

    const cardContent = (
      <div
        className={`bg-dark-lighter border rounded-lg p-4 transition-colors ${
          isMatch ? 'border-purple-600' : 'border-gray-700'
        } ${canEdit ? 'hover:border-primary cursor-pointer' : ''}`}
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

    if (canEdit) {
      return (
        <button
          key={booking.id}
          onClick={() => handleEditBooking(booking)}
          className="w-full text-left"
        >
          {cardContent}
        </button>
      );
    }

    return <div key={booking.id}>{cardContent}</div>;
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <h2 className="text-2xl font-bold text-white">{t('pastBookings')}</h2>
          
          {/* Admin Date Filter */}
          {isAdmin && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-400 whitespace-nowrap">Filter by date:</label>
              <div className="relative">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full sm:w-auto px-3 py-2 bg-dark border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-primary appearance-none"
                  style={{ 
                    colorScheme: 'dark',
                  }}
                  onClick={(e) => {
                    // Force the date picker to open
                    (e.target as HTMLInputElement).showPicker?.();
                  }}
                />
              </div>
              {selectedDate && (
                <button
                  onClick={() => setSelectedDate('')}
                  className="px-2 py-1 text-sm text-gray-400 hover:text-white bg-dark border border-gray-600 rounded whitespace-nowrap"
                >
                  Clear
                </button>
              )}
            </div>
          )}
        </div>

        {pastBookings.length === 0 && selectedDate && (
          <div className="bg-dark-lighter border border-gray-700 rounded-lg p-8 text-center text-gray-400">
            No bookings found for {format(parseISO(selectedDate), 'MMM d, yyyy')}
          </div>
        )}

        {pastBookings.length === 0 && !selectedDate && (
          <div className="bg-dark-lighter border border-gray-700 rounded-lg p-8 text-center text-gray-400">
            {t('noBookings')}
          </div>
        )}

        {pastBookings.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedPastBookings.map((b) => renderBookingCard(b))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-6">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 bg-dark border border-gray-600 rounded text-gray-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={20} />
                </button>
                
                <span className="text-gray-300">
                  Page {currentPage} of {totalPages}
                </span>
                
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 bg-dark border border-gray-600 rounded text-gray-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Edit Modal for Admin */}
      {showEditModal && editingBooking && isAdmin && (
        <BookingModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingBooking(null);
          }}
          onSubmit={handleBookingUpdate}
          selectedSlot={{
            pitch: editingBooking.pitchType,
            date: editingBooking.date,
            time: editingBooking.startTime,
          }}
          existingBooking={editingBooking}
          user={user}
          existingBookings={bookings}
        />
      )}
    </div>
  );
};

export default MyBookings;
