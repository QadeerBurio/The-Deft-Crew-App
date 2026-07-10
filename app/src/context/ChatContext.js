// context/ChatContext.js
import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import aiService from '../services/aiService';

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [offlineQueue, setOfflineQueue] = useState([]);

  const activeStreamRef = useRef(null);

  // Subscribe to network connectivity changes
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = !!state.isConnected && !!state.isInternetReachable;
      setIsOnline(online);
      
      if (online && offlineQueue.length > 0) {
        flushOfflineQueue();
      }
    });
    return () => unsubscribe();
  }, [offlineQueue]);

  // Load local offline sync queue on launch
  useEffect(() => {
    AsyncStorage.getItem('chat_offline_queue').then((stored) => {
      if (stored) {
        setOfflineQueue(JSON.parse(stored));
      }
    }).catch(console.error);
  }, []);

  const saveOfflineQueue = async (queue) => {
    try {
      setOfflineQueue(queue);
      await AsyncStorage.setItem('chat_offline_queue', JSON.stringify(queue));
    } catch (e) {
      console.error('Error saving offline queue:', e);
    }
  };

  const loadSessions = useCallback(async (searchQuery = '') => {
    try {
      const res = await aiService.getSessions(searchQuery);
      if (res.success) {
        setSessions(res.data);
      }
    } catch (err) {
      console.error('loadSessions error:', err.message);
    }
  }, []);

  const loadSessionDetails = useCallback(async (sessionId) => {
    if (!sessionId) return;
    setIsLoading(true);
    try {
      setActiveSessionId(sessionId);
      
      const [historyRes, suggestionsRes] = await Promise.all([
        aiService.getHistory(sessionId),
        aiService.getSuggestions(sessionId),
      ]);

      if (historyRes.success) {
        setMessages(historyRes.data);
      }
      if (suggestionsRes.success) {
        setSuggestions(suggestionsRes.data);
      }
    } catch (err) {
      console.error('loadSessionDetails error:', err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const startNewSession = useCallback(() => {
    setActiveSessionId(null);
    setMessages([]);
    setSuggestions([
      'Latest Brand Discounts',
      'Find Student Internships',
      'ATS Resume Templates',
      'Nearby Campus Events',
    ]);
  }, []);

  const queueOfflineMessage = async (messageText, category) => {
    const tempMessage = {
      _id: `temp-${Date.now()}`,
      sessionId: activeSessionId || 'new-session',
      role: 'user',
      message: messageText,
      createdAt: new Date(),
      isOffline: true,
    };

    setMessages((prev) => [...prev, tempMessage]);

    const updatedQueue = [...offlineQueue, { messageText, sessionId: activeSessionId, category }];
    await saveOfflineQueue(updatedQueue);

    setMessages((prev) => [
      ...prev,
      {
        _id: `warn-${Date.now()}`,
        role: 'assistant',
        message: '⚠️ Connection lost. Your message has been queued and will automatically send when you are back online.',
        createdAt: new Date(),
      },
    ]);
  };

  const flushOfflineQueue = async () => {
    const queueToProcess = [...offlineQueue];
    await saveOfflineQueue([]); // Clear queue to avoid loops
    for (const item of queueToProcess) {
      await sendMessageFlow(item.messageText, item.category);
    }
  };

  const sendMessageFlow = async (messageText, category) => {
    if (!messageText || messageText.trim() === '') return;

    if (activeStreamRef.current) {
      activeStreamRef.current.abort();
    }

    if (!isOnline) {
      await queueOfflineMessage(messageText, category);
      return;
    }

    setIsLoading(true);
    setSuggestions([]);

    const tempUserMsg = {
      _id: `user-${Date.now()}`,
      role: 'user',
      message: messageText,
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);

    let assistantMsgId = `assistant-${Date.now()}`;
    let accumulatedReply = '';

    const handleToken = (token) => {
      setIsLoading(false);
      setIsStreaming(true);
      accumulatedReply += token;

      setMessages((prev) => {
        const list = [...prev];
        const existingIdx = list.findIndex((m) => m._id === assistantMsgId);

        if (existingIdx !== -1) {
          list[existingIdx] = {
            ...list[existingIdx],
            message: accumulatedReply,
          };
        } else {
          list.push({
            _id: assistantMsgId,
            role: 'assistant',
            message: accumulatedReply,
            createdAt: new Date(),
          });
        }
        return list;
      });
    };

    const handleComplete = async () => {
      setIsStreaming(false);
      setIsLoading(false);
      activeStreamRef.current = null;

      try {
        const suggsRes = await aiService.getSuggestions(activeSessionId);
        if (suggsRes.success) {
          setSuggestions(suggsRes.data);
        }
        await loadSessions();
      } catch (err) {
        console.error('Post stream suggestions error:', err.message);
      }
    };

    const handleError = (err) => {
      console.error('Stream processing error:', err?.message || err || 'Unknown stream error');
      setIsStreaming(false);
      setIsLoading(false);
      activeStreamRef.current = null;

      setMessages((prev) => [
        ...prev,
        {
          _id: `error-${Date.now()}`,
          role: 'assistant',
          message: '❌ Failed to receive completion stream from server. Please retry.',
          createdAt: new Date(),
          isError: true,
        },
      ]);
    };

    activeStreamRef.current = aiService.streamMessage(
      messageText,
      activeSessionId || '',
      category,
      handleToken,
      handleComplete,
      handleError
    );
  };

  const deleteSession = async (sessionId) => {
    try {
      const res = await aiService.deleteSession(sessionId);
      if (res.success) {
        setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
        if (activeSessionId === sessionId) {
          startNewSession();
        }
      }
    } catch (err) {
      console.error('deleteSession error:', err.message);
    }
  };

  const regenerateLastResponse = () => {
    const userMsgs = messages.filter((m) => m.role === 'user');
    if (userMsgs.length === 0) return;

    const lastUserQuery = userMsgs[userMsgs.length - 1].message;
    
    setMessages((prev) => {
      const list = [...prev];
      const lastIdx = list.map(m => m.role).lastIndexOf('assistant');
      if (lastIdx !== -1) {
        list.splice(lastIdx, 1);
      }
      return list;
    });

    sendMessageFlow(lastUserQuery);
  };

  return (
    <ChatContext.Provider
      value={{
        sessions,
        activeSessionId,
        messages,
        suggestions,
        isLoading,
        isStreaming,
        isOnline,
        loadSessions,
        loadSessionDetails,
        startNewSession,
        sendMessage: sendMessageFlow,
        deleteSession,
        regenerateLastResponse,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
export default ChatProvider;
