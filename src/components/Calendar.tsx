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

  // Slots from 09:00 up to 23:00–00:00 (last slot ends at midnight)
  const timeSlots = Array.from({ length: 15 }, (_, i) => {
    const startHour24 = 9 + i;            // 9..23
    const endHour24 = (startHour24 + 1) % 24; // 10..00
    const start = `${startHour24.toString().padStart(2, '0')}:00`;
    const labelStart = start;
    const labelEnd = `${endHour24.toString().padStart(2, '0')}:00`;
    return {
      time: start,                  // start time in 24h
      display: `${labelStart} - ${labelEnd}`, // 24h label e.g. 23:00 - 00:00
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

  const goToPrevious = () => setCurrentDate(subDays(currentDate, 1));
  const goToNext = () => setCurrentDate(addDays(currentDate, 1));

  return (
    <div className="space-y-6">
      {/* Date Navigation - Clean and minimal */}
      <div className="flex items-center justify-between">
        <button
          onClick={goToPrevious}
          className="p-2 hover:bg-dark-lighter rounded-lg transition-colors text-gray-300 hover:text-white"
          aria-label="Previous day"
        >
          <ChevronLeft size={24} />
        </button>

        <div className="text-center">
          <h2 className="text-xl font-semibold text-white">
            {format(currentDate, 'EEEE, MMMM d, yyyy')}
          </h2>
        </div>

        <button
          onClick={goToNext}
          className="p-2 hover:bg-dark-lighter rounded-lg transition-colors text-gray-300 hover:text-white"
          aria-label="Next day"
        >
          <ChevronRight size={24} />
        </button>
      </div>

      {/* Pitch Tabs - Clean horizontal tabs */}
      <div className="flex space-x-2">
        <button
          onClick={() => setActivePitch('Pitch A')}
          className={`flex-1 py-3 rounded-lg font-medium transition-all ${
            activePitch === 'Pitch A'
              ? 'bg-primary text-white shadow-lg'
              : 'bg-dark-lighter text-gray-400 hover:text-white hover:bg-dark'
          }`}
        >
          {t('pitchA')}
        </button>
        <button
          onClick={() => setActivePitch('Pitch B')}
          className={`flex-1 py-3 rounded-lg font-medium transition-all ${
            activePitch === 'Pitch B'
              ? 'bg-primary text-white shadow-lg'
              : 'bg-dark-lighter text-gray-400 hover:text-white hover:bg-dark'
          }`}
        >
          {t('pitchB')}
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-gray-700 rounded"></div>
          <span className="text-gray-300">{t('available')}</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-amber-600 rounded"></div>
          <span className="text-gray-300">{t('pending')}</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-red-600 rounded"></div>
          <span className="text-gray-300">{t('booked')}</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-slate-800 rounded"></div>
          <span className="text-gray-300">{t('blocked')}</span>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : (
        <>
          {/* Grid of time slots - Clean card design */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {timeSlots.map((slot) => {
              const { status, booking } = getSlotStatus(activePitch, slot.time);

              return (
                <button
                  key={`${activePitch}-${slot.time}`}
                  onClick={() => handleSlotClick(activePitch, slot.time)}
                  className={`p-4 rounded-lg transition-all ${getCardClasses(status)} flex flex-col items-center justify-center min-h-[100px]`}
                  title={`${activePitch} - ${slot.display} - ${t(status)}`}
                >
                  <div className="text-white font-semibold text-lg mb-1">
                    {slot.display}
                  </div>
                  <div className="text-xs text-gray-300">
                    {t(status)}
                  </div>
                  {booking && (
                    <div className="text-xs text-gray-200 mt-2 text-center truncate w-full px-1">
                      {booking.teamName || booking.userEmail}
                    </div>
                  )}
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
