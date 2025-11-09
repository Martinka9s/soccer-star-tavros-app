import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, X, Calendar as CalendarIcon, Clock, User as UserIcon } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Booking } from '../types';
import { bookingService, notificationService } from '../services/firebaseService';

interface PendingRequestsProps {
  onCountChange?: (count: number) => void;
}

const PendingRequests: React.FC<PendingRequestsProps> = ({ onCountChange }) => {
  const { t } = useTranslation();
  const [pendingBookings, setPendingBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  // Track which booking is being processed to avoid duplicate clicks
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    void loadPendingBookings();
  }, []);

  const loadPendingBookings = async () => {
    setLoading(true);
    try {
      const bookings = await bookingService.getPendingBookings();
      const list = bookings ?? [];
      setPendingBookings(list);
      onCountChange?.(list.length);
    } catch (error) {
      console.error('Error loading pending bookings:', error);
      setPendingBookings([]);
      onCountChange?.(0);
    } finally {
      setLoading(false);
    }
  };

  const safeRemoveFromUI = (id: string) => {
    setPendingBookings(prev => {
      const next = prev.filter(b => b.id !== id);
      onCountChange?.(next.length);
      return next;
    });
  };

  const handleApprove = async (booking: Booking) => {
    if (busyId) return;
    setBusyId(booking.id);

    // Optimistic: remove from UI immediately
    safeRemoveFromUI(booking.id);

    try {
      // If your service uses updateDoc, this will throw if doc no longer exists.
      await bookingService.updateBooking(booking.id, { status: 'booked' });

      if (booking.userId) {
        await notificationService.createNotification(
          booking.userId,
          'approved',
          booking.id,
          booking.pitchType,
          booking.date,
          booking.startTime,
          t('bookingApproved', {
            pitch: booking.pitchType,
            date: booking.date,
            time: booking.startTime,
          })
        );
      }
    } catch (error: any) {
      // Ignore "not-found" – it means another tab/admin already processed it.
      if (error?.code !== 'not-found') {
        console.error('Error approving booking:', error);
        alert('Failed to approve booking');
        // If it failed for another reason, re-sync list
        await loadPendingBookings();
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (booking: Booking) => {
    if (busyId) return;
    if (!window.confirm('Are you sure you want to reject this booking?')) return;

    setBusyId(booking.id);
    // Optimistic: remove from UI immediately
    safeRemoveFromUI(booking.id);

    try {
      await bookingService.deleteBooking(booking.id);

      if (booking.userId) {
        await notificationService.createNotification(
          booking.userId,
          'rejected',
          booking.id,
          booking.pitchType,
          booking.date,
          booking.startTime,
          t('bookingRejected', {
            pitch: booking.pitchType,
            date: booking.date,
            time: booking.startTime,
          })
        );
      }
    } catch (error: any) {
      // Ignore "not-found" – already removed elsewhere
      if (error?.code !== 'not-found') {
        console.error('Error rejecting booking:', error);
        alert('Failed to reject booking');
        await loadPendingBookings();
      }
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12 text-gray-400">
        Loading pending requests...
      </div>
    );
  }

  if (pendingBookings.length === 0) {
    return (
      <div className="bg-dark-lighter border border-gray-700 rounded-lg p-12 text-center">
        <div className="text-gray-400 text-lg">No pending requests</div>
        <p className="text-gray-500 text-sm mt-2">
          All booking requests have been processed
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-white mb-6">
        {t('pendingRequests')} ({pendingBookings.length})
      </h2>

      <div className="grid grid-cols-1 gap-4">
        {pendingBookings.map((booking) => {
          const dateLabel = format(parseISO(booking.date), 'EEEE, MMM d, yyyy');
          const durationLabel = `${booking.duration} ${booking.duration === 1 ? t('hour') : t('hours')}`;

          const isBusy = busyId === booking.id;

          return (
            <div
              key={booking.id}
              className="bg-dark-lighter border border-amber-600 rounded-lg p-6 hover:border-amber-500 transition-colors"
            >
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold text-white">{booking.pitchType}</h3>
                    <span className="px-3 py-1 bg-amber-500 text-white rounded-full text-xs font-medium">
                      {t('pending')}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center space-x-2 text-gray-300">
                      <CalendarIcon size={16} className="text-gray-400" />
                      <span>{dateLabel}</span>
                    </div>

                    <div className="flex items-center space-x-2 text-gray-300">
                      <Clock size={16} className="text-gray-400" />
                      <span>
                        {booking.startTime} ({durationLabel})
                      </span>
                    </div>

                    {booking.userEmail ? (
                      <div className="flex items-center space-x-2 text-gray-300">
                        <UserIcon size={16} className="text-gray-400" />
                        <span>{booking.userEmail}</span>
                      </div>
                    ) : null}

                    {booking.phoneNumber ? (
                      <div className="flex items-center space-x-2 text-gray-300">
                        <span className="text-gray-400">📞</span>
                        <span>{booking.phoneNumber}</span>
                      </div>
                    ) : null}
                  </div>

                  {booking.teamName ? (
                    <div className="text-sm">
                      <span className="text-gray-400">Team: </span>
                      <span className="text-white font-medium">{booking.teamName}</span>
                    </div>
                  ) : null}

                  {booking.notes ? (
                    <div className="p-3 bg-dark rounded text-sm text-gray-300">
                      <span className="text-gray-400">Notes: </span>
                      {booking.notes}
                    </div>
                  ) : null}
                </div>

                <div className="flex lg:flex-col gap-3">
                  <button
                    onClick={() => handleApprove(booking)}
                    disabled={isBusy}
                    className={`flex-1 lg:flex-none flex items-center justify-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                      isBusy
                        ? 'bg-green-800 text-white opacity-70 cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  >
                    <Check size={20} />
                    <span>{isBusy ? t('processing') ?? 'Processing…' : t('approve')}</span>
                  </button>

                  <button
                    onClick={() => handleReject(booking)}
                    disabled={isBusy}
                    className={`flex-1 lg:flex-none flex items-center justify-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                      isBusy
                        ? 'bg-red-800 text-white opacity-70 cursor-not-allowed'
                        : 'bg-red-600 hover:bg-red-700 text-white'
                    }`}
                  >
                    <X size={20} />
                    <span>{isBusy ? t('processing') ?? 'Processing…' : t('reject')}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PendingRequests;
