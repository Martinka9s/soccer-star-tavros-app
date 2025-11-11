import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar as CalendarIcon, Clock, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, parseISO, subMonths, addMonths, addDays, isBefore, addMinutes, compareAsc } from 'date-fns';
import { Booking, User } from '../types';
import { bookingService } from '../services/firebaseService';
import BookingModal from './BookingModal';

interface MyBookingsProps {
  user: User;
}

/** ---- Robust time parsing ----
 * Accepts formats like: "9", "09", "9:0", "9:00", "21.00", "21h", "21:00 - 22:00", "21:00  "
 * Returns hh (0–23), mm (0–59), or null if no hour found.
 */
function parseTimeFlexible(timeRaw: string | undefined | null): { hh: number; mm: number } | null {
  const s = (timeRaw || '').trim();

  // take only the first token if there is a range like "21:00 - 22:00"
  const firstToken = s.split(/\s|-/)[0] || s;

  // Try to capture H, HH, H:mm, HH:mm, H.mm, HH.mm
  const m = firstToken.match(/^(\d{1,2})(?::|\.|h)?(\d{1,2})?$/i);
  if (!m) return null;

  let hh = Number(m[1]);
  let mm = m[2] ? Number(m[2]) : 0;

  if (Number.isNaN(hh) || hh < 0 || hh > 23) return null;
  if (Number.isNaN(mm) || mm < 0 || mm > 59) mm = 0;

  return { hh, mm };
}

// Build a local Date from "yyyy-MM-dd" and a flexible time string
function toLocalDateTime(dateStr: string, timeStr: string): Date | null {
  try {
    const [y, m, d] = (dateStr || '').split('-').map((v) => Number(v));
    if (!y || !m || !d) return null;

    const parsed = parseTimeFlexible(timeStr);
    if (!parsed) return null;

    return new Date(y, m - 1, d, parsed.hh, parsed.mm, 0, 0);
  } catch {
    return null;
  }
}

// ⏱️ Helpers to compute start/end and sort consistently
function startOfBooking(b: Booking): Date | null {
  return toLocalDateTime(b.date, b.startTime);
}
function endOfBooking(b: Booking): Date | null {
  const s = startOfBooking(b);
  if (!s) return null;
  const minutes = Math.round((Number(b.duration ?? 1)) * 60) || 60; // default 1h if bad/missing
  return addMinutes(s, minutes);
}
function byAsc(a: Date, b: Date) {
  return compareAsc(a, b);
}
function byDesc(a: Date, b: Date) {
  return compareAsc(b, a);
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
      // Admin: fetch ALL bookings from past 6 months to future 1 month (source dataset)
      const startDate = format(subMonths(new Date(), 6), 'yyyy-MM-dd');
      const endDate = format(addMonths(new Date(), 1), 'yyyy-MM-dd');

      bookingService
        .getAllBookingsInRange(startDate, endDate)
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
      // Regular user: pseudo-realtime subscription (polling)
      // ✅ FIXED: Removed 4th argument (phoneNumber)
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
  }, [user.id, user.teamName, user.phoneNumber, isAdmin]);

  // ✅ Upcoming window: admins see next 7 days; users see all future/ongoing
  const now = new Date();
  const in7 = addDays(now, 7);

  // Grace: treat very recent endings (±2 min) as ongoing (clock drift/seconds)
  const GRACE_MS = 2 * 60 * 1000;

  // A booking is "upcoming" if it hasn't ENDED yet (end > now - grace).
  // Admins additionally limit to those starting within the next 7 days.
  const isBookingInUpcomingWindow = (b: Booking): boolean => {
    const start = startOfBooking(b);
    const end = endOfBooking(b);
    if (!start || !end) return false;

    const notEndedYet = end.getTime() > now.getTime() - GRACE_MS;
    if (!notEndedYet) return false;

    if (isAdmin) {
      // show if it starts within next 7 days
      return isBefore(start, in7) || +start === +in7;
    }
    // users: show all future/ongoing
    return true;
  };

  // A booking is "past" only if it has ENDED (end <= now - grace)
  const isBookingPast = (b: Booking): boolean => {
    const end = endOfBooking(b);
    if (!end) return true; // invalid → treat as past so it's still visible somewhere
    return end.getTime() <= now.getTime() - GRACE_MS;
  };

  // Build lists + sort (upcoming soonest first, past most-recent first)
  const upcomingBookings = bookings
    .filter((b) => isBookingInUpcomingWindow(b))
    .sort((a, b) => byAsc(startOfBooking(a)!, startOfBooking(b)!));

  let pastBookings = bookings
    .filter((b) => isBookingPast(b))
    .sort((a, b) => byDesc(startOfBooking(a)!, startOfBooking(b)!));

  // Filter by date if admin selected a date (applies to PAST section)
  if (isAdmin && selectedDate) {
    pastBookings = pastBookings.filter((b) => b.date === selectedDate);
  }

  // Pagination for past bookings
  const totalPages = Math.ceil(pastBookings.length / ITEMS_PER_PAGE) || 1;
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
      case 'approved': // in case some singles use 'approved'
        return 'bg-green-500 text-white';
      case 'blocked':
        return 'bg-slate-600 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const isMatchBooking = (booking: Booking): boolean => !!(booking.homeTeam && booking.awayTeam);

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

      // Refresh bookings list for admin
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

  const renderBookingCard = (booking: Booking, isPast: boolean = false) => {
    const isMatch = isMatchBooking(booking);
    const canEdit = isAdmin;

    const cardContent = (
      <div
        className={`bg-slate-50 dark:bg-dark-lighter border rounded-lg p-4 transition-colors h-full border-slate-200 dark:border-gray-700 ${
          canEdit ? 'hover:border-[#6B2FB5] dark:hover:border-primary' : ''
        }`}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{booking.pitchType}</h3>
              {isMatch && (
                <span className="text-xs bg-purple-600 text-white px-2 py-1 rounded-full flex items-center gap-1">
                  <Users size={12} />
                  Match
                </span>
              )}
            </div>

            {isMatch ? (
              <div className="mt-2 text-gray-900 dark:text-white">
                <div className="space-y-0.5">
                  <span
                    className={`block w-full overflow-hidden text-ellipsis whitespace-nowrap ${
                      user.teamName === booking.homeTeam ? 'text-[#6B2FB5] dark:text-primary font-bold' : ''
                    }`}
                    title={booking.homeTeam}
                    aria-label={booking.homeTeam}
                  >
                    {booking.homeTeam}
                  </span>
                  <span
                    className={`block w-full overflow-hidden text-ellipsis whitespace-nowrap ${
                      user.teamName === booking.awayTeam ? 'text-[#6B2FB5] dark:text-primary font-bold' : ''
                    }`}
                    title={booking.awayTeam}
                    aria-label={booking.awayTeam}
                  >
                    {booking.awayTeam}
                  </span>
                </div>
              </div>
            ) : booking.teamName ? (
              <div className="mt-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">{t('team') || 'Team'}: </span>
                <span
                  className="text-sm text-gray-900 dark:text-white block w-full overflow-hidden text-ellipsis whitespace-nowrap"
                  title={booking.teamName}
                  aria-label={booking.teamName}
                >
                  {booking.teamName}
                </span>
              </div>
            ) : null}

            <div className="flex items-center space-x-4 mt-3 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center space-x-1">
                <CalendarIcon size={16} />
                {/* date string is safe for parseISO to render a label */}
                <span>{format(parseISO(booking.date), 'MMM d, yyyy')}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock size={16} />
                <span>
                  {(booking.startTime || '').trim()} ({booking.duration}h)
                </span>
              </div>
            </div>
          </div>

          {!isPast && (
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(
                booking.status
              )}`}
            >
              {t(booking.status)}
            </span>
          )}
        </div>

        {!isMatch && booking.phoneNumber ? (
          <div className="mt-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">{t('phone') || 'Phone'}: </span>
            <span className="text-sm text-gray-900 dark:text-white block w-full overflow-hidden text-ellipsis whitespace-nowrap">
              {booking.phoneNumber}
            </span>
          </div>
        ) : null}

        {booking.notes ? (
          <div className="mt-3 p-2 bg-slate-100 dark:bg-dark rounded text-sm text-gray-700 dark:text-gray-300">
            <span className="text-gray-600 dark:text-gray-400">{t('notes') || 'Notes'}: </span>
            <span className="block w-full overflow-hidden text-ellipsis whitespace-nowrap">
              {booking.notes}
            </span>
          </div>
        ) : null}
      </div>
    );

    if (canEdit) {
      return (
        <button
          key={booking.id}
          onClick={() => handleEditBooking(booking)}
          className="w-full text-left h-full hover:scale-[1.02] transition-transform"
          type="button"
        >
          {cardContent}
        </button>
      );
    }

    return <div key={booking.id} className="h-full">{cardContent}</div>;
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-600 dark:text-gray-400">Loading your bookings...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Upcoming Bookings */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t('upcomingBookings')}</h2>
        {upcomingBookings.length === 0 ? (
          <div className="bg-slate-50 dark:bg-dark-lighter border border-slate-200 dark:border-gray-700 rounded-lg p-8 text-center text-gray-600 dark:text-gray-400">
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('pastBookings')}</h2>

          {/* Admin Date Filter */}
          {isAdmin && (
            <div className="flex items-center gap-2">
              <div className="relative">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value || '')}
                  onInput={(e) => setSelectedDate((e.target as HTMLInputElement).value || '')}
                  className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
                  style={{ colorScheme: 'dark' }}
                  id="date-filter-input"
                  onClick={(e) => {
                    (e.target as HTMLInputElement).showPicker?.();
                  }}
                />
                <div className="px-4 py-2 bg-slate-100 dark:bg-dark border border-slate-300 dark:border-gray-600 rounded text-gray-900 dark:text-white text-sm hover:border-[#6B2FB5] dark:hover:border-primary transition-colors flex items-center gap-2 pointer-events-none">
                  <CalendarIcon size={16} />
                  {selectedDate ? format(parseISO(selectedDate), 'MMM d, yyyy') : 'Filter by date'}
                </div>
              </div>

              {selectedDate && (
                <button
                  onClick={() => setSelectedDate('')}
                  className="px-3 py-2 bg-slate-200 dark:bg-gray-600 hover:bg-slate-300 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded text-sm"
                >
                  Clear
                </button>
              )}
            </div>
          )}
        </div>

        {pastBookings.length === 0 && selectedDate && (
          <div className="bg-slate-50 dark:bg-dark-lighter border border-slate-200 dark:border-gray-700 rounded-lg p-8 text-center text-gray-600 dark:text-gray-400">
            No bookings found for {format(parseISO(selectedDate), 'MMM d, yyyy')}
          </div>
        )}

        {pastBookings.length === 0 && !selectedDate && (
          <div className="bg-slate-50 dark:bg-dark-lighter border border-slate-200 dark:border-gray-700 rounded-lg p-8 text-center text-gray-600 dark:text-gray-400">
            {t('noBookings')}
          </div>
        )}

        {pastBookings.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedPastBookings.map((b) => renderBookingCard(b, true))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-6">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 bg-slate-100 dark:bg-dark border border-slate-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={20} />
                </button>

                <span className="text-gray-700 dark:text-gray-300">
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 bg-slate-100 dark:bg-dark border border-slate-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
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
