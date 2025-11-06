import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { Booking, PitchType, User } from '../types';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (bookingData: any) => Promise<void>;
  selectedSlot: {
    pitch: PitchType;
    date: string;
    time: string;
  } | null;
  existingBooking?: Booking | null;
  user: User;
  existingBookings: Booking[];
}

const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  selectedSlot,
  existingBooking,
  user,
  existingBookings,
}) => {
  const { t } = useTranslation();
  const [duration, setDuration] = useState(1);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [teamName, setTeamName] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'pending' | 'booked' | 'blocked'>('pending');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isAdmin = user.role === 'admin';
  const isEditMode = !!existingBooking;
  const isBlocked = existingBooking?.status === 'blocked';

  useEffect(() => {
    if (existingBooking) {
      setDuration(existingBooking.duration);
      setPhoneNumber(existingBooking.phoneNumber || '');
      setTeamName(existingBooking.teamName || '');
      setNotes(existingBooking.notes || '');
      setStatus(existingBooking.status as any);
    } else {
      setDuration(1);
      setPhoneNumber(user.phoneNumber || '');
      setTeamName('');
      setNotes('');
      setStatus('pending');
    }
    setError('');
  }, [existingBooking, user, isOpen]);

  if (!isOpen || !selectedSlot) return null;

  const durationOptions = [1, 1.5, 2, 2.5, 3, 3.5, 4];

  const checkConflict = (selectedDuration: number): boolean => {
    if (isEditMode) return false;

    const [hours, minutes] = selectedSlot.time.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + selectedDuration * 60;

    return existingBookings.some((booking) => {
      if (booking.pitchType !== selectedSlot.pitch || booking.date !== selectedSlot.date) {
        return false;
      }
      if (booking.status === 'available') return false;

      const [bookingHours, bookingMinutes] = booking.startTime.split(':').map(Number);
      const bookingStartMinutes = bookingHours * 60 + bookingMinutes;
      const bookingEndMinutes = bookingStartMinutes + booking.duration * 60;

      return (
        (startMinutes >= bookingStartMinutes && startMinutes < bookingEndMinutes) ||
        (endMinutes > bookingStartMinutes && endMinutes <= bookingEndMinutes) ||
        (startMinutes <= bookingStartMinutes && endMinutes >= bookingEndMinutes)
      );
    });
  };

  const getAvailableDurations = (): number[] => {
    if (isEditMode) return durationOptions;
    return durationOptions.filter((d) => !checkConflict(d));
  };

  const availableDurations = getAvailableDurations();

  useEffect(() => {
    if (!isEditMode && availableDurations.length > 0 && !availableDurations.includes(duration)) {
      setDuration(availableDurations[0]);
    }
  }, [availableDurations, duration, isEditMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isEditMode && availableDurations.length === 0) {
      setError(t('conflictError'));
      return;
    }

    if (!isAdmin && !phoneNumber.trim()) {
      setError('Phone number is required');
      return;
    }

    setLoading(true);

    try {
      const bookingData: any = {
        pitchType: selectedSlot.pitch,
        date: selectedSlot.date,
        startTime: selectedSlot.time,
        duration,
        status: isAdmin && isBlocked ? 'blocked' : (isAdmin ? status : 'pending'),
        phoneNumber: phoneNumber.trim(),
        teamName: teamName.trim(),
        notes: notes.trim(),
      };

      if (!isAdmin || !isBlocked) {
        bookingData.userId = user.id;
        bookingData.userEmail = user.email;
      }

      await onSubmit(bookingData);
      onClose();
    } catch (err: any) {
      setError(err.message || t('bookingError'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this booking?')) return;
    
    setLoading(true);
    try {
      await onSubmit({ delete: true });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to delete booking');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-lighter rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-700 sticky top-0 bg-dark-lighter">
          <h2 className="text-xl font-semibold text-white">
            {isBlocked
              ? t('blockSlot')
              : isEditMode
              ? t('editBooking')
              : isAdmin
              ? t('createBooking')
              : t('bookSlot')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-500 bg-opacity-10 border border-red-500 rounded text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Pitch:</span>
              <span className="ml-2 text-white">{selectedSlot.pitch}</span>
            </div>
            <div>
              <span className="text-gray-400">Date:</span>
              <span className="ml-2 text-white">{selectedSlot.date}</span>
            </div>
            <div>
              <span className="text-gray-400">Time:</span>
              <span className="ml-2 text-white">{selectedSlot.time}</span>
            </div>
          </div>

          {!isBlocked && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('selectDuration')}
                </label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full px-4 py-2 bg-dark border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary"
                  disabled={isEditMode && isAdmin === false}
                >
                  {availableDurations.map((d) => (
                    <option key={d} value={d}>
                      {d} {d === 1 ? t('hour') : t('hours')}
                    </option>
                  ))}
                </select>
                {!isEditMode && availableDurations.length < durationOptions.length && (
                  <p className="mt-1 text-xs text-amber-400">
                    Some durations are unavailable due to conflicts
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('phoneNumber')} *
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required={!isAdmin}
                  className="w-full px-4 py-2 bg-dark border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary"
                  placeholder="69XXXXXXXX"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('teamName')}
                </label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full px-4 py-2 bg-dark border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary"
                  placeholder="Team name (optional)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('notes')}
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 bg-dark border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary resize-none"
                  placeholder="Additional notes (optional)"
                />
              </div>

              {isAdmin && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {t('status')}
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-4 py-2 bg-dark border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary"
                  >
                    <option value="pending">{t('pending')}</option>
                    <option value="booked">{t('booked')}</option>
                    <option value="blocked">{t('blocked')}</option>
                  </select>
                </div>
              )}
            </>
          )}

          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              disabled={loading || (!isEditMode && availableDurations.length === 0)}
              className="flex-1 py-3 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '...' : isEditMode ? t('save') : t('submit')}
            </button>
            {isEditMode && isAdmin && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('delete')}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
            >
              {t('cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BookingModal;
