import { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/card/Card';
import { Button } from '@/components/button/Button';
import { ArrowLeft, ArrowRight, SpeakerHigh, Star } from '@phosphor-icons/react';

interface FlashcardData {
  id: string;
  front: string;
  back: string;
  pronunciation?: string;
  example?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  partOfSpeech?: string;
  audio?: string;
}

interface FlashcardProps {
  cards: FlashcardData[];
  currentIndex: number;
  onNext: () => void;
  onPrevious: () => void;
  onFlip: () => void;
  isFlipped: boolean;
  onSpeak?: (text: string) => void;
  onMarkKnown?: (cardId: string) => void;
  onMarkUnknown?: (cardId: string) => void;
}

export function Flashcard({
  cards,
  currentIndex,
  onNext,
  onPrevious,
  onFlip,
  isFlipped,
  onSpeak,
  onMarkKnown,
  onMarkUnknown
}: FlashcardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [startX, setStartX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);

  const currentCard = cards[currentIndex];

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const currentX = e.touches[0].clientX;
    const offset = currentX - startX;
    setDragOffset(offset);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    
    if (Math.abs(dragOffset) > 100) {
      if (dragOffset > 0) {
        onPrevious();
      } else {
        onNext();
      }
    }
    
    setDragOffset(0);
    setIsDragging(false);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setStartX(e.clientX);
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const offset = e.clientX - startX;
    setDragOffset(offset);
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    
    if (Math.abs(dragOffset) > 100) {
      if (dragOffset > 0) {
        onPrevious();
      } else {
        onNext();
      }
    }
    
    setDragOffset(0);
    setIsDragging(false);
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'beginner': return 'text-green-600 bg-green-100 dark:bg-green-900/20';
      case 'intermediate': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
      case 'advanced': return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
    }
  };

  if (!currentCard) return null;

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Progress indicator */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Card {currentIndex + 1} of {cards.length}
          </span>
          {currentCard.difficulty && (
            <span className={`px-2 py-1 text-xs rounded-full ${getDifficultyColor(currentCard.difficulty)}`}>
              {currentCard.difficulty}
            </span>
          )}
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Main flashcard */}
      <div
        ref={cardRef}
        className={`relative perspective-1000 transition-transform duration-200 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{
          transform: `translateX(${dragOffset}px) ${isDragging ? 'scale(0.95)' : 'scale(1)'}`,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <Card 
          className={`w-full h-64 transition-transform duration-500 preserve-3d cursor-pointer ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
          onClick={onFlip}
        >
          {/* Front of card */}
          <div className={`absolute inset-0 w-full h-full backface-hidden ${isFlipped ? 'invisible' : 'visible'}`}>
            <div className="p-6 h-full flex flex-col justify-center items-center text-center">
              <div className="text-2xl font-semibold mb-4">
                {currentCard.front}
              </div>
              {currentCard.partOfSpeech && (
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  ({currentCard.partOfSpeech})
                </div>
              )}
                             {onSpeak && (
                 <Button
                   variant="ghost"
                   size="sm"
                   onClick={(e) => {
                     e.stopPropagation();
                     onSpeak(currentCard.front);
                   }}
                   className="mt-4"
                 >
                   <SpeakerHigh size={20} />
                 </Button>
               )}
              <div className="text-xs text-gray-400 mt-4">
                Tap to reveal translation
              </div>
            </div>
          </div>

          {/* Back of card */}
          <div className={`absolute inset-0 w-full h-full backface-hidden rotate-y-180 ${isFlipped ? 'visible' : 'invisible'}`}>
            <div className="p-6 h-full flex flex-col justify-center items-center text-center">
              <div className="text-xl font-semibold mb-2">
                {currentCard.back}
              </div>
              {currentCard.pronunciation && (
                <div className="text-sm text-blue-600 dark:text-blue-400 mb-3">
                  /{currentCard.pronunciation}/
                </div>
              )}
              {currentCard.example && (
                <div className="text-sm text-gray-600 dark:text-gray-300 italic mt-4">
                  "{currentCard.example}"
                </div>
              )}
                             {onSpeak && (
                 <Button
                   variant="ghost"
                   size="sm"
                   onClick={(e) => {
                     e.stopPropagation();
                     onSpeak(currentCard.back);
                   }}
                   className="mt-4"
                 >
                   <SpeakerHigh size={20} />
                 </Button>
               )}
            </div>
          </div>
        </Card>
      </div>

      {/* Navigation controls */}
      <div className="flex justify-between items-center mt-4">
        <Button
          variant="outline"
          onClick={onPrevious}
          disabled={currentIndex === 0}
          className="flex items-center gap-2"
        >
          <ArrowLeft size={16} />
          Previous
        </Button>

        <div className="flex gap-2">
          {onMarkUnknown && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onMarkUnknown(currentCard.id)}
              className="text-red-600 border-red-300 hover:bg-red-50"
            >
              Need Practice
            </Button>
          )}
          {onMarkKnown && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onMarkKnown(currentCard.id)}
              className="text-green-600 border-green-300 hover:bg-green-50"
            >
              <Star size={16} />
              Know It
            </Button>
          )}
        </div>

        <Button
          variant="outline"
          onClick={onNext}
          disabled={currentIndex === cards.length - 1}
          className="flex items-center gap-2"
        >
          Next
          <ArrowRight size={16} />
        </Button>
      </div>

      {/* Swipe hint */}
      <div className="text-center mt-4 text-xs text-gray-400">
        Swipe left for next card, right for previous
      </div>
    </div>
  );
}

// Custom CSS for 3D flip effect (add to your global CSS)
export const flashcardStyles = `
.perspective-1000 {
  perspective: 1000px;
}

.preserve-3d {
  transform-style: preserve-3d;
}

.backface-hidden {
  backface-visibility: hidden;
}

.rotate-y-180 {
  transform: rotateY(180deg);
}
`; 