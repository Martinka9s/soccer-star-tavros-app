import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, X, Calendar as CalendarIcon, Clock, User } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Booking } from '../types';
import { bookingService, notificationService } from '../services/firebaseService';

const PendingRequests: React.FC = () => {
  const { t } = useTranslation();
  const [pendingBookings, setPendingBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPendingBookings();
  }, []);

  const loadPendingBookings = async () => {
    setLoading(true);
    try {
      const bookings = await bookingService.getPendingBookings();
      setPendingBookings(bookings);
    } catch (error) {
      console.error('Error loading pending bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (booking: Booking) => {
    try {
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

      await loadPendingBookings();
    } catch (error) {
      console.error('Error approving booking:', error);
      alert('Failed to approve booking');
    }
  };

  const handleReject = async (booking: Booking) => {
    if (!window.confirm('Are you sure you want to reject this booking?')) return;

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

      await loadPendingBookings();
    } catch (error) {
      console.error('Error rejecting booking:', error);
      alert('Failed to reject booking');
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
        {pendingBookings.map((booking) => (
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
                    <span>{format(parseISO(booking.date), 'EEEE, MMM d, yyyy')}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-300">
                    <Clock size={16} className="text-gray-400" />
                    <span>
                      {booking.startTime} ({booking.duration} {booking.duration === 1 ? t('hour') : t('hours')})
                    </span>
                  </div>
                  {booking.userEmail && (
                    <div className="flex items-center space-x-2 text-gray-300">
