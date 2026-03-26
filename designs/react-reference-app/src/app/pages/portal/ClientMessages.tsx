import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Send, Paperclip, Check, CheckCheck, Dumbbell, Calendar } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';

const MOCK_MESSAGES = [
  { id: 'm1', sender: 'coach', text: 'Hey Jane, how are you feeling after yesterday\'s leg day?', time: '09:00 AM', status: 'read' },
  { id: 'm2', sender: 'client', text: 'Honestly, so sore! But in a good way.', time: '09:15 AM', status: 'read' },
  { id: 'm3', sender: 'coach', text: 'That\'s what we like to hear. Make sure you\'re hitting that protein goal today.', time: '09:20 AM', status: 'read' },
  { id: 'm4', sender: 'client', text: 'Will do! By the way, can I swap out the lunges for leg press on Friday?', time: '10:25 AM', status: 'read' },
  { id: 'm5', sender: 'client', text: 'Thanks Coach! Will do.', time: '10:30 AM', status: 'read' },
];

export function ClientMessages() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState(MOCK_MESSAGES);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { addNotification } = useNotifications();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    const newMsg = {
      id: Math.random().toString(),
      sender: 'client',
      text: message,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent'
    };

    setMessages([...messages, newMsg]);
    setMessage('');

    // Simulate reply after 3 seconds to demonstrate notification
    setTimeout(() => {
      const replyMsg = {
        id: Math.random().toString(),
        sender: 'coach',
        text: 'Sounds like a great plan. Keep up the good work!',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'read'
      };
      setMessages(prev => [...prev, replyMsg]);
      
      addNotification({
        title: 'Coach Eli',
        message: replyMsg.text,
        link: '/portal/messages'
      });
    }, 3000);
  };

  return (
    <div className="w-full h-[calc(100vh-6rem)] lg:h-[calc(100vh-8rem)] flex bg-white rounded-3xl shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-neutral-100/50 overflow-hidden">
      
      {/* Sidebar - Coach Info (Visible on Desktop) */}
      <div className="hidden lg:flex w-80 flex-col border-r border-neutral-100 bg-[#FAFAFA]">
        <div className="p-8 flex flex-col items-center border-b border-neutral-100 bg-white">
          <div className="w-20 h-20 rounded-2xl bg-[#121212] text-white flex items-center justify-center shadow-lg mb-4">
            <Dumbbell size={32} className="transform -rotate-45" />
          </div>
          <h2 className="font-serif text-xl font-semibold text-[#121212]">Coach Eli</h2>
          <p className="text-sm text-[#C81D6B] font-medium mt-1">Lead Trainer</p>
          <p className="text-xs text-neutral-500 text-center mt-4">
            Usually responds within a few hours.
          </p>
        </div>

        <div className="p-6">
          <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-4">Quick Links</h3>
          <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-neutral-100 transition-colors text-sm text-[#121212] font-medium">
            <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center">
              <Calendar size={14} className="text-neutral-600" />
            </div>
            Book Ad-hoc Call
          </button>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col h-full bg-[#FAFAFA]">
        {/* Header */}
        <div className="h-20 px-6 border-b border-neutral-100 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="lg:hidden w-10 h-10 rounded-xl bg-[#121212] text-white flex items-center justify-center shrink-0">
              <Dumbbell size={20} className="transform -rotate-45" />
            </div>
            <div>
              <h3 className="font-semibold text-[#121212]">Chat with Coach</h3>
              <p className="text-xs text-neutral-500 font-medium">Online</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">
          <div className="text-center">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest bg-neutral-100 px-3 py-1 rounded-full">
              Today
            </span>
          </div>

          {messages.map((msg) => {
            const isClient = msg.sender === 'client';
            return (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={msg.id}
                className={`flex flex-col ${isClient ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-end gap-2 max-w-[85%] lg:max-w-[70%]">
                  {!isClient && (
                    <div className="w-6 h-6 rounded-md bg-[#121212] text-white flex items-center justify-center shrink-0 mb-1 shadow-sm">
                      <Dumbbell size={12} className="transform -rotate-45" />
                    </div>
                  )}
                  
                  <div className={`p-4 rounded-2xl text-sm ${
                    isClient 
                      ? 'bg-[#C81D6B] text-white rounded-br-sm shadow-md' 
                      : 'bg-white border border-neutral-100 shadow-sm text-[#121212] rounded-bl-sm'
                  }`}>
                    {msg.text}
                  </div>
                </div>
                
                <div className="flex items-center gap-1 mt-1 px-8">
                  <span className="text-[10px] text-neutral-400 font-medium">
                    {msg.time}
                  </span>
                  {isClient && (
                    <span className="text-neutral-400">
                      {msg.status === 'read' ? <CheckCheck size={12} className="text-blue-500" /> : <Check size={12} />}
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 bg-white border-t border-neutral-100 shrink-0">
          <form onSubmit={handleSend} className="flex items-end gap-3">
            <button type="button" className="h-[56px] w-[56px] flex items-center justify-center text-neutral-400 hover:text-[#121212] transition-colors rounded-2xl hover:bg-neutral-50 shrink-0">
              <Paperclip size={22} />
            </button>
            <div className="flex-1 bg-neutral-50 rounded-2xl border border-neutral-200 focus-within:border-[#C81D6B] focus-within:ring-1 focus-within:ring-[#C81D6B] transition-all overflow-hidden shadow-sm">
              <textarea 
                rows={1}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Message Coach Eli..."
                className="w-full bg-transparent p-4 outline-none text-sm resize-none max-h-32 min-h-[56px]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(e);
                  }
                }}
              />
            </div>
            <button 
              type="submit"
              disabled={!message.trim()}
              className="h-[56px] w-[56px] flex items-center justify-center bg-[#121212] text-white rounded-2xl hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0 shadow-md"
            >
              <Send size={20} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}