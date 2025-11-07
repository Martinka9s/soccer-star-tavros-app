import React from 'react';
import type { User } from '../types';

interface MyBookingsProps {
  user: User;
}

const MyBookings: React.FC<MyBookingsProps> = (_props) => {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">Upcoming bookings</h2>
        <div className="bg-dark-lighter border border-gray-700 rounded-lg p-8 text-center text-gray-400">
          No bookings
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-white mb-4">Past bookings</h2>
        <div className="bg-dark-lighter border border-gray-700 rounded-lg p-8 text-center text-gray-400">
          No bookings
        </div>
      </div>
    </div>
  );
};

export default MyBookings;
