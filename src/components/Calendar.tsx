import React, { useState, useEffect, useMemo } from 'react';
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

// Hours to display: 09:00–23:00 + 00:00–01:00 (matches your screenshot)
const HOURS_SEQUENCE = [9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,0];

const PITCH_A: PitchType = 'Pitch A' as PitchType;
const PITCH_B: PitchType = 'Pitch B' as PitchType;

const pad = (n: number) => n.toString().padStart(2, '0');
const timeLabel = (startHour: number) => {
  const endHour = (startHour + 1) % 24;
  return `${pad(startHour)}:00 - ${pad(endHour)}:00`;
};
const asTime = (h: number) => `${pad(h)}:00`;

const Calendar: React.FC<CalendarProps> = ({ user, onLoginRequired }) => {
  const { t } = useTranslation();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [activePitch, setActivePitch] = useState<PitchType>(PITCH_B); // Your screenshot shows Pitch B selected
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state (kept from your original)
  const [selectedSlot, setSelectedSlot] = useState<{
    pitch: PitchType;
    date: string;
    time: string;
  } | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showModal, setShowModal] = useState(false);

  const dateString = format(currentDate, 'yyyy-MM-dd');

  useEffect(() => {
    void loadBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateString]);

  const loadBookings = async () => {
    setLoading(true);
    try {
      const data = await bookingService.getBookingsByDate(dateString);
      setBookings(data ?? []);
    } catch (error) {
      console.error('Error loading bookings:', error);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  // --- Helpers to determine slot status based on bookings (supports multi-hour) ---
  const timeToMinutes = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  };

  const overlapsSlot = (booking: Booking, slotHour: number) => {
    const slotStartMin = slotHour * 60;
    const slotEndMin = ((slotHour + 1) % 24) * 60;

    const bStart = timeToMinutes(booking.startTime);
    const bEndRaw = bStart + Math.max(1, booking.duration) * 60;
    const bEnd = bEndRaw % (24 * 60);

    // handle midnight wrap
    if (bEndRaw <= 24 * 60) {
      // normal interval
      return !(slotEndMin <= bStart || slotStartMin >= bEnd);
    } else {
      // wraps over midnight: occupied if slot is after start OR before end
      return slotStartMin >= bStart || slotEndMin <= bEnd;
    }
  };

  type SlotInfo = { status: 'available' | 'pending' | 'booked' | 'blocked'; booking?: Booking };
  const getSlotInfo = (pitch: PitchType, slotHour: number): SlotInfo => {
    const relevant = bookings.filter(
      (b) => b.pitchType === pitch && b.status !== 'available' && overlapsSlot(b, slotHour)
    );

    if (!relevant.length) return { status: 'available' };

    // Priority: blocked > booked > pending
    const blocked = relevant.find((b) => b.status === 'blocked');
    if (blocked) return { status: 'blocked', booking: blocked };

    const booked = relevant.find((b) => b.status === 'booked');
    if (booked) return { status: 'booked', booking: booked };

    const pending = relevant.find((b) => b.status === 'pending');
    if (pending) return { status: 'pending', booking: pending };

    return { status: 'available' };
  };

  // --- Colors like your left screenshot ---
  const tileClasses: Record<SlotInfo['status'], string> = {
    available: 'bg-dark-lighter border border-gray-700 hover:border-primary text-gray-200',
    pending: 'bg-amber-600 text-white',
    booked: 'bg-red-600 text-white',
    blocked: 'bg-slate-600 text-white',
  };

  // Buttons and labels (top bar)
  const dayLabel = useMemo(
    () => ({
      dow: format(currentDate, 'EEEE'),
      date: format(currentDate, 'MMMM d'),
    }),
    [currentDate]
  );

  // Click to book / open modal (kept your exact logic)
  const handleSlotClick = (pitch: PitchType, time: string) => {
    const today = startOfDay(new Date());
    const selectedDate = startOfDay(parseISO(dateString + 'T00:00:00'));

    if (isBefore(selectedDate, today)) {
      alert(t('pastDateError'));
      return;
    }

    const { status, booking } = getSlotInfo(pitch, Number(time.split(':')[0]));

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
      {/* Title & legend */}
      <div className="text-center">
        <h1 className="text-3xl font-extrabold text-white">
          {t('livePitchAvailability') || 'Live pitch availability'}
        </h1>
        <p className="text-gray-400 mt-1">
          {t('selectDateAndPitch') || 'Select a date and pitch to see the schedule.'}
        </p>

        <div className="flex items-center justify-center gap-6 mt-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-gray-400" />
            <span>{t('available')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-amber-500" />
            <span>{t('pending')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-red-500" />
            <span>{t('booked')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-slate-600" />
            <span>{t('blocked')}</span>
          </div>
        </div>
      </div>

      {/* Controls bar (previous/next day + pitch toggle + Today) */}
      <div className="bg-dark-lighter/60 border border-gray-700 rounded-xl p-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={goToPrevious}
              className="p-2 hover:bg-dark rounded-lg transition-colors text-gray-300 hover:text-white"
              aria-label="Previous day"
            >
              <ChevronLeft size={22} />
            </button>

            <div className="text-center px-3">
              <div className="text-lg font-semibold text-white">{dayLabel.dow}</div>
              <div className="text-sm text-gray-400">{dayLabel.date}</div>
            </div>

            <button
              onClick={goToNext}
              className="p-2 hover:bg-dark rounded-lg transition-colors text-gray-300 hover:text-white"
              aria-label="Next day"
            >
              <ChevronRight size={22} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={goToToday}
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors text-sm"
            >
              {t('today')}
            </button>
            <button
              onClick={() => setActivePitch(PITCH_A)}
              className={`px-4 py-2 rounded-lg border ${
                activePitch === PITCH_A
                  ? 'bg-primary text-white border-primary'
                  : 'bg-dark text-gray-200 border-gray-700 hover:bg-primary/20'
              }`}
            >
              {t('pitchA')}
            </button>
            <button
              onClick={() => setActivePitch(PITCH_B)}
              className={`px-4 py-2 rounded-lg border ${
                activePitch === PITCH_B
                  ? 'bg-primary text-white border-primary'
                  : 'bg-dark text-gray-200 border-gray-700 hover:bg-primary/20'
              }`}
            >
              {t('pitchB')}
            </button>
          </div>
        </div>
      </div>

      {/* Slots grid (cards) */}
      {loading ? (
        <div className="text-center py-10 text-gray-400">{t('loading') || 'Loading...'}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {HOURS_SEQUENCE.map((h) => {
            const info = getSlotInfo(activePitch, h);
            const labelBelow =
              info.booking?.teamName ||
              (info.status !== 'available' ? t(info.status) : t('available'));

            return (
              <button
                key={h}
                onClick={() => handleSlotClick(activePitch, asTime(h))}
                disabled={info.status !== 'available' && user?.role !== 'admin'}
                className={`text-left rounded-xl p-5 transition-colors ${
                  tileClasses[info.status]
                } ${info.status === 'available' ? 'hover:shadow-md' : 'cursor-not-allowed'}`}
                title={`${timeLabel(h)} • ${labelBelow}`}
              >
                <div className="text-lg font-bold">{timeLabel(h)}</div>
                <div className="text-sm mt-1 opacity-90">{labelBelow}</div>
              </button>
            );
          })}
        </div>
      )}

      {/* Booking modal (same behavior as your original) */}
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
