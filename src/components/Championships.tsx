import React, { useState, useEffect } from 'react';
import { Trophy, Calendar, Target, Award, ChevronDown, ChevronUp } from 'lucide-react';
import { Team, ChampionshipType } from '../types';
import { teamService } from '../services/firebaseService';

const Championships: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChampionship, setSelectedChampionship] = useState<ChampionshipType>('MSL DREAM LEAGUE');

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    try {
      setLoading(true);
      const allTeams = await teamService.getAllTeams();
      setTeams(allTeams.filter(t => t.status === 'approved'));
    } catch (error) {
      console.error('Error loading teams:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter teams by championship
  const championshipTeams = teams.filter(t => t.championship === selectedChampionship);

  // Sort by points (desc), then goal difference, then goals for
  const sortedTeams = [...championshipTeams].sort((a, b) => {
    if (b.stats.points !== a.stats.points) {
      return b.stats.points - a.stats.points;
    }
    const gdA = (a.stats.goalsFor || 0) - (a.stats.goalsAgainst || 0);
    const gdB = (b.stats.goalsFor || 0) - (b.stats.goalsAgainst || 0);
    if (gdB !== gdA) {
      return gdB - gdA;
    }
    return (b.stats.goalsFor || 0) - (a.stats.goalsFor || 0);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600 dark:text-gray-400">Loading championships...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Championships
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            View standings and match schedules
          </p>
        </div>
      </div>

      {/* Championship Selector */}
      <div className="flex space-x-2 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedChampionship('MSL DREAM LEAGUE')}
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
          onClick={() => setSelectedChampionship('MSL A')}
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
          onClick={() => setSelectedChampionship('MSL B')}
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

      {/* Standings Table */}
      <div className="bg-white dark:bg-dark-lighter rounded-lg shadow-lg overflow-hidden">
        <div className="px-6 py-4 bg-[#6B2FB5] border-b border-purple-600">
          <h2 className="text-xl font-bold text-white flex items-center">
            <Award size={24} className="mr-2" />
            Standings
          </h2>
        </div>

        {sortedTeams.length === 0 ? (
          <div className="p-12 text-center">
            <Trophy size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              No teams in this championship yet
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
                  const goalDifference = (team.stats.goalsFor || 0) - (team.stats.goalsAgainst || 0);
                  const isTopThree = index < 3;
                  
                  return (
                    <tr
                      key={team.id}
                      className={`hover:bg-slate-50 dark:hover:bg-dark transition-colors ${
                        isTopThree ? 'bg-green-50 dark:bg-green-900/10' : ''
                      }`}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`font-bold ${
                          index === 0 ? 'text-yellow-600' :
                          index === 1 ? 'text-gray-400' :
                          index === 2 ? 'text-orange-600' :
                          'text-gray-600 dark:text-gray-400'
                        }`}>
                          {index + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {team.name}
                        </span>
                      </td>
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
                      <td className={`px-4 py-3 text-center font-medium ${
                        goalDifference > 0 ? 'text-green-600 dark:text-green-400' :
                        goalDifference < 0 ? 'text-red-600 dark:text-red-400' :
                        'text-gray-700 dark:text-gray-300'
                      }`}>
                        {goalDifference > 0 ? '+' : ''}{goalDifference}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-1 bg-[#6B2FB5] text-white rounded font-bold">
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
            Legend
          </h3>
          <div className="flex flex-wrap gap-4 text-xs text-gray-600 dark:text-gray-400">
            <span><strong>Pld:</strong> Played</span>
            <span><strong>W:</strong> Won</span>
            <span><strong>D:</strong> Draw</span>
            <span><strong>L:</strong> Lost</span>
            <span><strong>GF:</strong> Goals For</span>
            <span><strong>GA:</strong> Goals Against</span>
            <span><strong>GD:</strong> Goal Difference</span>
            <span><strong>Pts:</strong> Points</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-300 dark:border-gray-600">
            <span className="text-xs text-gray-600 dark:text-gray-400">
              🟢 <strong>Top 3</strong> highlighted in green
            </span>
          </div>
        </div>
      )}

      {/* Upcoming Matches - Placeholder for now */}
      <div className="bg-white dark:bg-dark-lighter rounded-lg shadow-lg overflow-hidden">
        <div className="px-6 py-4 bg-[#6B2FB5] border-b border-purple-600">
          <h2 className="text-xl font-bold text-white flex items-center">
            <Calendar size={24} className="mr-2" />
            Upcoming Matches
          </h2>
        </div>
        <div className="p-12 text-center">
          <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            Match schedule coming soon
          </p>
        </div>
      </div>
    </div>
  );
};

export default Championships;
