import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, AlertCircle, Loader2 } from 'lucide-react';
import { useAssistant } from '../hooks/useAssistant';

export function FloatingAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { messages, isLoading, error, sendMessage, clearError } = useAssistant();

  const toggleChat = () => {
    setIsOpen(!isOpen);
    if (error) clearError();
  };

  const handleSendMessage = async () => {
    if (!chatMessage.trim() || isLoading) return;
    
    const messageToSend = chatMessage;
    setChatMessage('');
    await sendMessage(messageToSend);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <>
      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-80 h-96 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                <Bot className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <h3 className="font-semibold font-space text-white">Drewbert</h3>
                <p className="text-xs text-primary-100 font-manrope">Here to help</p>
              </div>
            </div>
            <button
              onClick={toggleChat}
              className="p-1 hover:bg-primary-500 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 p-4 bg-gray-50 overflow-y-auto">
            <div className="space-y-4">
              {/* Welcome Message - only show if no messages */}
              {messages.length === 0 && (
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-primary-600" />
                  </div>
                  <div className="bg-white rounded-lg p-3 shadow-sm max-w-[220px]">
                    <p className="text-sm text-gray-800 font-manrope">
                      Hi! I'm Drewbert's AI assistant. I can help with:
                    </p>
                    <ul className="text-xs text-gray-600 font-manrope mt-2 space-y-1">
                      <li>• Emergency guidance</li>
                      <li>• Overdose prevention tips</li>
                      <li>• How to use the app</li>
                      <li>• Finding resources</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700 font-manrope">{error}</p>
                  </div>
                </div>
              )}

              {/* Chat Messages */}
              {messages.map((message) => (
                <div key={message.id} className={`flex items-start gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.role === 'user' 
                      ? 'bg-primary-600 text-white' 
                      : 'bg-primary-100 text-primary-600'
                  }`}>
                    {message.role === 'user' ? (
                      <span className="text-xs font-bold">U</span>
                    ) : (
                      <Bot className="w-4 h-4" />
                    )}
                  </div>
                  <div className={`rounded-lg p-3 shadow-sm max-w-[220px] ${
                    message.role === 'user' 
                      ? 'bg-primary-600 text-white' 
                      : 'bg-white text-gray-800'
                  }`}>
                    <p className="text-sm font-manrope whitespace-pre-wrap">{message.content}</p>
                    <p className={`text-xs mt-1 font-manrope ${
                      message.role === 'user' ? 'text-primary-100' : 'text-gray-500'
                    }`}>
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}

              {/* Loading indicator */}
              {isLoading && (
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-primary-600" />
                  </div>
                  <div className="bg-white rounded-lg p-3 shadow-sm">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 text-primary-600 animate-spin" />
                      <p className="text-sm text-gray-600 font-manrope">Thinking...</p>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-gray-100">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ask for help..."
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg font-manrope text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={isLoading || !chatMessage.trim()}
                className={`px-3 py-2 rounded-lg font-manrope text-sm flex items-center justify-center transition-colors ${
                  isLoading || !chatMessage.trim()
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-primary-600 text-white hover:bg-primary-700'
                }`}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={toggleChat}
        className={`fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white rounded-full shadow-lg z-50 flex items-center justify-center transition-all duration-300 ${
          isOpen ? 'scale-95' : 'scale-100 hover:scale-105'
        }`}
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <MessageCircle className="w-6 h-6" />
        )}
      </button>

      {/* Pulsing indicator when closed */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 w-14 h-14 rounded-full border-2 border-primary-500 opacity-75 animate-ping pointer-events-none z-40"></div>
      )}
    </>
  );
}