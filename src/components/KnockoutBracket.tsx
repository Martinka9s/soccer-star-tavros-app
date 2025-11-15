import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Play } from 'lucide-react';
import { BracketMatch, ChampionshipType } from '../types';
import { teamService } from '../services/firebaseService';

interface KnockoutBracketProps {
  championship: ChampionshipType;
}

const KnockoutBracket: React.FC<KnockoutBracketProps> = ({ championship }) => {
  const { t } = useTranslation();
  const [matches, setMatches] = useState<BracketMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await teamService.getBracketMatchesForChampionship(
          championship
        );
        setMatches(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [championship]);

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-600 dark:text-gray-400">
        {t('loading', { defaultValue: 'Loading...' })}
      </div>
    );
  }

  const r16 = matches.filter((m) => m.round === 'round_of_16');
  const qf = matches.filter((m) => m.round === 'quarterfinals');
  const sf = matches.filter((m) => m.round === 'semifinals');
  const finalMatch = matches.find((m) => m.round === 'final');

  if (r16.length === 0 && qf.length === 0 && sf.length === 0 && !finalMatch) {
    return (
      <div className="p-8 text-center text-gray-600 dark:text-gray-400">
        {t('bracketComingSoon', {
          defaultValue: 'Knockout bracket will appear here when finals begin',
        })}
      </div>
    );
  }

  // Left / right split like your image
  const leftR16 = r16.filter((m) => m.matchNumber <= 4);
  const rightR16 = r16.filter((m) => m.matchNumber > 4);

  const leftQF = qf.filter((m) => m.matchNumber <= 2);
  const rightQF = qf.filter((m) => m.matchNumber > 2);

  const leftSF = sf.filter((m) => m.matchNumber === 1);
  const rightSF = sf.filter((m) => m.matchNumber === 2);

  return (
    <div className="w-full overflow-x-auto py-6">
      <div className="min-w-[900px] grid grid-cols-[1.2fr,auto,1.2fr] gap-6 items-stretch">
        {/* LEFT SIDE */}
        <div className="grid grid-cols-3 gap-x-4 gap-y-6">
          {/* Round of 16 (left) */}
          <div className="space-y-4">
            <RoundTitle label={t('roundOf16', { defaultValue: 'Round of 16' })} />
            {padToLength(leftR16, 4).map((m, idx) => (
              <MatchCard key={m?.id ?? `l-r16-${idx}`} match={m} />
            ))}
          </div>

          {/* Quarterfinals (left) */}
          <div className="space-y-6 pt-8">
            <RoundTitle label={t('quarterfinals', { defaultValue: 'Quarterfinals' })} />
            {padToLength(leftQF, 2).map((m, idx) => (
              <MatchCard key={m?.id ?? `l-qf-${idx}`} match={m} />
            ))}
          </div>

          {/* Semifinal (left) */}
          <div className="space-y-16 pt-16">
            <RoundTitle label={t('semifinals', { defaultValue: 'Semifinals' })} />
            {padToLength(leftSF, 1).map((m, idx) => (
              <MatchCard key={m?.id ?? `l-sf-${idx}`} match={m} />
            ))}
          </div>
        </div>

        {/* CENTER – FINAL */}
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="px-4 py-1 rounded-full bg-[#6B2FB5] text-white text-xs font-semibold tracking-wide uppercase flex items-center gap-2">
            <Play size={14} />
            {t('final', { defaultValue: 'Final' })}
          </div>

          <div className="w-64">
            <MatchCard match={finalMatch ?? null} highlight />
          </div>

          <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            {t('champion', { defaultValue: 'Champion' })}
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="grid grid-cols-3 gap-x-4 gap-y-6">
          {/* Semifinal (right) */}
          <div className="space-y-16 pt-16">
            <RoundTitle label={t('semifinals', { defaultValue: 'Semifinals' })} />
            {padToLength(rightSF, 1).map((m, idx) => (
              <MatchCard key={m?.id ?? `r-sf-${idx}`} match={m} />
            ))}
          </div>

          {/* Quarterfinals (right) */}
          <div className="space-y-6 pt-8">
            <RoundTitle label={t('quarterfinals', { defaultValue: 'Quarterfinals' })} />
            {padToLength(rightQF, 2).map((m, idx) => (
              <MatchCard key={m?.id ?? `r-qf-${idx}`} match={m} />
            ))}
          </div>

          {/* Round of 16 (right) */}
          <div className="space-y-4">
            <RoundTitle label={t('roundOf16', { defaultValue: 'Round of 16' })} />
            {padToLength(rightR16, 4).map((m, idx) => (
              <MatchCard key={m?.id ?? `r-r16-${idx}`} match={m} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const RoundTitle: React.FC<{ label: string }> = ({ label }) => (
  <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
    {label}
  </div>
);

const padToLength = <T,>(arr: T[], len: number): (T | null)[] => {
  const result = [...arr];
  while (result.length < len) result.push(null);
  return result;
};

const MatchCard: React.FC<{ match: BracketMatch | null; highlight?: boolean }> = ({
  match,
  highlight = false,
}) => {
  const hasTeams = !!(match?.homeTeamName || match?.awayTeamName);
  const homeScore =
    typeof match?.homeTeamScore === 'number' ? String(match.homeTeamScore) : '';
  const awayScore =
    typeof match?.awayTeamScore === 'number' ? String(match.awayTeamScore) : '';

  return (
    <div
      className={`relative rounded-lg border text-xs px-3 py-2 bg-slate-50/80 dark:bg-dark border-slate-200 dark:border-gray-700 min-h-[56px] flex flex-col justify-center ${
        highlight
          ? 'ring-2 ring-[#6B2FB5] shadow-lg'
          : 'shadow-sm'
      }`}
    >
      {hasTeams ? (
        <>
          <Row
            name={match?.homeTeamName ?? 'TBD'}
            score={homeScore}
            bold={!!match?.winnerId && match.winnerId === match.homeTeamId}
          />
          <Row
            name={match?.awayTeamName ?? 'TBD'}
            score={awayScore}
            bold={!!match?.winnerId && match.winnerId === match.awayTeamId}
          />
        </>
      ) : (
        <div className="text-[11px] text-gray-500 dark:text-gray-400 italic text-center">
          TBD
        </div>
      )}
    </div>
  );
};

const Row: React.FC<{ name: string; score: string; bold?: boolean }> = ({
  name,
  score,
  bold = false,
}) => (
  <div className="flex items-center justify-between gap-2">
    <span
      className={`truncate ${
        bold ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-200'
      }`}
      title={name}
    >
      {name}
    </span>
    <span
      className={`w-6 text-right ${
        bold ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'
      }`}
    >
      {score}
    </span>
  </div>
);

export default KnockoutBracket;
