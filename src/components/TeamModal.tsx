import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { ChampionshipType, PreferredDay, SubgroupType, TeamLevel } from '../types';

interface TeamModalProps {
  onClose: () => void;
  onSubmit: (
    teamName: string,
    phoneNumber: string,
    teamLevel: TeamLevel,
    preferredDay: PreferredDay,
    championship?: ChampionshipType,
    subgroup?: SubgroupType
  ) => Promise<void> | void;
  userEmail: string;

  existingTeamName?: string | null;
  existingPhone?: string | null;
  existingTeamLevel?: TeamLevel | null;
  existingPreferredDay?: PreferredDay | null;

  // When admin assigns a team from TeamsManagement
  isAdminAssigning?: boolean;
  existingChampionship?: ChampionshipType | null;
  existingSubgroup?: SubgroupType | null;
}

const TeamModal: React.FC<TeamModalProps> = ({
  onClose,
  onSubmit,
  userEmail,
  existingTeamName,
  existingPhone,
  existingTeamLevel,
  existingPreferredDay,
  isAdminAssigning = false,
  existingChampionship,
  existingSubgroup,
}) => {
  const { t } = useTranslation();

  const [teamName, setTeamName] = useState(existingTeamName || '');
  const [phoneNumber, setPhoneNumber] = useState(existingPhone || '');
  const [teamLevel, setTeamLevel] = useState<TeamLevel>(
    existingTeamLevel || 'beginner'
  );
  const [preferredDay, setPreferredDay] = useState<PreferredDay>(
    existingPreferredDay || 'monday'
  );

  // For admin assignment
  const [championship, setChampionship] = useState<ChampionshipType | ''>(
    existingChampionship || ''
  );
  const [subgroup, setSubgroup] = useState<SubgroupType | undefined>(
    existingSubgroup || undefined
  );

  const [submitting, setSubmitting] = useState(false);

  const getSubgroupsForChampionship = (
    ch: ChampionshipType | ''
  ): SubgroupType[] => {
    if (ch === 'MSL A') {
      return ['ΟΜΙΛΟΣ ΔΕΥΤΕΡΑΣ', 'ΟΜΙΛΟΣ ΤΡΙΤΗΣ', 'ΟΜΙΛΟΣ ΤΕΤΑΡΤΗΣ'];
    }
    if (ch === 'MSL B') {
      return ['ΟΜΙΛΟΣ ΔΕΥΤΕΡΑΣ', 'ΟΜΙΛΟΣ ΤΡΙΤΗΣ', 'ΟΜΙΛΟΣ ΠΕΜΠΤΗΣ'];
    }
    return [];
  };

  const availableSubgroups = getSubgroupsForChampionship(championship || '');
  const requiresSubgroup = availableSubgroups.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim() || !phoneNumber.trim()) return;

    if (isAdminAssigning && championship === '') return;
    if (isAdminAssigning && requiresSubgroup && !subgroup) return;

    try {
      setSubmitting(true);
      await onSubmit(
        teamName.trim(),
        phoneNumber.trim(),
        teamLevel,
        preferredDay,
        isAdminAssigning ? (championship as ChampionshipType) : undefined,
        isAdminAssigning ? subgroup : undefined
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-slate-50 dark:bg-dark-lighter shadow-xl border border-slate-200 dark:border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              {isAdminAssigning ? t('assignTeam') : t('joinChampionship')}
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              {t('joinChampionshipDesc')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-gray-500 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-gray-900 transition"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Info line */}
          {!isAdminAssigning && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {userEmail}
            </div>
          )}

          {/* Team name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              {t('teamName')}
            </label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-dark px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6B2FB5]"
              placeholder={t('enterTeamName') as string}
              required
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              {t('phoneNumber')}
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-dark px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6B2FB5]"
              placeholder={t('enterPhone') as string}
              required
            />
          </div>

          {/* Team level + preferred day */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                {t('teamLevel')}
              </label>
              <select
                value={teamLevel}
                onChange={(e) => setTeamLevel(e.target.value as TeamLevel)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-dark px-3 py-2 text-sm text-gray-900 dark:text-white"
              >
                <option value="beginner">{t('beginner')}</option>
                <option value="intermediate">{t('intermediate')}</option>
                <option value="advanced">{t('advanced')}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                {t('preferredDay')}
              </label>
              <select
                value={preferredDay}
                onChange={(e) => setPreferredDay(e.target.value as PreferredDay)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-dark px-3 py-2 text-sm text-gray-900 dark:text-white"
              >
                <option value="monday">{t('monday')}</option>
                <option value="tuesday">{t('tuesday')}</option>
                <option value="wednesday">{t('wednesday')}</option>
                <option value="thursday">{t('thursday')}</option>
                <option value="friday">{t('friday')}</option>
              </select>
            </div>
          </div>

          {/* Admin-only: championship + subgroup */}
          {isAdminAssigning && (
            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  {t('championship')}
                </label>
                <select
                  value={championship}
                  onChange={(e) => {
                    const value = e.target.value as ChampionshipType | '';
                    setChampionship(value);
                    setSubgroup(undefined);
                  }}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-dark px-3 py-2 text-sm text-gray-900 dark:text-white"
                  required
                >
                  <option value="">{t('selectChampionship')}</option>
                  <option value="MSL DREAM LEAGUE">MSL DREAM LEAGUE</option>
                  <option value="MSL A">MSL A</option>
                  <option value="MSL B">MSL B</option>
                </select>
              </div>

              {requiresSubgroup && championship && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    {t('subgroup')}
                  </label>
                  <select
                    value={subgroup || ''}
                    onChange={(e) => setSubgroup(e.target.value as SubgroupType)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-dark px-3 py-2 text-sm text-gray-900 dark:text-white"
                    required={requiresSubgroup}
                  >
                    <option value="">{t('selectSubgroup')}</option>
                    {availableSubgroups.map((sg) => (
                      <option key={sg} value={sg}>
                        {sg}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Footer buttons */}
          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-lg bg-[#6B2FB5] hover:bg-[#5a2596] text-sm font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? t('submitting') : isAdminAssigning ? t('assignTeam') : t('submitRequest')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TeamModal;
