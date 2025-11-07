import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addDays, subDays, startOfDay, isBefore, parseISO } from 'date-fns';
import { Booking, PitchType, User } from '../types';
import { bookingService } from '../services/firebaseService';
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

  // 09:00 → 01:00 (next day) = 17 one-hour slots
  const timeSlots = Array.from({ length: 17 }, (_, i) => {
    const hour = i + 9; // 9..25
    const period = hour >= 12 ? t('pm') : t('am');
    const displayStartHour = hour > 12 ? hour - 12 : hour; // 1..12
    const actualHour = hour >= 24 ? hour - 24 : hour; // 0..23

    const start = `${actualHour.toString().padStart(2, '0')}:00`;
    const endHour24 = (actualHour + 1) % 24;
    const end = `${endHour24.toString().padStart(2, '0')}:00`;

    // For the label we keep simple “HH:00 - HH:00”
    const labelStart = `${displayStartHour.toString().padStart(2, '0')}:00`;
    const displayEndHour = displayStartHour === 12 ? 1 : displayStartHour + 1;
    const labelEnd = `${displayEndHour.toString().padStart(2, '0')}:00`;

    return {
      time: start,
      display: `${labelStart} - ${labelEnd}`,
      period, // not shown in the range line; you already show 24h-like ranges in your mock
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
    // Neutral cards with subtle tints like in your screenshot
    switch (status) {
      case 'available':
        return 'bg-[#2C3144] hover:bg-[#343a52]'; // slate-ish
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

        if (selectedBooking.userId && user?.role === 'admin') {
          const { notificationService } = await import('../services/firebaseService');
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
      } else if (selectedBooking) {
        await bookingService.updateBooking(selectedBooking.id, bookingData);
      } else {
        await bookingService.createBooking({
          ...bookingData,
          pitchType: selectedSlot.pitch,
          date: selectedSlot.date,
          startTime: selectedSlot.time,
        });
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

  const goToToday = () => setCurrentDate(new Date());
  const goToPrevious = () => setCurrentDate(subDays(currentDate, 1));
  const goToNext = () => setCurrentDate(addDays(currentDate, 1));

  return (
    <div className="space-y-6">
      {/* Title + Subtitle centered */}
      <div className="text-center">
        <h1 className="text-4xl font-extrabold text-white">{t('livePitchAvailability')}</h1>
        <p className="mt-2 text-base text-gray-300">{t('selectDateAndPitch')}</p>
      </div>

      {/* Legend centered */}
      <div className="flex items-center justify-center gap-6 text-sm">
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
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full bg-slate-600" />
          <span className="text-gray-300">{t('blocked')}</span>
        </div>
      </div>

      {/* Banner bar: date+arrows (left) | actions (right) */}
      <div className="bg-dark-lighter rounded-xl px-4 py-3">
        <div className="flex items-center justify-between">
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
              <div className="text-sm text-gray-300">{format(currentDate, 'MMMM d')}</div>
            </div>

            <button
              onClick={goToNext}
              className="h-9 w-9 flex items-center justify-center rounded-lg bg-dark text-gray-300 hover:text-white"
              aria-label="Next day"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Right: Today + pitch pills */}
          <div className="flex items-center gap-2">
            <button
              onClick={goToToday}
              className="h-9 px-4 rounded-lg bg-primary text-white hover:bg-primary-dark text-sm font-medium transition-colors"
            >
              {t('today')}
            </button>

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
          {/* Grid of cards for the selected pitch */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {timeSlots.map((slot) => {
              const { status, booking } = getSlotStatus(activePitch, slot.time);

              return (
                <button
                  key={`${activePitch}-${slot.time}`}
                  onClick={() => handleSlotClick(activePitch, slot.time)}
                  className={`text-left rounded-xl p-5 transition-colors ${getCardClasses(
                    status
                  )}`}
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
                        <span className="capitalize">{t(status)}</span>
                        {booking && (
                          <>
                            <span className="mx-2">·</span>
                            <span className="text-white">
                              {booking.teamName || booking.userEmail}
                            </span>
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
