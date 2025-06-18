import { useState, useEffect } from 'react';
import { Card } from '@/components/card/Card';
import { Button } from '@/components/button/Button';
import { Flashcard } from '@/components/flashcard/Flashcard';
import { Quiz } from '@/components/quiz/Quiz';
import { getTTS, initTTS } from '@/utils/textToSpeech';
import { 
  GraduationCap, 
  Cards, 
  CheckSquare, 
  SpeakerHigh, 
  Settings,
  BookOpen,
  Trophy,
  Target
} from '@phosphor-icons/react';

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
  explanation?: string;
  audioText?: string;
}

interface QuizResult {
  questionId: string;
  selected: number | null;
  correct: boolean;
  timeSpent: number;
}

interface LanguageLearningProps {
  onCreateFlashcards: (topic: string, difficulty: string, count: number) => Promise<any>;
  onCreateQuiz: (topic: string, difficulty: string, count: number) => Promise<any>;
  onPracticePronunciation: (text: string) => Promise<any>;
}

type LearningMode = 'home' | 'flashcards' | 'quiz' | 'pronunciation' | 'settings';

export function LanguageLearning({ 
  onCreateFlashcards, 
  onCreateQuiz, 
  onPracticePronunciation 
}: LanguageLearningProps) {
  const [mode, setMode] = useState<LearningMode>('home');
  const [flashcards, setFlashcards] = useState<FlashcardData[]>([]);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elevenLabsKey, setElevenLabsKey] = useState<string>('');
  const [ttsEnabled, setTtsEnabled] = useState(false);
  
  // Load ElevenLabs key from localStorage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem('elevenlabs_api_key');
    if (savedKey) {
      setElevenLabsKey(savedKey);
      try {
        initTTS(savedKey);
        setTtsEnabled(true);
      } catch (error) {
        console.error('Failed to initialize TTS:', error);
      }
    }
  }, []);

  const handleSpeak = async (text: string) => {
    if (!ttsEnabled) {
      // Fallback to browser speech synthesis
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.8;
        speechSynthesis.speak(utterance);
      }
      return;
    }

    const tts = getTTS();
    if (tts) {
      try {
        await tts.speak(text);
      } catch (error) {
        console.error('TTS error:', error);
        // Fallback to browser TTS
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = 'en-US';
          speechSynthesis.speak(utterance);
        }
      }
    }
  };

  const handleCreateFlashcards = async (topic: string, difficulty: string, count: number) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await onCreateFlashcards(topic, difficulty, count);
      
      if (result && result.data) {
        try {
          const parsedData = JSON.parse(result.data);
          const cardsArray = Array.isArray(parsedData) ? parsedData : [parsedData];
          setFlashcards(cardsArray);
          setCurrentCardIndex(0);
          setIsCardFlipped(false);
          setMode('flashcards');
        } catch (parseError) {
          setError('Failed to parse flashcard data');
        }
      } else {
        setError('Failed to create flashcards');
      }
    } catch (error) {
      setError(`Error creating flashcards: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateQuiz = async (topic: string, difficulty: string, count: number) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await onCreateQuiz(topic, difficulty, count);
      
      if (result && result.data) {
        try {
          const parsedData = JSON.parse(result.data);
          const questionsArray = Array.isArray(parsedData) ? parsedData : [parsedData];
          setQuizQuestions(questionsArray);
          setMode('quiz');
        } catch (parseError) {
          setError('Failed to parse quiz data');
        }
      } else {
        setError('Failed to create quiz');
      }
    } catch (error) {
      setError(`Error creating quiz: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuizComplete = (score: number, results: QuizResult[]) => {
    console.log('Quiz completed with score:', score, 'Results:', results);
    // You could store results in memory or show a summary
    setMode('home');
  };

  const handleSaveElevenLabsKey = () => {
    if (elevenLabsKey.trim()) {
      localStorage.setItem('elevenlabs_api_key', elevenLabsKey.trim());
      try {
        initTTS(elevenLabsKey.trim());
        setTtsEnabled(true);
        setError(null);
      } catch (error) {
        setError('Failed to initialize TTS with the provided key');
      }
    }
  };

  const renderHome = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="text-6xl mb-4">📚</div>
        <h1 className="text-3xl font-bold mb-2">English Learning Hub</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Master English with interactive flashcards, quizzes, and pronunciation practice
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
          <div className="text-center space-y-4">
            <div className="text-4xl text-blue-600">📇</div>
            <h3 className="text-xl font-semibold">Flashcards</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Study vocabulary with interactive flashcards
            </p>
            <Button variant="primary" className="w-full" onClick={() => setMode('flashcards')}>
              Start Flashcards
            </Button>
          </div>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
          <div className="text-center space-y-4">
            <div className="text-4xl text-green-600">✅</div>
            <h3 className="text-xl font-semibold">Quiz</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Test your knowledge with quizzes
            </p>
            <Button variant="primary" className="w-full" onClick={() => setMode('quiz')}>
              Take Quiz
            </Button>
          </div>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
          <div className="text-center space-y-4">
            <div className="text-4xl text-purple-600">🔊</div>
            <h3 className="text-xl font-semibold">Pronunciation</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Practice pronunciation with audio
            </p>
            <Button variant="primary" className="w-full" onClick={() => setMode('pronunciation')}>
              Practice Speaking
            </Button>
          </div>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
          <div className="text-center space-y-4">
            <div className="text-4xl text-orange-600">⚙️</div>
            <h3 className="text-xl font-semibold">Settings</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Configure your learning preferences
            </p>
            <Button variant="primary" className="w-full" onClick={() => setMode('settings')}>
              Open Settings
            </Button>
          </div>
        </Card>
      </div>

      {error && (
        <Card className="p-4 border-red-300 bg-red-50 dark:bg-red-900/20">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </Card>
      )}
    </div>
  );

  const renderFlashcards = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => setMode('home')}>
          ← Back to Home
        </Button>
        <h2 className="text-xl font-semibold">Flashcard Study</h2>
        <div /> {/* Spacer */}
      </div>

      {flashcards.length > 0 ? (
        <Flashcard
          cards={flashcards}
          currentIndex={currentCardIndex}
          onNext={() => {
            setCurrentCardIndex(prev => Math.min(prev + 1, flashcards.length - 1));
            setIsCardFlipped(false);
          }}
          onPrevious={() => {
            setCurrentCardIndex(prev => Math.max(prev - 1, 0));
            setIsCardFlipped(false);
          }}
          onFlip={() => setIsCardFlipped(!isCardFlipped)}
          isFlipped={isCardFlipped}
          onSpeak={handleSpeak}
        />
      ) : (
        <Card className="p-8 text-center">
          <p className="text-gray-600 dark:text-gray-400">No flashcards available. Create some from the home page!</p>
        </Card>
      )}
    </div>
  );

  const renderQuiz = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => setMode('home')}>
          ← Back to Home
        </Button>
        <h2 className="text-xl font-semibold">Vocabulary Quiz</h2>
        <div /> {/* Spacer */}
      </div>

      {quizQuestions.length > 0 ? (
        <Quiz
          questions={quizQuestions}
          onComplete={handleQuizComplete}
          onSpeak={handleSpeak}
          timeLimit={30}
        />
      ) : (
        <Card className="p-8 text-center">
          <p className="text-gray-600 dark:text-gray-400">No quiz available. Create one from the home page!</p>
        </Card>
      )}
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => setMode('home')}>
          ← Back to Home
        </Button>
        <h2 className="text-xl font-semibold">Settings</h2>
        <div /> {/* Spacer */}
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Text-to-Speech Settings</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              ElevenLabs API Key (Optional)
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                value={elevenLabsKey}
                onChange={(e) => setElevenLabsKey(e.target.value)}
                placeholder="Enter your ElevenLabs API key"
                className="flex-1 px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-600"
              />
              <Button onClick={handleSaveElevenLabsKey}>
                Save
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {ttsEnabled ? '✅ TTS enabled with ElevenLabs' : '⚠️ Using browser TTS (fallback)'}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      {mode === 'home' && renderHome()}
      {mode === 'flashcards' && renderFlashcards()}
      {mode === 'quiz' && renderQuiz()}
      {mode === 'settings' && renderSettings()}
    </div>
  );
}

// Helper components for creating content
function FlashcardCreator({ onCreateFlashcards, isLoading }: { 
  onCreateFlashcards: (topic: string, difficulty: string, count: number) => void;
  isLoading: boolean;
}) {
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('beginner');
  const [count, setCount] = useState(10);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (topic.trim()) {
      onCreateFlashcards(topic.trim(), difficulty, count);
    }
  };

  const popularTopics = ['Business English', 'Travel Vocabulary', 'Daily Conversations', 'Academic English'];

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Enter topic (e.g., 'business English')"
          className="w-full px-3 py-2 text-sm border rounded-md dark:bg-gray-800 dark:border-gray-600"
          required
        />
      </div>
      
      <div className="flex gap-2">
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          className="flex-1 px-3 py-2 text-sm border rounded-md dark:bg-gray-800 dark:border-gray-600"
        >
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
        <select
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
          className="px-3 py-2 text-sm border rounded-md dark:bg-gray-800 dark:border-gray-600"
        >
          <option value={5}>5 cards</option>
          <option value={10}>10 cards</option>
          <option value={15}>15 cards</option>
          <option value={20}>20 cards</option>
        </select>
      </div>

      <Button type="submit" disabled={isLoading || !topic.trim()} className="w-full">
        {isLoading ? 'Creating...' : 'Create Flashcards'}
      </Button>

      <div className="flex flex-wrap gap-1">
        {popularTopics.map(popularTopic => (
          <button
            key={popularTopic}
            type="button"
            onClick={() => setTopic(popularTopic)}
            className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            {popularTopic}
          </button>
        ))}
      </div>
    </form>
  );
}

function QuizCreator({ onCreateQuiz, isLoading }: {
  onCreateQuiz: (topic: string, difficulty: string, count: number) => void;
  isLoading: boolean;
}) {
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('beginner');
  const [count, setCount] = useState(8);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (topic.trim()) {
      onCreateQuiz(topic.trim(), difficulty, count);
    }
  };

  const popularTopics = ['Synonyms', 'Definitions', 'Phrasal Verbs', 'Idioms'];

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Enter quiz topic (e.g., 'synonyms')"
          className="w-full px-3 py-2 text-sm border rounded-md dark:bg-gray-800 dark:border-gray-600"
          required
        />
      </div>
      
      <div className="flex gap-2">
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          className="flex-1 px-3 py-2 text-sm border rounded-md dark:bg-gray-800 dark:border-gray-600"
        >
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
        <select
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
          className="px-3 py-2 text-sm border rounded-md dark:bg-gray-800 dark:border-gray-600"
        >
          <option value={5}>5 questions</option>
          <option value={8}>8 questions</option>
          <option value={10}>10 questions</option>
          <option value={15}>15 questions</option>
        </select>
      </div>

      <Button type="submit" disabled={isLoading || !topic.trim()} className="w-full">
        {isLoading ? 'Creating...' : 'Create Quiz'}
      </Button>

      <div className="flex flex-wrap gap-1">
        {popularTopics.map(popularTopic => (
          <button
            key={popularTopic}
            type="button"
            onClick={() => setTopic(popularTopic)}
            className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            {popularTopic}
          </button>
        ))}
      </div>
    </form>
  );
} 