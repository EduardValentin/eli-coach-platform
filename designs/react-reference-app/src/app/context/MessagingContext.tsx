import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface Message {
  id: string;
  sender: 'coach' | 'client' | 'system';
  text: string;
  time: string;
  status: 'sent' | 'read';
  systemType?: 'plan-update' | 'checkin-scheduled' | 'checkin-rescheduled' | 'checkin-cancelled';
}

export interface Conversation {
  id: string;
  name: string;
  initial: string;
  avatar: string | null;
  status: 'Active' | 'Stale';
  unread: number;
  lastMessage: string;
  time: string;
}

interface MessagingState {
  conversations: Conversation[];
  getMessages: (clientId: string) => Message[];
  sendMessage: (clientId: string, text: string, sender: 'coach' | 'client') => void;
  addSystemMessage: (clientId: string, text: string, systemType: 'plan-update' | 'checkin-scheduled') => void;
}

const INITIAL_CONVERSATIONS: Conversation[] = [
  { id: 'c1', name: 'Jane Doe', initial: 'J', avatar: 'https://i.pravatar.cc/150?img=47', status: 'Active', unread: 2, lastMessage: 'Thanks Coach! Will do.', time: '10:30 AM' },
  { id: 'c2', name: 'Jessica Alba', initial: 'J', avatar: 'https://i.pravatar.cc/150?img=45', status: 'Active', unread: 0, lastMessage: 'Did my macros look okay?', time: 'Yesterday' },
  { id: 'c3', name: 'Emma Stone', initial: 'E', avatar: null, status: 'Stale', unread: 0, lastMessage: 'See you next week.', time: 'Oct 12' },
];

const INITIAL_MESSAGES: Record<string, Message[]> = {
  c1: [
    { id: 'm1', sender: 'coach', text: "Hey Jane, how are you feeling after yesterday's leg day?", time: '09:00 AM', status: 'read' },
    { id: 'm2', sender: 'client', text: 'Honestly, so sore! But in a good way.', time: '09:15 AM', status: 'read' },
    { id: 'm3', sender: 'coach', text: "That's what we like to hear. Make sure you're hitting that protein goal today.", time: '09:20 AM', status: 'read' },
    { id: 'm4', sender: 'client', text: 'Will do! By the way, can I swap out the lunges for leg press on Friday?', time: '10:25 AM', status: 'read' },
    { id: 'm5', sender: 'client', text: 'Thanks Coach! Will do.', time: '10:30 AM', status: 'read' },
  ],
  c2: [
    { id: 'm6', sender: 'client', text: 'Did my macros look okay?', time: '3:00 PM', status: 'read' },
  ],
  c3: [
    { id: 'm7', sender: 'coach', text: 'See you next week.', time: '2:00 PM', status: 'read' },
  ],
};

const MessagingContext = createContext<MessagingState | undefined>(undefined);

export function MessagingProvider({ children }: { children: ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>(INITIAL_CONVERSATIONS);
  const [messagesByClient, setMessagesByClient] = useState<Record<string, Message[]>>(INITIAL_MESSAGES);

  const getMessages = useCallback((clientId: string): Message[] => {
    return messagesByClient[clientId] || [];
  }, [messagesByClient]);

  const sendMessage = useCallback((clientId: string, text: string, sender: 'coach' | 'client') => {
    const msg: Message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      sender,
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent',
    };
    setMessagesByClient(prev => ({
      ...prev,
      [clientId]: [...(prev[clientId] || []), msg],
    }));
    // Update conversation last message
    setConversations(prev => prev.map(c =>
      c.id === clientId ? { ...c, lastMessage: text, time: 'Just now' } : c
    ));
  }, []);

  const addSystemMessage = useCallback((clientId: string, text: string, systemType: 'plan-update' | 'checkin-scheduled' | 'checkin-rescheduled' | 'checkin-cancelled') => {
    const msg: Message = {
      id: `sys-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      sender: 'system',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'read',
      systemType,
    };
    setMessagesByClient(prev => ({
      ...prev,
      [clientId]: [...(prev[clientId] || []), msg],
    }));
    setConversations(prev => prev.map(c =>
      c.id === clientId ? { ...c, lastMessage: text, time: 'Just now' } : c
    ));
  }, []);

  return (
    <MessagingContext.Provider value={{ conversations, getMessages, sendMessage, addSystemMessage }}>
      {children}
    </MessagingContext.Provider>
  );
}

export function useMessaging() {
  const context = useContext(MessagingContext);
  if (context === undefined) {
    throw new Error('useMessaging must be used within a MessagingProvider');
  }
  return context;
}
