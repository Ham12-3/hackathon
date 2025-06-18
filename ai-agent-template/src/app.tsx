import { useEffect, useState } from "react";

// Component imports
import { Button } from "@/components/button/Button";
import { Card } from "@/components/card/Card";
import { Flashcard } from "@/components/flashcard/Flashcard";
import { Quiz } from "@/components/quiz/Quiz";

// Icon imports
import {
  Moon,
  Sun,
  ArrowLeft,
  BookOpen,
  Cards,
  GameController,
  SpeakerHigh,
  TextAa,
} from "@phosphor-icons/react";

// TTS imports
import { initTTS, getTTS } from "@/utils/textToSpeech";

// Types
interface FlashcardData {
  id: string;
  front: string;
  back: string;
  pronunciation?: string;
  example?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  partOfSpeech?: string;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  audioText?: string;
}

type AppMode = 'home' | 'flashcards' | 'quiz' | 'pronunciation' | 'grammar';

export default function App() {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    // Check localStorage first, default to dark if not found
    const savedTheme = localStorage.getItem("theme");
    return (savedTheme as "dark" | "light") || "dark";
  });

  const [currentMode, setCurrentMode] = useState<AppMode>('home');
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [elevenlabsKey, setElevenlabsKey] = useState('');

  // Sample flashcards data
  const [flashcards] = useState<FlashcardData[]>([
    {
      id: '1',
      front: 'Serendipity',
      back: 'A pleasant surprise; finding something good without looking for it',
      pronunciation: 'ser-ən-ˈdi-pə-tē',
      example: 'Meeting my best friend was pure serendipity.',
      difficulty: 'advanced',
      partOfSpeech: 'noun'
    },
    {
      id: '2',
      front: 'Eloquent',
      back: 'Fluent and persuasive in speaking or writing',
      pronunciation: 'ˈe-lə-kwənt',
      example: 'She gave an eloquent speech about climate change.',
      difficulty: 'intermediate',
      partOfSpeech: 'adjective'
    },
    {
      id: '3',
      front: 'Ubiquitous',
      back: 'Present, appearing, or found everywhere',
      pronunciation: 'yo͞oˈbikwədəs',
      example: 'Smartphones have become ubiquitous in modern society.',
      difficulty: 'advanced',
      partOfSpeech: 'adjective'
    },
  ]);

  // Sample quiz data
  const [quizQuestions] = useState<QuizQuestion[]>([
    {
      id: '1',
      question: 'What does "serendipity" mean?',
      options: [
        'A planned discovery',
        'A pleasant surprise or unexpected find',
        'A type of scientific method',
        'A musical term'
      ],
      correctAnswer: 1,
      explanation: 'Serendipity refers to finding something good or useful without looking for it.',
      audioText: 'serendipity'
    },
    {
      id: '2',
      question: 'Choose the correct pronunciation of "eloquent":',
      options: [
        'ee-LO-kwent',
        'EL-o-kwent',
        'e-LOQ-uent',
        'el-O-kwent'
      ],
      correctAnswer: 1,
      explanation: 'Eloquent is pronounced as EL-o-kwent with emphasis on the first syllable.',
      audioText: 'eloquent'
    }
  ]);

  useEffect(() => {
    // Apply theme class on mount and when theme changes
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    }

    // Save theme preference to localStorage
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    // Check for existing ElevenLabs API key
    const savedKey = localStorage.getItem('elevenlabs_api_key');
    if (savedKey) {
      setElevenlabsKey(savedKey);
      initTTS(savedKey);
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
  };

  const handleSpeak = async (text: string) => {
    const tts = getTTS();
    if (tts) {
      try {
        await tts.speak(text);
      } catch (error) {
        console.error('TTS error:', error);
        // Fallback to browser speech
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = 'en-US';
          speechSynthesis.speak(utterance);
        }
      }
    } else {
      // Browser speech synthesis fallback
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        speechSynthesis.speak(utterance);
      }
    }
  };

  const handleNextCard = () => {
    setCurrentFlashcardIndex((prev) => (prev + 1) % flashcards.length);
    setIsCardFlipped(false);
  };

  const handlePreviousCard = () => {
    setCurrentFlashcardIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length);
    setIsCardFlipped(false);
  };

  const handleFlipCard = () => {
    setIsCardFlipped(!isCardFlipped);
  };

  const renderHeader = () => (
    <div className="px-6 py-4 border-b border-neutral-300 dark:border-neutral-800 flex items-center gap-3 bg-white dark:bg-gray-900">
      <div className="flex items-center justify-center h-8 w-8">
        <BookOpen size={28} className="text-[#F48120]" />
      </div>

      <div className="flex-1">
        <h2 className="font-semibold text-base">
          {currentMode === 'home' ? 'English Learning Hub' : 
           currentMode === 'flashcards' ? 'Vocabulary Flashcards' :
           currentMode === 'quiz' ? 'Quiz Challenge' :
           currentMode === 'pronunciation' ? 'Pronunciation Practice' :
           'Grammar Check'}
        </h2>
      </div>

      {currentMode !== 'home' && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentMode('home')}
        >
          <ArrowLeft size={16} />
          Back
        </Button>
      )}

      <Button
        variant="ghost"
        size="md"
        shape="square"
        className="rounded-full h-9 w-9"
        onClick={toggleTheme}
      >
        {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
      </Button>
    </div>
  );

  const renderHomeContent = () => (
    <div className="p-6">
      <div className="text-center mb-8">
        <div className="text-6xl mb-4">📚</div>
        <h1 className="text-3xl font-bold mb-2">English Learning Hub</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Master English with interactive learning tools and AI-powered features.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        <div 
          className="cursor-pointer transform hover:scale-105"
          onClick={() => setCurrentMode('flashcards')}
        >
          <Card className="p-6 hover:shadow-lg transition-all duration-200">
            <div className="text-center space-y-4">
              <div className="text-5xl text-blue-600">
                <Cards size={48} />
              </div>
              <h3 className="text-xl font-semibold">Flashcards</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Study vocabulary with interactive swipeable flashcards
              </p>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded text-xs text-blue-600 dark:text-blue-400">
                {flashcards.length} cards available • Swipe to navigate
              </div>
            </div>
          </Card>
        </div>

        <div 
          className="cursor-pointer transform hover:scale-105"
          onClick={() => setCurrentMode('quiz')}
        >
          <Card className="p-6 hover:shadow-lg transition-all duration-200">
            <div className="text-center space-y-4">
              <div className="text-5xl text-green-600">
                <GameController size={48} />
              </div>
              <h3 className="text-xl font-semibold">Interactive Quiz</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Test your knowledge with timed multiple-choice questions
              </p>
              <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded text-xs text-green-600 dark:text-green-400">
                {quizQuestions.length} questions • Audio support
              </div>
            </div>
          </Card>
        </div>

        <div 
          className="cursor-pointer transform hover:scale-105"
          onClick={() => setCurrentMode('pronunciation')}
        >
          <Card className="p-6 hover:shadow-lg transition-all duration-200">
            <div className="text-center space-y-4">
              <div className="text-5xl text-purple-600">
                <SpeakerHigh size={48} />
              </div>
              <h3 className="text-xl font-semibold">Pronunciation</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Practice pronunciation with high-quality text-to-speech
              </p>
              <div className="bg-purple-50 dark:bg-purple-900/20 p-2 rounded text-xs text-purple-600 dark:text-purple-400">
                {elevenlabsKey ? 'ElevenLabs enabled' : 'Browser TTS'} • Click to speak
              </div>
            </div>
          </Card>
        </div>

        <div 
          className="cursor-pointer transform hover:scale-105"
          onClick={() => setCurrentMode('grammar')}
        >
          <Card className="p-6 hover:shadow-lg transition-all duration-200">
            <div className="text-center space-y-4">
              <div className="text-5xl text-orange-600">
                <TextAa size={48} />
              </div>
              <h3 className="text-xl font-semibold">Grammar & Tools</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Check grammar, get translations, and language tools
              </p>
              <div className="bg-orange-50 dark:bg-orange-900/20 p-2 rounded text-xs text-orange-600 dark:text-orange-400">
                AI-powered • Instant feedback
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* ElevenLabs API Key Section */}
      <div className="mt-8 max-w-md mx-auto">
        <Card className="p-6 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
          <div className="text-center">
            <div className="text-yellow-600 dark:text-yellow-400 mb-2">🔑 Pro Tip</div>
            <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
              Add your ElevenLabs API key for premium text-to-speech quality!
            </p>
            <input
              type="password"
              placeholder="Enter ElevenLabs API key..."
              value={elevenlabsKey}
              onChange={(e) => setElevenlabsKey(e.target.value)}
              className="w-full p-2 text-sm border rounded dark:bg-gray-800 dark:border-gray-600"
            />
            <Button
              size="sm"
              className="mt-2 w-full"
              onClick={() => {
                if (elevenlabsKey.trim()) {
                  localStorage.setItem('elevenlabs_api_key', elevenlabsKey);
                  initTTS(elevenlabsKey);
                  alert('ElevenLabs API key saved!');
                }
              }}
            >
              Save API Key
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );

  const renderFlashcardsContent = () => (
    <div className="p-6">
      <Flashcard
        cards={flashcards}
        currentIndex={currentFlashcardIndex}
        onNext={handleNextCard}
        onPrevious={handlePreviousCard}
        onFlip={handleFlipCard}
        isFlipped={isCardFlipped}
        onSpeak={handleSpeak}
      />
    </div>
  );

  const renderQuizContent = () => (
    <div className="p-6">
      <Quiz
        questions={quizQuestions}
        onSpeak={handleSpeak}
        onComplete={(score, results) => {
          console.log('Quiz completed with score:', score, 'Results:', results);
          // You can add more completion logic here like saving results
        }}
      />
    </div>
  );

  const renderPronunciationContent = () => (
    <div className="p-6 max-w-2xl mx-auto">
      <Card className="p-8 text-center">
        <div className="text-6xl mb-4">🎤</div>
        <h3 className="text-2xl font-semibold mb-4">Pronunciation Practice</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Practice pronouncing English words and phrases with audio feedback.
        </p>
        
        <div className="space-y-4">
          {flashcards.slice(0, 3).map((card) => (
            <div key={card.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <div className="font-semibold">{card.front}</div>
                  {card.pronunciation && (
                    <div className="text-sm text-blue-600 dark:text-blue-400">
                      /{card.pronunciation}/
                    </div>
                  )}
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleSpeak(card.front)}
                >
                  <SpeakerHigh size={16} />
                  Speak
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            💡 Try different words and listen to the pronunciation. 
            {elevenlabsKey ? ' Using premium ElevenLabs voice!' : ' Using browser speech synthesis.'}
          </p>
        </div>
      </Card>
    </div>
  );

  const renderGrammarContent = () => (
    <div className="p-6 max-w-2xl mx-auto">
      <Card className="p-8 text-center">
        <div className="text-6xl mb-4">📝</div>
        <h3 className="text-2xl font-semibold mb-4">Grammar & Language Tools</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Check grammar, get translations, and improve your English writing.
        </p>

        <div className="space-y-4 text-left">
          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-2">Grammar Check</h4>
            <textarea
              className="w-full p-3 border rounded dark:bg-gray-800 dark:border-gray-600"
              rows={3}
              placeholder="Type a sentence to check grammar..."
            />
            <Button className="mt-2 w-full">Check Grammar</Button>
          </div>

          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-2">Translation</h4>
            <input
              type="text"
              className="w-full p-3 border rounded dark:bg-gray-800 dark:border-gray-600"
              placeholder="Enter text to translate..."
            />
            <Button className="mt-2 w-full">Translate</Button>
          </div>
        </div>

        <div className="mt-6 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
          <p className="text-sm text-orange-800 dark:text-orange-200">
            🚧 These tools are currently in development. More features coming soon!
          </p>
        </div>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto">
        {renderHeader()}
        
        <div className="min-h-[calc(100vh-80px)]">
          {currentMode === 'home' && renderHomeContent()}
          {currentMode === 'flashcards' && renderFlashcardsContent()}
          {currentMode === 'quiz' && renderQuizContent()}
          {currentMode === 'pronunciation' && renderPronunciationContent()}
          {currentMode === 'grammar' && renderGrammarContent()}
        </div>
      </div>
    </div>
  );
}
