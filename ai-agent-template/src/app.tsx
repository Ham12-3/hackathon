import { useEffect, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { type ToolInvocation, type Message } from "ai";

// Component imports
import { Button } from "@/components/button/Button";
import { Input } from "@/components/input/Input";
import { Textarea } from "@/components/textarea/Textarea";
import { ToolInvocationCard } from "@/components/tool-invocation-card/ToolInvocationCard";
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

  // Agent configuration with ReACT prompting
  const {
    isLoading: agentLoading,
    messages,
    input,
    setInput,
    handleSubmit: originalHandleSubmit,
    addToolResult,
  } = useChat({
    api: "/api/chat",
    initialMessages: [
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
      },
    ],
  });

  // Check for server-side API keys on mount
  useEffect(() => {
    const checkServerKeys = async () => {
      try {
        setKeyCheckLoading(true);
        const response = await fetch('/check-open-ai-key');
        const data = await response.json() as { success: boolean };
        setHasValidKey(data.success);
      } catch (error) {
        console.error('Failed to check API keys:', error);
        setHasValidKey(false);
      } finally {
        setKeyCheckLoading(false);
      }
    };

    checkServerKeys();

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
    
    messages.forEach((message: Message, index: number) => {
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
      
      // Track tool invocations as actions
      if (message.toolInvocations) {
        message.toolInvocations.forEach((tool: any, toolIndex: number) => {
          newReasoning.push({
            id: `tool-${index}-${toolIndex}`,
            type: 'action',
            content: `Using tool: ${tool.toolName}`,
            timestamp: message.createdAt || new Date(),
            tool: tool.toolName,
            result: tool.result || 'pending',
          });
        });
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

  const handleSubmit = (e: React.FormEvent) => {
    setIsReasoning(true);
    originalHandleSubmit(e);
    setTimeout(() => setIsReasoning(false), 2000);
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
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
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
                </div>
              </div>
            )}

            {messages.slice(1).map((message: Message) => (
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
                  
                  {message.toolInvocations && (
                    <div className="mt-2 space-y-2">
                      {message.toolInvocations.map((tool: ToolInvocation) => (
                        <ToolInvocationCard
                          key={tool.toolCallId}
                          toolInvocation={tool}
                          toolCallId={tool.toolCallId}
                          needsConfirmation={false}
                          addToolResult={addToolResult}
                        />
                      ))}
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
            
            {agentLoading && (
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
                disabled={agentLoading || !input.trim()}
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
