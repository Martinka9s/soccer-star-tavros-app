import React, { useState } from 'react';
import { X, Calendar, Repeat } from 'lucide-react';

interface RecurringBookingEditModalProps {
  onClose: () => void;
  onEditThis: () => void;
  onEditAll: () => void;
  action: 'edit' | 'delete';
  bookingDate: string;
}

const RecurringBookingEditModal: React.FC<RecurringBookingEditModalProps> = ({
  onClose,
  onEditThis,
  onEditAll,
  action,
  bookingDate,
}) => {
  const [selectedOption, setSelectedOption] = useState<'this' | 'all'>('this');

  const handleConfirm = () => {
    if (selectedOption === 'this') {
      onEditThis();
    } else {
      onEditAll();
    }
  };

  const actionText = action === 'edit' ? 'Edit' : 'Delete';
  const actionTextLower = action === 'edit' ? 'edit' : 'delete';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-lighter rounded-2xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-[#6B2FB5] rounded-lg">
              <Repeat size={24} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {actionText} Recurring Booking
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 dark:hover:bg-dark rounded-lg transition-colors"
            aria-label="Close"
          >
            <X size={24} className="text-gray-700 dark:text-gray-300" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            This is a recurring booking. Would you like to {actionTextLower}:
          </p>

          {/* Option 1: This Event */}
          <label className="flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-dark ${
            selectedOption === 'this'
              ? 'border-[#6B2FB5] bg-purple-50 dark:bg-purple-900/20'
              : 'border-slate-300 dark:border-gray-600'
          }">
            <input
              type="radio"
              name="recurringOption"
              value="this"
              checked={selectedOption === 'this'}
              onChange={() => setSelectedOption('this')}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <Calendar size={18} className="text-gray-600 dark:text-gray-400" />
                <span className="font-semibold text-gray-900 dark:text-white">
                  This event only
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Only {actionTextLower} the booking on {new Date(bookingDate).toLocaleDateString()}
              </p>
            </div>
          </label>

          {/* Option 2: All Future Events */}
          <label className={`flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-dark ${
            selectedOption === 'all'
              ? 'border-[#6B2FB5] bg-purple-50 dark:bg-purple-900/20'
              : 'border-slate-300 dark:border-gray-600'
          }`}>
            <input
              type="radio"
              name="recurringOption"
              value="all"
              checked={selectedOption === 'all'}
              onChange={() => setSelectedOption('all')}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <Repeat size={18} className="text-gray-600 dark:text-gray-400" />
                <span className="font-semibold text-gray-900 dark:text-white">
                  This and all future events
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {actionText} all bookings from {new Date(bookingDate).toLocaleDateString()} onwards
              </p>
            </div>
          </label>

          {/* Info Box */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              💡 <strong>Tip:</strong> Editing "This event only" will break it from the recurring series.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-slate-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-slate-100 dark:hover:bg-dark transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className={`flex-1 px-6 py-3 text-white rounded-lg transition-colors font-medium ${
                action === 'delete'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-[#6B2FB5] hover:bg-[#5a2596]'
              }`}
            >
              {actionText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecurringBookingEditModal;
