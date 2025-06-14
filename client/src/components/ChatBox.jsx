import React, { useState, useEffect, useRef } from 'react';
import './ChatBox.css';

const ChatBox = ({ socket, playerName }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (socket) {
            socket.on("chat_message", (chatData) => {
                setMessages(prev => [...prev, chatData]);
            });
        }
        return () => {
            if (socket) {
                socket.off("chat_message");
            }
        };
    }, [socket]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (newMessage.trim() && socket) {
            socket.emit("chat_message", newMessage.trim());
            setNewMessage('');
        }
    };

    return (
        <div className="chat-box">
            <div className="chat-header">
                <h3>Game Chat</h3>
            </div>
            <div className="messages-container">
                {messages.map((msg, index) => (
                    <div 
                        key={index} 
                        className={`message ${msg.sender === playerName ? 'own-message' : ''}`}
                    >
                        <div className="message-header">
                            <span className="sender">{msg.sender}</span>
                            <span className="timestamp">{msg.timestamp}</span>
                        </div>
                        <div className="message-content">{msg.message}</div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSubmit} className="message-input-form">
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    maxLength={200}
                />
                <button type="submit">Send</button>
            </form>
        </div>
    );
};

export default ChatBox; 