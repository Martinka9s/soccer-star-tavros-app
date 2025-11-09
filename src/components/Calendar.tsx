import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addDays, subDays, startOfDay, isBefore, parseISO } from 'date-fns';
import { Booking, PitchType, User } from '../types';
import { bookingService, notificationService } from '../services/firebaseService';
import BookingModal from './BookingModal';

interface CalendarProps {
  user: User | null;
  onLoginRequired: () => void;
}

const Calendar: React.FC<CalendarProps> = ({ user, onLoginRequired }) => {
  const { t } = useTranslation();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedSlot, setSelectedSlot] = useState<{
    pitch: PitchType;
    date: string;
    time: string;
  } | null>(null);

  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showModal, setShowModal] = useState(false);

  // visual pitch toggle (pill buttons on the right)
  const [activePitch, setActivePitch] = useState<PitchType>('Pitch A');

  const dateString = format(currentDate, 'yyyy-MM-dd');

  useEffect(() => {
    loadBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateString]);

  const loadBookings = async () => {
    setLoading(true);
    try {
      const data = await bookingService.getBookingsByDate(dateString);
      setBookings(data);
    } catch (error) {
      console.error('Error loading bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  // Slots from 09:00 up to 00:00–01:00 (last slot starts at midnight)
  const timeSlots = Array.from({ length: 16 }, (_, i) => {
    const startHour24 = 9 + i;                 // 9..24
    const endHour24 = (startHour24 + 1) % 24;  // 10..01
    const start = `${(startHour24 % 24).toString().padStart(2, '0')}:00`;
    const labelStart = start;
    const labelEnd = `${endHour24.toString().padStart(2, '0')}:00`;
    return {
      time: start,                      // start time in 24h
      display: `${labelStart} - ${labelEnd}`, // e.g., 23:00 - 00:00, 00:00 - 01:00
    };
  });

  const getSlotStatus = (
    pitch: PitchType,
    time: string
  ): { status: 'available' | 'pending' | 'booked' | 'blocked'; booking?: Booking } => {
    const [hours, minutes] = time.split(':').map(Number);
    const slotStartMinutes = hours * 60 + minutes;

    for (const booking of bookings) {
      if (booking.pitchType !== pitch || booking.status === 'available') continue;

      const [bookingHours, bookingMinutes] = booking.startTime.split(':').map(Number);
      const bookingStartMinutes = bookingHours * 60 + bookingMinutes;
      const bookingEndMinutes = bookingStartMinutes + booking.duration * 60;

      if (slotStartMinutes >= bookingStartMinutes && slotStartMinutes < bookingEndMinutes) {
        return { status: booking.status, booking };
      }
    }

    return { status: 'available' };
  };

  const getCardClasses = (status: string): string => {
    switch (status) {
      case 'available':
        return 'bg-[#2C3144] hover:bg-[#343a52]';
      case 'pending':
        return 'bg-amber-600/30 hover:bg-amber-600/40 border border-amber-500/40';
      case 'booked':
        return 'bg-red-600/30 hover:bg-red-600/40 border border-red-500/40';
      case 'blocked':
        return 'bg-slate-700/60 hover:bg-slate-700/70';
      default:
        return 'bg-[#2C3144] hover:bg-[#343a52]';
    }
  };

  const handleSlotClick = (pitch: PitchType, time: string) => {
    const today = startOfDay(new Date());
    const selectedDate = startOfDay(parseISO(dateString + 'T00:00:00'));

    if (isBefore(selectedDate, today)) {
      alert(t('pastDateError'));
      return;
    }

    const { status, booking } = getSlotStatus(pitch, time);

    if (!user) {
      onLoginRequired();
      return;
    }

    if (user.role === 'admin') {
      setSelectedSlot({ pitch, date: dateString, time });
      setSelectedBooking(booking || null);
      setShowModal(true);
    } else {
      if (status === 'available') {
        setSelectedSlot({ pitch, date: dateString, time });
        setSelectedBooking(null);
        setShowModal(true);
      }
    }
  };

  const handleBookingSubmit = async (bookingData: any) => {
    if (!selectedSlot) return;

    try {
      if (bookingData.delete && selectedBooking) {
        await bookingService.deleteBooking(selectedBooking.id);

        // Send cancellation notification
        if (selectedBooking.userId && user?.role === 'admin') {
          await notificationService.createNotification(
            selectedBooking.userId,
            'cancelled',
            selectedBooking.id,
            selectedBooking.pitchType,
            selectedBooking.date,
            selectedBooking.startTime,
            t('bookingCancelled', {
              pitch: selectedBooking.pitchType,
              date: selectedBooking.date,
              time: selectedBooking.startTime,
            })
          );
        }

        // If it was a match, notify both teams
        if (selectedBooking.homeTeam && selectedBooking.awayTeam) {
          if (selectedBooking.homeTeamUserId) {
            await notificationService.createNotification(
              selectedBooking.homeTeamUserId,
              'cancelled',
              selectedBooking.id,
              selectedBooking.pitchType,
              selectedBooking.date,
              selectedBooking.startTime,
              `Match cancelled: ${selectedBooking.homeTeam} vs ${selectedBooking.awayTeam}`
            );
          }
          if (selectedBooking.awayTeamUserId) {
            await notificationService.createNotification(
              selectedBooking.awayTeamUserId,
              'cancelled',
              selectedBooking.id,
              selectedBooking.pitchType,
              selectedBooking.date,
              selectedBooking.startTime,
              `Match cancelled: ${selectedBooking.homeTeam} vs ${selectedBooking.awayTeam}`
            );
          }
        }
      } else if (selectedBooking) {
        // Update existing booking
        await bookingService.updateBooking(selectedBooking.id, bookingData);
      } else {
        // Create new booking
        const bookingId = await bookingService.createBooking({
          ...bookingData,
          pitchType: selectedSlot.pitch,
          date: selectedSlot.date,
          startTime: selectedSlot.time,
        });

        // Send notifications based on booking type
        if (bookingData.homeTeam && bookingData.awayTeam) {
          // Match booking - notify both teams
          if (bookingData.homeTeamUserId) {
            await notificationService.createMatchNotification(
              bookingData.homeTeamUserId,
              bookingId,
              selectedSlot.pitch,
              selectedSlot.date,
              selectedSlot.time,
              bookingData.homeTeam,
              bookingData.awayTeam,
              true // isHomeTeam
            );
          }
          if (bookingData.awayTeamUserId) {
            await notificationService.createMatchNotification(
              bookingData.awayTeamUserId,
              bookingId,
              selectedSlot.pitch,
              selectedSlot.date,
              selectedSlot.time,
              bookingData.homeTeam,
              bookingData.awayTeam,
              false // isHomeTeam (away team)
            );
          }
        } else if (bookingData.userId && bookingData.userId !== user?.id) {
          // Single team booking by admin - notify the team owner
          await notificationService.createNotification(
            bookingData.userId,
            'approved',
            bookingId,
            selectedSlot.pitch,
            selectedSlot.date,
            selectedSlot.time,
            `Booking confirmed for ${bookingData.teamName || 'your team'} on ${selectedSlot.date} at ${selectedSlot.time}`
          );
        }
        // Guest bookings (no userId or userId === admin) don't get notifications
      }

      await loadBookings();
      setShowModal(false);
      setSelectedSlot(null);
      setSelectedBooking(null);
    } catch (error) {
      console.error('Error submitting booking:', error);
      throw error;
    }
  };

  const goToPrevious = () => setCurrentDate(subDays(currentDate, 1));
  const goToNext = () => setCurrentDate(addDays(currentDate, 1));

  // Helper: show match vs; otherwise email/team on a separate line
  const getBookingDisplayText = (booking: Booking): string => {
    if (booking.homeTeam && booking.awayTeam) {
      return `${booking.homeTeam} vs ${booking.awayTeam}`;
    }
    return booking.teamName || booking.userEmail || '';
  };

  // NEW: mask email like "local@g…"
  const maskEmail = (email: string) => {
    if (!email) return '';
    const [local, domain = ''] = email.split('@');
    const domainFirst = domain[0] || '';
    return `${local}@${domainFirst}…`;
  };

  return (
    <div className="space-y-6">
      {/* Title + Subtitle centered */}
      <div className="text-center">
        <h1 className="text-4xl font-extrabold text-white">{t('livePitchAvailability')}</h1>
        <p className="mt-2 text-base text-gray-300">{t('selectDateAndPitch')}</p>
      </div>

      {/* Legend: 3 on first row, 1 centered below (mobile); single row on sm+ */}
      <div className="grid grid-cols-3 gap-x-4 gap-y-2 sm:flex sm:flex-nowrap sm:items-center sm:justify-center sm:gap-6 text-sm">
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full bg-[#2C3144]" />
          <span className="text-gray-300">{t('available')}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full bg-amber-500" />
          <span className="text-gray-300">{t('pending')}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full bg-red-500" />
          <span className="text-gray-300">{t('booked')}</span>
        </div>
        <div className="flex items-center gap-2 col-span-3 justify-center sm:col-span-1 sm:justify-start">
          <span className="inline-block h-3 w-3 rounded-full bg-slate-600" />
          <span className="text-gray-300">{t('blocked')}</span>
        </div>
      </div>

      {/* Banner bar */}
      <div className="bg-dark-lighter rounded-xl px-4 py-3">
        {/* Mobile (app) layout: centered date with arrows; pills below */}
        <div className="sm:hidden">
          {/* Row 1: arrows + centered date */}
          <div className="grid grid-cols-[auto,1fr,auto] items-center">
            <button
              onClick={goToPrevious}
              className="h-9 w-9 flex items-center justify-center rounded-lg bg-dark text-gray-300 hover:text-white justify-self-start"
              aria-label="Previous day"
            >
              <ChevronLeft size={18} />
            </button>

            <div className="text-center">
              <div className="text-xl font-semibold text-white">
                {format(currentDate, 'EEEE, MMM d')}
              </div>
            </div>

            <button
              onClick={goToNext}
              className="h-9 w-9 flex items-center justify-center rounded-lg bg-dark text-gray-300 hover:text-white justify-self-end"
              aria-label="Next day"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Row 2: Pitch A / Pitch B under the date */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={() => setActivePitch('Pitch A')}
              className={`h-9 px-5 w-full rounded-lg text-sm font-medium transition-colors border ${
                activePitch === 'Pitch A'
                  ? 'bg-primary text-white border-transparent'
                  : 'bg-dark text-gray-200 border-gray-700 hover:text-white'
              }`}
            >
              {t('pitchA')}
            </button>
            <button
              onClick={() => setActivePitch('Pitch B')}
              className={`h-9 px-5 w-full rounded-lg text-sm font-medium transition-colors border ${
                activePitch === 'Pitch B'
                  ? 'bg-primary text-white border-transparent'
                  : 'bg-dark text-gray-200 border-gray-700 hover:text-white'
              }`}
            >
              {t('pitchB')}
            </button>
          </div>
        </div>

        {/* Desktop/Web layout: arrows+date left, pills right (original behavior) */}
        <div className="hidden sm:flex items-center justify-between">
          {/* Left: arrows tight to date */}
          <div className="flex items-center gap-4">
            <button
              onClick={goToPrevious}
              className="h-9 w-9 flex items-center justify-center rounded-lg bg-dark text-gray-300 hover:text-white"
              aria-label="Previous day"
            >
              <ChevronLeft size={18} />
            </button>

            <div className="leading-tight">
              <div className="text-xl font-semibold text-white">
                {format(currentDate, 'EEEE')}
              </div>
              <div className="text-sm text-gray-300">
                {format(currentDate, 'MMMM d')}
              </div>
            </div>

            <button
              onClick={goToNext}
              className="h-9 w-9 flex items-center justify-center rounded-lg bg-dark text-gray-300 hover:text-white"
              aria-label="Next day"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Right: pitch pills */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActivePitch('Pitch A')}
              className={`h-9 px-5 rounded-lg text-sm font-medium transition-colors border ${
                activePitch === 'Pitch A'
                  ? 'bg-primary text-white border-transparent'
                  : 'bg-dark text-gray-200 border-gray-700 hover:text-white'
              }`}
            >
              {t('pitchA')}
            </button>
            <button
              onClick={() => setActivePitch('Pitch B')}
              className={`h-9 px-5 rounded-lg text-sm font-medium transition-colors border ${
                activePitch === 'Pitch B'
                  ? 'bg-primary text-white border-transparent'
                  : 'bg-dark text-gray-200 border-gray-700 hover:text-white'
              }`}
            >
              {t('pitchB')}
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : (
        <>
          {/* Grid of cards for the selected pitch - 2 per row on mobile, 2 on md, 4 on xl */}
          <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {timeSlots.map((slot) => {
              const { status, booking } = getSlotStatus(activePitch, slot.time);

              return (
                <button
                  key={`${activePitch}-${slot.time}`}
                  onClick={() => handleSlotClick(activePitch, slot.time)}
                  className={`text-left rounded-xl p-5 transition-colors ${getCardClasses(status)}`}
                  title={`${activePitch} - ${slot.display} - ${t(status)}`}
                >
                  <div className="text-lg font-semibold text-white">
                    {slot.display}
                  </div>

                  <div className="mt-2 text-sm text-gray-300">
                    {status === 'available' ? (
                      <span>{t('available')}</span>
                    ) : (
                      <>
                        {/* First line: status */}
                        <span className="capitalize">{t(status)}</span>

                        {booking && (
                          <>
                            {/* If it's a match, keep opponent line inline */}
                            {booking.homeTeam && booking.awayTeam ? (
                              <>
                                <span className="mx-2">·</span>
                                <span className="text-white">
                                  {`${booking.homeTeam} vs ${booking.awayTeam}`}
                                </span>
                              </>
                            ) : (
                              /* Single team or friendly booking:
                                 Second line with masked email or team name, truncated */
                              <span className="block mt-1">
                                <span
                                  className="block max-w-[140px] sm:max-w-[180px] overflow-hidden text-ellipsis whitespace-nowrap text-white/90"
                                  title={booking.teamName || booking.userEmail || ''}
                                  aria-label={booking.teamName || booking.userEmail || ''}
                                >
                                  {(booking.teamName && booking.teamName.trim().length > 0)
                                    ? booking.teamName
                                    : maskEmail(booking.userEmail || '')}
                                </span>
                              </span>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {showModal && user && selectedSlot && (
        <BookingModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setSelectedSlot(null);
            setSelectedBooking(null);
          }}
          onSubmit={handleBookingSubmit}
          selectedSlot={selectedSlot}
          existingBooking={selectedBooking}
          user={user}
          existingBookings={bookings}
        />
      )}
    </div>
  );
};

export default Calendar;
