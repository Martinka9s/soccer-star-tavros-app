import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addDays, subDays, startOfDay, isBefore, parseISO } from 'date-fns';
import { el } from 'date-fns/locale';
import { Booking, PitchType, User } from '../types';
import { bookingService, notificationService } from '../services/firebaseService';
import BookingModal from './BookingModal';

interface CalendarProps {
  user: User | null;
  onLoginRequired: () => void;
}

const Calendar: React.FC<CalendarProps> = ({ user, onLoginRequired }) => {
  const { t, i18n } = useTranslation();

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

  const [activePitch, setActivePitch] = useState<PitchType>('Pitch A');

  const dateString = format(currentDate, 'yyyy-MM-dd');

  const formatWithLocale = (date: Date, formatStr: string) => {
    return format(date, formatStr, { locale: i18n.language === 'gr' ? el : undefined });
  };

  useEffect(() => {
    loadBookings();
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

  const timeSlots = Array.from({ length: 16 }, (_, i) => {
    const startHour24 = 9 + i;
    const endHour24 = (startHour24 + 1) % 24;
    const start = `${(startHour24 % 24).toString().padStart(2, '0')}:00`;
    const labelStart = start;
    const labelEnd = `${endHour24.toString().padStart(2, '0')}:00`;
    return {
      time: start,
      display: `${labelStart} - ${labelEnd}`,
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

  const getCardClasses = (
    status: 'available' | 'pending' | 'booked' | 'blocked',
    isClickable: boolean
  ): string => {
    const baseClasses = isClickable ? 'cursor-pointer' : 'cursor-default';

    switch (status) {
      case 'available':
        return `${baseClasses} bg-green-100 dark:bg-[#2C3144] ${
          isClickable ? 'hover:bg-green-200 dark:hover:bg-[#343a52]' : ''
        } border-2 border-slate-200 dark:border-transparent shadow-sm`;
      case 'pending':
        return `${baseClasses} bg-amber-50 dark:bg-amber-600/30 ${
          isClickable ? 'hover:bg-amber-100 dark:hover:bg-amber-600/40' : ''
        } border-2 border-amber-200 dark:border-amber-500/40 shadow-md`;
      case 'booked':
        return `${baseClasses} bg-red-50 dark:bg-red-600/30 ${
          isClickable ? 'hover:bg-red-100 dark:hover:bg-red-600/40' : ''
        } border-2 border-red-200 dark:border-red-500/40 shadow-md`;
      case 'blocked':
        return `${baseClasses} bg-slate-100 dark:bg-slate-700/60 ${
          isClickable ? 'hover:bg-slate-200 dark:hover:bg-slate-700/70' : ''
        } border-2 border-slate-300 dark:border-transparent shadow-sm`;
      default:
        return `${baseClasses} bg-green-100 dark:bg-[#2C3144] ${
          isClickable ? 'hover:bg-green-200 dark:hover:bg-[#343a52]' : ''
        } border-2 border-slate-200 dark:border-transparent shadow-sm`;
    }
  };

  const handleSlotClick = (pitch: PitchType, time: string) => {
    const today = startOfDay(new Date());
    const selectedDate = startOfDay(parseISO(dateString + 'T00:00:00'));

    const { status, booking } = getSlotStatus(pitch, time);

    if (!user) {
      if (status === 'available') {
        onLoginRequired();
      }
      return;
    }

    if (isBefore(selectedDate, today) && user?.role !== 'admin') {
      alert(t('pastDateError'));
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
        await bookingService.updateBooking(selectedBooking.id, bookingData);
      } else {
        const bookingId = await bookingService.createBooking({
          ...bookingData,
          pitchType: selectedSlot.pitch,
          date: selectedSlot.date,
          startTime: selectedSlot.time,
        });

        if (bookingData.homeTeam && bookingData.awayTeam) {
          if (bookingData.homeTeamUserId) {
            await notificationService.createMatchNotification(
              bookingData.homeTeamUserId,
              bookingId,
              selectedSlot.pitch,
              selectedSlot.date,
              selectedSlot.time,
              bookingData.homeTeam,
              bookingData.awayTeam,
              true
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
              false
            );
          }
        } else if (bookingData.userId && bookingData.userId !== user?.id) {
          await notificationService.createNotification(
            bookingData.userId,
            'approved',
            bookingId,
            selectedSlot.pitch,
            selectedSlot.date,
            selectedSlot.time,
            `Booking confirmed for ${bookingData.teamName || 'your team'} on ${
              selectedSlot.date
            } at ${selectedSlot.time}`
          );
        }
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

  const canSeePrivateDetails = (booking: Booking, viewer: User | null) => {
    const isFriendlyNoTeam = !booking.homeTeam && !booking.awayTeam && !booking.teamName;
    if (!isFriendlyNoTeam) return true;
    if (!viewer) return false;
    if (viewer.role === 'admin') return true;
    return booking.userId === viewer.id;
  };

  const maskEmail = (email: string) => {
    if (!email) return '';
    const [local, domain = ''] = email.split('@');
    const domainFirst = domain[0] || '';
    return `${local}@${domainFirst}…`;
  };

  const canSeeContactInfo = (booking: Booking, viewer: User | null) => {
    if (!viewer) return false;
    if (viewer.role === 'admin') return true;
    if (booking.userId && booking.userId === viewer.id) return true;
    if (booking.teamName && viewer.teamName && booking.teamName === viewer.teamName) return true;
    return false;
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-4xl font-extrabold text-gray-900 dark:text:white">
          {t('livePitchAvailability')}
        </h1>
        <p className="mt-2 text-base text-gray-700 dark:text-gray-300">
          {t('selectDateAndPitch')}
        </p>
      </div>

      <div className="flex flex-wrap justify-center items-center gap-5 mt-1 text-sm">
        <LegendDot label={t('available')} colorClass="bg-green-400 dark:bg-[#3a4057]" />
        <LegendDot label={t('pending')} colorClass="bg-amber-500" />
        <LegendDot label={t('booked')} colorClass="bg-red-600" />
        <LegendDot label={t('blocked')} colorClass="bg-slate-600" />
      </div>

      <div className="bg-slate-50 dark:bg-dark-lighter border border-slate-200 dark:border-transparent rounded-xl px-4 py-3 shadow-sm dark:shadow-none">
        {/* Mobile */}
        <div className="sm:hidden">
          <div className="grid grid-cols-[auto,1fr,auto] items-center">
            <button
              onClick={goToPrevious}
              className="h-9 w-9 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-dark text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white justify-self-start"
              aria-label="Previous day"
            >
              <ChevronLeft size={18} />
            </button>

            <div className="text-center">
              <div className="text-xl font-semibold text-gray-900 dark:text-white">
                {formatWithLocale(currentDate, 'EEEE, MMM d')}
              </div>
            </div>

            <button
              onClick={goToNext}
              className="h-9 w-9 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-dark text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white justify-self-end"
              aria-label="Next day"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={() => setActivePitch('Pitch A')}
              className={`h-9 px-5 w-full rounded-lg text-sm font-medium transition-colors border ${
                activePitch === 'Pitch A'
                  ? 'bg-[#6B2FB5] text-white border-transparent'
                  : 'bg-slate-50 dark:bg-dark text-gray-700 dark:text-gray-200 border-slate-300 dark:border-gray-700 hover:text-gray-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-gray-800'
              }`}
            >
              {t('pitchA')}
            </button>
            <button
              onClick={() => setActivePitch('Pitch B')}
              className={`h-9 px-5 w-full rounded-lg text-sm font-medium transition-colors border ${
                activePitch === 'Pitch B'
                  ? 'bg-[#6B2FB5] text-white border-transparent'
                  : 'bg-slate-50 dark:bg-dark text-gray-700 dark:text-gray-200 border-slate-300 dark:border-gray-700 hover:text-gray-900 dark:hover:text:white hover:bg-slate-100 dark:hover:bg-gray-800'
              }`}
            >
              {t('pitchB')}
            </button>
          </div>
        </div>

        {/* Desktop */}
        <div className="hidden sm:flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={goToPrevious}
              className="h-9 w-9 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-dark text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              aria-label="Previous day"
            >
              <ChevronLeft size={18} />
            </button>

            <div className="leading-tight">
              <div className="text-xl font-semibold text-gray-900 dark:text-white">
                {formatWithLocale(currentDate, 'EEEE')}
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-300">
                {formatWithLocale(currentDate, 'MMMM d')}
              </div>
            </div>

            <button
              onClick={goToNext}
              className="h-9 w-9 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-dark text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
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
                  ? 'bg-[#6B2FB5] text-white border-transparent'
                  : 'bg-slate-50 dark:bg-dark text-gray-700 dark:text-gray-200 border-slate-300 dark:border-gray-700 hover:text-gray-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-gray-800'
              }`}
            >
              {t('pitchA')}
            </button>
            <button
              onClick={() => setActivePitch('Pitch B')}
              className={`h-9 px-5 rounded-lg text-sm font-medium transition-colors border ${
                activePitch === 'Pitch B'
                  ? 'bg-[#6B2FB5] text-white border-transparent'
                  : 'bg-slate-50 dark:bg-dark text-gray-700 dark:text-gray-200 border-slate-300 dark:border-gray-700 hover:text-gray-900 dark:hover:text:white hover:bg-slate-100 dark:hover:bg-gray-800'
              }`}
            >
              {t('pitchB')}
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-600 dark:text-gray-400">Loading...</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {timeSlots.map((slot) => {
            const { status, booking } = getSlotStatus(activePitch, slot.time);

            const isClickable = user
              ? user.role === 'admin' || status === 'available'
              : status === 'available';

            let primaryLabel = '';
            let secondaryLabel = '';

            if (booking) {
              if (booking.homeTeam && booking.awayTeam) {
                primaryLabel = `${booking.homeTeam} vs ${booking.awayTeam}`;
                secondaryLabel = '';
              } else if (booking.teamName && booking.teamName.trim()) {
                primaryLabel = booking.teamName;
                if (canSeeContactInfo(booking, user)) {
                  secondaryLabel =
                    booking.phoneNumber || (booking.userEmail ? maskEmail(booking.userEmail) : '');
                } else {
                  secondaryLabel = '';
                }
              } else {
                if (canSeePrivateDetails(booking, user)) {
                  primaryLabel = booking.userEmail
                    ? maskEmail(booking.userEmail)
                    : booking.phoneNumber || '';
                  secondaryLabel =
                    booking.phoneNumber && booking.userEmail ? booking.phoneNumber : '';
                } else {
                  primaryLabel = '';
                  secondaryLabel = '';
                }
              }
            }

            const statusBadgeColor =
              status === 'booked'
                ? 'bg-red-600'
                : status === 'pending'
                ? 'bg-amber-500'
                : status === 'blocked'
                ? 'bg-slate-600'
                : 'bg-gray-400 dark:bg-[#3a4057]';

            const showPrimary = status !== 'available' && !!primaryLabel;
            const showSecondary = status !== 'available' && !!secondaryLabel;

            return (
              <button
                key={`${activePitch}-${slot.time}`}
                onClick={() => handleSlotClick(activePitch, slot.time)}
                className={`relative text-left rounded-xl p-3 transition-colors ${getCardClasses(
                  status,
                  isClickable
                )} h-24`}
                title={`${activePitch} - ${slot.display} - ${t(status)}`}
                disabled={!isClickable}
              >
                <span
                  className={`absolute right-2 top-2 inline-block w-2.5 h-2.5 rounded-full ${statusBadgeColor}`}
                  aria-label={t(status)}
                  title={t(status)}
                />

                <div className="h-full grid grid-rows-[auto,auto,auto] gap-1.5">
                  <div
                    className="text-sm font-semibold text-gray-900 dark:text-white truncate leading-5"
                    title={slot.display}
                  >
                    {slot.display}
                  </div>

                  <div
                    className="text-sm text-gray-800 dark:text-white whitespace-nowrap overflow-hidden text-ellipsis leading-5"
                    title={showPrimary ? primaryLabel : ''}
                  >
                    {showPrimary ? primaryLabel : '\u00A0'}
                  </div>

                  <div
                    className="text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap overflow-hidden text-ellipsis leading-5"
                    title={showSecondary ? secondaryLabel : ''}
                  >
                    {showSecondary ? secondaryLabel : '\u00A0'}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
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

const LegendDot: React.FC<{ label: string; colorClass: string }> = ({ label, colorClass }) => (
  <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
    <span className={`inline-block w-3 h-3 rounded-full ${colorClass}`} />
    <span>{label}</span>
  </div>
);

export default Calendar;
