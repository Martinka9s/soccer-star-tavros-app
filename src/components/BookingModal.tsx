import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { Booking, PitchType, User } from '../types';
import { userService } from '../services/firebaseService';

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

type BookingMode = 'match' | 'single-team' | 'guest';

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
  
  const [editableDate, setEditableDate] = useState('');
  const [editableTime, setEditableTime] = useState('');

  const [bookingMode, setBookingMode] = useState<BookingMode>('guest');
  const [availableTeams, setAvailableTeams] = useState<{ userId: string; teamName: string; email: string }[]>([]);
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');

  const isAdmin = user.role === 'admin';
  const isEditMode = !!existingBooking;
  const isBlocked = existingBooking?.status === 'blocked';

  useEffect(() => {
    if (isAdmin && isOpen) {
      loadTeams();
    }
  }, [isAdmin, isOpen]);

  const loadTeams = async () => {
    try {
      const teams = await userService.getAllTeams();
      setAvailableTeams(teams);
    } catch (error) {
      console.error('Error loading teams:', error);
    }
  };

  useEffect(() => {
    if (selectedSlot) {
      setEditableDate(selectedSlot.date);
      setEditableTime(selectedSlot.time);
    }
    
    if (existingBooking) {
      setDuration(existingBooking.duration);
      setPhoneNumber(existingBooking.phoneNumber || '');
      setTeamName(existingBooking.teamName || '');
      setNotes(existingBooking.notes || '');
      setStatus(existingBooking.status as any);
      setEditableDate(existingBooking.date);
      setEditableTime(existingBooking.startTime);

      if (existingBooking.homeTeam && existingBooking.awayTeam) {
        setBookingMode('match');
        setHomeTeam(existingBooking.homeTeam);
        setAwayTeam(existingBooking.awayTeam);
      } else if (existingBooking.teamName && availableTeams.some(t => t.teamName === existingBooking.teamName)) {
        setBookingMode('single-team');
        setSelectedTeam(existingBooking.teamName);
      } else {
        setBookingMode('guest');
      }
    } else {
      setDuration(1);
      setPhoneNumber(user.phoneNumber || '');
      setTeamName('');
      setNotes('');
      setStatus('pending');
      setBookingMode('guest');
      setHomeTeam('');
      setAwayTeam('');
      setSelectedTeam('');
    }
    setError('');
  }, [existingBooking, user, isOpen, availableTeams, selectedSlot]);

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

    if (isAdmin && !isBlocked) {
      if (bookingMode === 'match') {
        if (!homeTeam || !awayTeam) {
          setError('Please select both home and away teams');
          return;
        }
        if (homeTeam === awayTeam) {
          setError('Home and away teams must be different');
          return;
        }
      } else if (bookingMode === 'single-team') {
        if (!selectedTeam) {
          setError('Please select a team');
          return;
        }
      } else if (bookingMode === 'guest') {
        if (!phoneNumber.trim()) {
          setError('Phone number is required for guest bookings');
          return;
        }
      }
    } else if (!isAdmin && !phoneNumber.trim()) {
      setError('Phone number is required');
      return;
    }

    setLoading(true);

    try {
      const bookingData: any = {
        pitchType: selectedSlot.pitch,
        date: isAdmin && isEditMode ? editableDate : selectedSlot.date,
        startTime: isAdmin && isEditMode ? editableTime : selectedSlot.time,
        duration,
        status: isAdmin && isBlocked ? 'blocked' : (isAdmin ? status : 'pending'),
        notes: notes.trim(),
      };

      if (isAdmin && bookingMode === 'match') {
        bookingData.homeTeam = homeTeam;
        bookingData.awayTeam = awayTeam;
        
        const homeTeamUser = availableTeams.find(t => t.teamName === homeTeam);
        const awayTeamUser = availableTeams.find(t => t.teamName === awayTeam);
        
        if (homeTeamUser) bookingData.homeTeamUserId = homeTeamUser.userId;
        if (awayTeamUser) bookingData.awayTeamUserId = awayTeamUser.userId;
        
      } else if (isAdmin && bookingMode === 'single-team') {
        const teamUser = availableTeams.find(t => t.teamName === selectedTeam);
        if (teamUser) {
          bookingData.userId = teamUser.userId;
          bookingData.userEmail = teamUser.email;
          bookingData.teamName = selectedTeam;
        }
      } else {
        bookingData.userId = user.id;
        bookingData.userEmail = user.email;
        bookingData.phoneNumber = phoneNumber.trim();
        bookingData.teamName = teamName.trim();
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
      <div className="bg-slate-50 dark:bg-dark-lighter rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-gray-700 sticky top-0 bg-slate-50 dark:bg-dark-lighter">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
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
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/60 rounded text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-700 dark:text-gray-400">Pitch:</span>
              <span className="ml-2 text-gray-900 dark:text-white">{selectedSlot.pitch}</span>
            </div>
            
            <div>
              <span className="text-gray-700 dark:text-gray-400">Date:</span>
              {isAdmin && isEditMode ? (
                <input
                  type="date"
                  value={editableDate}
                  onChange={(e) => setEditableDate(e.target.value)}
                  className="ml-2 px-2 py-1 bg-white dark:bg-dark border border-slate-300 dark:border-gray-600 rounded text-gray-900 dark:text-white text-sm focus:outline-none focus:border-[#6B2FB5] dark:focus:border-primary"
                />
              ) : (
                <span className="ml-2 text-gray-900 dark:text-white">{editableDate}</span>
              )}
            </div>
            
            <div className="col-span-2">
              <span className="text-gray-700 dark:text-gray-400">Time:</span>
              {isAdmin && isEditMode ? (
                <input
                  type="time"
                  value={editableTime}
                  onChange={(e) => setEditableTime(e.target.value)}
                  className="ml-2 px-2 py-1 bg-white dark:bg-dark border border-slate-300 dark:border-gray-600 rounded text-gray-900 dark:text-white text-sm focus:outline-none focus:border-[#6B2FB5] dark:focus:border-primary"
                />
              ) : (
                <span className="ml-2 text-gray-900 dark:text-white">{editableTime}</span>
              )}
            </div>
          </div>

          {isAdmin && !isBlocked && !isEditMode && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Booking Type
              </label>
              <div className="space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    value="match"
                    checked={bookingMode === 'match'}
                    onChange={() => setBookingMode('match')}
                    className="text-[#6B2FB5] dark:text-primary focus:ring-[#6B2FB5] dark:focus:ring-primary"
                  />
                  <span className="text-gray-900 dark:text-white">Match (2 teams)</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    value="single-team"
                    checked={bookingMode === 'single-team'}
                    onChange={() => setBookingMode('single-team')}
                    className="text-[#6B2FB5] dark:text-primary focus:ring-[#6B2FB5] dark:focus:ring-primary"
                  />
                  <span className="text-gray-900 dark:text-white">Single Team</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    value="guest"
                    checked={bookingMode === 'guest'}
                    onChange={() => setBookingMode('guest')}
                    className="text-[#6B2FB5] dark:text-primary focus:ring-[#6B2FB5] dark:focus:ring-primary"
                  />
                  <span className="text-gray-900 dark:text-white">Guest / Other</span>
                </label>
              </div>
            </div>
          )}

          {!isBlocked && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('selectDuration')}
                </label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full px-4 py-2 bg-white dark:bg-dark border border-slate-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-[#6B2FB5] dark:focus:border-primary"
                  disabled={isEditMode && isAdmin === false}
                >
                  {availableDurations.map((d) => (
                    <option key={d} value={d}>
                      {d} {d === 1 ? t('hour') : t('hours')}
                    </option>
                  ))}
                </select>
                {!isEditMode && availableDurations.length < durationOptions.length && (
                  <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                    Some durations are unavailable due to conflicts
                  </p>
                )}
              </div>

              {isAdmin && bookingMode === 'match' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Home Team *
                    </label>
                    <select
                      value={homeTeam}
                      onChange={(e) => setHomeTeam(e.target.value)}
                      className="w-full px-4 py-2 bg-white dark:bg-dark border border-slate-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-[#6B2FB5] dark:focus:border-primary"
                      required
                    >
                      <option value="">Select home team</option>
                      {availableTeams.map((team) => (
                        <option key={team.userId} value={team.teamName}>
                          {team.teamName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Away Team *
                    </label>
                    <select
                      value={awayTeam}
                      onChange={(e) => setAwayTeam(e.target.value)}
                      className="w-full px-4 py-2 bg-white dark:bg-dark border border-slate-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-[#6B2FB5] dark:focus:border-primary"
                      required
                    >
                      <option value="">Select away team</option>
                      {availableTeams.filter(t => t.teamName !== homeTeam).map((team) => (
                        <option key={team.userId} value={team.teamName}>
                          {team.teamName}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {isAdmin && bookingMode === 'single-team' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select Team *
                  </label>
                  <select
                    value={selectedTeam}
                    onChange={(e) => setSelectedTeam(e.target.value)}
                    className="w-full px-4 py-2 bg-white dark:bg-dark border border-slate-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-[#6B2FB5] dark:focus:border-primary"
                    required
                  >
                    <option value="">Select a team</option>
                    {availableTeams.map((team) => (
                      <option key={team.userId} value={team.teamName}>
                        {team.teamName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {(!isAdmin || bookingMode === 'guest') && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('phoneNumber')} *
                    </label>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      required={!isAdmin}
                      className="w-full px-4 py-2 bg-white dark:bg-dark border border-slate-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-[#6B2FB5] dark:focus:border-primary"
                      placeholder="69XXXXXXXX"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('teamName')}
                    </label>
                    <input
                      type="text"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      className="w-full px-4 py-2 bg-white dark:bg-dark border border-slate-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-[#6B2FB5] dark:focus:border-primary"
                      placeholder="Team name (optional)"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('notes')}
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 bg-white dark:bg-dark border border-slate-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-[#6B2FB5] dark:focus:border-primary resize-none"
                  placeholder="Additional notes (optional)"
                />
              </div>

              {isAdmin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('status')}
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-4 py-2 bg-white dark:bg-dark border border-slate-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-[#6B2FB5] dark:focus:border-primary"
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
              className="flex-1 py-3 bg-[#6B2FB5] hover:bg-[#5a2596] dark:bg-primary dark:hover:bg-primary-dark text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="px-6 py-3 bg-slate-200 dark:bg-gray-600 hover:bg-slate-300 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
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
