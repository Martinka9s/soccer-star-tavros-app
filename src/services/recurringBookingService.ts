// Recurring Booking Service Functions
// Add these to your firebaseService.ts or create a separate recurringBookingService.ts

import { 
  collection, 
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebaseService';
import { Booking } from '../types';
import { 
  generateRecurringGroupId, 
  getWeeklyRecurringDates,
  addWeeks 
} from '../utils/timeUtils';

export const recurringBookingService = {
  /**
   * Create a recurring booking series
   * @param bookingData - Base booking data
   * @param endDate - Optional end date, defaults to 1 year from start
   * @returns Array of created booking IDs
   */
  async createRecurringBooking(
    bookingData: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>,
    endDate?: string
  ): Promise<string[]> {
    try {
      const recurringGroupId = generateRecurringGroupId();
      const startDate = bookingData.date;
      
      // Calculate end date (1 year if not specified)
      const finalEndDate = endDate || addWeeks(startDate, 52);
      
      // Get all weekly dates
      const dates = getWeeklyRecurringDates(startDate, finalEndDate);
      
      // Create bookings in batches (Firestore limit: 500 per batch)
      const bookingIds: string[] = [];
      const batchSize = 500;
      
      for (let i = 0; i < dates.length; i += batchSize) {
        const batchDates = dates.slice(i, i + batchSize);
        const batch = writeBatch(db);
        
        for (const date of batchDates) {
          const bookingRef = doc(collection(db, 'bookings'));
          batch.set(bookingRef, {
            ...bookingData,
            date,
            isRecurring: true,
            recurringPattern: 'weekly',
            recurringGroupId,
            recurringEndDate: finalEndDate,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          bookingIds.push(bookingRef.id);
        }
        
        await batch.commit();
      }
      
      return bookingIds;
    } catch (error) {
      console.error('Error creating recurring booking:', error);
      throw new Error('Failed to create recurring booking series');
    }
  },

  /**
   * Get all bookings in a recurring series
   */
  async getRecurringSeriesBookings(recurringGroupId: string): Promise<Booking[]> {
    try {
      const q = query(
        collection(db, 'bookings'),
        where('recurringGroupId', '==', recurringGroupId)
      );
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
        createdAt: docSnap.data().createdAt?.toDate() || new Date(),
        updatedAt: docSnap.data().updatedAt?.toDate() || new Date(),
      } as Booking));
    } catch (error) {
      console.error('Error getting recurring series:', error);
      throw new Error('Failed to load recurring bookings');
    }
  },

  /**
   * Get future bookings in a recurring series (from a specific date)
   */
  async getFutureRecurringBookings(
    recurringGroupId: string,
    fromDate: string
  ): Promise<Booking[]> {
    try {
      const q = query(
        collection(db, 'bookings'),
        where('recurringGroupId', '==', recurringGroupId),
        where('date', '>=', fromDate)
      );
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
        createdAt: docSnap.data().createdAt?.toDate() || new Date(),
        updatedAt: docSnap.data().updatedAt?.toDate() || new Date(),
      } as Booking));
    } catch (error) {
      console.error('Error getting future recurring bookings:', error);
      throw new Error('Failed to load future bookings');
    }
  },

  /**
   * Update a single booking in a recurring series
   */
  async updateSingleRecurringBooking(
    bookingId: string,
    updates: Partial<Booking>
  ): Promise<void> {
    try {
      // Remove recurring fields if editing just this one
      const cleanUpdates = { ...updates };
      delete cleanUpdates.isRecurring;
      delete cleanUpdates.recurringGroupId;
      
      await updateDoc(doc(db, 'bookings', bookingId), {
        ...cleanUpdates,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating single recurring booking:', error);
      throw new Error('Failed to update booking');
    }
  },

  /**
   * Update all future bookings in a recurring series
   */
  async updateFutureRecurringBookings(
    recurringGroupId: string,
    fromDate: string,
    updates: Partial<Booking>
  ): Promise<void> {
    try {
      const futureBookings = await this.getFutureRecurringBookings(recurringGroupId, fromDate);
      
      // Update in batches
      const batchSize = 500;
      for (let i = 0; i < futureBookings.length; i += batchSize) {
        const batch = writeBatch(db);
        const batchBookings = futureBookings.slice(i, i + batchSize);
        
        for (const booking of batchBookings) {
          batch.update(doc(db, 'bookings', booking.id), {
            ...updates,
            updatedAt: serverTimestamp(),
          });
        }
        
        await batch.commit();
      }
    } catch (error) {
      console.error('Error updating future recurring bookings:', error);
      throw new Error('Failed to update recurring series');
    }
  },

  /**
   * Delete a single booking in a recurring series
   */
  async deleteSingleRecurringBooking(bookingId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'bookings', bookingId));
    } catch (error) {
      console.error('Error deleting single recurring booking:', error);
      throw new Error('Failed to delete booking');
    }
  },

  /**
   * Delete all future bookings in a recurring series
   */
  async deleteFutureRecurringBookings(
    recurringGroupId: string,
    fromDate: string
  ): Promise<void> {
    try {
      const futureBookings = await this.getFutureRecurringBookings(recurringGroupId, fromDate);
      
      // Delete in batches
      const batchSize = 500;
      for (let i = 0; i < futureBookings.length; i += batchSize) {
        const batch = writeBatch(db);
        const batchBookings = futureBookings.slice(i, i + batchSize);
        
        for (const booking of batchBookings) {
          batch.delete(doc(db, 'bookings', booking.id));
        }
        
        await batch.commit();
      }
    } catch (error) {
      console.error('Error deleting future recurring bookings:', error);
      throw new Error('Failed to delete recurring series');
    }
  },

  /**
   * Delete entire recurring series
   */
  async deleteRecurringSeries(recurringGroupId: string): Promise<void> {
    try {
      const allBookings = await this.getRecurringSeriesBookings(recurringGroupId);
      
      // Delete in batches
      const batchSize = 500;
      for (let i = 0; i < allBookings.length; i += batchSize) {
        const batch = writeBatch(db);
        const batchBookings = allBookings.slice(i, i + batchSize);
        
        for (const booking of batchBookings) {
          batch.delete(doc(db, 'bookings', booking.id));
        }
        
        await batch.commit();
      }
    } catch (error) {
      console.error('Error deleting recurring series:', error);
      throw new Error('Failed to delete recurring series');
    }
  },
};
