/**
 * Tool definitions for the AI chat agent
 * Tools can either require human confirmation or execute automatically
 */
import { tool } from "ai";
import { z } from "zod";

import type { ChatInternal } from "./server";
import { getCurrentAgent } from "agents";
import { unstable_scheduleSchema } from "agents/schedule";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";

/**
 * Weather information tool that requires human confirmation
 * When invoked, this will present a confirmation dialog to the user
 * The actual implementation is in the executions object below
 */
const getWeatherInformation = tool({
  description: "show the weather in a given city to the user",
  parameters: z.object({ city: z.string() }),
  // Omitting execute function makes this tool require human confirmation
});

/**
 * Local time tool that executes automatically
 * Since it includes an execute function, it will run without user confirmation
 * This is suitable for low-risk operations that don't need oversight
 */
const getLocalTime = tool({
  description: "get the local time for a specified location",
  parameters: z.object({ location: z.string() }),
  execute: async ({ location }) => {
    console.log(`Getting local time for ${location}`);
    return "10am";
  },
});

const scheduleTask = tool({
  description: "A tool to schedule a task to be executed at a later time",
  parameters: unstable_scheduleSchema,
  execute: async ({ when, description }) => {
    // we can now read the agent context from the ALS store
    const { agent } = getCurrentAgent<ChatInternal>();

    function throwError(msg: string): string {
      throw new Error(msg);
    }
    if (when.type === "no-schedule") {
      return "Not a valid schedule input";
    }
    const input =
      when.type === "scheduled"
        ? when.date // scheduled
        : when.type === "delayed"
          ? when.delayInSeconds // delayed
          : when.type === "cron"
            ? when.cron // cron
            : throwError("not a valid schedule input");
    try {
      agent!.schedule(input!, "executeTask", description);
    } catch (error) {
      console.error("error scheduling task", error);
      return `Error scheduling task: ${error}`;
    }
    return `Task scheduled for type "${when.type}" : ${input}`;
  },
});

/**
 * Tool to list all scheduled tasks
 * This executes automatically without requiring human confirmation
 */
const getScheduledTasks = tool({
  description: "List all tasks that have been scheduled",
  parameters: z.object({}),
  execute: async () => {
    const { agent } = getCurrentAgent<ChatInternal>();

    try {
      const tasks = agent!.getSchedules();
      if (!tasks || tasks.length === 0) {
        return "No scheduled tasks found.";
      }
      return tasks;
    } catch (error) {
      console.error("Error listing scheduled tasks", error);
      return `Error listing scheduled tasks: ${error}`;
    }
  },
});

const setMemory = tool({
  description:
    "A tool to set a specific memory entry by key-value pair. This preserves existing memories.",
  parameters: z.object({
    key: z.string().describe("The key for the memory entry"),
    value: z.string().describe("The value to store for this key"),
  }),
  execute: async ({ key, value }) => {
    const { agent } = getCurrentAgent<ChatInternal>();
    const agentState = agent!.state as { memory?: Record<string, string> };
    const currentMemory = agentState.memory || {};

    // Merge the new key-value pair with existing memory
    const updatedMemory = {
      ...currentMemory,
      [key]: value,
    };

    agent?.setState({
      memory: updatedMemory,
    });
    return `Memory "${key}" set to "${value}"`;
  },
});

const forgetMemory = tool({
  description: "A tool to forget a specific memory entry by key",
  parameters: z.object({
    key: z.string().describe("The key of the memory entry to forget"),
  }),
  execute: async ({ key }) => {
    const { agent } = getCurrentAgent<ChatInternal>();
    const agentState = agent!.state as { memory?: Record<string, string> };
    const currentMemory = agentState.memory || {};

    // Create new memory object without the specified key
    const { [key]: _, ...updatedMemory } = currentMemory;

    agent?.setState({
      memory: updatedMemory,
    });
    return `Memory entry "${key}" forgotten`;
  },
});

const addMcpServer = tool({
  description: "A tool to dynamically add an MCP server",
  parameters: z.object({
    url: z.string(),
    name: z.string(),
  }),
  execute: async ({ url, name }) => {
    const { agent } = getCurrentAgent();
    if (!agent) {
      throw new Error("No agent found");
    }
    const { id, authUrl } = await agent.addMcpServer(
      name,
      url,
      "http://localhost:5173"
    );
    return `MCP server added with id ${id}. ${authUrl ? `Authentication is necessary. Use URL: ${authUrl}` : ""}`;
  },
});

const removeMcpServer = tool({
  description: "A tool to remove an MCP server by id",
  parameters: z.object({
    id: z.string(),
  }),
  execute: async ({ id }) => {
    const { agent } = getCurrentAgent<ChatInternal>();
    if (!agent) {
      throw new Error("No agent found");
    }
    await agent.removeMcpServer(id);
    return `MCP server removed with id ${id}`;
  },
});

const listMcpServers = tool({
  description: "A tool to list all MCP servers",
  parameters: z.object({}),
  execute: async () => {
    const { agent } = getCurrentAgent<ChatInternal>();
    return agent!.getMcpServers();
  },
});

/**
 * Tool to cancel a scheduled task by its ID
 * This executes automatically without requiring human confirmation
 */
const cancelScheduledTask = tool({
  description: "Cancel a scheduled task using its ID",
  parameters: z.object({
    taskId: z.string().describe("The ID of the task to cancel"),
  }),
  execute: async ({ taskId }) => {
    const { agent } = getCurrentAgent<ChatInternal>();
    try {
      await agent!.cancelSchedule(taskId);
      return `Task ${taskId} has been successfully canceled.`;
    } catch (error) {
      console.error("Error canceling scheduled task", error);
      return `Error canceling task ${taskId}: ${error}`;
    }
  },
});

/**
 * LANGUAGE LEARNING TOOLS
 * These tools provide various language learning capabilities
 */

/**
 * Translation tool using AI
 */
const translateText = tool({
  description: "Translate text between different languages using AI",
  parameters: z.object({
    text: z.string().describe("The text to translate"),
    fromLanguage: z.string().describe("Source language (e.g., 'English', 'Spanish')"),
    toLanguage: z.string().describe("Target language (e.g., 'French', 'German')"),
  }),
  execute: async ({ text, fromLanguage, toLanguage }) => {
    try {
      const result = await generateText({
        model: anthropic("claude-3-5-sonnet-latest"),
        prompt: `Translate the following text from ${fromLanguage} to ${toLanguage}. Only provide the translation, no explanations:

Text: "${text}"`,
      });
      
      return {
        originalText: text,
        translatedText: result.text.trim(),
        fromLanguage,
        toLanguage,
      };
    } catch (error) {
      return `Translation failed: ${error}`;
    }
  },
});

/**
 * Create flashcards for vocabulary learning
 */
const createFlashcard = tool({
  description: "Create a flashcard for language learning with word, translation, example sentence, and pronunciation guide",
  parameters: z.object({
    word: z.string().describe("The word to create a flashcard for"),
    language: z.string().describe("The language of the word"),
    targetLanguage: z.string().describe("Language to translate to"),
  }),
  execute: async ({ word, language, targetLanguage }) => {
    try {
      const result = await generateText({
        model: anthropic("claude-3-5-sonnet-latest"),
        prompt: `Create a comprehensive flashcard for the ${language} word "${word}" translated to ${targetLanguage}. Return ONLY a JSON object with this exact structure:

{
  "id": "unique_id",
  "front": "${word}",
  "back": "translation",
  "pronunciation": "phonetic_pronunciation",
  "example": "example sentence in ${language}",
  "difficulty": "beginner|intermediate|advanced",
  "partOfSpeech": "noun|verb|adjective|etc"
}`,
      });
      
      return {
        type: 'flashcard',
        data: result.text.trim(),
      };
    } catch (error) {
      return `Flashcard creation failed: ${error}`;
    }
  },
});

/**
 * Create a set of flashcards for a specific topic
 */
const createFlashcardSet = tool({
  description: "Create a set of flashcards for a specific English learning topic",
  parameters: z.object({
    topic: z.string().describe("The topic to create flashcards for (e.g., 'business English', 'travel vocabulary', 'common phrases')"),
    difficulty: z.enum(["beginner", "intermediate", "advanced"]).describe("Difficulty level"),
    count: z.number().min(5).max(20).default(10).describe("Number of flashcards to create"),
  }),
  execute: async ({ topic, difficulty, count }) => {
    try {
      const result = await generateText({
        model: anthropic("claude-3-5-sonnet-latest"),
        prompt: `Create a set of ${count} flashcards for English learning on the topic "${topic}" at ${difficulty} level. 

Return ONLY a JSON array where each flashcard has this exact structure:
[
  {
    "id": "unique_id_1",
    "front": "english_word_or_phrase",
    "back": "clear_definition_or_explanation",
    "pronunciation": "phonetic_pronunciation",
    "example": "example sentence using the word",
    "difficulty": "${difficulty}",
    "partOfSpeech": "noun|verb|adjective|phrase|etc"
  }
]

Make sure the vocabulary is appropriate for ${difficulty} level English learners and relevant to ${topic}.`,
      });
      
      return {
        type: 'flashcard_set',
        topic,
        difficulty,
        count,
        data: result.text.trim(),
      };
    } catch (error) {
      return `Flashcard set creation failed: ${error}`;
    }
  },
});

/**
 * Create a vocabulary quiz with multiple choice questions
 */
const createVocabularyQuiz = tool({
  description: "Create an interactive vocabulary quiz for English learning",
  parameters: z.object({
    topic: z.string().describe("The topic for the quiz (e.g., 'synonyms', 'definitions', 'usage')"),
    difficulty: z.enum(["beginner", "intermediate", "advanced"]).describe("Difficulty level"),
    questionCount: z.number().min(5).max(15).default(8).describe("Number of questions"),
  }),
  execute: async ({ topic, difficulty, questionCount }) => {
    try {
      const result = await generateText({
        model: anthropic("claude-3-5-sonnet-latest"),
        prompt: `Create a ${questionCount}-question English vocabulary quiz on "${topic}" at ${difficulty} level.

Return ONLY a JSON array where each question has this exact structure:
[
  {
    "id": "q1",
    "question": "What does the word 'example' mean?",
    "options": ["option A", "option B", "option C", "option D"],
    "correctAnswer": 0,
    "explanation": "Brief explanation of why this is correct",
    "audioText": "example"
  }
]

Make questions appropriate for ${difficulty} level English learners. Include a mix of definition, usage, and context questions.`,
      });
      
      return {
        type: 'quiz',
        topic,
        difficulty,
        questionCount,
        data: result.text.trim(),
      };
    } catch (error) {
      return `Quiz creation failed: ${error}`;
    }
  },
});

/**
 * Practice pronunciation tool
 */
const practicePronunciation = tool({
  description: "Get pronunciation practice materials for English words or phrases",
  parameters: z.object({
    text: z.string().describe("The word or phrase to practice"),
    includePhonetics: z.boolean().default(true).describe("Include phonetic transcription"),
    includeTips: z.boolean().default(true).describe("Include pronunciation tips"),
  }),
  execute: async ({ text, includePhonetics, includeTips }) => {
    try {
      const result = await generateText({
        model: anthropic("claude-3-5-sonnet-latest"),
        prompt: `Provide pronunciation guidance for the English text: "${text}"

Return a JSON object with:
{
  "text": "${text}",
  "phonetic": "${includePhonetics ? 'IPA phonetic transcription' : 'null'}",
  "syllables": "broken down syllables",
  "stress": "which syllables to stress",
  "tips": ${includeTips ? '"array of helpful pronunciation tips"' : 'null'},
  "audioText": "${text}",
  "difficulty": "beginner|intermediate|advanced"
}`,
      });
      
      return {
        type: 'pronunciation',
        text,
        data: result.text.trim(),
      };
    } catch (error) {
      return `Pronunciation practice failed: ${error}`;
    }
  },
});

/**
 * Set ElevenLabs API key for text-to-speech
 */
const setElevenLabsKey = tool({
  description: "Set or update the ElevenLabs API key for high-quality text-to-speech",
  parameters: z.object({
    apiKey: z.string().describe("The ElevenLabs API key"),
  }),
  execute: async ({ apiKey }) => {
    try {
      // Store in localStorage (this runs on client side)
      if (typeof window !== 'undefined') {
        localStorage.setItem('elevenlabs_api_key', apiKey);
        return {
          type: 'success',
          message: 'ElevenLabs API key saved successfully! You can now use high-quality text-to-speech for pronunciation practice.',
          data: {
            keySet: true,
            instructions: 'Use the pronunciation tools or create flashcards to test the text-to-speech functionality.'
          }
        };
      } else {
        return {
          type: 'error',
          message: 'Unable to save API key - localStorage not available'
        };
      }
    } catch (error) {
      return `Failed to set ElevenLabs key: ${error}`;
    }
  },
});

/**
 * Grammar checking and correction tool
 */
const checkGrammar = tool({
  description: "Check and correct grammar in a given text, providing explanations for mistakes",
  parameters: z.object({
    text: z.string().describe("The text to check for grammar errors"),
    language: z.string().describe("The language of the text"),
  }),
  execute: async ({ text, language }) => {
    try {
      const result = await generateText({
        model: anthropic("claude-3-5-sonnet-latest"),
        prompt: `Check the following ${language} text for grammar errors and provide corrections with explanations:

Text: "${text}"

Please provide:
1. Corrected text
2. List of errors found with explanations
3. Grammar level assessment (beginner/intermediate/advanced)`,
      });
      
      return {
        originalText: text,
        language,
        analysis: result.text.trim(),
      };
    } catch (error) {
      return `Grammar check failed: ${error}`;
    }
  },
});

/**
 * Generate vocabulary quiz
 */
const generateVocabularyQuiz = tool({
  description: "Generate a vocabulary quiz for language learning practice",
  parameters: z.object({
    language: z.string().describe("The language to practice"),
    difficulty: z.enum(["beginner", "intermediate", "advanced"]).describe("Difficulty level"),
    topicOrWords: z.string().optional().describe("Specific topic or comma-separated words to focus on"),
    questionCount: z.number().min(3).max(10).default(5).describe("Number of questions"),
  }),
  execute: async ({ language, difficulty, topicOrWords, questionCount }) => {
    try {
      const result = await generateText({
        model: anthropic("claude-3-5-sonnet-latest"),
        prompt: `Generate a ${difficulty} level vocabulary quiz for ${language} learning with ${questionCount} questions.
${topicOrWords ? `Focus on: ${topicOrWords}` : ''}

For each question, provide:
1. Question text
2. Multiple choice options (A, B, C, D)
3. Correct answer
4. Brief explanation

Format as JSON array.`,
      });
      
      return {
        language,
        difficulty,
        questionCount,
        topic: topicOrWords,
        quiz: result.text.trim(),
      };
    } catch (error) {
      return `Quiz generation failed: ${error}`;
    }
  },
});

/**
 * Practice conversation starter
 */
const startConversationPractice = tool({
  description: "Start a guided conversation practice session in a target language",
  parameters: z.object({
    language: z.string().describe("Target language for conversation"),
    scenario: z.string().describe("Conversation scenario (e.g., 'ordering food', 'job interview', 'casual chat')"),
    userLevel: z.enum(["beginner", "intermediate", "advanced"]).describe("User's language level"),
  }),
  execute: async ({ language, scenario, userLevel }) => {
    try {
      const result = await generateText({
        model: anthropic("claude-3-5-sonnet-latest"),
        prompt: `Start a ${userLevel} level conversation practice in ${language} for the scenario: "${scenario}".

Provide:
1. Opening line in ${language}
2. English translation  
3. Suggested response options for the user
4. Context and cultural notes
5. Key vocabulary for this scenario`,
      });
      
      return {
        language,
        scenario,
        userLevel,
        conversationStarter: result.text.trim(),
      };
    } catch (error) {
      return `Conversation practice failed: ${error}`;
    }
  },
});

/**
 * Export all available tools
 * These will be provided to the AI model to describe available capabilities
 */
export const tools = {
  setMemory,
  forgetMemory,
  addMcpServer,
  removeMcpServer,
  listMcpServers,
  getWeatherInformation,
  getLocalTime,
  scheduleTask,
  getScheduledTasks,
  cancelScheduledTask,
  translateText,
  createFlashcard,
  createFlashcardSet,
  createVocabularyQuiz,
  practicePronunciation,
  setElevenLabsKey,
  checkGrammar,
  generateVocabularyQuiz,
  startConversationPractice,
};

/**
 * Implementation of confirmation-required tools
 * This object contains the actual logic for tools that need human approval
 * Each function here corresponds to a tool above that doesn't have an execute function
 */
export const executions = {
  getWeatherInformation: async ({ city }: { city: string }) => {
    console.log(`Getting weather information for ${city}`);
    return `The weather in ${city} is sunny`;
  },
};
