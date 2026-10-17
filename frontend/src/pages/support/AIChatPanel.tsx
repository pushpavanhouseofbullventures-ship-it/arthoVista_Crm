import React, { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../../services/api';
import { 
  Send, Loader2, Bot, User, Sparkles
} from 'lucide-react';

interface ChatMessage {
  sender: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

export const AIChatPanel: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: 'ai',
      content: 'Hello! I am your ArthaVenture Copilot. I analyze your leads, service cases, invoicing ledger, and tickets in real-time to answer operations questions. Ask me anything!',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // AI Query Mutation
  const aiMutation = useMutation({
    mutationFn: async (messageText: string) => {
      const response = await api.post('/ai/chat', { message: messageText });
      return response.data.data;
    },
    onSuccess: (data) => {
      setMessages(prev => [...prev, {
        sender: 'ai',
        content: data.reply,
        timestamp: new Date()
      }]);
    },
    onError: (err: any) => {
      setMessages(prev => [...prev, {
        sender: 'ai',
        content: `Error: ${err.response?.data?.message || 'I encountered an issue gathering your CRM workspace details. Make sure you are logged in.'}`,
        timestamp: new Date()
      }]);
    }
  });

  const handleSendMessage = (text: string) => {
    if (!text.trim() || aiMutation.isPending) return;

    // Append user message
    setMessages(prev => [...prev, {
      sender: 'user',
      content: text,
      timestamp: new Date()
    }]);

    aiMutation.mutate(text);
    setInputValue('');
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputValue);
  };

  const suggestionChips = [
    { label: 'Show sales expected forecast', query: 'What is my sales expected forecast?' },
    { label: 'Analyze overdue invoices aging', query: 'Show overdue invoices summary report' },
    { label: 'Check support ticket statuses', query: 'List support tickets status breakdown' },
    { label: 'CRM Leads overview', query: 'How many active leads are in CRM?' }
  ];

  return (
    <div className="flex flex-col h-[82vh] max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-dark-800">
        <div>
          <h1 className="text-xl font-black text-slate-800 dark:text-white flex items-center space-x-2">
            <Sparkles className="h-5 w-5 text-primary-500 fill-primary-500 animate-pulse" />
            <span>AI Copilot Console</span>
          </h1>
          <p className="text-[11px] text-slate-500 dark:text-dark-400">Natural language reporting and intelligent context recommendations.</p>
        </div>
      </div>

      {/* Suggestion Chips */}
      <div className="flex flex-wrap gap-2 py-1">
        {suggestionChips.map((chip, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(chip.query)}
            disabled={aiMutation.isPending}
            className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-dark-950 dark:hover:bg-dark-800 border border-slate-205 dark:border-dark-800 text-slate-700 dark:text-dark-300 font-semibold rounded-full text-[10px] tracking-wider uppercase transition shadow-2xs cursor-pointer disabled:opacity-50"
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Message History Board */}
      <div className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-dark-950/20 border border-slate-200 dark:border-dark-850 rounded-3xl p-6 space-y-4">
        {messages.map((msg, index) => {
          const isAI = msg.sender === 'ai';
          return (
            <div key={index} className={`flex ${isAI ? 'justify-start' : 'justify-end'}`}>
              <div className={`flex items-start space-x-2 max-w-xl ${isAI ? '' : 'flex-row-reverse space-x-reverse'}`}>
                {/* Avatar Icon */}
                <div className={`p-1.5 rounded-full flex-shrink-0 mt-1 shadow-2xs ${
                  isAI 
                    ? 'bg-primary-50 text-primary-600 dark:bg-primary-950/50 dark:text-primary-400' 
                    : 'bg-slate-100 text-slate-600 dark:bg-dark-800 dark:text-dark-300'
                }`}>
                  {isAI ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                </div>

                {/* Chat content bubble */}
                <div className={`rounded-3xl p-4 text-xs leading-relaxed ${
                  isAI 
                    ? 'bg-white border border-slate-150 text-slate-850 dark:bg-dark-900 dark:border-dark-800 dark:text-dark-200' 
                    : 'btn-blue-45 text-white shadow-md'
                }`}>
                  <div className="whitespace-pre-line font-light">
                    {/* Render bold tags and lists beautifully */}
                    {msg.content}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Loader indicators */}
        {aiMutation.isPending && (
          <div className="flex justify-start">
            <div className="flex items-start space-x-2">
              <div className="p-1.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                <Bot className="h-4 w-4" />
              </div>
              <div className="bg-white border border-slate-150 rounded-3xl p-4 dark:bg-dark-900 dark:border-dark-800 flex items-center space-x-2 text-xs text-slate-400">
                <Loader2 className="h-4.5 w-4.5 animate-spin text-blue-600" />
                <span>Reading tenant statistics...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input panel form */}
      <form onSubmit={handleFormSubmit} className="flex items-center space-x-2 pt-2">
        <input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Ask Copilot: 'Show overdue invoices' or 'What is my forecast?'"
          disabled={aiMutation.isPending}
          className="flex-1 px-4 py-3 border border-slate-205 dark:border-dark-800 rounded-2xl bg-white dark:bg-dark-900 text-slate-900 dark:text-white text-xs outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={aiMutation.isPending || !inputValue.trim()}
          className="btn-tri-45 font-bold py-3 px-5 rounded-2xl text-xs transition shadow flex items-center space-x-1.5 disabled:opacity-50 active:scale-95"
        >
          <Send className="h-3.5 w-3.5" />
          <span>Ask</span>
        </button>
      </form>
    </div>
  );
};
