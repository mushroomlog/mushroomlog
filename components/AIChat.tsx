import React, { useState, useRef, useEffect } from 'react';
import { askMycologist } from '../services/geminiService';
import { Send, Bot, User, Loader2 } from 'lucide-react';

interface Message {
  role: 'user' | 'ai';
  content: string;
}

const AIChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', content: "Hello! I'm your AI Mycologist assistant. Ask me anything about mushroom cultivation, contamination identification, or environmental conditions." }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      const response = await askMycologist(userMsg);
      setMessages(prev => [...prev, { role: 'ai', content: response }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', content: "I'm having trouble connecting to the mycelial network (API Error). Please check your connection or API key." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-white rounded-xl border border-earth-200 shadow-sm overflow-hidden">
      <div className="bg-earth-50 p-4 border-b border-earth-100 flex items-center gap-3">
        <div className="w-10 h-10 bg-earth-200 rounded-full flex items-center justify-center">
          <Bot className="text-earth-700" size={24} />
        </div>
        <div>
          <h2 className="font-bold text-earth-900">Mycologist Assistant</h2>
          <p className="text-xs text-earth-500">Powered by Gemini AI</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div 
              className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                msg.role === 'user' 
                  ? 'bg-earth-600 text-white rounded-br-none' 
                  : 'bg-earth-100 text-earth-900 rounded-bl-none'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
             <div className="bg-earth-50 text-earth-500 p-3 rounded-2xl rounded-bl-none flex items-center gap-2">
               <Loader2 className="animate-spin" size={16} />
               <span className="text-xs">Thinking...</span>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-earth-100 bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about humidity, substrates, etc..."
            className="flex-1 p-3 border border-earth-200 rounded-lg focus:ring-2 focus:ring-earth-500 outline-none"
            disabled={isLoading}
          />
          <button 
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="bg-earth-600 text-white p-3 rounded-lg hover:bg-earth-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIChat;