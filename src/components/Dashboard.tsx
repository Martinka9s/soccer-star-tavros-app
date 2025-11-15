import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, ChevronDown, ChevronUp, Edit2 } from 'lucide-react';
import { Booking, User } from '../types';
import { bookingService } from '../services/firebaseService';

interface DashboardProps {
  onBookNowClick: () => void;
  onJoinChampionshipClick: () => void;
  user?: User | null;
}

const Dashboard: React.FC<DashboardProps> = ({ onBookNowClick, onJoinChampionshipClick, user }) => {
  const { t } = useTranslation();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showAllResults, setShowAllResults] = useState(false);
  const [showAllNextGames, setShowAllNextGames] = useState(false);
  const [nextGames, setNextGames] = useState<Booking[]>([]);
  const [latestResults, setLatestResults] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMatch, setEditingMatch] = useState<string | null>(null);
  const [editScores, setEditScores] = useState({ home: 0, away: 0 });

  // Carousel slides configuration
  const carouselSlides = [
    {
      type: 'book-pitch',
      image: '/sst_logo.PNG',
      title: t('appName'),
      subtitle: t('livePitchAvailability'),
      buttonText: t('bookAPitch'),
      buttonAction: onBookNowClick,
    },
    {
      type: 'join-championship',
      image: '/sst_logo.PNG',
      title: t('joinTheChampionship'),
      subtitle: t('registerYourTeam'),
      buttonText: t('joinNow'),
      buttonAction: onJoinChampionshipClick,
    },
    {
      type: 'info',
      image: '/sst_logo.PNG',
      title: t('professionalFootballFacilities'),
      subtitle: t('stateOfTheArtPitches'),
      buttonText: t('learnMore'),
      buttonAction: onBookNowClick,
    },
  ];

  // Fetch match games
  useEffect(() => {
    loadGames();
  }, []);

  const loadGames = async () => {
    try {
      setLoading(true);
      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);
      const thirtyDaysFromNow = new Date(today);
      thirtyDaysFromNow.setDate(today.getDate() + 30);

      const startDate = thirtyDaysAgo.toISOString().split('T')[0];
      const endDate = thirtyDaysFromNow.toISOString().split('T')[0];

      const allBookings = await bookingService.getAllBookingsInRange(startDate, endDate);
      
      // Filter only match bookings (with both home and away teams)
      const matchBookings = allBookings.filter(
        booking => booking.homeTeam && booking.awayTeam && booking.status === 'booked'
      );

      const todayStr = today.toISOString().split('T')[0];

      // Upcoming games: future matches or today's matches
      const upcoming = matchBookings
        .filter(booking => booking.date >= todayStr)
        .sort((a, b) => {
          if (a.date !== b.date) return a.date.localeCompare(b.date);
          return a.startTime.localeCompare(b.startTime);
        });

      // Latest results: past completed matches with scores
      const past = matchBookings
        .filter(booking => 
          booking.date < todayStr && 
          booking.matchCompleted === true &&
          booking.homeTeamScore !== undefined && 
          booking.awayTeamScore !== undefined
        )
        .sort((a, b) => {
          if (a.date !== b.date) return b.date.localeCompare(a.date);
          return b.startTime.localeCompare(a.startTime);
        })
        .slice(0, 10); // Show last 10 results

      setNextGames(upcoming);
      setLatestResults(past);
    } catch (error) {
      console.error('Error loading games:', error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-advance carousel every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselSlides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [carouselSlides.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % carouselSlides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + carouselSlides.length) % carouselSlides.length);
  };

  const handleEditScore = (matchId: string, homeScore: number, awayScore: number) => {
    setEditingMatch(matchId);
    setEditScores({ home: homeScore || 0, away: awayScore || 0 });
  };

  const handleSaveScore = async (matchId: string) => {
    try {
      await bookingService.updateBooking(matchId, {
        homeTeamScore: editScores.home,
        awayTeamScore: editScores.away,
        matchCompleted: true,
      });
      
      setEditingMatch(null);
      await loadGames();
      alert('Score updated successfully!');
    } catch (error) {
      console.error('Error updating score:', error);
      alert('Failed to update score');
    }
  };

  const displayedResults = showAllResults ? latestResults : latestResults.slice(0, 2);
  const displayedNextGames = showAllNextGames ? nextGames : nextGames.slice(0, 2);

  const isAdmin = user?.role === 'admin';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600 dark:text-gray-400">{t('loading')}...</div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Hero Section with Carousel */}
      <section className="relative w-full h-[300px] md:h-[400px] rounded-2xl overflow-hidden bg-slate-200 dark:bg-dark-lighter">
        {/* Carousel Images */}
        <div className="relative w-full h-full">
          {carouselSlides.map((slide, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-opacity duration-700 ${
                index === currentSlide ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <img
                src={slide.image}
                alt={slide.title}
                className="w-full h-full object-cover"
              />
              {/* Dark overlay for text readability */}
              <div className="absolute inset-0 bg-black/40" />
            </div>
          ))}
        </div>

        {/* Carousel Controls */}
        <button
          onClick={prevSlide}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full transition-all z-20"
          aria-label="Previous slide"
        >
          <ChevronLeft size={24} className="text-white" />
        </button>
        <button
          onClick={nextSlide}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full transition-all z-20"
          aria-label="Next slide"
        >
          <ChevronRight size={24} className="text-white" />
        </button>

        {/* Carousel Indicators */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2 z-20">
          {carouselSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentSlide ? 'bg-white w-8' : 'bg-white/50'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        {/* CTA Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 z-15 pointer-events-none">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 drop-shadow-lg">
            {carouselSlides[currentSlide].title}
          </h1>
          <p className="text-xl md:text-2xl text-white mb-8 drop-shadow-md">
            {carouselSlides[currentSlide].subtitle}
          </p>
          <button
            onClick={carouselSlides[currentSlide].buttonAction}
            className="px-8 py-4 bg-[#6B2FB5] hover:bg-[#5a2596] text-white text-lg font-bold rounded-lg transition-all transform hover:scale-105 shadow-xl pointer-events-auto"
          >
            <div className="flex items-center space-x-2">
              <CalendarIcon size={24} />
              <span>{carouselSlides[currentSlide].buttonText}</span>
            </div>
          </button>
        </div>
      </section>

      {/* Next Games Section */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('nextGames', { defaultValue: 'Next games' })}
          </h2>
        </div>

        {nextGames.length === 0 ? (
          <div className="text-center py-12 bg-slate-100 dark:bg-dark-lighter rounded-lg">
            <p className="text-gray-600 dark:text-gray-400">
              {t('noUpcomingGames')}
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {displayedNextGames.map((game) => (
                <div
                  key={game.id}
                  className="bg-slate-100 dark:bg-dark-lighter rounded-lg p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-semibold text-gray-900 dark:text-white flex-1 text-right pr-6">
                      {game.homeTeam}
                    </div>
                    <div className="bg-slate-700 dark:bg-dark px-6 py-2 rounded-lg">
                      <span className="text-xl font-bold text-white">VS</span>
                    </div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white flex-1 text-left pl-6">
                      {game.awayTeam}
                    </div>
                  </div>
                  <div className="mt-3 text-center text-sm text-gray-600 dark:text-gray-400">
                    {game.date} • {game.startTime} • {game.pitchType}
                    {game.championship && (
                      <span className="ml-2 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded text-xs">
                        {game.championship}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {nextGames.length > 2 && (
              <button
                onClick={() => setShowAllNextGames(!showAllNextGames)}
                className="w-full mt-4 py-2 text-[#6B2FB5] dark:text-primary hover:text-[#5a2596] dark:hover:text-primary-light font-medium flex items-center justify-center space-x-1 transition-colors"
              >
                <span>{showAllNextGames ? t('showLess') : t('showAll')}</span>
                {showAllNextGames ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
            )}
          </>
        )}
      </section>

      {/* Latest Results Section */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('latestResults', { defaultValue: 'Latest results' })}
          </h2>
        </div>

        {latestResults.length === 0 ? (
          <div className="text-center py-12 bg-slate-100 dark:bg-dark-lighter rounded-lg">
            <p className="text-gray-600 dark:text-gray-400">
              {t('noLatestResults', { defaultValue: 'No results yet' })}
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {displayedResults.map((result) => (
                <div
                  key={result.id}
                  className="bg-slate-100 dark:bg-dark-lighter rounded-lg p-6 hover:shadow-lg transition-shadow"
                >
                  {editingMatch === result.id ? (
                    // Edit mode
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="text-lg font-semibold text-gray-900 dark:text-white flex-1 text-right">
                          {result.homeTeam}
                        </div>
                        <input
                          type="number"
                          min="0"
                          value={editScores.home}
                          onChange={(e) => setEditScores({ ...editScores, home: parseInt(e.target.value) || 0 })}
                          className="w-16 px-2 py-1 text-center text-xl font-bold bg-white dark:bg-dark border border-slate-300 dark:border-gray-600 rounded"
                        />
                        <span className="text-xl font-bold text-gray-900 dark:text-white">-</span>
                        <input
                          type="number"
                          min="0"
                          value={editScores.away}
                          onChange={(e) => setEditScores({ ...editScores, away: parseInt(e.target.value) || 0 })}
                          className="w-16 px-2 py-1 text-center text-xl font-bold bg-white dark:bg-dark border border-slate-300 dark:border-gray-600 rounded"
                        />
                        <div className="text-lg font-semibold text-gray-900 dark:text-white flex-1 text-left">
                          {result.awayTeam}
                        </div>
                      </div>
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleSaveScore(result.id)}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm"
                        >
                          {t('save', { defaultValue: 'Save' })}
                        </button>
                        <button
                          onClick={() => setEditingMatch(null)}
                          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm"
                        >
                          {t('cancel', { defaultValue: 'Cancel' })}
                        </button>
                      </div>
                    </div>
                  ) : (
                    // View mode
                    <>
                      <div className="flex items-center justify-between">
                        <div className="text-lg font-semibold text-gray-900 dark:text-white flex-1 text-right pr-6">
                          {result.homeTeam}
                        </div>
                        <div className="bg-slate-700 dark:bg-dark px-6 py-2 rounded-lg">
                          <span className="text-2xl font-bold text-white">
                            {result.homeTeamScore} - {result.awayTeamScore}
                          </span>
                        </div>
                        <div className="text-lg font-semibold text-gray-900 dark:text-white flex-1 text-left pl-6">
                          {result.awayTeam}
                        </div>
                        {isAdmin && (
                          <button
                            onClick={() => handleEditScore(result.id, result.homeTeamScore || 0, result.awayTeamScore || 0)}
                            className="ml-4 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                            title="Edit score"
                          >
                            <Edit2 size={18} />
                          </button>
                        )}
                      </div>
                      <div className="mt-3 text-center text-sm text-gray-600 dark:text-gray-400">
                        {result.date} • {result.pitchType}
                        {result.championship && (
                          <span className="ml-2 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded text-xs">
                            {result.championship}
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            {latestResults.length > 2 && (
              <button
                onClick={() => setShowAllResults(!showAllResults)}
                className="w-full mt-4 py-2 text-[#6B2FB5] dark:text-primary hover:text-[#5a2596] dark:hover:text-primary-light font-medium flex items-center justify-center space-x-1 transition-colors"
              >
                <span>{showAllResults ? t('showLess') : t('showAll')}</span>
                {showAllResults ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
            )}
          </>
        )}
      </section>
    </div>
  );
};

export default Dashboard;
