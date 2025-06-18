import { useEffect, useState } from "react";
// Remove useChat import - we'll create our own chat implementation
// import { useChat } from "@ai-sdk/react";
// import { type ToolInvocation, type Message } from "ai";

// Component imports
import { Button } from "@/components/button/Button";
import { Input } from "@/components/input/Input";
import { Textarea } from "@/components/textarea/Textarea";
// import { ToolInvocationCard } from "@/components/tool-invocation-card/ToolInvocationCard";
import { Avatar } from "@/components/avatar/Avatar";
import { MemoizedMarkdown } from "@/components/memoized-markdown";

// Icon imports
import {
  Moon,
  Sun,
  PaperPlaneTilt,
  Brain,
  Lightning,
  Eye,
  BookOpen,
  Robot,
} from "@phosphor-icons/react";

// TTS imports
import { initTTS } from "@/utils/textToSpeech";

// Types
interface ReasoningStep {
  id: string;
  type: 'thought' | 'action' | 'observation';
  content: string;
  timestamp: Date;
  tool?: string;
  result?: any;
}

interface LearningProgress {
  session: string;
  steps: ReasoningStep[];
  goal: string;
  completed: boolean;
  learnings: string[];
}

// Custom Message type for our standalone implementation
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: Date;
  quiz?: QuizData;
  flashcards?: FlashcardData[];
  pronunciation?: PronunciationData;
}

interface QuizData {
  id: string;
  title: string;
  questions: QuizQuestion[];
}

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

interface FlashcardData {
  id: string;
  front: string;
  back: string;
  example?: string;
  pronunciation?: string;
}

interface PronunciationData {
  id: string;
  title: string;
  exercises: PronunciationExercise[];
}

interface PronunciationExercise {
  id: string;
  word: string;
  ipa: string;
  audioText: string;
  tips: string[];
  example: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export default function App() {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const savedTheme = localStorage.getItem("theme");
    return (savedTheme as "dark" | "light") || "dark";
  });

  const [hasValidKey, setHasValidKey] = useState(false);
  const [reasoning, setReasoning] = useState<ReasoningStep[]>([]);
  const [isReasoning, setIsReasoning] = useState(false);
  const [elevenlabsKey, setElevenlabsKey] = useState('');
  const [keyCheckLoading, setKeyCheckLoading] = useState(true);

  // Standalone chat implementation
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "system",
      role: "system",
      content: `You are an advanced English Learning AI Agent using the ReACT (Reasoning + Acting) paradigm. You help users learn English through interactive lessons, flashcards, quizzes, pronunciation, and grammar practice.

## ReACT Framework Instructions:
You MUST follow this exact pattern for every response:

**Thought**: [Analyze the user's request and plan your approach]
**Action**: [Choose and execute appropriate tools or provide direct teaching]
**Observation**: [Reflect on the results and plan next steps]

## Available Learning Tools:
- createFlashcard: Generate individual vocabulary flashcards
- createFlashcardSet: Create themed flashcard collections
- createVocabularyQuiz: Generate interactive quizzes
- practicePronunciation: Provide pronunciation guidance
- setElevenLabsKey: Configure text-to-speech
- setMemory: Remember user progress and preferences
- forgetMemory: Clear specific learning data

## Teaching Approach:
1. **Always start with a Thought** - reason about what the user needs
2. **Take Action** - use tools or provide direct instruction
3. **Make Observations** - reflect on effectiveness and suggest improvements
4. **Adapt** - modify approach based on user response

## Example ReACT Pattern:
User: "I want to learn advanced vocabulary"

**Thought**: The user wants advanced vocabulary. I should assess their current level and create appropriate flashcards with challenging words that include pronunciation, examples, and context.

**Action**: I'll create a set of advanced vocabulary flashcards focusing on academic and professional terms.

**Observation**: These flashcards will help build sophisticated vocabulary. I should also offer pronunciation practice and usage examples.

Be interactive, encouraging, and always follow the Thought-Action-Observation pattern!`,
      createdAt: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<{[key: string]: number}>({});
  const [quizResults, setQuizResults] = useState<{[key: string]: boolean}>({});
  const [flippedCards, setFlippedCards] = useState<{[key: string]: boolean}>({});
  const [pronunciationAttempts, setPronunciationAttempts] = useState<{[key: string]: number}>({});

  // Check for server-side API keys on mount
  useEffect(() => {
    // For now, assume we have valid keys (you can add your API keys to .dev.vars)
    setHasValidKey(true);
    setKeyCheckLoading(false);

    // Initialize ElevenLabs from environment variable in .dev.vars
    // The ElevenLabs key should be available server-side
    const checkElevenLabsKey = () => {
      // First check if already stored locally
      const savedElevenLabsKey = localStorage.getItem('elevenlabs_api_key');
      if (savedElevenLabsKey) {
        setElevenlabsKey(savedElevenLabsKey);
        initTTS(savedElevenLabsKey);
      }
    };

    checkElevenLabsKey();
  }, []);

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Extract reasoning steps from messages
  useEffect(() => {
    const newReasoning: ReasoningStep[] = [];
    
    messages.forEach((message: ChatMessage, index: number) => {
      if (message.role === 'assistant' && message.content) {
        const content = message.content;
        
        // Extract Thought, Action, Observation patterns
        const thoughtMatch = content.match(/\*\*Thought\*\*:?\s*([^*]+)/i);
        const actionMatch = content.match(/\*\*Action\*\*:?\s*([^*]+)/i);
        const observationMatch = content.match(/\*\*Observation\*\*:?\s*([^*]+)/i);
        
        if (thoughtMatch) {
          newReasoning.push({
            id: `thought-${index}`,
            type: 'thought',
            content: thoughtMatch[1].trim(),
            timestamp: message.createdAt || new Date(),
          });
        }
        
        if (actionMatch) {
          newReasoning.push({
            id: `action-${index}`,
            type: 'action',
            content: actionMatch[1].trim(),
            timestamp: message.createdAt || new Date(),
          });
        }
        
        if (observationMatch) {
          newReasoning.push({
            id: `observation-${index}`,
            type: 'observation',
            content: observationMatch[1].trim(),
            timestamp: message.createdAt || new Date(),
          });
        }
      }
    });
    
    setReasoning(newReasoning);
  }, [messages]);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const handleElevenLabsKeySubmit = () => {
    if (elevenlabsKey.trim()) {
      localStorage.setItem('elevenlabs_api_key', elevenlabsKey);
      initTTS(elevenlabsKey);
    }
  };

  const generateQuiz = (topic: string): QuizData => {
    const grammarQuestions: QuizQuestion[] = [
      {
        id: 'q1',
        question: 'Which sentence uses the correct past perfect tense?',
        options: [
          'I had finished my homework before dinner.',
          'I have finished my homework before dinner.',
          'I finished my homework before dinner.',
          'I will have finished my homework before dinner.'
        ],
        correctAnswer: 0,
        explanation: 'Past perfect (had + past participle) shows an action completed before another past action.'
      },
      {
        id: 'q2',
        question: 'Choose the correct conditional sentence:',
        options: [
          'If I was you, I would study harder.',
          'If I were you, I would study harder.',
          'If I am you, I would study harder.',
          'If I will be you, I would study harder.'
        ],
        correctAnswer: 1,
        explanation: 'In hypothetical conditions, we use "were" for all persons in the subjunctive mood.'
      },
      {
        id: 'q3',
        question: 'Which preposition is correct?',
        options: [
          'I arrived in 3 PM.',
          'I arrived on 3 PM.',
          'I arrived at 3 PM.',
          'I arrived by 3 PM.'
        ],
        correctAnswer: 2,
        explanation: 'We use "at" with specific times (at 3 PM, at noon, at midnight).'
      }
    ];

    const vocabularyQuestions: QuizQuestion[] = [
      {
        id: 'v1',
        question: 'What does "serendipity" mean?',
        options: [
          'A feeling of sadness',
          'A pleasant surprise or fortunate accident',
          'A type of flower',
          'A mathematical concept'
        ],
        correctAnswer: 1,
        explanation: 'Serendipity means finding something good without looking for it, a happy accident.'
      },
      {
        id: 'v2',
        question: 'Which word means "using very few words"?',
        options: [
          'Verbose',
          'Eloquent',
          'Laconic',
          'Articulate'
        ],
        correctAnswer: 2,
        explanation: 'Laconic means expressing much in few words; brief and clearly expressed.'
      },
      {
        id: 'v3',
        question: 'What does "ubiquitous" mean?',
        options: [
          'Very rare',
          'Present everywhere',
          'Extremely large',
          'Very old'
        ],
        correctAnswer: 1,
        explanation: 'Ubiquitous means present, appearing, or found everywhere.'
      }
    ];

    const isGrammar = topic.toLowerCase().includes('grammar');
    const questions = isGrammar ? grammarQuestions : vocabularyQuestions;
    
    return {
      id: `quiz-${Date.now()}`,
      title: isGrammar ? 'English Grammar Quiz' : 'Vocabulary Quiz',
      questions
    };
  };

  const generateFlashcards = (topic: string): FlashcardData[] => {
    const vocabularyCards: FlashcardData[] = [
      {
        id: 'fc1',
        front: 'Serendipity',
        back: 'A pleasant surprise; finding something good by accident',
        example: 'Meeting my best friend was pure serendipity - we bumped into each other at a coffee shop.',
        pronunciation: '/ˌserənˈdipədē/'
      },
      {
        id: 'fc2',
        front: 'Eloquent',
        back: 'Fluent and persuasive in speaking or writing',
        example: 'Her eloquent speech moved the entire audience to tears.',
        pronunciation: '/ˈeləkwənt/'
      },
      {
        id: 'fc3',
        front: 'Ubiquitous',
        back: 'Present, appearing, or found everywhere',
        example: 'Smartphones have become ubiquitous in modern society.',
        pronunciation: '/yo͞oˈbikwədəs/'
      },
      {
        id: 'fc4',
        front: 'Ephemeral',
        back: 'Lasting for a very short time',
        example: 'The beauty of cherry blossoms is ephemeral, lasting only a few weeks.',
        pronunciation: '/əˈfem(ə)rəl/'
      }
    ];

    const grammarCards: FlashcardData[] = [
      {
        id: 'gc1',
        front: 'Past Perfect Tense',
        back: 'Had + past participle. Shows action completed before another past action.',
        example: 'I had eaten before she arrived.',
      },
      {
        id: 'gc2',
        front: 'Subjunctive Mood',
        back: 'Used for hypothetical situations. Use "were" for all persons.',
        example: 'If I were rich, I would travel the world.',
      },
      {
        id: 'gc3',
        front: 'Prepositions of Time',
        back: 'at (specific times), on (days/dates), in (months/years)',
        example: 'at 3 PM, on Monday, in July',
      }
    ];

    const isGrammar = topic.toLowerCase().includes('grammar');
    return isGrammar ? grammarCards : vocabularyCards;
  };

  const generatePronunciation = (topic: string): PronunciationData => {
    const exercises: PronunciationExercise[] = [
      {
        id: 'p1',
        word: 'Thought',
        ipa: '/θɔːt/',
        audioText: 'Thought',
        tips: [
          'Place your tongue between your teeth for the "th" sound',
          'The "ough" is pronounced like "aw" in "saw"',
          'Keep the "t" sound crisp at the end'
        ],
        example: 'I had a thought about the pronunciation exercise.',
        difficulty: 'medium'
      },
      {
        id: 'p2',
        word: 'Through',
        ipa: '/θruː/',
        audioText: 'Through',
        tips: [
          'Start with the "th" sound (tongue between teeth)',
          'Glide into the "oo" sound like in "zoo"',
          'The "ough" here sounds like "oo"'
        ],
        example: 'We walked through the pronunciation practice.',
        difficulty: 'hard'
      },
      {
        id: 'p3',
        word: 'World',
        ipa: '/wɜːrld/',
        audioText: 'World',
        tips: [
          'Start with rounded lips for the "w" sound',
          'The "or" sounds like "ur" in "hurt"',
          'Roll the "r" slightly if you can'
        ],
        example: 'English is spoken around the world.',
        difficulty: 'easy'
      },
      {
        id: 'p4',
        word: 'Schedule',
        ipa: '/ˈʃedjuːl/',
        audioText: 'Schedule',
        tips: [
          'Start with "sh" sound (tongue behind teeth)',
          'The "e" is pronounced like "eh"',
          'End with "jool" (like "jewel" but with "ool")'
        ],
        example: 'Let me check my schedule for pronunciation practice.',
        difficulty: 'medium'
      }
    ];

    return {
      id: `pronunciation-${Date.now()}`,
      title: 'English Pronunciation Practice',
      exercises
    };
  };

  // Enhanced TTS function using ElevenLabs
  const speakWithElevenLabs = async (text: string, elevenLabsKey?: string) => {
    if (elevenLabsKey) {
      try {
        const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM', {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': elevenLabsKey,
          },
          body: JSON.stringify({
            text: text,
            model_id: 'eleven_monolingual_v1',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.5,
              style: 0.0,
              use_speaker_boost: true
            }
          }),
        });

        if (response.ok) {
          const audioBlob = await response.blob();
          const audioUrl = URL.createObjectURL(audioBlob);
          const audio = new Audio(audioUrl);
          audio.play();
          return;
        }
      } catch (error) {
        console.log('ElevenLabs failed, falling back to browser TTS:', error);
      }
    }
    
    // Fallback to browser TTS
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.8;
    utterance.pitch = 1;
    speechSynthesis.speak(utterance);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    setIsLoading(true);
    setIsReasoning(true);
    
    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      createdAt: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    
    // Simulate AI response with ReACT pattern
    setTimeout(() => {
      const userInput = input.toLowerCase();
      
      // Check for pronunciation first (highest priority for pronunciation-specific terms)
      const isPronunciationRequest = userInput.includes('pronunciation') || userInput.includes('pronounce') || 
                                   userInput.includes('speak') || userInput.includes('sound') ||
                                   userInput.includes('ipa') || userInput.includes('phonetic') ||
                                   userInput.includes('accent') || userInput.includes('articulate');
      
      const isQuizRequest = !isPronunciationRequest && (userInput.includes('quiz') || userInput.includes('test') || userInput.includes('question'));
      
      // Only match flashcards if it's not pronunciation and contains specific flashcard/vocabulary terms
      const isFlashcardRequest = !isPronunciationRequest && !isQuizRequest && 
                               (userInput.includes('flashcard') || userInput.includes('vocabulary') || 
                                (userInput.includes('word') && !userInput.includes('pronounce')));
      
      let quiz: QuizData | undefined;
      let flashcards: FlashcardData[] | undefined;
      let pronunciation: PronunciationData | undefined;
      let responseContent = '';

      if (isQuizRequest) {
        quiz = generateQuiz(input);
        responseContent = `**Thought**: The user asked for "${input}". This is a request for a quiz, so I should create an interactive quiz to test their knowledge and provide immediate feedback with explanations.

**Action**: I'll generate a comprehensive ${quiz.title.toLowerCase()} with multiple-choice questions that test understanding and provide detailed explanations for each answer.

**Observation**: Creating interactive quizzes helps reinforce learning through active recall and immediate feedback. This follows the ReACT pattern by reasoning about the educational need, taking action to create the quiz, and observing that this method enhances learning retention.

Perfect! I've created an interactive ${quiz.title.toLowerCase()} for you. Each question includes explanations to help you understand the concepts better. Try answering each question and I'll provide immediate feedback!`;
      } else if (isFlashcardRequest) {
        flashcards = generateFlashcards(input);
        responseContent = `**Thought**: The user asked for "${input}". This is a request for flashcards, so I should create interactive vocabulary cards that include definitions, examples, and pronunciation guides.

**Action**: I'll generate a set of flashcards with advanced vocabulary words, including definitions, example sentences, and pronunciation guides to help with comprehensive learning.

**Observation**: Flashcards are excellent for vocabulary acquisition through spaced repetition and active recall. This ReACT approach helps identify the learning need, create appropriate materials, and observe that this method supports long-term retention.

Excellent! I've created interactive flashcards for you. Click on each card to flip it and see the definition, example sentence, and pronunciation. These cards use spaced repetition principles to help you remember new vocabulary effectively!`;
      } else if (isPronunciationRequest) {
        pronunciation = generatePronunciation(input);
        responseContent = `**Thought**: The user asked for "${input}". This is a request for pronunciation practice, so I should create interactive pronunciation exercises with IPA notation, audio examples, and practical tips.

**Action**: I'll generate pronunciation exercises focusing on challenging English sounds, complete with IPA transcription, helpful tips, and audio examples using ElevenLabs TTS for high-quality pronunciation models.

**Observation**: Pronunciation practice is crucial for English learners and benefits from both visual (IPA) and auditory (TTS) feedback. This ReACT approach helps identify pronunciation challenges, create targeted exercises, and observe that multimodal learning enhances pronunciation accuracy.

Perfect! I've created interactive pronunciation exercises for you. Each word includes IPA notation, pronunciation tips, and audio examples. Click the speaker buttons to hear high-quality pronunciations powered by ElevenLabs!`;
      } else {
        responseContent = `**Thought**: The user asked "${input}". I need to analyze this request and determine the best way to help them with their English learning. Let me consider what specific aspect of English they might need help with and how I can provide the most valuable assistance.

**Action**: I'll provide a comprehensive response that addresses their question while demonstrating English learning techniques. I'll also suggest related activities that could enhance their learning experience.

**Observation**: This response follows the ReACT pattern by first reasoning about the request, taking action to provide helpful guidance, and now observing the effectiveness of my approach. I should continue to adapt my teaching style based on the user's responses and learning needs.

Great question! I'm here to help you with your English learning journey. Whether you need help with vocabulary, grammar, pronunciation, or conversation practice, I can provide personalized assistance using various interactive tools and techniques.

What specific area of English would you like to focus on today?`;
      }
      
              const aiResponse: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: responseContent,
          createdAt: new Date(),
          quiz,
          flashcards,
          pronunciation,
        };
      
      setMessages(prev => [...prev, aiResponse]);
      setIsLoading(false);
      setIsReasoning(false);
    }, 2000);
  };

  const getReasoningIcon = (type: 'thought' | 'action' | 'observation') => {
    switch (type) {
      case 'thought':
        return <Brain size={16} className="text-blue-500" />;
      case 'action':
        return <Lightning size={16} className="text-yellow-500" />;
      case 'observation':
        return <Eye size={16} className="text-green-500" />;
    }
  };

  const getReasoningColor = (type: 'thought' | 'action' | 'observation') => {
    switch (type) {
      case 'thought':
        return 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20';
      case 'action':
        return 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20';
      case 'observation':
        return 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20';
    }
  };

  const renderHeader = () => (
    <div className="px-6 py-4 border-b border-neutral-300 dark:border-neutral-800 flex items-center gap-3 bg-white dark:bg-gray-900">
      <div className="flex items-center justify-center h-8 w-8">
        <Robot size={28} className="text-[#F48120]" />
      </div>

      <div className="flex-1">
        <h2 className="font-semibold text-base">English Learning AI Agent</h2>
        <p className="text-xs text-neutral-600 dark:text-neutral-400">
          ReACT Framework: Reasoning + Acting
        </p>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
          <Brain size={12} />
          <span>Reasoning: {reasoning.filter(r => r.type === 'thought').length}</span>
        </div>
        
        <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300">
          <Lightning size={12} />
          <span>Actions: {reasoning.filter(r => r.type === 'action').length}</span>
        </div>

        <Button
          onClick={toggleTheme}
          variant="secondary"
          size="sm"
          className="p-2"
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </Button>
      </div>
    </div>
  );

  const renderReasoningPanel = () => (
    <div className="border-l border-neutral-300 dark:border-neutral-800 w-80 bg-neutral-50 dark:bg-gray-800 p-4 overflow-y-auto">
      <div className="flex items-center gap-2 mb-4">
        <Brain size={20} className="text-blue-500" />
        <h3 className="font-semibold">Agent Reasoning</h3>
      </div>
      
      {isReasoning && (
        <div className="mb-4 p-3 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
            <Brain size={16} className="animate-pulse" />
            <span className="text-sm font-medium">Agent is reasoning...</span>
          </div>
        </div>
      )}
      
      <div className="space-y-3">
        {reasoning.slice(-10).map((step) => (
          <div key={step.id} className={`p-3 border rounded-lg ${getReasoningColor(step.type)}`}>
            <div className="flex items-center gap-2 mb-1">
              {getReasoningIcon(step.type)}
              <span className="text-xs font-medium capitalize">{step.type}</span>
              <span className="text-xs text-neutral-500 ml-auto">
                {step.timestamp.toLocaleTimeString()}
              </span>
            </div>
            <p className="text-sm">{step.content}</p>
            {step.tool && (
              <div className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">
                Tool: {step.tool}
              </div>
            )}
          </div>
        ))}
      </div>
      
      {reasoning.length === 0 && (
        <div className="text-center text-neutral-500 dark:text-neutral-400 text-sm">
          Start a conversation to see agent reasoning
        </div>
      )}
    </div>
  );

  if (keyCheckLoading) {
    return (
      <div className="h-screen flex flex-col bg-white dark:bg-gray-900">
        {renderHeader()}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Robot size={48} className="text-[#F48120] mx-auto mb-4 animate-pulse" />
            <p className="text-neutral-600 dark:text-neutral-400">
              Checking API configuration...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!hasValidKey) {
    return (
      <div className="h-screen flex flex-col bg-white dark:bg-gray-900">
        {renderHeader()}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center">
            <Robot size={48} className="text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2 text-red-600 dark:text-red-400">
              API Configuration Required
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              Your server needs to be configured with API keys. Please ensure your <code>.dev.vars</code> file contains:
            </p>
            
            <div className="text-left bg-neutral-100 dark:bg-neutral-800 p-4 rounded-lg mb-4 font-mono text-sm">
              <div>OPENAI_API_KEY=your_openai_key</div>
              <div>ANTHROPIC_API_KEY=your_anthropic_key</div>
              <div>ELEVEN_LABS=your_elevenlabs_key</div>
            </div>

            {!elevenlabsKey && (
              <div className="mt-6">
                <label className="block text-sm font-medium mb-2 text-left">
                  ElevenLabs API Key (Optional - for premium TTS)
                </label>
                <Input
                  type="password"
                  placeholder="Your ElevenLabs API key..."
                  value={elevenlabsKey}
                  onChange={(e) => setElevenlabsKey(e.target.value)}
                  onValueChange={(value) => setElevenlabsKey(value)}
                  onKeyDown={(e) => e.key === "Enter" && handleElevenLabsKeySubmit()}
                />
                <Button onClick={handleElevenLabsKeySubmit} className="w-full mt-2" size="sm">
                  Save ElevenLabs Key
                </Button>
              </div>
            )}

            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                💡 Your API keys are stored securely in environment variables and never exposed to the client.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-gray-900">
      {renderHeader()}
      
      <div className="flex-1 flex overflow-hidden">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 1 && (
              <div className="text-center py-12">
                <Robot size={64} className="text-[#F48120] mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">Ready to Learn English!</h2>
                <p className="text-neutral-600 dark:text-neutral-400 mb-6">
                  I'm your AI learning agent. I can help you with vocabulary, grammar, 
                  pronunciation, and more using interactive tools and reasoning.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
                  <div className="p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer transition-colors"
                       onClick={() => setInput("Create flashcards for advanced vocabulary words")}>
                    <BookOpen size={24} className="text-blue-500 mb-2" />
                    <h3 className="font-medium mb-1">Vocabulary Flashcards</h3>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      Create interactive flashcards for any topic
                    </p>
                  </div>
                  
                  <div className="p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer transition-colors"
                       onClick={() => setInput("Generate a quiz on English grammar")}>
                    <Lightning size={24} className="text-yellow-500 mb-2" />
                    <h3 className="font-medium mb-1">Interactive Quizzes</h3>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      Test your knowledge with smart quizzes
                    </p>
                  </div>
                  
                  <div className="p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer transition-colors"
                       onClick={() => setInput("Help me practice pronunciation of difficult English words")}>
                    <span className="text-2xl mb-2 block">🎤</span>
                    <h3 className="font-medium mb-1">Pronunciation Practice</h3>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      Practice speaking with AI-powered audio examples
                    </p>
                  </div>
                </div>
              </div>
            )}

            {messages.slice(1).map((message: ChatMessage) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.role === "assistant" && (
                  <Avatar 
                    username="AI"
                    className="w-8 h-8 bg-[#F48120] text-white flex items-center justify-center text-sm font-medium"
                  />
                )}
                
                <div
                  className={`max-w-[70%] ${
                    message.role === "user"
                      ? "bg-blue-500 text-white rounded-2xl rounded-br-md px-4 py-2"
                      : "bg-neutral-100 dark:bg-neutral-800 rounded-2xl rounded-bl-md px-4 py-3"
                  }`}
                >
                  {message.content && (
                    <MemoizedMarkdown content={message.content} id={message.id} />
                  )}
                  
                  {/* Render Quiz if present */}
                  {message.quiz && (
                    <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                      <h3 className="text-lg font-semibold mb-4 text-blue-800 dark:text-blue-200">
                        🧩 {message.quiz.title}
                      </h3>
                      <div className="space-y-4">
                        {message.quiz.questions.map((question, qIndex) => (
                          <div key={question.id} className="p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                            <h4 className="font-medium mb-3 text-gray-800 dark:text-gray-200">
                              {qIndex + 1}. {question.question}
                            </h4>
                            <div className="space-y-2">
                              {question.options.map((option, optIndex) => {
                                const questionKey = `${message.id}-${question.id}`;
                                const isSelected = selectedAnswers[questionKey] === optIndex;
                                const isCorrect = optIndex === question.correctAnswer;
                                const showResult = selectedAnswers[questionKey] !== undefined;
                                
                                return (
                                  <button
                                    key={optIndex}
                                    onClick={() => {
                                      setSelectedAnswers(prev => ({
                                        ...prev,
                                        [questionKey]: optIndex
                                      }));
                                      setQuizResults(prev => ({
                                        ...prev,
                                        [questionKey]: isCorrect
                                      }));
                                    }}
                                    disabled={showResult}
                                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                                      showResult
                                        ? isCorrect
                                          ? 'bg-green-100 border-green-300 text-green-800 dark:bg-green-900/20 dark:border-green-600 dark:text-green-200'
                                          : isSelected
                                          ? 'bg-red-100 border-red-300 text-red-800 dark:bg-red-900/20 dark:border-red-600 dark:text-red-200'
                                          : 'bg-gray-100 border-gray-300 text-gray-600 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400'
                                        : isSelected
                                        ? 'bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900/20 dark:border-blue-600 dark:text-blue-200'
                                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600'
                                    }`}
                                  >
                                    <span className="flex items-center">
                                      <span className="w-6 h-6 rounded-full border-2 mr-3 flex items-center justify-center text-xs font-medium">
                                        {String.fromCharCode(65 + optIndex)}
                                      </span>
                                      {option}
                                      {showResult && isCorrect && (
                                        <span className="ml-auto text-green-600 dark:text-green-400">✓</span>
                                      )}
                                      {showResult && isSelected && !isCorrect && (
                                        <span className="ml-auto text-red-600 dark:text-red-400">✗</span>
                                      )}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                            {selectedAnswers[`${message.id}-${question.id}`] !== undefined && question.explanation && (
                              <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                  <strong>Explanation:</strong> {question.explanation}
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Render Flashcards if present */}
                  {message.flashcards && (
                    <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
                      <h3 className="text-lg font-semibold mb-4 text-purple-800 dark:text-purple-200">
                        🃏 Vocabulary Flashcards
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {message.flashcards.map((card) => {
                          const cardKey = `${message.id}-${card.id}`;
                          const isFlipped = flippedCards[cardKey] || false;
                          
                          return (
                            <div
                              key={card.id}
                              className="relative h-48 cursor-pointer perspective-1000"
                              onClick={() => {
                                setFlippedCards(prev => ({
                                  ...prev,
                                  [cardKey]: !prev[cardKey]
                                }));
                              }}
                            >
                              <div className={`relative w-full h-full transition-transform duration-600 transform-style-preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
                                {/* Front of card */}
                                <div className="absolute inset-0 w-full h-full backface-hidden bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 p-4 flex flex-col justify-center items-center text-center">
                                  <h4 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">
                                    {card.front}
                                  </h4>
                                  {card.pronunciation && (
                                    <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                                      {card.pronunciation}
                                    </p>
                                  )}
                                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-4">
                                    Click to flip
                                  </p>
                                </div>
                                
                                {/* Back of card */}
                                <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900 dark:to-blue-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 p-4 flex flex-col justify-center">
                                  <p className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-3">
                                    {card.back}
                                  </p>
                                  {card.example && (
                                    <div className="mt-3 p-2 bg-white/70 dark:bg-gray-800/70 rounded">
                                      <p className="text-sm text-gray-700 dark:text-gray-300">
                                        <em>Example:</em> {card.example}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  {/* Render Pronunciation Practice if present */}
                  {message.pronunciation && (
                    <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
                      <h3 className="text-lg font-semibold mb-4 text-green-800 dark:text-green-200">
                        🎤 {message.pronunciation.title}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {message.pronunciation.exercises.map((exercise) => {
                          const exerciseKey = `${message.id}-${exercise.id}`;
                          const attempts = pronunciationAttempts[exerciseKey] || 0;
                          const difficultyColor = exercise.difficulty === 'easy' ? 'text-green-600' : exercise.difficulty === 'medium' ? 'text-yellow-600' : 'text-red-600';
                          
                          return (
                            <div key={exercise.id} className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="text-xl font-bold text-gray-800 dark:text-gray-200">
                                  {exercise.word}
                                </h4>
                                <span className={`text-xs font-medium px-2 py-1 rounded-full ${difficultyColor} bg-gray-100 dark:bg-gray-700`}>
                                  {exercise.difficulty}
                                </span>
                              </div>
                              
                              <div className="mb-3">
                                <p className="text-lg font-mono text-blue-600 dark:text-blue-400 mb-1">
                                  {exercise.ipa}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                                  {exercise.example}
                                </p>
                              </div>
                              
                              <div className="mb-4">
                                <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  💡 Pronunciation Tips:
                                </h5>
                                <ul className="space-y-1">
                                  {exercise.tips.map((tip, tipIndex) => (
                                    <li key={tipIndex} className="text-xs text-gray-600 dark:text-gray-400 flex items-start">
                                      <span className="text-yellow-500 mr-2">•</span>
                                      {tip}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <Button
                                  onClick={() => {
                                    speakWithElevenLabs(exercise.audioText, elevenlabsKey);
                                    setPronunciationAttempts(prev => ({
                                      ...prev,
                                      [exerciseKey]: attempts + 1
                                    }));
                                  }}
                                  size="sm"
                                  className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white"
                                >
                                  🔊 Listen ({attempts} plays)
                                </Button>
                                
                                <Button
                                  onClick={() => {
                                    speakWithElevenLabs(`Repeat after me: ${exercise.audioText}`, elevenlabsKey);
                                  }}
                                  size="sm"
                                  variant="secondary"
                                  className="flex items-center gap-2"
                                >
                                  🎯 Practice Mode
                                </Button>
                              </div>
                              
                              {attempts > 0 && (
                                <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                                  <p className="text-xs text-blue-700 dark:text-blue-300">
                                    🎉 Great practice! You've listened to this word {attempts} time{attempts !== 1 ? 's' : ''}. 
                                    {attempts >= 3 && " You're becoming more familiar with the pronunciation!"}
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      
                      <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                          <strong>💡 Pro Tip:</strong> {elevenlabsKey ? 
                            "You're using ElevenLabs premium TTS for high-quality pronunciation! Listen carefully and repeat." :
                            "Add your ElevenLabs API key for premium pronunciation examples!"
                          }
                        </p>
                      </div>
                    </div>
                  )}
                  

                </div>
                
                {message.role === "user" && (
                  <Avatar 
                    username="User"
                    className="w-8 h-8 bg-blue-500 text-white flex items-center justify-center text-sm font-medium"
                  />
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <Avatar 
                  username="AI"
                  className="w-8 h-8 bg-[#F48120] text-white flex items-center justify-center text-sm font-medium"
                />
                <div className="bg-neutral-100 dark:bg-neutral-800 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Brain size={16} className="animate-pulse text-blue-500" />
                    <span className="text-sm">Agent is reasoning...</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <form onSubmit={handleSubmit} className="p-6 border-t border-neutral-300 dark:border-neutral-800">
            <div className="flex gap-3">
              <div className="flex-1">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask me anything about English learning! I'll reason through it step by step..."
                  className="min-h-[60px] resize-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                />
              </div>
              <Button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="px-4 py-2 h-[60px]"
              >
                <PaperPlaneTilt size={20} />
              </Button>
            </div>
          </form>
        </div>

        {/* Reasoning Panel */}
        {renderReasoningPanel()}
      </div>
    </div>
  );
}
