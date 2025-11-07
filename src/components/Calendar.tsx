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

  // visual pitch toggle (matches the pills in the toolbar)
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

  // 09:00 → 01:00 (next day) = 17 slots
  const timeSlots = Array.from({ length: 17 }, (_, i) => {
    const hour = i + 9; // 9..25
    const displayHour = hour > 12 ? hour - 12 : hour; // 1..12
    const period = hour >= 12 ? t('pm') : t('am');
    const actualHour = hour >= 24 ? hour - 24 : hour; // 0..23
    return {
      time: `${actualHour.toString().padStart(2, '0')}:00`,
      display: `${displayHour}:00 ${period}`,
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

  const getSlotColor = (status: string): string => {
    switch (status) {
      case 'available':
        return 'bg-gray-700 hover:bg-gray-600';
      case 'pending':
        return 'bg-amber-600 hover:bg-amber-700';
      case 'booked':
        return 'bg-red-600 hover:bg-red-700';
      case 'blocked':
        return 'bg-slate-800 hover:bg-slate-700';
      default:
        return 'bg-gray-700';
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
    <div className="space-y-4">
      {/* Hero: Title + Subtitle */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-white">{t('livePitchAvailability')}</h1>
        <p className="text-sm text-gray-400">{t('selectDateAndPitch')}</p>
      </div>

      {/* Toolbar: arrows + centered date + pitch pills */}
      <div className="mt-1 bg-dark-lighter rounded-lg p-4">
        <div className="flex items-center justify-between">
          {/* Left: Prev */}
          <div className="w-24 flex items-center justify-start">
            <button
              onClick={goToPrevious}
              className="h-9 w-9 flex items-center justify-center rounded-lg bg-dark text-gray-300 hover:text-white"
              aria-label="Previous day"
            >
              <ChevronLeft size={18} />
            </button>
          </div>

          {/* Center: Date */}
          <div className="text-center">
            <div className="text-lg font-semibold text-white leading-tight">
              {format(currentDate, 'EEEE')}
            </div>
            <div className="text-sm text-gray-300">{format(currentDate, 'MMMM d')}</div>
          </div>

          {/* Right: Next + (pills live below) */}
          <div className="w-24 flex items-center justify-end">
            <button
              onClick={goToNext}
              className="h-9 w-9 flex items-center justify-center rounded-lg bg-dark text-gray-300 hover:text-white"
              aria-label="Next day"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Pitch toggle row */}
        <div className="mt-3 flex items-center justify-center gap-2">
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

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-gray-700 rounded" />
          <span className="text-gray-300">{t('available')}</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-amber-600 rounded" />
          <span className="text-gray-300">{t('pending')}</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-red-600 rounded" />
          <span className="text-gray-300">{t('booked')}</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-slate-800 rounded" />
          <span className="text-gray-300">{t('blocked')}</span>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : (
        <div className="bg-dark-lighter rounded-lg overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="p-4 text-left text-gray-300 font-semibold">Time</th>
                <th className="p-4 text-center text-gray-300 font-semibold">{t('pitchA')}</th>
                <th className="p-4 text-center text-gray-300 font-semibold">{t('pitchB')}</th>
              </tr>
            </thead>
            <tbody>
              {timeSlots.map((slot) => {
                const pitchAStatus = getSlotStatus('Pitch A', slot.time);
                const pitchBStatus = getSlotStatus('Pitch B', slot.time);

                return (
                  <tr key={slot.time} className="border-b border-gray-700 last:border-b-0">
                    <td className="p-4 text-gray-400 font-medium">{slot.display}</td>

                    <td className="p-2">
                      <button
                        onClick={() => handleSlotClick('Pitch A', slot.time)}
                        className={`w-full h-16 rounded-lg transition-colors cursor-pointer ${getSlotColor(
                          pitchAStatus.status
                        )}`}
                        title={`${t('pitchA')} - ${slot.display} - ${t(pitchAStatus.status)}`}
                      >
                        {pitchAStatus.booking && (
                          <div className="text-white text-xs p-2">
                            {pitchAStatus.booking.teamName || pitchAStatus.booking.userEmail}
                            <br />
                            {pitchAStatus.booking.duration}h
                          </div>
                        )}
                      </button>
                    </td>

                    <td className="p-2">
                      <button
                        onClick={() => handleSlotClick('Pitch B', slot.time)}
                        className={`w-full h-16 rounded-lg transition-colors cursor-pointer ${getSlotColor(
                          pitchBStatus.status
                        )}`}
                        title={`${t('pitchB')} - ${slot.display} - ${t(pitchBStatus.status)}`}
                      >
                        {pitchBStatus.booking && (
                          <div className="text-white text-xs p-2">
                            {pitchBStatus.booking.teamName || pitchBStatus.booking.userEmail}
                            <br />
                            {pitchBStatus.booking.duration}h
                          </div>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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

export default Calendar;
