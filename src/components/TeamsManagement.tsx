import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Trophy, Check, X, Trash2, MoveHorizontal, RotateCcw, ChevronDown, Edit2, RotateCw } from 'lucide-react';
import { Team, ChampionshipType, SubgroupType, TeamLevel, PreferredDay } from '../types';
import { teamService } from '../services/firebaseService';
import TeamModal from './TeamModal';

interface TeamsManagementProps {
  adminEmail: string;
}

const TeamsManagement: React.FC<TeamsManagementProps> = ({ adminEmail }) => {
  const { t } = useTranslation();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [moveToChampionship, setMoveToChampionship] = useState<ChampionshipType | ''>('');
  const [moveToSubgroup, setMoveToSubgroup] = useState<SubgroupType | undefined>(undefined);
  
  // Modal states
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [teamToAssign, setTeamToAssign] = useState<Team | null>(null);

  // Fetch teams from Firebase
  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    try {
      setLoading(true);
      const allTeams = await teamService.getAllTeams();
      setTeams(allTeams);
    } catch (error) {
      console.error('Error loading teams:', error);
      alert('Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  const pendingTeams = teams.filter(t => t.status === 'pending');
  const dreamLeagueTeams = teams.filter(t => t.status === 'approved' && t.championship === 'MSL DREAM LEAGUE');
  const mslATeams = teams.filter(t => t.status === 'approved' && t.championship === 'MSL A');
  const mslBTeams = teams.filter(t => t.status === 'approved' && t.championship === 'MSL B');
  const inactiveTeams = teams.filter(t => t.status === 'declined' || t.status === 'inactive');

  // Open modal for team assignment
  const handleApproveClick = (team: Team) => {
    setTeamToAssign(team);
    setShowAssignModal(true);
  };

  // Handle assignment from modal
  const handleAssignment = async (
    _teamName: string,
    _phoneNumber: string,
    _teamLevel: TeamLevel,
    _preferredDay: PreferredDay,
    championship?: ChampionshipType,
    subgroup?: SubgroupType
  ) => {
    if (!teamToAssign || !championship) return;

    try {
      await teamService.approveTeam(teamToAssign.id, championship, adminEmail, subgroup);
      alert('Team approved successfully!');
      setShowAssignModal(false);
      setTeamToAssign(null);
      await loadTeams();
    } catch (error: any) {
      console.error('Error approving team:', error);
      alert(error.message || 'Failed to approve team');
    }
  };

  const handleDecline = async (teamId: string) => {
    if (!window.confirm('Decline this team registration? They will be moved to Inactive Teams.')) return;
    try {
      await teamService.declineTeam(teamId, adminEmail);
      alert('Team declined and moved to Inactive Teams');
      await loadTeams();
    } catch (error: any) {
      console.error('Error declining team:', error);
      alert(error.message || 'Failed to decline team');
    }
  };

  const handleMoveTeam = async (teamId: string, newChampionship: ChampionshipType, newSubgroup?: SubgroupType) => {
    if (!window.confirm('Moving this team will reset all their stats. Continue?')) return;
    try {
      await teamService.moveTeam(teamId, newChampionship, newSubgroup);
      alert('Team moved successfully! Stats have been reset.');
      setEditingTeamId(null);
      setMoveToChampionship('');
      setMoveToSubgroup(undefined);
      await loadTeams();
    } catch (error: any) {
      console.error('Error moving team:', error);
      alert(error.message || 'Failed to move team');
    }
  };

  const handleDeactivateTeam = async (teamId: string) => {
    if (!window.confirm('Deactivate this team? They will be moved to Inactive Teams.')) return;
    try {
      await teamService.deactivateTeam(teamId);
      alert('Team deactivated and moved to Inactive Teams');
      setEditingTeamId(null);
      await loadTeams();
    } catch (error: any) {
      console.error('Error deactivating team:', error);
      alert(error.message || 'Failed to deactivate team');
    }
  };

  const handleReactivateTeam = async (teamId: string, championship: ChampionshipType, subgroup?: SubgroupType) => {
    try {
      await teamService.approveTeam(teamId, championship, adminEmail, subgroup);
      alert('Team reactivated successfully!');
      await loadTeams();
    } catch (error: any) {
      console.error('Error reactivating team:', error);
      alert(error.message || 'Failed to reactivate team');
    }
  };

  const handleResetChampionship = async (championship: ChampionshipType) => {
    const confirmed = window.confirm(
      `Reset ${championship}?\n\nThis will:\n- Archive current season data\n- Reset all team stats to 0\n- Clear match results\n\nTeams will remain assigned for new season.\n\nContinue?`
    );
    if (!confirmed) return;
    
    try {
      await teamService.resetChampionship(championship, adminEmail);
      alert(`${championship} has been reset for the new season!`);
      await loadTeams();
    } catch (error: any) {
      console.error('Error resetting championship:', error);
      alert(error.message || 'Failed to reset championship');
    }
  };

  // Get available subgroups for a championship
  const getSubgroupsForChampionship = (championship: ChampionshipType): SubgroupType[] => {
    if (championship === 'MSL A') {
      return ['ΟΜΙΛΟΣ ΔΕΥΤΕΡΑΣ', 'ΟΜΙΛΟΣ ΤΡΙΤΗΣ', 'ΟΜΙΛΟΣ ΤΕΤΑΡΤΗΣ'];
    } else if (championship === 'MSL B') {
      return ['ΟΜΙΛΟΣ ΔΕΥΤΕΡΑΣ', 'ΟΜΙΛΟΣ ΤΡΙΤΗΣ', 'ΟΜΙΛΟΣ ΠΕΜΠΤΗΣ'];
    }
    return [];
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
          {t('teamsManagement', { defaultValue: 'Teams management' })}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {t('teamsManagementDesc', { defaultValue: 'Review registrations, manage teams, and organize championships' })}
        </p>
      </div>

      {/* Pending Requests */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center space-x-2">
            <span>{t('pendingRequests', { defaultValue: 'Pending requests' })}</span>
            {pendingTeams.length > 0 && (
              <span className="px-3 py-1 bg-orange-500 text-white text-sm font-bold rounded-full">
                {pendingTeams.length}
              </span>
            )}
          </h2>
        </div>

        {pendingTeams.length === 0 ? (
          <div className="bg-slate-100 dark:bg-dark-lighter rounded-lg p-8 text-center">
            <p className="text-gray-600 dark:text-gray-400">{t('noPendingRequests', { defaultValue: 'No pending requests' })}</p>
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
                        {t('requested', { defaultValue: 'Requested' })}: {new Date(team.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleApproveClick(team)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium flex items-center space-x-1"
                    >
                      <Check size={18} />
                      <span>{t('approve', { defaultValue: 'Approve' })}</span>
                    </button>
                    <button
                      onClick={() => handleDecline(team.id)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium flex items-center space-x-1"
                    >
                      <X size={18} />
                      <span>{t('decline', { defaultValue: 'Decline' })}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* MSL DL (Dream League) */}
      <ChampionshipSection
        championship="MSL DREAM LEAGUE"
        displayName="MSL DL"
        teams={dreamLeagueTeams}
        editingTeamId={editingTeamId}
        setEditingTeamId={setEditingTeamId}
        moveToChampionship={moveToChampionship}
        setMoveToChampionship={setMoveToChampionship}
        moveToSubgroup={moveToSubgroup}
        setMoveToSubgroup={setMoveToSubgroup}
        onMoveTeam={handleMoveTeam}
        onDeactivateTeam={handleDeactivateTeam}
        onResetChampionship={handleResetChampionship}
        getSubgroupsForChampionship={getSubgroupsForChampionship}
      />

      {/* MSL A */}
      <ChampionshipSection
        championship="MSL A"
        teams={mslATeams}
        editingTeamId={editingTeamId}
        setEditingTeamId={setEditingTeamId}
        moveToChampionship={moveToChampionship}
        setMoveToChampionship={setMoveToChampionship}
        moveToSubgroup={moveToSubgroup}
        setMoveToSubgroup={setMoveToSubgroup}
        onMoveTeam={handleMoveTeam}
        onDeactivateTeam={handleDeactivateTeam}
        onResetChampionship={handleResetChampionship}
        getSubgroupsForChampionship={getSubgroupsForChampionship}
      />

      {/* MSL B */}
      <ChampionshipSection
        championship="MSL B"
        teams={mslBTeams}
        editingTeamId={editingTeamId}
        setEditingTeamId={setEditingTeamId}
        moveToChampionship={moveToChampionship}
        setMoveToChampionship={setMoveToChampionship}
        moveToSubgroup={moveToSubgroup}
        setMoveToSubgroup={setMoveToSubgroup}
        onMoveTeam={handleMoveTeam}
        onDeactivateTeam={handleDeactivateTeam}
        onResetChampionship={handleResetChampionship}
        getSubgroupsForChampionship={getSubgroupsForChampionship}
      />

      {/* Inactive Teams Section */}
      <InactiveTeamsSection
        teams={inactiveTeams}
        onReactivate={handleReactivateTeam}
        getSubgroupsForChampionship={getSubgroupsForChampionship}
      />

      {/* Assignment Modal */}
      {showAssignModal && teamToAssign && (
        <TeamModal
          onClose={() => {
            setShowAssignModal(false);
            setTeamToAssign(null);
          }}
          onSubmit={handleAssignment}
          userEmail={teamToAssign.userEmail}
          existingTeamName={teamToAssign.name}
          existingPhone={teamToAssign.phoneNumber}
          existingTeamLevel={teamToAssign.teamLevel}
          existingPreferredDay={teamToAssign.preferredDay}
          isAdminAssigning={true}
          existingChampionship={teamToAssign.championship}
          existingSubgroup={teamToAssign.subgroup}
        />
      )}
    </div>
  );
};

// Championship Section Component
interface ChampionshipSectionProps {
  championship: ChampionshipType;
  displayName?: string;
  teams: Team[];
  editingTeamId: string | null;
  setEditingTeamId: (id: string | null) => void;
  moveToChampionship: ChampionshipType | '';
  setMoveToChampionship: (championship: ChampionshipType | '') => void;
  moveToSubgroup: SubgroupType | undefined;
  setMoveToSubgroup: (subgroup: SubgroupType | undefined) => void;
  onMoveTeam: (teamId: string, newChampionship: ChampionshipType, newSubgroup?: SubgroupType) => void;
  onDeactivateTeam: (teamId: string) => void;
  onResetChampionship: (championship: ChampionshipType) => void;
  getSubgroupsForChampionship: (championship: ChampionshipType) => SubgroupType[];
}

const ChampionshipSection: React.FC<ChampionshipSectionProps> = ({
  championship,
  displayName,
  teams,
  editingTeamId,
  setEditingTeamId,
  moveToChampionship,
  setMoveToChampionship,
  moveToSubgroup,
  setMoveToSubgroup,
  onMoveTeam,
  onDeactivateTeam,
  onResetChampionship,
  getSubgroupsForChampionship,
}) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(true);

  const otherChampionships: ChampionshipType[] = [
    'MSL DREAM LEAGUE',
    'MSL A',
    'MSL B',
  ].filter((c) => c !== championship) as ChampionshipType[];

  const displayTitle = displayName || championship;
  const availableSubgroups = getSubgroupsForChampionship(moveToChampionship as ChampionshipType);
  const requiresSubgroup = availableSubgroups.length > 0;

  return (
    <section>
      <div className="flex items-center justify-between mb-4 gap-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center space-x-2 flex-1 min-w-0"
        >
          <Trophy size={24} className="text-[#6B2FB5] flex-shrink-0" />
          <div className="flex items-center space-x-2 min-w-0">
            <span className="text-xl font-bold text-gray-900 dark:text-white whitespace-nowrap">
              {displayTitle}
            </span>
            <span className="text-sm font-normal text-gray-600 dark:text-gray-400 whitespace-nowrap">
              ({teams.length} teams)
            </span>
            <ChevronDown
              size={20}
              className={`transition-transform flex-shrink-0 text-gray-600 dark:text-gray-400 ${expanded ? 'rotate-180' : ''}`}
            />
          </div>
        </button>

        <button
          onClick={() => onResetChampionship(championship)}
          className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded-lg transition-colors font-medium flex items-center space-x-1.5 whitespace-nowrap flex-shrink-0"
        >
          <RotateCcw size={16} />
          <span>{t('resetSeason', { defaultValue: 'Reset' })}</span>
        </button>
      </div>

      {expanded && (
        <>
          {teams.length === 0 ? (
            <div className="bg-slate-100 dark:bg-dark-lighter rounded-lg p-8 text-center">
              <p className="text-gray-600 dark:text-gray-400">{t('noTeamsInChampionship', { defaultValue: 'No teams in this championship' })}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {teams.map((team) => {
                const isEditing = editingTeamId === team.id;

                return (
                  <div
                    key={team.id}
                    className="bg-slate-100 dark:bg-dark-lighter rounded-lg p-6 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                          {team.name}
                          {team.subgroup && (
                            <span className="ml-2 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs rounded">
                              {team.subgroup.split(' ')[1]}
                            </span>
                          )}
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
                        {!isEditing ? (
                          <button
                            onClick={() => setEditingTeamId(team.id)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium flex items-center justify-center space-x-2"
                          >
                            <Edit2 size={18} />
                            <span>{t('edit', { defaultValue: 'Edit' })}</span>
                          </button>
                        ) : (
                          <>
                            <select
                              value={moveToChampionship}
                              onChange={(e) => {
                                setMoveToChampionship(e.target.value as ChampionshipType);
                                setMoveToSubgroup(undefined); // Reset subgroup when championship changes
                              }}
                              className="px-3 py-2 bg-white dark:bg-dark border border-slate-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white"
                            >
                              <option value="">{t('moveTo', { defaultValue: 'Move to...' })}</option>
                              {otherChampionships.map((ch) => (
                                <option key={ch} value={ch}>
                                  {ch}
                                </option>
                              ))}
                            </select>

                            {requiresSubgroup && moveToChampionship && (
                              <select
                                value={moveToSubgroup || ''}
                                onChange={(e) => setMoveToSubgroup(e.target.value as SubgroupType)}
                                className="px-3 py-2 bg-white dark:bg-dark border border-slate-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white"
                              >
                                <option value="">{t('selectSubgroup', { defaultValue: 'Select subgroup...' })}</option>
                                {availableSubgroups.map((sg) => (
                                  <option key={sg} value={sg}>
                                    {sg}
                                  </option>
                                ))}
                              </select>
                            )}

                            {moveToChampionship && (!requiresSubgroup || moveToSubgroup) && (
                              <button
                                onClick={() => {
                                  onMoveTeam(team.id, moveToChampionship as ChampionshipType, moveToSubgroup);
                                }}
                                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium flex items-center justify-center space-x-2"
                              >
                                <MoveHorizontal size={18} />
                                <span>{t('moveTeam', { defaultValue: 'Move team' })}</span>
                              </button>
                            )}

                            <button
                              onClick={() => onDeactivateTeam(team.id)}
                              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors font-medium flex items-center justify-center space-x-2"
                            >
                              <Trash2 size={18} />
                              <span>{t('deactivate', { defaultValue: 'Deactivate' })}</span>
                            </button>

                            <button
                              onClick={() => {
                                setEditingTeamId(null);
                                setMoveToChampionship('');
                                setMoveToSubgroup(undefined);
                              }}
                              className="px-4 py-2 border border-slate-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-slate-200 dark:hover:bg-dark transition-colors font-medium"
                            >
                              {t('cancel', { defaultValue: 'Cancel' })}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </section>
  );
};

// Inactive Teams Section Component
interface InactiveTeamsSectionProps {
  teams: Team[];
  onReactivate: (teamId: string, championship: ChampionshipType, subgroup?: SubgroupType) => void;
  getSubgroupsForChampionship: (championship: ChampionshipType) => SubgroupType[];
}

const InactiveTeamsSection: React.FC<InactiveTeamsSectionProps> = ({
  teams,
  onReactivate,
  getSubgroupsForChampionship,
}) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [reactivatingTeamId, setReactivatingTeamId] = useState<string | null>(null);
  const [selectedChampionship, setSelectedChampionship] = useState<ChampionshipType | ''>('');
  const [selectedSubgroup, setSelectedSubgroup] = useState<SubgroupType | undefined>(undefined);

  const availableSubgroups = selectedChampionship ? getSubgroupsForChampionship(selectedChampionship as ChampionshipType) : [];
  const requiresSubgroup = availableSubgroups.length > 0;

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center space-x-2 text-2xl font-bold text-gray-900 dark:text-white hover:text-[#6B2FB5] dark:hover:text-primary transition-colors"
        >
          <Trash2 size={28} className="text-gray-500" />
          <span>{t('inactiveTeams', { defaultValue: 'Inactive teams' })}</span>
          <span className="text-sm font-normal text-gray-600 dark:text-gray-400">
            ({teams.length} teams)
          </span>
          <ChevronDown
            size={24}
            className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {expanded && (
        <>
          {teams.length === 0 ? (
            <div className="bg-slate-100 dark:bg-dark-lighter rounded-lg p-8 text-center">
              <p className="text-gray-600 dark:text-gray-400">{t('noInactiveTeams', { defaultValue: 'No inactive teams' })}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {teams.map((team) => {
                const isReactivating = reactivatingTeamId === team.id;

                return (
                  <div
                    key={team.id}
                    className="bg-slate-100 dark:bg-dark-lighter rounded-lg p-6 opacity-75 hover:opacity-100 transition-all"
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                          {team.name}
                          <span className="ml-2 px-2 py-1 bg-gray-500 text-white text-xs rounded">
                            {team.status === 'declined' ? t('declined', { defaultValue: 'Declined' }) : t('inactive', { defaultValue: 'Inactive' })}
                          </span>
                        </h3>
                        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                          <p>👤 {team.userEmail}</p>
                          <p>📞 {team.phoneNumber}</p>
                        </div>
                      </div>

                      <div className="flex flex-col space-y-2 md:ml-4">
                        {!isReactivating ? (
                          <button
                            onClick={() => setReactivatingTeamId(team.id)}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium flex items-center justify-center space-x-2"
                          >
                            <RotateCw size={18} />
                            <span>{t('reactivate', { defaultValue: 'Reactivate' })}</span>
                          </button>
                        ) : (
                          <>
                            <select
                              value={selectedChampionship}
                              onChange={(e) => {
                                setSelectedChampionship(e.target.value as ChampionshipType);
                                setSelectedSubgroup(undefined);
                              }}
                              className="px-4 py-2 bg-white dark:bg-dark border border-slate-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                            >
                              <option value="">{t('selectChampionship', { defaultValue: 'Select championship' })}</option>
                              <option value="MSL DREAM LEAGUE">MSL DREAM LEAGUE</option>
                              <option value="MSL A">MSL A</option>
                              <option value="MSL B">MSL B</option>
                            </select>

                            {requiresSubgroup && selectedChampionship && (
                              <select
                                value={selectedSubgroup || ''}
                                onChange={(e) => setSelectedSubgroup(e.target.value as SubgroupType)}
                                className="px-4 py-2 bg-white dark:bg-dark border border-slate-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                              >
                                <option value="">{t('selectSubgroup', { defaultValue: 'Select subgroup...' })}</option>
                                {availableSubgroups.map((sg) => (
                                  <option key={sg} value={sg}>
                                    {sg}
                                  </option>
                                ))}
                              </select>
                            )}

                            <button
                              onClick={() => {
                                if (selectedChampionship && (!requiresSubgroup || selectedSubgroup)) {
                                  onReactivate(team.id, selectedChampionship as ChampionshipType, selectedSubgroup);
                                  setReactivatingTeamId(null);
                                  setSelectedChampionship('');
                                  setSelectedSubgroup(undefined);
                                }
                              }}
                              disabled={!selectedChampionship || (requiresSubgroup && !selectedSubgroup)}
                              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {t('confirmReactivate', { defaultValue: 'Confirm reactivate' })}
                            </button>

                            <button
                              onClick={() => {
                                setReactivatingTeamId(null);
                                setSelectedChampionship('');
                                setSelectedSubgroup(undefined);
                              }}
                              className="px-4 py-2 border border-slate-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-slate-200 dark:hover:bg-dark transition-colors font-medium"
                            >
                              {t('cancel', { defaultValue: 'Cancel' })}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default TeamsManagement;
