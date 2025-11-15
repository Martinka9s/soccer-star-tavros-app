import KnockoutBracket from './KnockoutBracket';
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Trophy, Award, Users, Play } from 'lucide-react';
import { Team, ChampionshipType, SubgroupType } from '../types';
import { teamService } from '../services/firebaseService';
import { useAuth } from '../hooks/useAuth';

const Championships: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChampionship, setSelectedChampionship] =
    useState<ChampionshipType>('MSL DREAM LEAGUE');
  const [selectedSubgroup, setSelectedSubgroup] =
    useState<SubgroupType | 'ALL'>('ALL');

  useEffect(() => {
    void loadTeams();
  }, []);

  const loadTeams = async () => {
    try {
      setLoading(true);
      const allTeams = await teamService.getAllTeams();
      setTeams(allTeams.filter((t) => t.status === 'approved'));
    } catch (error) {
      console.error('Error loading teams:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get subgroups for selected championship (DB values stay in Greek)
  const getSubgroupsForChampionship = (
    championship: ChampionshipType
  ): SubgroupType[] => {
    if (championship === 'MSL A') {
      return ['ΟΜΙΛΟΣ ΔΕΥΤΕΡΑΣ', 'ΟΜΙΛΟΣ ΤΡΙΤΗΣ', 'ΟΜΙΛΟΣ ΤΕΤΑΡΤΗΣ'];
    } else if (championship === 'MSL B') {
      return ['ΟΜΙΛΟΣ ΔΕΥΤΕΡΑΣ', 'ΟΜΙΛΟΣ ΤΡΙΤΗΣ', 'ΟΜΙΛΟΣ ΠΕΜΠΤΗΣ'];
    }
    return [];
  };

  // Filter teams by championship and optionally by subgroup
  const getFilteredTeams = () => {
    let filtered = teams.filter((t) => t.championship === selectedChampionship);

    if (selectedSubgroup !== 'ALL' && selectedChampionship !== 'MSL DREAM LEAGUE') {
      filtered = filtered.filter((t) => t.subgroup === selectedSubgroup);
    }

    return filtered;
  };

  // Sort teams by standings (points, GD, GF)
  const sortedTeams = [...getFilteredTeams()].sort((a, b) => {
    if (b.stats.points !== a.stats.points) {
      return b.stats.points - a.stats.points;
    }
    const gdA =
      (a.stats.goalsFor || 0) - (a.stats.goalsAgainst || 0);
    const gdB =
      (b.stats.goalsFor || 0) - (b.stats.goalsAgainst || 0);
    if (gdB !== gdA) {
      return gdB - gdA;
    }
    return (b.stats.goalsFor || 0) - (a.stats.goalsFor || 0);
  });

  // Localized labels for subgroups (UI shows Greek or English, DB stays Greek)
  const getSubgroupLabel = (subgroup: SubgroupType): string => {
    const labels: Record<SubgroupType, string> = {
      'ΟΜΙΛΟΣ ΔΕΥΤΕΡΑΣ': t('mondayGroup', { defaultValue: 'Monday group' }),
      'ΟΜΙΛΟΣ ΤΡΙΤΗΣ': t('tuesdayGroup', { defaultValue: 'Tuesday group' }),
      'ΟΜΙΛΟΣ ΤΕΤΑΡΤΗΣ': t('wednesdayGroup', { defaultValue: 'Wednesday group' }),
      'ΟΜΙΛΟΣ ΠΕΜΠΤΗΣ': t('thursdayGroup', { defaultValue: 'Thursday group' }),
    };
    return labels[subgroup] || subgroup;
  };

  // Handle championship change - reset subgroup
  const handleChampionshipChange = (championship: ChampionshipType) => {
    setSelectedChampionship(championship);
    setSelectedSubgroup('ALL');
  };

  // Kick off finals: mark top 8/16 as qualified and the rest as eliminated
  const handleKickoffFinals = async () => {
    if (!isAdmin) {
      alert('Only admin can start finals.');
      return;
    }

    const qualifiersCount =
      selectedChampionship === 'MSL DREAM LEAGUE' ? 8 : 16;
    const confirmText = `Kick off finals for ${selectedChampionship}? Top ${qualifiersCount} teams will qualify and the rest will be marked as eliminated (light red).`;

    if (!window.confirm(confirmText)) {
      return;
    }

    try {
      setLoading(true);
      await teamService.kickoffFinals(selectedChampionship);
      await loadTeams();
      alert(
        'Finals phase started. Qualified teams remain normal, others are marked as eliminated (light red).'
      );
    } catch (error: any) {
      console.error('Error kicking off finals:', error);
      alert(error.message || 'Failed to kick off finals');
    } finally {
      setLoading(false);
    }
  };

  const subgroups = getSubgroupsForChampionship(selectedChampionship);
  const hasSubgroups = subgroups.length > 0;

  // ---------- Knockout bracket data (visual only, from standings) ----------

  const qualifiersCount =
    selectedChampionship === 'MSL DREAM LEAGUE' ? 8 : 16;

  // finals considered "started" when at least one team has eliminated flag set
  const finalsStarted = sortedTeams.some(
    (t) => typeof t.eliminated !== 'undefined'
  );

  // For now we show the bracket only for MSL A & MSL B (16 teams)
  const isSixteenTeamBracket =
    (selectedChampionship === 'MSL A' || selectedChampionship === 'MSL B') &&
    qualifiersCount === 16;

  const qualifiedTeams = isSixteenTeamBracket
    ? sortedTeams.filter((t) => t.eliminated === false)
    : [];

  const showBracket =
    finalsStarted &&
    isSixteenTeamBracket &&
    qualifiedTeams.length >= 16;

  // Seed list 1..16 based on table order
  const seeds = qualifiedTeams.slice(0, 16);

  // Round of 16 pairings: 1–16, 2–15, 3–14, 4–13, 5–12, 6–11, 7–10, 8–9
  const r16Pairs: [number, number][] = [
    [0, 15],
    [1, 14],
    [2, 13],
    [3, 12],
    [4, 11],
    [5, 10],
    [6, 9],
    [7, 8],
  ];

  const r16Matches = r16Pairs.map(([iA, iB], idx) => ({
    label: `R16 ${idx + 1}`,
    home: seeds[iA]?.name ?? `Team ${iA + 1}`,
    away: seeds[iB]?.name ?? `Team ${iB + 1}`,
  }));

  // Quarterfinals – order requested:
  // QF1: Winner R16 1 vs Winner R16 8
  // QF2: Winner R16 2 vs Winner R16 7
  // QF3: Winner R16 3 vs Winner R16 6
  // QF4: Winner R16 4 vs Winner R16 5
  const qfMatches = [
    { label: 'QF 1', subtitle: 'Winner R16 1 vs Winner R16 8' },
    { label: 'QF 2', subtitle: 'Winner R16 2 vs Winner R16 7' },
    { label: 'QF 3', subtitle: 'Winner R16 3 vs Winner R16 6' },
    { label: 'QF 4', subtitle: 'Winner R16 4 vs Winner R16 5' },
  ];

  const sfMatches = [
    { label: 'SF 1', subtitle: 'Winner QF 1 vs Winner QF 4' },
    { label: 'SF 2', subtitle: 'Winner QF 2 vs Winner QF 3' },
  ];

  const finalMatch = {
    label: 'Final',
    subtitle: 'Winner SF 1 vs Winner SF 2',
  };

  // ------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600 dark:text-gray-400">
          {t('loading', { defaultValue: 'Loading...' })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {t('championships', { defaultValue: 'Championships' })}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('championshipsDesc', {
              defaultValue: 'View standings and match schedules',
            })}
          </p>
        </div>
      </div>

      {/* Championship Selector */}
      <div className="flex space-x-2 overflow-x-auto pb-2">
        <button
          onClick={() => handleChampionshipChange('MSL DREAM LEAGUE')}
          className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
            selectedChampionship === 'MSL DREAM LEAGUE'
              ? 'bg-[#6B2FB5] text-white shadow-lg'
              : 'bg-slate-200 dark:bg-dark-lighter text-gray-700 dark:text-gray-300 hover:bg-slate-300 dark:hover:bg-dark'
          }`}
        >
          <Trophy size={18} className="inline mr-2" />
          MSL DL
        </button>
        <button
          onClick={() => handleChampionshipChange('MSL A')}
          className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
            selectedChampionship === 'MSL A'
              ? 'bg-[#6B2FB5] text-white shadow-lg'
              : 'bg-slate-200 dark:bg-dark-lighter text-gray-700 dark:text-gray-300 hover:bg-slate-300 dark:hover:bg-dark'
          }`}
        >
          <Trophy size={18} className="inline mr-2" />
          MSL A
        </button>
        <button
          onClick={() => handleChampionshipChange('MSL B')}
          className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
            selectedChampionship === 'MSL B'
              ? 'bg-[#6B2FB5] text-white shadow-lg'
              : 'bg-slate-200 dark:bg-dark-lighter text-gray-700 dark:text-gray-300 hover:bg-slate-300 dark:hover:bg-dark'
          }`}
        >
          <Trophy size={18} className="inline mr-2" />
          MSL B
        </button>
      </div>

      {/* Subgroup Tabs (for MSL A and MSL B only) */}
      {hasSubgroups && (
        <div className="flex space-x-2 overflow-x-auto pb-2 border-t border-slate-200 dark:border-gray-700 pt-4">
          <button
            onClick={() => setSelectedSubgroup('ALL')}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
              selectedSubgroup === 'ALL'
                ? 'bg-green-600 text-white shadow-lg'
                : 'bg-slate-200 dark:bg-dark-lighter text-gray-700 dark:text-gray-300 hover:bg-slate-300 dark:hover:bg-dark'
            }`}
          >
            <Users size={18} className="inline mr-2" />
            {t('allGroups', { defaultValue: 'All groups (merged)' })}
          </button>
          {subgroups.map((subgroup) => (
            <button
              key={subgroup}
              onClick={() => setSelectedSubgroup(subgroup)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                selectedSubgroup === subgroup
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-slate-200 dark:bg-dark-lighter text-gray-700 dark:text-gray-300 hover:bg-slate-300 dark:hover:bg-dark'
              }`}
            >
              {getSubgroupLabel(subgroup)}
            </button>
          ))}
        </div>
      )}

      {/* Kickoff Finals Button (Admin only) */}
      {isAdmin && sortedTeams.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={handleKickoffFinals}
            className="mb-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold shadow-sm transition-colors"
          >
            Kick off finals
          </button>
        </div>
      )}

      {/* Standings Table */}
      <div className="bg-white dark:bg-dark-lighter rounded-lg shadow-lg overflow-hidden">
        <div className="px-6 py-4 bg-[#6B2FB5] border-b border-purple-600">
          <h2 className="text-xl font-bold text-white flex items-center">
            <Award size={24} className="mr-2" />
            {t('standings', { defaultValue: 'Standings' })}
            {hasSubgroups && selectedSubgroup !== 'ALL' && (
              <span className="ml-3 text-sm font-normal opacity-90">
                - {getSubgroupLabel(selectedSubgroup as SubgroupType)}
              </span>
            )}
            {hasSubgroups && selectedSubgroup === 'ALL' && (
              <span className="ml-3 text-sm font-normal opacity-90">
                -{' '}
                {t('mergedStandings', {
                  defaultValue: 'Combined standings',
                })}
              </span>
            )}
          </h2>
        </div>

        {sortedTeams.length === 0 ? (
          <div className="p-12 text-center">
            <Trophy size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              {hasSubgroups && selectedSubgroup !== 'ALL'
                ? t('noTeamsInSubgroup', {
                    defaultValue: 'No teams in this subgroup yet',
                  })
                : t('noTeamsInChampionship', {
                    defaultValue: 'No teams in this championship yet',
                  })}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-100 dark:bg-dark border-b border-slate-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Pos
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Team
                  </th>
                  {hasSubgroups && selectedSubgroup === 'ALL' && (
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Group
                    </th>
                  )}
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Pld
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    W
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    D
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    L
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    GF
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    GA
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    GD
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Pts
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-gray-700">
                {sortedTeams.map((team, index) => {
                  const goalDifference =
                    (team.stats.goalsFor || 0) -
                    (team.stats.goalsAgainst || 0);
                  const isTopThree = index < 3;
                  const isEliminated = team.eliminated === true;

                  return (
                    <tr
                      key={team.id}
                      className={`hover:bg-slate-50 dark:hover:bg-dark transition-colors ${
                        isEliminated
                          ? 'bg-red-50 dark:bg-red-900/10 opacity-75'
                          : isTopThree
                          ? 'bg-green-50 dark:bg-green-900/10'
                          : ''
                      }`}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`font-bold ${
                            index === 0
                              ? 'text-yellow-600'
                              : index === 1
                              ? 'text-gray-400'
                              : index === 2
                              ? 'text-orange-600'
                              : isEliminated
                              ? 'text-red-500'
                              : 'text-gray-600 dark:text-gray-400'
                          }`}
                        >
                          {index + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`font-medium ${
                            isEliminated
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-gray-900 dark:text-white'
                          }`}
                        >
                          {team.name}
                        </span>
                      </td>
                      {hasSubgroups && selectedSubgroup === 'ALL' && (
                        <td className="px-4 py-3 text-center">
                          <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded">
                            {team.subgroup
                              ? getSubgroupLabel(
                                  team.subgroup as SubgroupType
                                )
                              : '-'}
                          </span>
                        </td>
                      )}
                      <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300">
                        {team.stats.played}
                      </td>
                      <td className="px-4 py-3 text-center text-green-600 dark:text-green-400 font-medium">
                        {team.stats.wins}
                      </td>
                      <td className="px-4 py-3 text-center text-yellow-600 dark:text-yellow-400 font-medium">
                        {team.stats.draws}
                      </td>
                      <td className="px-4 py-3 text-center text-red-600 dark:text-red-400 font-medium">
                        {team.stats.losses}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300">
                        {team.stats.goalsFor || 0}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300">
                        {team.stats.goalsAgainst || 0}
                      </td>
                      <td
                        className={`px-4 py-3 text-center font-medium ${
                          goalDifference > 0
                            ? 'text-green-600 dark:text-green-400'
                            : goalDifference < 0
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {goalDifference > 0 ? '+' : ''}
                        {goalDifference}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`px-2 py-1 rounded font-bold ${
                            isEliminated
                              ? 'bg-red-500 text-white'
                              : 'bg-[#6B2FB5] text-white'
                          }`}
                        >
                          {team.stats.points}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Legend */}
      {sortedTeams.length > 0 && (
        <div className="bg-slate-100 dark:bg-dark-lighter rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            {t('legend', { defaultValue: 'Legend' })}
          </h3>
          <div className="flex flex-wrap gap-4 text-xs text-gray-600 dark:text-gray-400">
            <span>
              <strong>Pld:</strong>{' '}
              {t('played', { defaultValue: 'Played' })}
            </span>
            <span>
              <strong>W:</strong> {t('won', { defaultValue: 'Won' })}
            </span>
            <span>
              <strong>D:</strong> {t('draw', { defaultValue: 'Draw' })}
            </span>
            <span>
              <strong>L:</strong> {t('lost', { defaultValue: 'Lost' })}
            </span>
            <span>
              <strong>GF:</strong>{' '}
              {t('goalsFor', { defaultValue: 'Goals for' })}
            </span>
            <span>
              <strong>GA:</strong>{' '}
              {t('goalsAgainst', { defaultValue: 'Goals against' })}
            </span>
            <span>
              <strong>GD:</strong>{' '}
              {t('goalDifference', {
                defaultValue: 'Goal difference',
              })}
            </span>
            <span>
              <strong>Pts:</strong>{' '}
              {t('points', { defaultValue: 'Points' })}
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-300 dark:border-gray-600 space-y-1">
            <div className="text-xs text-gray-600 dark:text-gray-400">
              🔴{' '}
              <strong>
                {t('eliminated', { defaultValue: 'Eliminated' })}
              </strong>{' '}
              {t('highlightedInRed', {
                defaultValue: 'teams shown in red (out of championship)',
              })}
            </div>
          </div>
        </div>
      )}

      {/* Knockout Bracket */}
      <div className="bg-white dark:bg-dark-lighter rounded-lg shadow-lg overflow-hidden">
        <div className="px-6 py-4 bg-[#6B2FB5] border-b border-purple-600">
          <h2 className="text-xl font-bold text-white flex items-center">
            <Play size={24} className="mr-2" />
            {t('knockoutBracket', {
              defaultValue: 'Knockout bracket',
            })}
          </h2>
        </div>

        {showBracket ? (
          <div className="p-6 overflow-x-auto">
            <div className="grid grid-cols-4 gap-6 min-w-[700px]">
              {/* Round of 16 */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  {t('roundOf16', { defaultValue: 'Round of 16' })}
                </h3>
                <div className="space-y-3">
                  {r16Matches.map((m) => (
                    <BracketMatchCard
                      key={m.label}
                      title={m.label}
                      home={m.home}
                      away={m.away}
                    />
                  ))}
                </div>
              </div>

              {/* Quarterfinals */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  {t('quarterfinals', {
                    defaultValue: 'Quarterfinals',
                  })}
                </h3>
                <div className="space-y-3">
                  {qfMatches.map((m) => (
                    <BracketMatchCard
                      key={m.label}
                      title={m.label}
                      subtitle={m.subtitle}
                    />
                  ))}
                </div>
              </div>

              {/* Semifinals */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  {t('semifinals', { defaultValue: 'Semifinals' })}
                </h3>
                <div className="space-y-3">
                  {sfMatches.map((m) => (
                    <BracketMatchCard
                      key={m.label}
                      title={m.label}
                      subtitle={m.subtitle}
                    />
                  ))}
                </div>
              </div>

              {/* Final */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  {t('final', { defaultValue: 'Final' })}
                </h3>
                <BracketMatchCard
                  title={finalMatch.label}
                  subtitle={finalMatch.subtitle}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="p-12 text-center">
            <Play size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              {t('bracketComingSoon', {
                defaultValue:
                  'Knockout bracket will appear here when finals begin',
              })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

interface BracketMatchCardProps {
  title: string;
  home?: string;
  away?: string;
  subtitle?: string;
}

const BracketMatchCard: React.FC<BracketMatchCardProps> = ({
  title,
  home,
  away,
  subtitle,
}) => {
  return (
    <div className="bg-slate-50 dark:bg-dark rounded-lg border border-slate-200 dark:border-gray-700 px-3 py-2 text-xs text-gray-800 dark:text-gray-200">
      <div className="flex items-center justify-between mb-1">
        <span className="font-semibold">{title}</span>
      </div>
      {home && away ? (
        <>
          <div className="flex justify-between">
            <span className="truncate pr-2">{home}</span>
            <span className="text-gray-500 dark:text-gray-400">vs</span>
          </div>
          <div className="truncate">{away}</div>
        </>
      ) : (
        <div className="text-gray-600 dark:text-gray-400">
          {subtitle}
        </div>
      )}
    </div>
  );
};

export default Championships;
