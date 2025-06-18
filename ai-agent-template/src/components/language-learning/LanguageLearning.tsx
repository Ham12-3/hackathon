import { useState } from 'react';
import { Card } from '@/components/card/Card';
import { Button } from '@/components/button/Button';

export function LanguageLearning() {
  const [selectedMode, setSelectedMode] = useState<string | null>(null);

  if (selectedMode) {
    return (
      <div className="w-full max-w-4xl mx-auto p-4">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => setSelectedMode(null)}>
            ← Back to Home
          </Button>
          <h2 className="text-xl font-semibold">{selectedMode}</h2>
          <div />
        </div>
        
        <Card className="p-8 text-center">
          <div className="text-6xl mb-4">🚧</div>
          <h3 className="text-xl font-semibold mb-2">{selectedMode} Coming Soon</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            This feature is under development. For now, you can ask the AI assistant to:
          </p>
          <ul className="text-left space-y-2 max-w-md mx-auto">
            <li>• Create flashcard sets for vocabulary learning</li>
            <li>• Generate vocabulary quizzes</li>
            <li>• Practice pronunciation</li>
            <li>• Check grammar and get translations</li>
          </ul>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <div className="text-center mb-8">
        <div className="text-6xl mb-4">📚</div>
        <h1 className="text-3xl font-bold mb-2">English Learning Hub</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Master English with AI-powered tools. Ask the assistant to create learning materials for you!
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
          <div className="text-center space-y-4" onClick={() => setSelectedMode('Flashcards')}>
            <div className="text-4xl text-blue-600">📇</div>
            <h3 className="text-xl font-semibold">Flashcards</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Study vocabulary with interactive flashcards
            </p>
            <div className="text-xs text-blue-600 dark:text-blue-400">
              Try: "Create flashcards for business English"
            </div>
          </div>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
          <div className="text-center space-y-4" onClick={() => setSelectedMode('Quiz')}>
            <div className="text-4xl text-green-600">✅</div>
            <h3 className="text-xl font-semibold">Quiz</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Test your knowledge with quizzes
            </p>
            <div className="text-xs text-green-600 dark:text-green-400">
              Try: "Create a vocabulary quiz about synonyms"
            </div>
          </div>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
          <div className="text-center space-y-4" onClick={() => setSelectedMode('Pronunciation')}>
            <div className="text-4xl text-purple-600">🔊</div>
            <h3 className="text-xl font-semibold">Pronunciation</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Practice pronunciation with audio
            </p>
            <div className="text-xs text-purple-600 dark:text-purple-400">
              Try: "Help me practice pronunciation of 'pronunciation'"
            </div>
          </div>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
          <div className="text-center space-y-4" onClick={() => setSelectedMode('Grammar')}>
            <div className="text-4xl text-orange-600">📝</div>
            <h3 className="text-xl font-semibold">Grammar</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Check grammar and get translations
            </p>
            <div className="text-xs text-orange-600 dark:text-orange-400">
              Try: "Check this sentence for grammar errors"
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-8 text-center">
        <Card className="p-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <div className="text-blue-600 dark:text-blue-400 mb-2">💡 Pro Tip</div>
          <p className="text-sm text-blue-800 dark:text-blue-200">
            Simply chat with the AI assistant below to create personalized learning materials. 
            You can also set your ElevenLabs API key for high-quality text-to-speech!
          </p>
        </Card>
      </div>
    </div>
  );
} 