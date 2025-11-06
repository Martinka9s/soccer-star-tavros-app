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

  const handleDelet
