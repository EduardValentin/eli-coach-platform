import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Search, Send, Paperclip, Check, CheckCheck, MoreVertical, Phone, User } from 'lucide-react';
import { useSearchParams, Link } from 'react-router';
import { useNotifications } from '../../context/NotificationContext';

const MOCK_CONVERSATIONS = [
  { id: 'c1', name: 'Jane Doe', initial: 'J', status: 'Active', unread: 2, lastMessage: 'Thanks Coach! Will do.', time: '10:30 AM' },
  { id: 'c2', name: 'Jessica Alba', initial: 'J', status: 'Active', unread: 0, lastMessage: 'Did my macros look okay?', time: 'Yesterday' },
  { id: 'c3', name: 'Emma Stone', initial: 'E', status: 'Stale', unread: 0, lastMessage: 'See you next week.', time: 'Oct 12' },
];

const MOCK_MESSAGES = [
  { id: 'm1', sender: 'coach', text: 'Hey Jane, how are you feeling after yesterday\'s leg day?', time: '09:00 AM', status: 'read' },
  { id: 'm2', sender: 'client', text: 'Honestly, so sore! But in a good way.', time: '09:15 AM', status: 'read' },
  { id: 'm3', sender: 'coach', text: 'That\'s what we like to hear. Make sure you\'re hitting that protein goal today.', time: '09:20 AM', status: 'read' },
  { id: 'm4', sender: 'client', text: 'Will do! By the way, can I swap out the lunges for leg press on Friday?', time: '10:25 AM', status: 'read' },
  { id: 'm5', sender: 'client', text: 'Thanks Coach! Will do.', time: '10:30 AM', status: 'read' },
];

export function CoachMessages() {
  const [searchParams] = useSearchParams();
  const initialClientId = searchParams.get('client') || MOCK_CONVERSATIONS[0].id;
  
  const [activeClient, setActiveClient] = useState(initialClientId);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState(MOCK_MESSAGES);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { addNotification } = useNotifications();

  const activeConversation = MOCK_CONVERSATIONS.find(c => c.id === activeClient);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeClient]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    const newMsg = {
      id: Math.random().toString(),
      sender: 'coach',
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
        sender: 'client',
        text: 'Got it, thanks for letting me know!',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'read'
      };
      setMessages(prev => [...prev, replyMsg]);
      
      addNotification({
        title: activeConversation?.name || 'Client',
        message: replyMsg.text,
        link: `/coach/messages?client=${activeClient}`
      });
    }, 3000);
  };

  const filteredConversations = MOCK_CONVERSATIONS.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full h-[calc(100vh-6rem)] lg:h-[calc(100vh-8rem)] flex bg-white rounded-3xl shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-neutral-100/50 overflow-hidden">
      
      {/* Sidebar */}
      <div className="w-full md:w-80 border-r border-neutral-100 flex flex-col hidden md:flex shrink-0">
        <div className="p-6 border-b border-neutral-100">
          <h2 className="font-serif text-2xl text-[#121212] mb-4">Messages</h2>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input 
              type="text" 
              placeholder="Search clients..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-[#C81D6B] focus:bg-white transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredConversations.map(conv => (
            <button
              key={conv.id}
              onClick={() => setActiveClient(conv.id)}
              className={`w-full text-left p-4 flex items-start gap-3 border-b border-neutral-50 transition-colors ${
                activeClient === conv.id ? 'bg-[#C81D6B]/5' : 'hover:bg-neutral-50'
              }`}
            >
              <div className="relative shrink-0">
                <div className="w-12 h-12 rounded-full bg-white border border-neutral-200 flex items-center justify-center font-serif text-[#121212] font-semibold">
                  {conv.initial}
                </div>
                {conv.status === 'Active' && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <p className={`text-sm truncate ${activeClient === conv.id ? 'font-bold text-[#121212]' : 'font-semibold text-neutral-700'}`}>
                    {conv.name}
                  </p>
                  <p className="text-[10px] text-neutral-400 shrink-0 ml-2">{conv.time}</p>
                </div>
                <p className={`text-xs truncate ${conv.unread > 0 ? 'font-semibold text-[#121212]' : 'text-neutral-500'}`}>
                  {conv.lastMessage}
                </p>
              </div>
              {conv.unread > 0 && (
                <div className="w-5 h-5 rounded-full bg-[#C81D6B] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                  {conv.unread}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col h-full bg-[#FAFAFA]">
        {activeConversation ? (
          <>
            {/* Header */}
            <div className="h-20 px-6 border-b border-neutral-100 bg-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center font-serif text-[#121212] font-semibold">
                  {activeConversation.initial}
                </div>
                <div>
                  <h3 className="font-semibold text-[#121212]">{activeConversation.name}</h3>
                  <p className="text-xs text-green-600 font-medium">Active • Week 4 of 12</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-neutral-400">
                <button className="p-2 hover:text-[#121212] hover:bg-neutral-100 rounded-full transition-colors">
                  <Phone size={18} />
                </button>
                <Link to={`/coach/clients/${activeConversation.id}`} className="p-2 hover:text-[#121212] hover:bg-neutral-100 rounded-full transition-colors flex items-center justify-center" title="View Profile">
                  <User size={18} />
                </Link>
                <button className="p-2 hover:text-[#121212] hover:bg-neutral-100 rounded-full transition-colors">
                  <MoreVertical size={18} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {messages.map((msg) => {
                const isCoach = msg.sender === 'coach';
                return (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={msg.id}
                    className={`flex flex-col ${isCoach ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-end gap-2 max-w-[80%]">
                      {!isCoach && (
                        <div className="w-6 h-6 rounded-full bg-white border border-neutral-200 flex items-center justify-center font-serif text-xs shrink-0 mb-1">
                          {activeConversation.initial}
                        </div>
                      )}
                      
                      <div className={`p-4 rounded-2xl text-sm ${
                        isCoach 
                          ? 'bg-[#121212] text-white rounded-br-sm' 
                          : 'bg-white border border-neutral-100 shadow-sm text-[#121212] rounded-bl-sm'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 mt-1 px-8">
                      <span className="text-[10px] text-neutral-400 font-medium">
                        {msg.time}
                      </span>
                      {isCoach && (
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
                <div className="flex-1 bg-neutral-50 rounded-2xl border border-neutral-200 focus-within:border-[#C81D6B] focus-within:ring-1 focus-within:ring-[#C81D6B] transition-all overflow-hidden">
                  <textarea 
                    rows={1}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type your message..."
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
                  className="h-[56px] w-[56px] flex items-center justify-center bg-[#C81D6B] text-white rounded-2xl hover:bg-[#a31556] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0 shadow-md"
                >
                  <Send size={20} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-neutral-400 text-sm">
            Select a conversation to start messaging
          </div>
        )}
      </div>
    </div>
  );
}