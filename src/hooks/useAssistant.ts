import { useState, useCallback, useRef } from 'react';
import OpenAI from 'openai';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface UseAssistantState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
}

interface ApiError {
  error?: {
    message: string;
    type: string;
    code: string;
  };
  status?: number;
}

const safeApiCall = async <T>(apiCall: () => Promise<T>): Promise<T> => {
  try {
    return await apiCall();
  } catch (error) {
    // Handle and improve OpenAI API errors
    if (error instanceof Error) {
      // Try to extract more meaningful error info if it's in JSON format
      try {
        const errorJson = JSON.parse(error.message) as ApiError;
        if (errorJson.error?.message) {
          throw new Error(`API Error: ${errorJson.error.message}`);
        }
      } catch (e) {
        // Not JSON, use the original error
      }
    }
    throw error; // Re-throw the original or enhanced error
  }
};

export function useAssistant() {
  const [state, setState] = useState<UseAssistantState>({
    messages: [],
    isLoading: false,
    error: null,
  });

  // Use ref to store thread ID to avoid stale closure issues
  const threadIdRef = useRef<string | null>(null);

  // Get API key from Vite environment variables only (browser-safe)
  const getApiKey = () => {
    return import.meta.env.VITE_OPENAI_API_KEY || 
           import.meta.env.OPENAI_API_KEY;
  };

  const getAssistantId = () => {
    return import.meta.env.VITE_OPENAI_ASSISTANT_ID || 
           import.meta.env.OPENAI_ASSISTANT_ID;
  };

  const apiKey = getApiKey();
  const assistantId = getAssistantId();

  // Validate that we have the required environment variables
  if (!apiKey) {
    throw new Error('OpenAI API key is missing. Please set VITE_OPENAI_API_KEY or OPENAI_API_KEY environment variable.');
  }

  if (!assistantId) {
    throw new Error('OpenAI Assistant ID is missing. Please set VITE_OPENAI_ASSISTANT_ID or OPENAI_ASSISTANT_ID environment variable.');
  }

  // Initialize OpenAI client with environment variables
  const openai = new OpenAI({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true, // Required for client-side usage
    defaultHeaders: {
      'OpenAI-Beta': 'assistants=v2' // Ensure this header is set for all SDK calls
    }
  });

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Get or create thread - ensure we have a valid thread ID
      let currentThreadId = threadIdRef.current;
      if (!currentThreadId) {
        console.log('Creating new thread...');
        const thread = await safeApiCall(() => openai.beta.threads.create());
        currentThreadId = thread.id;
        threadIdRef.current = currentThreadId;
        console.log('Thread created:', currentThreadId);
      }

      // Verify we have a valid thread ID
      if (!currentThreadId || currentThreadId === 'undefined') {
        throw new Error('Failed to obtain valid thread ID');
      }

      // Add user message to state
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content,
        timestamp: new Date(),
      };

      setState(prev => ({
        ...prev,
        messages: [...prev.messages, userMessage],
      }));

      // Add message to thread
      console.log('Adding message to thread:', currentThreadId);
      await safeApiCall(() => 
        openai.beta.threads.messages.create(currentThreadId, {
          role: 'user',
          content,
        })
      );

      // Run the assistant
      console.log('Starting assistant run...');
      const run = await safeApiCall(() => 
        openai.beta.threads.runs.create(currentThreadId, {
          assistant_id: assistantId,
        })
      );

      console.log('Run created:', run.id, 'for thread:', currentThreadId);

      // Use the improved polling mechanism
      try {
        let runStatus;
        const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
        
        do {
          runStatus = await pollRunStatus(currentThreadId, run.id, apiKey);
          
          // If still in progress, wait before next poll
          if (runStatus.status === 'in_progress' || runStatus.status === 'queued') {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } while (runStatus.status === 'in_progress' || runStatus.status === 'queued');
        
        // Process completed status
        if (runStatus.status === 'completed') {
          // Get the assistant's response
          const messages = await openai.beta.threads.messages.list(currentThreadId);
          const assistantMessage = messages.data[0];

          if (assistantMessage.role === 'assistant' && assistantMessage.content[0].type === 'text') {
            const responseMessage: Message = {
              id: assistantMessage.id,
              role: 'assistant',
              content: assistantMessage.content[0].text.value,
              timestamp: new Date(assistantMessage.created_at * 1000),
            };

            setState(prev => ({
              ...prev,
              messages: [...prev.messages, responseMessage],
              isLoading: false,
            }));
          }
        } else if (runStatus.status === 'failed') {
          throw new Error(`Assistant run failed: ${runStatus.last_error?.message || 'Unknown error'}`);
        } else if (runStatus.status === 'cancelled') {
          throw new Error('Assistant run was cancelled');
        } else {
          throw new Error(`Unexpected run status: ${runStatus.status}`);
        }
      } catch (error) {
        console.error('Error during assistant run:', error);
        setState(prev => ({
          ...prev,
          error: `Assistant error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          isLoading: false,
        }));
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to send message. Please try again.',
        isLoading: false,
      }));
    }
  }, [openai, assistantId]);

  const pollRunStatus = async (threadId: string, runId: string, apiKey: string): Promise<any> => {
    // Maximum number of retries
    const MAX_RETRIES = 3;
    // Starting delay in ms (1 second)
    const BASE_DELAY = 1000;
    
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const url = `https://api.openai.com/v1/threads/${threadId}/runs/${runId}`;
        console.log(`Polling attempt ${attempt + 1}/${MAX_RETRIES} for run status from: ${url}`);
        
        const response = await fetch(url, {
          headers: { 
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'OpenAI-Beta': 'assistants=v2'  // Add the required beta header
          },
        });
        
        // Handle HTTP errors
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error(`Run status error: ${response.status}`, errorData);
          
          // If rate limited, wait longer before retry
          if (response.status === 429) {
            await new Promise(resolve => setTimeout(resolve, BASE_DELAY * Math.pow(2, attempt + 1)));
            continue;
          }
          
          throw new Error(`Failed to fetch run status: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
        }
        
        const runStatus = await response.json();
        console.log('Run status:', runStatus.status);
        return runStatus;
      } catch (error) {
        console.error(`Polling error (attempt ${attempt + 1}/${MAX_RETRIES}):`, error);
        
        // Only retry if not the last attempt
        if (attempt < MAX_RETRIES - 1) {
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, BASE_DELAY * Math.pow(2, attempt)));
        } else {
          throw error; // Re-throw on final attempt
        }
      }
    }
    
    throw new Error('Maximum polling retries exceeded');
  };

  const clearMessages = useCallback(() => {
    setState({
      messages: [],
      isLoading: false,
      error: null,
    });
    threadIdRef.current = null;
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    messages: state.messages,
    isLoading: state.isLoading,
    error: state.error,
    sendMessage,
    clearMessages,
    clearError,
  };
}
