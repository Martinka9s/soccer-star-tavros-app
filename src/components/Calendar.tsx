import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addDays, subDays, startOfDay, isBefore, parseISO } from 'date-fns';
import { Booking, PitchType, User } from '../types';
import { bookingService, db } from '../services/firebaseService';
import BookingModal from './BookingModal';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

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

  // visual pitch toggle (we keep it, but table shows both columns as before)
  const [activePitch, setActivePitch] = useState<PitchType>('Pitch A');

  const dateString = format(currentDate, 'yyyy-MM-dd');

  // --- FAST: live query using cache-first onSnapshot ---
  useEffect(() => {
    setLoading(true);

    const q = query(collection(db, 'bookings'), where('date', '==', dateString));
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((doc) => {
          const d = doc.data() as any;
          return {
            id: doc.id,
            ...d,
            // Firestore timestamps become JS Date via our service when writing; here ensure Date objects:
            createdAt: d.createdAt?.toDate ? d.createdAt.toDate() : new Date(d.createdAt),
            updatedAt: d.updatedAt?.toDate ? d.updatedAt.toDate() : new Date(d.updatedAt),
          } as Booking;
        });
        setBookings(data);
        setLoading(false);
      },
      (err) => {
        console.error('onSnapshot error:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [dateString]);

  // 09:00 → 01:00 (next day) = 17 slots
  const timeSlots = useMemo(
    () =>
      Array.from({ length: 17 }, (_, i) => {
        const hour = i + 9; // 9..25
        const displayStartHour = hour > 12 ? hour - 12 : hour; // 1..12
        const period = hour >= 12 ? t('pm') : t('am');
        const actualHour = hour >= 24 ? hour - 24 : hour; // 0..23

        const start = `${actualHour.toString().padStart(2, '0')}:00`;
        const labelStart = `${displayStartHour.toString().padStart(2, '0')}:00`;
        const displayEndHour = displayStartHour === 12 ? 1 : displayStartHour + 1;
        const labelEnd = `${displayEndHour.toString().padStart(2, '0')}:00`;

        return { time: start, display: `${labelStart} - ${labelEnd}`, period };
      }),
    [t]
  );

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

  const goToPrevious = () => setCurrentDate(subDays(currentDate, 1));
  const goToNext = () => setCurrentDate(addDays(currentDate, 1));

  // --- Simple skeleton row for perceived speed ---
  const SkeletonRow = () => (
    <tr className="border-b border-gray-700 last:border-b-0">
      <td className="p-4">
        <div className="h-4 w-24 bg-gray-700 rounded animate-pulse" />
      </td>
      <td className="p-2">
        <div className="h-16 w-full rounded-lg bg-gray-700 animate-pulse" />
      </td>
      <td className="p-2">
        <div className="h-16 w-full rounded-lg bg-gray-700 animate-pulse" />
      </td>
    </tr>
  );

  return (
    <div className="space-y-4">
      {/* Hero: Title + Subtitle */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-white">{t('livePitchAvailability')}</h1>
        <p className="text-sm text-gray-400">{t('selectDateAndPitch')}</p>
      </div>

      {/* Toolbar: arrows + centered date; pills on the right like your screenshot */}
      <div className="bg-dark-lighter rounded-lg p-4">
        <div className="flex items-center justify-between gap-3">
          {/* Left: Prev */}
          <div className="flex items-center gap-2">
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

          {/* Right: Today + pitch pills */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentDate(new Date())}
              className="h-9 px-4 rounded-lg text-sm font-medium transition-colors bg-primary text-white"
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

      <div className="bg-dark-lighter rounded-lg overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="p-4 text-left text-gray-300 font-semibold">Time</th>
              <th className="p-4 text-center text-gray-300 font-semibold">{t('pitchA')}</th>
              <th className="p-4 text-center text-gray-300 font-semibold">{t('pitchB')}</th>
            </tr>
          </thead>

          {loading ? (
            <tbody>
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </tbody>
          ) : (
            <tbody>
              {timeSlots.map((slot) => {
                const pitchAStatus = getSlotStatus('Pitch A', slot.time);
                const pitchBStatus = getSlotStatus('Pitch B', slot.time);

                return (
                  <tr key={slot.time} className="border-b border-gray-700 last:border-b-0">
                    <td className="p-4 text-gray-400 font-medium">
                      <div>{slot.display}</div>
                    </td>

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
          )}
        </table>
      </div>

      {showModal && user && selectedSlot && (
        <BookingModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setSelectedSlot(null);
            setSelectedBooking(null);
          }}
          onSubmit={async (bookingData: any) => {
            await handleBookingSubmit(bookingData);
          }}
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
