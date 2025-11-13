import React, { useState, useEffect } from 'react';
import { Trophy, Check, X, Trash2, MoveHorizontal, RotateCcw, ChevronDown } from 'lucide-react';
import { Team, ChampionshipType } from '../types';

interface TeamsManagementProps {
  // TODO: Add Firebase service functions as props
}

const TeamsManagement: React.FC<TeamsManagementProps> = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChampionship, setSelectedChampionship] = useState<ChampionshipType | ''>('');

  // TODO: Fetch teams from Firebase
  useEffect(() => {
    // Mock data for now
    setTeams([]);
    setLoading(false);
  }, []);

  const pendingTeams = teams.filter(t => t.status === 'pending');
  const dreamLeagueTeams = teams.filter(t => t.status === 'approved' && t.championship === 'MSL DREAM LEAGUE');
  const mslATeams = teams.filter(t => t.status === 'approved' && t.championship === 'MSL A');
  const mslBTeams = teams.filter(t => t.status === 'approved' && t.championship === 'MSL B');

  const handleApprove = async (teamId: string, championship: ChampionshipType) => {
    // TODO: Call Firebase service to approve team
    console.log('Approve team:', teamId, 'to championship:', championship);
  };

  const handleDecline = async (teamId: string) => {
    if (!window.confirm('Are you sure you want to decline this team registration?')) return;
    // TODO: Call Firebase service to decline team
    console.log('Decline team:', teamId);
  };

  const handleMoveTeam = async (teamId: string, newChampionship: ChampionshipType) => {
    if (!window.confirm('Moving this team will reset all their stats. Continue?')) return;
    // TODO: Call Firebase service to move team and reset stats
    console.log('Move team:', teamId, 'to:', newChampionship);
  };

  const handleRemoveTeam = async (teamId: string) => {
    if (!window.confirm('Are you sure you want to remove this team?')) return;
    // TODO: Call Firebase service to remove team
    console.log('Remove team:', teamId);
  };

  const handleResetChampionship = async (championship: ChampionshipType) => {
    const confirmed = window.confirm(
      `Reset ${championship}?\n\nThis will:\n- Archive current season data\n- Reset all team stats to 0\n- Clear match results\n\nTeams will remain assigned for new season.\n\nContinue?`
    );
    if (!confirmed) return;
    // TODO: Call Firebase service to reset championship
    console.log('Reset championship:', championship);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600 dark:text-gray-400">Loading teams...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Teams Management
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Review registrations, manage teams, and organize championships
        </p>
      </div>

      {/* Pending Requests */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center space-x-2">
            <span>Pending Requests</span>
            {pendingTeams.length > 0 && (
              <span className="px-3 py-1 bg-orange-500 text-white text-sm font-bold rounded-full">
                {pendingTeams.length}
              </span>
            )}
          </h2>
        </div>

        {pendingTeams.length === 0 ? (
          <div className="bg-slate-100 dark:bg-dark-lighter rounded-lg p-8 text-center">
            <p className="text-gray-600 dark:text-gray-400">No pending requests</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingTeams.map((team) => (
              <div
                key={team.id}
                className="bg-slate-100 dark:bg-dark-lighter rounded-lg p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                      {team.name}
                    </h3>
                    <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <p>👤 {team.userEmail}</p>
                      <p>📞 {team.phoneNumber}</p>
                      <p className="text-xs">
                        Requested: {new Date(team.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col space-y-2">
                    <select
                      value={selectedChampionship || ''}
                      onChange={(e) => setSelectedChampionship(e.target.value as ChampionshipType)}
                      className="px-4 py-2 bg-white dark:bg-dark border border-slate-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                    >
                      <option value="">Select Championship</option>
                      <option value="MSL DREAM LEAGUE">MSL DREAM LEAGUE</option>
                      <option value="MSL A">MSL A</option>
                      <option value="MSL B">MSL B</option>
                    </select>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => selectedChampionship && handleApprove(team.id, selectedChampionship as ChampionshipType)}
                        disabled={!selectedChampionship}
                        className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-1"
                      >
                        <Check size={18} />
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={() => handleDecline(team.id)}
                        className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium flex items-center justify-center space-x-1"
                      >
                        <X size={18} />
                        <span>Decline</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* MSL DREAM LEAGUE */}
      <ChampionshipSection
        championship="MSL DREAM LEAGUE"
        teams={dreamLeagueTeams}
        onMoveTeam={handleMoveTeam}
        onRemoveTeam={handleRemoveTeam}
        onResetChampionship={handleResetChampionship}
      />

      {/* MSL A */}
      <ChampionshipSection
        championship="MSL A"
        teams={mslATeams}
        onMoveTeam={handleMoveTeam}
        onRemoveTeam={handleRemoveTeam}
        onResetChampionship={handleResetChampionship}
      />

      {/* MSL B */}
      <ChampionshipSection
        championship="MSL B"
        teams={mslBTeams}
        onMoveTeam={handleMoveTeam}
        onRemoveTeam={handleRemoveTeam}
        onResetChampionship={handleResetChampionship}
      />
    </div>
  );
};

// Championship Section Component
interface ChampionshipSectionProps {
  championship: ChampionshipType;
  teams: Team[];
  onMoveTeam: (teamId: string, newChampionship: ChampionshipType) => void;
  onRemoveTeam: (teamId: string) => void;
  onResetChampionship: (championship: ChampionshipType) => void;
}

const ChampionshipSection: React.FC<ChampionshipSectionProps> = ({
  championship,
  teams,
  onMoveTeam,
  onRemoveTeam,
  onResetChampionship,
}) => {
  const [expanded, setExpanded] = useState(true);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [targetChampionship, setTargetChampionship] = useState<ChampionshipType | ''>('');

  const otherChampionships: ChampionshipType[] = [
    'MSL DREAM LEAGUE',
    'MSL A',
    'MSL B',
  ].filter((c) => c !== championship) as ChampionshipType[];

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center space-x-2 text-2xl font-bold text-gray-900 dark:text-white hover:text-[#6B2FB5] dark:hover:text-primary transition-colors"
        >
          <Trophy size={28} className="text-[#6B2FB5]" />
          <span>{championship}</span>
          <span className="text-sm font-normal text-gray-600 dark:text-gray-400">
            ({teams.length} teams)
          </span>
          <ChevronDown
            size={24}
            className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
        </button>

        <button
          onClick={() => onResetChampionship(championship)}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors font-medium flex items-center space-x-2"
        >
          <RotateCcw size={18} />
          <span>Reset Season</span>
        </button>
      </div>

      {expanded && (
        <>
          {teams.length === 0 ? (
            <div className="bg-slate-100 dark:bg-dark-lighter rounded-lg p-8 text-center">
              <p className="text-gray-600 dark:text-gray-400">No teams in this championship</p>
            </div>
          ) : (
            <div className="space-y-3">
              {teams.map((team) => (
                <div
                  key={team.id}
                  className="bg-slate-100 dark:bg-dark-lighter rounded-lg p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                        {team.name}
                      </h3>
                      <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        <p>👤 {team.userEmail}</p>
                        <p>📞 {team.phoneNumber}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-xs">
                            Pts: {team.stats.points}
                          </span>
                          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded text-xs">
                            Pla: {team.stats.played}
                          </span>
                          <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded text-xs">
                            W: {team.stats.wins}
                          </span>
                          <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded text-xs">
                            D: {team.stats.draws}
                          </span>
                          <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded text-xs">
                            L: {team.stats.losses}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col space-y-2 md:ml-4">
                      <div className="flex space-x-2">
                        <select
                          value={selectedTeamId === team.id ? targetChampionship : ''}
                          onChange={(e) => {
                            setSelectedTeamId(team.id);
                            setTargetChampionship(e.target.value as ChampionshipType);
                          }}
                          className="px-3 py-2 bg-white dark:bg-dark border border-slate-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white"
                        >
                          <option value="">Move to...</option>
                          {otherChampionships.map((ch) => (
                            <option key={ch} value={ch}>
                              {ch}
                            </option>
                          ))}
                        </select>

                        {selectedTeamId === team.id && targetChampionship && (
                          <button
                            onClick={() => {
                              onMoveTeam(team.id, targetChampionship as ChampionshipType);
                              setSelectedTeamId('');
                              setTargetChampionship('');
                            }}
                            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                          >
                            <MoveHorizontal size={18} />
                          </button>
                        )}
                      </div>

                      <button
                        onClick={() => onRemoveTeam(team.id)}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium flex items-center justify-center space-x-1 text-sm"
                      >
                        <Trash2 size={16} />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default TeamsManagement;
