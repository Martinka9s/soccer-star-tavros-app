import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Trophy } from 'lucide-react';
import { ChampionshipType, SubgroupType, TeamLevel, PreferredDay } from '../types';

interface TeamModalProps {
  onClose: () => void;
  onSubmit: (
    teamName: string, 
    phoneNumber: string, 
    teamLevel: TeamLevel, 
    preferredDay: PreferredDay, 
    championship?: ChampionshipType, 
    subgroup?: SubgroupType
  ) => Promise<void>;
  userEmail: string;
  existingTeamName?: string;
  existingPhone?: string;
  existingTeamLevel?: TeamLevel;
  existingPreferredDay?: PreferredDay;
  isAdminAssigning?: boolean; // NEW: Admin assigning team to championship
  existingChampionship?: ChampionshipType;
  existingSubgroup?: SubgroupType;
}

const TeamModal: React.FC<TeamModalProps> = ({
  onClose,
  onSubmit,
  userEmail,
  existingTeamName = '',
  existingPhone = '',
  existingTeamLevel,
  existingPreferredDay,
  isAdminAssigning = false,
  existingChampionship,
  existingSubgroup,
}) => {
  const { t } = useTranslation();
  const [teamName, setTeamName] = useState(existingTeamName);
  const [phoneNumber, setPhoneNumber] = useState(existingPhone);
  const [teamLevel, setTeamLevel] = useState<TeamLevel | ''>(existingTeamLevel || '');
  const [preferredDay, setPreferredDay] = useState<PreferredDay | ''>(existingPreferredDay || '');
  const [selectedChampionship, setSelectedChampionship] = useState<ChampionshipType | undefined>(existingChampionship);
  const [selectedSubgroup, setSelectedSubgroup] = useState<SubgroupType | undefined>(existingSubgroup);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Get available subgroups based on selected championship
  const getSubgroupsForChampionship = (championship?: ChampionshipType): SubgroupType[] => {
    if (championship === 'MSL A') {
      return ['ΟΜΙΛΟΣ ΔΕΥΤΕΡΑΣ', 'ΟΜΙΛΟΣ ΤΡΙΤΗΣ', 'ΟΜΙΛΟΣ ΤΕΤΑΡΤΗΣ'];
    } else if (championship === 'MSL B') {
      return ['ΟΜΙΛΟΣ ΔΕΥΤΕΡΑΣ', 'ΟΜΙΛΟΣ ΤΡΙΤΗΣ', 'ΟΜΙΛΟΣ ΠΕΜΠΤΗΣ'];
    }
    return [];
  };

  // Get English label for subgroup
  const getSubgroupLabel = (subgroup: SubgroupType): string => {
    const labels = {
      'ΟΜΙΛΟΣ ΔΕΥΤΕΡΑΣ': 'Monday Group',
      'ΟΜΙΛΟΣ ΤΡΙΤΗΣ': 'Tuesday Group',
      'ΟΜΙΛΟΣ ΤΕΤΑΡΤΗΣ': 'Wednesday Group',
      'ΟΜΙΛΟΣ ΠΕΜΠΤΗΣ': 'Thursday Group',
    };
    return labels[subgroup] || subgroup;
  };

  const availableSubgroups = getSubgroupsForChampionship(selectedChampionship);
  const requiresSubgroup = availableSubgroups.length > 0;

  // When championship changes, reset subgroup if it's not valid for new championship
  const handleChampionshipChange = (championship: ChampionshipType) => {
    setSelectedChampionship(championship);
    const newSubgroups = getSubgroupsForChampionship(championship);
    if (newSubgroups.length === 0) {
      setSelectedSubgroup(undefined);
    } else if (selectedSubgroup && !newSubgroups.includes(selectedSubgroup)) {
      setSelectedSubgroup(undefined);
    }
  };

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

    if (!teamLevel) {
      setError('Team level is required');
      return;
    }

    if (!preferredDay) {
      setError('Preferred playing day is required');
      return;
    }

    // Admin assigning: require championship selection
    if (isAdminAssigning) {
      if (!selectedChampionship) {
        setError('Please select a championship');
        return;
      }
      if (requiresSubgroup && !selectedSubgroup) {
        setError('Please select a subgroup for this championship');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await onSubmit(
        teamName.trim(), 
        phoneNumber.trim(),
        teamLevel as TeamLevel,
        preferredDay as PreferredDay,
        selectedChampionship,
        selectedSubgroup
      );
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
              {isAdminAssigning 
                ? t('assignTeam', { defaultValue: 'Assign to Championship' })
                : t('joinChampionship', { defaultValue: 'Join Championship' })
              }
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
          {!isAdminAssigning && (
            <p className="text-gray-600 dark:text-gray-400">
              {t('joinChampionshipDesc', { 
                defaultValue: 'Register your team to compete in our championships. An admin will review your request and assign you to the appropriate league.'
              })}
            </p>
          )}

          {/* Email (read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('email')}
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
              {t('teamName')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder={t('enterTeamName', { defaultValue: 'Enter your team name' })}
              required
              disabled={isAdminAssigning}
              className="w-full px-4 py-3 bg-white dark:bg-dark border border-slate-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#6B2FB5] focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400 disabled:bg-slate-100 disabled:text-gray-500"
            />
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('phoneNumber', { defaultValue: 'Phone Number' })} <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder={t('enterPhone', { defaultValue: 'Enter your phone number' })}
              required
              disabled={isAdminAssigning}
              className="w-full px-4 py-3 bg-white dark:bg-dark border border-slate-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#6B2FB5] focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400 disabled:bg-slate-100 disabled:text-gray-500"
            />
          </div>

          {/* Championship Selection (Admin Only) */}
          {isAdminAssigning && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('championship', { defaultValue: 'Championship' })} <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedChampionship || ''}
                onChange={(e) => handleChampionshipChange(e.target.value as ChampionshipType)}
                required
                className="w-full px-4 py-3 bg-white dark:bg-dark border border-slate-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#6B2FB5] focus:border-transparent text-gray-900 dark:text-white"
              >
                <option value="">{t('selectChampionship', { defaultValue: 'Select a championship...' })}</option>
                <option value="MSL DREAM LEAGUE">MSL DREAM LEAGUE</option>
                <option value="MSL A">MSL A</option>
                <option value="MSL B">MSL B</option>
              </select>
            </div>
          )}

          {/* Subgroup Selection (Admin Only, for MSL A/B) */}
          {isAdminAssigning && requiresSubgroup && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('subgroup', { defaultValue: 'Playing Day Group' })} <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedSubgroup || ''}
                onChange={(e) => setSelectedSubgroup(e.target.value as SubgroupType)}
                required
                className="w-full px-4 py-3 bg-white dark:bg-dark border border-slate-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#6B2FB5] focus:border-transparent text-gray-900 dark:text-white"
              >
                <option value="">{t('selectSubgroup', { defaultValue: 'Select a subgroup...' })}</option>
                {availableSubgroups.map(subgroup => (
                  <option key={subgroup} value={subgroup}>
                    {subgroup} ({getSubgroupLabel(subgroup)})
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {t('subgroupExplanation', { 
                  defaultValue: 'Teams in each subgroup will compete against each other during the group stage.' 
                })}
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Info Box */}
          {!isAdminAssigning && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                📋 {t('championshipReviewInfo', {
                  defaultValue: 'Your request will be reviewed by an admin who will assign you to one of our championships: MSL DREAM LEAGUE, MSL A, or MSL B.'
                })}
              </p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-slate-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-slate-100 dark:hover:bg-dark transition-colors font-medium"
            >
              {t('cancel', { defaultValue: 'Cancel' })}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 bg-[#6B2FB5] hover:bg-[#5a2596] text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting 
                ? t('submitting', { defaultValue: 'Submitting...' }) 
                : isAdminAssigning
                ? t('assignTeam', { defaultValue: 'Assign Team' })
                : t('submitRequest', { defaultValue: 'Submit Request' })
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TeamModal;
