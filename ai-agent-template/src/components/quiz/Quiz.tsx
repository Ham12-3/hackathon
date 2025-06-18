import { useState, useEffect } from 'react';
import { Card } from '@/components/card/Card';
import { Button } from '@/components/button/Button';
import { CheckCircle, XCircle, Clock, SpeakerHigh } from '@phosphor-icons/react';

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
  audioText?: string;
}

interface QuizProps {
  questions: QuizQuestion[];
  onComplete: (score: number, results: QuizResult[]) => void;
  onSpeak?: (text: string) => void;
  timeLimit?: number; // seconds per question
}

interface QuizResult {
  questionId: string;
  selected: number | null;
  correct: boolean;
  timeSpent: number;
}

export function Quiz({ questions, onComplete, onSpeak, timeLimit = 30 }: QuizProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [startTime, setStartTime] = useState(Date.now());
  const [isComplete, setIsComplete] = useState(false);

  const currentQuestion = questions[currentQuestionIndex];

  // Timer effect
  useEffect(() => {
    if (isComplete) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentQuestionIndex, isComplete]);

  // Reset timer when question changes
  useEffect(() => {
    setTimeLeft(timeLimit);
    setStartTime(Date.now());
  }, [currentQuestionIndex, timeLimit]);

  const handleTimeUp = () => {
    if (!showResult) {
      handleAnswerSubmit();
    }
  };

  const handleAnswerSelect = (answerIndex: number) => {
    if (showResult) return;
    setSelectedAnswer(answerIndex);
  };

  const handleAnswerSubmit = () => {
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
    
    const result: QuizResult = {
      questionId: currentQuestion.id,
      selected: selectedAnswer,
      correct: isCorrect,
      timeSpent,
    };

    const newResults = [...results, result];
    setResults(newResults);
    setShowResult(true);

    // Auto advance after showing result
    setTimeout(() => {
      if (currentQuestionIndex < questions.length - 1) {
        handleNextQuestion();
      } else {
        handleQuizComplete(newResults);
      }
    }, 2000);
  };

  const handleNextQuestion = () => {
    setCurrentQuestionIndex(prev => prev + 1);
    setSelectedAnswer(null);
    setShowResult(false);
  };

  const handleQuizComplete = (finalResults: QuizResult[]) => {
    setIsComplete(true);
    const score = Math.round((finalResults.filter(r => r.correct).length / finalResults.length) * 100);
    onComplete(score, finalResults);
  };

  const getOptionClassName = (optionIndex: number) => {
    const baseClasses = "w-full p-4 text-left border rounded-lg transition-all duration-200";
    
    if (!showResult) {
      return `${baseClasses} ${
        selectedAnswer === optionIndex
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
      }`;
    }

    // Show results
    if (optionIndex === currentQuestion.correctAnswer) {
      return `${baseClasses} border-green-500 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200`;
    }
    
    if (selectedAnswer === optionIndex && optionIndex !== currentQuestion.correctAnswer) {
      return `${baseClasses} border-red-500 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200`;
    }

    return `${baseClasses} border-gray-300 dark:border-gray-600 opacity-60`;
  };

  const getOptionIcon = (optionIndex: number) => {
    if (!showResult) return null;
    
    if (optionIndex === currentQuestion.correctAnswer) {
      return <CheckCircle size={20} className="text-green-600" />;
    }
    
    if (selectedAnswer === optionIndex && optionIndex !== currentQuestion.correctAnswer) {
      return <XCircle size={20} className="text-red-600" />;
    }

    return null;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeColor = () => {
    if (timeLeft <= 5) return 'text-red-600';
    if (timeLeft <= 10) return 'text-yellow-600';
    return 'text-gray-600 dark:text-gray-400';
  };

  if (isComplete) {
    const correctAnswers = results.filter(r => r.correct).length;
    const score = Math.round((correctAnswers / results.length) * 100);
    
    return (
      <Card className="w-full max-w-2xl mx-auto p-8">
        <div className="text-center">
          <div className="text-6xl mb-4">
            {score >= 80 ? '🎉' : score >= 60 ? '👍' : '📚'}
          </div>
          <h2 className="text-2xl font-bold mb-4">Quiz Complete!</h2>
          <div className="text-4xl font-bold mb-2 text-blue-600">
            {score}%
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You got {correctAnswers} out of {results.length} questions correct
          </p>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-semibold text-green-600">
                {correctAnswers}
              </div>
              <div className="text-sm text-gray-500">Correct</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-semibold text-red-600">
                {results.length - correctAnswers}
              </div>
              <div className="text-sm text-gray-500">Incorrect</div>
            </div>
          </div>

          <div className="text-sm text-gray-500 mb-4">
            Average time per question: {formatTime(Math.round(results.reduce((acc, r) => acc + r.timeSpent, 0) / results.length))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Progress and Timer */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Question {currentQuestionIndex + 1} of {questions.length}
          </span>
          <div className={`flex items-center gap-2 ${getTimeColor()}`}>
            <Clock size={16} />
            <span className="font-mono font-semibold">
              {formatTime(timeLeft)}
            </span>
          </div>
        </div>
        
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
        
        {/* Timer bar */}
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1 mt-2">
          <div 
            className={`h-1 rounded-full transition-all duration-1000 ${
              timeLeft <= 5 ? 'bg-red-500' : timeLeft <= 10 ? 'bg-yellow-500' : 'bg-green-500'
            }`}
            style={{ width: `${(timeLeft / timeLimit) * 100}%` }}
          />
        </div>
      </div>

      <Card className="p-6 mb-6">
        <div className="flex justify-between items-start mb-6">
          <h3 className="text-xl font-semibold flex-1">
            {currentQuestion.question}
          </h3>
          {onSpeak && currentQuestion.audioText && (
                         <Button
               variant="ghost"
               size="sm"
               onClick={() => onSpeak(currentQuestion.audioText!)}
               className="ml-4"
             >
               <SpeakerHigh size={20} />
             </Button>
          )}
        </div>

        <div className="space-y-3">
          {currentQuestion.options.map((option, index) => (
            <button
              key={index}
              className={getOptionClassName(index)}
              onClick={() => handleAnswerSelect(index)}
              disabled={showResult}
            >
              <div className="flex items-center justify-between">
                <span>{option}</span>
                {getOptionIcon(index)}
              </div>
            </button>
          ))}
        </div>

        {showResult && currentQuestion.explanation && (
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Explanation:</strong> {currentQuestion.explanation}
            </p>
          </div>
        )}

        {!showResult && selectedAnswer !== null && (
          <div className="mt-6 text-center">
            <Button 
              onClick={handleAnswerSubmit}
              className="px-8"
            >
              Submit Answer
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
} 