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
      time: start,                              // start time in 24h
      display: `${labelStart} - ${labelEnd}`,   // e.g., 23:00 - 00:00, 00:00 - 01:00
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

    // Only block past dates for regular users
    if (isBefore(selectedDate, today) && user?.role !== 'admin') {
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

  // ---------- Visibility + formatting helpers ----------
  const canSeePrivateDetails = (booking: Booking, viewer: User | null) => {
    const isFriendlyNoTeam =
      !booking.homeTeam && !booking.awayTeam && !booking.teamName;
    if (!isFriendlyNoTeam) return true;      // matches or team bookings → public
    if (!viewer) return false;
    if (viewer.role === 'admin') return true;
    return booking.userId === viewer.id;     // only the booker sees it
  };

  const maskEmail = (email: string) => {
    if (!email) return '';
    const [local, domain = ''] = email.split('@');
    const domainFirst = domain[0] || '';
    return `${local}@${domainFirst}…`;
  };
  // ----------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Title + Subtitle centered */}
      <div className="text-center">
        <h1 className="text-4xl font-extrabold text-white">{t('livePitchAvailability')}</h1>
        <p className="mt-2 text-base text-gray-300">{t('selectDateAndPitch')}</p>
      </div>

      {/* Banner bar (legend removed as requested) */}
      <div className="bg-dark-lighter rounded-xl px-4 py-3">
        {/* Mobile (app) layout */}
        <div className="sm:hidden">
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

          {/* Pitch pills */}
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

        {/* Desktop/Web layout */}
        <div className="hidden sm:flex items-center justify-between">
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
          {/* Grid of cards */}
          <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {timeSlots.map((slot) => {
              const { status, booking } = getSlotStatus(activePitch, slot.time);

              // Compute primary/secondary labels in a compact form
              let primaryLabel = '';
              let secondaryLabel = '';

              if (booking) {
                if (booking.homeTeam && booking.awayTeam) {
                  // Match in one line
                  primaryLabel = `${booking.homeTeam} vs ${booking.awayTeam}`;
                } else if (booking.teamName && booking.teamName.trim()) {
                  // Single-team booking
                  primaryLabel = booking.teamName;
                  secondaryLabel = booking.phoneNumber || booking.userEmail || '';
                } else {
                  // Guest/friendly (no team) — respect privacy
                  if (canSeePrivateDetails(booking, user)) {
                    primaryLabel = booking.userEmail ? maskEmail(booking.userEmail) : (booking.phoneNumber || '');
                    secondaryLabel =
                      booking.phoneNumber && booking.userEmail ? booking.phoneNumber : '';
                  }
                }
              }

              const statusBadgeClass =
                status === 'booked'
                  ? 'bg-red-600 text-white'
                  : status === 'pending'
                  ? 'bg-amber-500 text-black'
                  : status === 'blocked'
                  ? 'bg-slate-600 text-white'
                  : 'bg-[#3a4057] text-gray-200';

              // For "available", show badge only (no duplicate text rows)
              const showPrimary = status !== 'available' && primaryLabel;
              const showSecondary = status !== 'available' && secondaryLabel;

              return (
                <button
                  key={`${activePitch}-${slot.time}`}
                  onClick={() => handleSlotClick(activePitch, slot.time)}
                  className={`relative text-left rounded-xl p-3 transition-colors ${getCardClasses(status)} h-24`} // ↑ more height to avoid clipping
                  title={`${activePitch} - ${slot.display} - ${t(status)}`}
                >
                  {/* micro status badge fixed in the corner */}
                  <span
                    className={`absolute right-2 top-2 text-[10px] leading-none px-2 py-0.5 rounded-full ${statusBadgeClass}`}
                  >
                    {t(status)}
                  </span>

                  <div className="h-full grid grid-rows-[auto,auto,auto] gap-1.5">
                    {/* Row 1: time only */}
                    <div className="text-sm font-semibold text-white truncate leading-5" title={slot.display}>
                      {slot.display}
                    </div>

                    {/* Row 2: primary (or placeholder nbsp to keep height consistent) */}
                    <div
                      className="text-sm text-white whitespace-nowrap overflow-hidden text-ellipsis leading-5"
                      title={showPrimary ? primaryLabel : ''}
                    >
                      {showPrimary ? primaryLabel : '\u00A0'}
                    </div>

                    {/* Row 3: secondary (or placeholder) */}
                    <div
                      className="text-xs text-gray-300 whitespace-nowrap overflow-hidden text-ellipsis leading-5"
                      title={showSecondary ? secondaryLabel : ''}
                    >
                      {showSecondary ? secondaryLabel : '\u00A0'}
                    </div>
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
