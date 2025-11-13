import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Trophy } from 'lucide-react';

interface TeamRegistrationModalProps {
  onClose: () => void;
  onSubmit: (teamName: string, phoneNumber: string) => Promise<void>;
  userEmail: string;
  existingTeamName?: string;
  existingPhone?: string;
}

const TeamRegistrationModal: React.FC<TeamRegistrationModalProps> = ({
  onClose,
  onSubmit,
  userEmail,
  existingTeamName = '',
  existingPhone = '',
}) => {
  const { t } = useTranslation();
  const [teamName, setTeamName] = useState(existingTeamName);
  const [phoneNumber, setPhoneNumber] = useState(existingPhone);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!teamName.trim()) {
      setError('Team name is required');
      return;
    }

    if (!phoneNumber.trim()) {
      setError('Phone number is required');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(teamName.trim(), phoneNumber.trim());
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit registration');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-50 dark:bg-dark-lighter rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-[#6B2FB5] rounded-lg">
              <Trophy size={24} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Join Championship
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <p className="text-gray-600 dark:text-gray-400">
            Register your team to compete in our championships. An admin will review your request and assign you to the appropriate league.
          </p>

          {/* Email (read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email
            </label>
            <input
              type="email"
              value={userEmail}
              disabled
              className="w-full px-4 py-3 bg-slate-100 dark:bg-dark border border-slate-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400"
            />
          </div>

          {/* Team Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Team Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Enter your team name"
              required
              className="w-full px-4 py-3 bg-white dark:bg-dark border border-slate-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#6B2FB5] focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400"
            />
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="Enter your phone number"
              required
              className="w-full px-4 py-3 bg-white dark:bg-dark border border-slate-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#6B2FB5] focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Info Box */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              📋 Your request will be reviewed by an admin who will assign you to one of our championships: MSL DREAM LEAGUE, MSL A, or MSL B.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-slate-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-slate-100 dark:hover:bg-dark transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 bg-[#6B2FB5] hover:bg-[#5a2596] text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TeamRegistrationModal;
