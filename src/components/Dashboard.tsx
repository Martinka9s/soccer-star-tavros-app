import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { Booking } from '../types';

interface DashboardProps {
  onBookNowClick: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onBookNowClick }) => {
  const { t } = useTranslation();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showAllResults, setShowAllResults] = useState(false);
  const [showAllNextGames, setShowAllNextGames] = useState(false);

  // Placeholder carousel images - replace with your actual images
  const carouselImages = [
    '/sst_logo.PNG', // Placeholder - replace with actual carousel images
    '/sst_logo.PNG',
    '/sst_logo.PNG',
  ];

  // Auto-advance carousel every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [carouselImages.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % carouselImages.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + carouselImages.length) % carouselImages.length);
  };

  // TODO: Replace with actual data fetched from Firebase
  // Fetch yesterday's completed matches with scores
  const yesterdayResults: Booking[] = [
    // Mock data - will be replaced with Firebase query
  ];

  // TODO: Replace with actual data fetched from Firebase
  // Fetch tomorrow's scheduled matches
  const nextGames: Booking[] = [
    // Mock data - will be replaced with Firebase query
  ];

  const displayedResults = showAllResults ? yesterdayResults : yesterdayResults.slice(0, 2);
  const displayedNextGames = showAllNextGames ? nextGames : nextGames.slice(0, 2);

  return (
    <div className="space-y-12">
      {/* Hero Section with Carousel */}
      <section className="relative w-full h-[400px] md:h-[500px] rounded-2xl overflow-hidden bg-slate-200 dark:bg-dark-lighter">
        {/* Carousel Images */}
        <div className="relative w-full h-full">
          {carouselImages.map((image, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-opacity duration-700 ${
                index === currentSlide ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <img
                src={image}
                alt={`Slide ${index + 1}`}
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
          className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full transition-all z-10"
          aria-label="Previous slide"
        >
          <ChevronLeft size={24} className="text-white" />
        </button>
        <button
          onClick={nextSlide}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full transition-all z-10"
          aria-label="Next slide"
        >
          <ChevronRight size={24} className="text-white" />
        </button>

        {/* Carousel Indicators */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2 z-10">
          {carouselImages.map((_, index) => (
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
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 z-10">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 drop-shadow-lg">
            {t('appName')}
          </h1>
          <p className="text-xl md:text-2xl text-white mb-8 drop-shadow-md">
            {t('livePitchAvailability')}
          </p>
          <button
            onClick={onBookNowClick}
            className="px-8 py-4 bg-[#6B2FB5] hover:bg-[#5a2596] text-white text-lg font-bold rounded-lg transition-all transform hover:scale-105 shadow-xl"
          >
            <div className="flex items-center space-x-2">
              <CalendarIcon size={24} />
              <span>Book a Pitch Now</span>
            </div>
          </button>
        </div>
      </section>

      {/* Yesterday's Results Section */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            Yesterday's Results
          </h2>
        </div>

        {yesterdayResults.length === 0 ? (
          <div className="text-center py-12 bg-slate-100 dark:bg-dark-lighter rounded-lg">
            <p className="text-gray-600 dark:text-gray-400">
              No results from yesterday
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {displayedResults.map((result) => (
                <div
                  key={result.id}
                  className="bg-slate-100 dark:bg-dark-lighter rounded-lg p-6 flex items-center justify-between hover:shadow-lg transition-shadow"
                >
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
                </div>
              ))}
            </div>

            {yesterdayResults.length > 2 && (
              <button
                onClick={() => setShowAllResults(!showAllResults)}
                className="w-full mt-4 py-2 text-[#6B2FB5] dark:text-primary hover:text-[#5a2596] dark:hover:text-primary-light font-medium flex items-center justify-center space-x-1 transition-colors"
              >
                <span>{showAllResults ? 'Show less' : 'Show all'}</span>
                {showAllResults ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
            )}
          </>
        )}
      </section>

      {/* Next Games Section */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            Next Games
          </h2>
        </div>

        {nextGames.length === 0 ? (
          <div className="text-center py-12 bg-slate-100 dark:bg-dark-lighter rounded-lg">
            <p className="text-gray-600 dark:text-gray-400">
              No upcoming games scheduled
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
                  </div>
                </div>
              ))}
            </div>

            {nextGames.length > 2 && (
              <button
                onClick={() => setShowAllNextGames(!showAllNextGames)}
                className="w-full mt-4 py-2 text-[#6B2FB5] dark:text-primary hover:text-[#5a2596] dark:hover:text-primary-light font-medium flex items-center justify-center space-x-1 transition-colors"
              >
                <span>{showAllNextGames ? 'Show less' : 'Show all'}</span>
                {showAllNextGames ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
            )}
          </>
        )}
      </section>
    </div>
  );
};

export default Dashboard;
