import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OnboardingSlide {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  bgGradient: string;
}

const slides: OnboardingSlide[] = [
  {
    id: 1,
    title: 'Easy Shipping,',
    subtitle: 'Smarter Business',
    description: 'Smart shipping saves time, cuts costs, and grows businesses faster.',
    image: 'https://images.pexels.com/photos/3945683/pexels-photo-3945683.jpeg?auto=compress&cs=tinysrgb&w=600',
    bgGradient: 'from-amber-50 to-orange-50',
  },
  {
    id: 2,
    title: 'Track Real-Time,',
    subtitle: 'Deliver with Confidence',
    description: 'Monitor every delivery in real-time with GPS tracking and live updates.',
    image: 'https://images.pexels.com/photos/5398274/pexels-photo-5398274.jpeg?auto=compress&cs=tinysrgb&w=600',
    bgGradient: 'from-blue-50 to-cyan-50',
  },
  {
    id: 3,
    title: 'Optimize Routes,',
    subtitle: 'Save Resources',
    description: 'Intelligent routing reduces fuel costs and delivery times significantly.',
    image: 'https://images.pexels.com/photos/5632399/pexels-photo-5632399.jpeg?auto=compress&cs=tinysrgb&w=600',
    bgGradient: 'from-emerald-50 to-teal-50',
  },
];

export default function Onboarding() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragEnd, setDragEnd] = useState<number | null>(null);
  const navigate = useNavigate();

  const handleMouseDown = (e: React.MouseEvent) => {
    setDragStart(e.clientX);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    setDragEnd(e.clientX);
    handleSwipe(e.clientX);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setDragStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setDragEnd(e.changedTouches[0].clientX);
    handleSwipe(e.changedTouches[0].clientX);
  };

  const handleSwipe = (endX: number) => {
    if (!dragStart) return;

    const distance = dragStart - endX;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else if (isRightSwipe && currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }

    setDragStart(null);
    setDragEnd(null);
  };

  const completeOnboarding = () => {
    localStorage.setItem('mod4_onboarding_completed', 'true');
    navigate('/login');
  };

  const slide = slides[currentSlide];

  return (
    <div className="min-h-screen flex flex-col overflow-hidden safe-top safe-bottom">
      <div
        className={`flex-1 relative bg-gradient-to-b ${slide.bgGradient} transition-all duration-500 ease-out`}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Background image */}
        <motion.div
          key={`bg-${slide.id}`}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0"
        >
          <img
            src={slide.image}
            alt={slide.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        </motion.div>

        {/* Status bar spacing */}
        <div className="h-12" />

        {/* Content overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-20 px-6 pointer-events-none">
          {/* Text content */}
          <motion.div
            key={`text-${slide.id}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-center space-y-4 pointer-events-auto"
          >
            <div>
              <h1 className="text-4xl font-bold text-white leading-tight">
                {slide.title}
              </h1>
              <h2 className="text-4xl font-bold bg-gradient-to-r from-amber-300 to-orange-300 bg-clip-text text-transparent leading-tight">
                {slide.subtitle}
              </h2>
            </div>
            <p className="text-lg text-white/90 max-w-sm mx-auto">
              {slide.description}
            </p>
          </motion.div>
        </div>
      </div>

      {/* Bottom action area */}
      <div className="bg-white px-6 py-6 space-y-4">
        {/* Indicators */}
        <div className="flex justify-center gap-2">
          {slides.map((_, index) => (
            <motion.div
              key={index}
              className={`h-1 rounded-full transition-all ${
                index === currentSlide
                  ? 'bg-primary w-8'
                  : 'bg-gray-300 w-2'
              }`}
              animate={{
                width: index === currentSlide ? 32 : 8,
              }}
            />
          ))}
        </div>

        {/* Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="pointer-events-auto"
        >
          {currentSlide === slides.length - 1 ? (
            <Button
              onClick={completeOnboarding}
              className="w-full h-14 bg-primary text-white font-semibold text-lg hover:bg-primary/90 rounded-xl"
            >
              Get Started
            </Button>
          ) : (
            <button
              onClick={() => setCurrentSlide(currentSlide + 1)}
              className="w-full h-14 bg-primary text-white font-semibold text-lg hover:bg-primary/90 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <span>Swipe to Shipping</span>
              <motion.div
                animate={{ x: [0, 4, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <ChevronRight className="w-5 h-5" />
              </motion.div>
            </button>
          )}
        </motion.div>

        {/* Skip link */}
        <button
          onClick={completeOnboarding}
          className="w-full py-2 text-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
