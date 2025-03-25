'use client';

import React, { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import ReactMarkdown from 'react-markdown';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    isStreaming?: boolean;
}

interface Chat {
    id: string;
    title: string;
    messages: Message[];
    createdAt: Date;
    updatedAt: Date;
}

export default function ChatInterface() {
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [chats, setChats] = useState<Chat[]>([]);
    const [currentChatId, setCurrentChatId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Load chats from localStorage on initial render
    useEffect(() => {
        const savedChats = localStorage.getItem('chats');
        if (savedChats) {
            try {
                const parsedChats = JSON.parse(savedChats).map((chat: any) => ({
                    ...chat,
                    createdAt: new Date(chat.createdAt),
                    updatedAt: new Date(chat.updatedAt),
                    messages: chat.messages.map((msg: any) => ({
                        ...msg,
                        timestamp: new Date(msg.timestamp)
                    }))
                }));
                setChats(parsedChats);

                // Set current chat to most recently updated
                if (parsedChats.length > 0) {
                    const sortedChats = [...parsedChats].sort(
                        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
                    );
                    setCurrentChatId(sortedChats[0].id);
                }
            } catch (error) {
                console.error('Error parsing saved chats:', error);
                localStorage.removeItem('chats');
            }
        }
    }, []);

    // Save chats to localStorage whenever they change
    useEffect(() => {
        if (chats.length > 0) {
            localStorage.setItem('chats', JSON.stringify(chats));
        }
    }, [chats]);

    // Scroll to bottom of chat when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chats, currentChatId]);

    const createNewChat = () => {
        const newChatId = uuidv4();
        const newChat: Chat = {
            id: newChatId,
            title: 'New Chat',
            messages: [],
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        setChats(prev => [...prev, newChat]);
        setCurrentChatId(newChatId);
    };

    // If no chats exist, create one
    useEffect(() => {
        if (chats.length === 0) {
            createNewChat();
        }
    }, [chats]);

    const currentChat = chats.find(chat => chat.id === currentChatId);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || !currentChatId) return;

        const userMessage: Message = {
            id: uuidv4(),
            role: 'user',
            content: input,
            timestamp: new Date(),
        };

        // Initialize an empty streaming message
        const streamingMessageId = uuidv4();
        const streamingMessage: Message = {
            id: streamingMessageId,
            role: 'assistant',
            content: '',
            timestamp: new Date(),
            isStreaming: true,
        };

        // Update chat with user message and empty assistant message
        setChats(prevChats =>
            prevChats.map(chat =>
                chat.id === currentChatId
                    ? {
                        ...chat,
                        messages: [...chat.messages, userMessage, streamingMessage],
                        updatedAt: new Date(),
                        // Update title for new chats with first user message
                        title: chat.title === 'New Chat'
                            ? input.slice(0, 30) + (input.length > 30 ? '...' : '')
                            : chat.title
                    }
                    : chat
            )
        );

        setInput('');
        setIsLoading(true);

        try {
            // Get all messages for context (excluding the streaming message)
            const messages = currentChat
                ? [...currentChat.messages, userMessage].filter(msg => !msg.isStreaming).map(msg => ({
                    role: msg.role,
                    content: msg.content
                }))
                : [{ role: userMessage.role, content: userMessage.content }];

            // Use EventSource for SSE
            const eventSource = new EventSource('/api/chat', {
                withCredentials: true,
            });

            // Send the message data using a POST request
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ messages }),
            });

            if (!response.ok) {
                throw new Error('Failed to start streaming response');
            }

            // Listen for incoming message chunks
            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('Stream reader not available');
            }

            const decoder = new TextDecoder();
            let isComplete = false;

            // Process the streaming response
            while (!isComplete) {
                const { done, value } = await reader.read();

                if (done) {
                    isComplete = true;
                    break;
                }

                const text = decoder.decode(value);
                const lines = text.split('\n\n').filter(line => line.trim() !== '');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));

                            if (data.token) {
                                // Update the streaming message with new content
                                setChats(prevChats =>
                                    prevChats.map(chat =>
                                        chat.id === currentChatId
                                            ? {
                                                ...chat,
                                                messages: chat.messages.map(msg =>
                                                    msg.id === streamingMessageId
                                                        ? { ...msg, content: msg.content + data.token }
                                                        : msg
                                                )
                                            }
                                            : chat
                                    )
                                );
                            }

                            if (data.done) {
                                // Mark the message as no longer streaming
                                setChats(prevChats =>
                                    prevChats.map(chat =>
                                        chat.id === currentChatId
                                            ? {
                                                ...chat,
                                                messages: chat.messages.map(msg =>
                                                    msg.id === streamingMessageId
                                                        ? { ...msg, isStreaming: false }
                                                        : msg
                                                )
                                            }
                                            : chat
                                    )
                                );
                                isComplete = true;
                            }

                            if (data.error) {
                                throw new Error(data.error);
                            }
                        } catch (error) {
                            console.error('Error parsing SSE data:', error);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error:', error);

            // Update the streaming message with an error
            setChats(prevChats =>
                prevChats.map(chat =>
                    chat.id === currentChatId
                        ? {
                            ...chat,
                            messages: chat.messages.map(msg =>
                                msg.id === streamingMessageId
                                    ? {
                                        ...msg,
                                        content: 'Sorry, I encountered an error while processing your request.',
                                        isStreaming: false
                                    }
                                    : msg
                            )
                        }
                        : chat
                )
            );
        } finally {
            setIsLoading(false);
        }
    };

    const deleteChat = (chatId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setChats(prevChats => prevChats.filter(chat => chat.id !== chatId));

        // If we deleted the current chat, select another one
        if (chatId === currentChatId) {
            const remainingChats = chats.filter(chat => chat.id !== chatId);
            if (remainingChats.length > 0) {
                setCurrentChatId(remainingChats[0].id);
            } else {
                createNewChat();
            }
        }
    };

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Sidebar */}
            <div className="w-64 bg-gray-800 text-white p-4 flex flex-col">
                <button onClick={createNewChat} className="mb-4 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded">
                    New Chat
                </button>
                <div className="flex-1 overflow-y-auto">
                    {chats.map(chat => (
                        <div key={chat.id} className={`p-2 mb-2 rounded cursor-pointer flex justify-between items-center ${chat.id === currentChatId ? 'bg-gray-700' : 'hover:bg-gray-700'}`} onClick={() => setCurrentChatId(chat.id)}>
                            <div className="truncate flex-1">{chat.title}</div>
                            <button onClick={(e) => deleteChat(chat.id, e)} className="text-gray-400 hover:text-red-500">
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            </div>
            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col">
                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-4 bg-white">
                    {currentChat?.messages.map(message => (
                        <div key={message.id} className={`mb-4 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                            <div className={`inline-block max-w-3xl p-3 rounded-lg ${message.role === 'user' ? 'bg-blue-100 text-blue-900' : 'bg-gray-100 text-gray-900'}`}>
                                <div className="font-bold mb-1">
                                    {message.role === 'user' ? 'You' : 'AI'}
                                    {message.isStreaming && <span className="ml-2 animate-pulse">...</span>}
                                </div>
                                <div className="prose max-w-none text-left">
                                    {isCode(message.content) ? (
                                        <pre>
                                            <code className={`language-${guessLanguage(message.content)}`}>
                                                {message.content}
                                            </code>
                                        </pre>
                                    ) : (
                                        <ReactMarkdown>{message.content}</ReactMarkdown>
                                    )}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                    {new Date(message.timestamp).toLocaleTimeString()}
                                </div>
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
                {/* Input Form with improved visibility */}
                <div className="p-4 border-t bg-white shadow-md">
                    <form onSubmit={handleSubmit} className="flex">
                        <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type your message..." className="flex-1 p-3 border-2 border-gray-300 rounded-l focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-base font-medium bg-white" disabled={isLoading} />
                        <button type="submit" disabled={isLoading || !input.trim()} className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-r font-medium">
                            {isLoading ? 'Sending...' : 'Send'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );

    // Helper function to determine if a message is code
    function isCode(content: string) {
        return content.includes('`') || /<code/.test(content);
    }

    // Helper function to guess the language of the code snippet
    function guessLanguage(content: string) {
        // Simple heuristic based on common language markers
        if (content.includes('<')) return 'html';
        if (content.includes('{')) return 'javascript';
        if (content.includes('[')) return 'json';
        return 'plaintext'; // Default to plaintext if no clear indicators
    }
}