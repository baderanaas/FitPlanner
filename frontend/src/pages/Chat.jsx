import { UserButton, useAuth, useUser } from "@clerk/clerk-react";
import { Link } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import Navbar from "./Navbar";

function Chat() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();

  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "👋 **Welcome to FitPlanner!**\n\nI'm your personal fitness assistant, here to help you with:\n\n• **Nutrition guidance** - Calculate BMI, body fat %, ideal weight\n• **Meal planning** - Get personalized meal plans based on your goals\n• **Macro tracking** - Calculate your daily macronutrient needs\n• **Food information** - Detailed nutrition facts for any food\n\nHow can I assist you today?",
      sender: "bot",
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef(null);

  const suggestionChips = [
    { icon: "🎯", text: "Calculate my BMI", prompt: "I want to calculate my BMI" },
    { icon: "🍽️", text: "Create meal plan", prompt: "Create a meal plan for me" },
    { icon: "💪", text: "Track macros", prompt: "Help me calculate my daily macros" },
    { icon: "🥗", text: "Food nutrition", prompt: "Get nutrition info for a food" },
  ];

  const handleSuggestionClick = (prompt) => {
    setInputMessage(prompt);
    setShowSuggestions(false);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessageToAPI = async (message) => {
    try {
      const token = await getToken();

      if (!token) {
        throw new Error("No authentication token available");
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/agent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            message: message,
            timestamp: new Date().toISOString(),
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      return (
        data.final_answer ||
        data.response ||
        data.message ||
        "Sorry, I couldn't process that request."
      );
    } catch (error) {
      console.error("Error sending message to API:", error);
      return "Sorry, I'm having trouble connecting right now. Please try again later.";
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!inputMessage.trim() || isLoading) return;

    if (!isSignedIn) {
      alert("Please sign in to use the chat feature.");
      return;
    }

    const userMessage = {
      id: Date.now(),
      text: inputMessage,
      sender: "user",
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);
    setShowSuggestions(false);

    try {
      const botResponse = await sendMessageToAPI(inputMessage);

      const botMessage = {
        id: Date.now() + 1,
        text: botResponse,
        sender: "bot",
        timestamp: new Date().toLocaleTimeString(),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        text: "Sorry, something went wrong. Please try again.",
        sender: "bot",
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  // Show loading state while Clerk is initializing
  if (!isLoaded) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ height: "100vh" }}
      >
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  // Redirect to sign in if not authenticated
  if (!isSignedIn) {
    return (
      <div className="container mt-5">
        <div className="row justify-content-center">
          <div className="col-md-6 text-center">
            <h2>Authentication Required</h2>
            <p className="text-muted mb-4">
              Please sign in to access the chat feature.
            </p>
            <Link to="/login" className="btn btn-primary">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Top Navigation */}
      <Navbar />
      {/* Main Chat Interface */}
      <div className="desktop-chat-container">
        {/* Chat Header */}
        <div className="chat-header bg-white border-bottom px-4 py-3">
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center">
              <div className="avatar-bot bg-success d-flex align-items-center justify-content-center me-3">
                <i className="fas fa-robot text-white"></i>
              </div>
              <div>
                <h4 className="mb-0 fw-bold text-dark" style={{fontSize: '1.2rem', letterSpacing: '-0.01em'}}>FitPlanner Assistant</h4>
                <small className="text-success d-flex align-items-center" style={{fontSize: '0.85rem', fontWeight: '500'}}>
                  <span className="status-indicator me-2"></span> Active now
                </small>
              </div>
            </div>
            <div className="d-flex align-items-center">
              <div className="me-4">
                <small className="text-muted d-block">Session started</small>
                <small className="text-muted">
                  {new Date().toLocaleDateString()}
                </small>
              </div>
              <div className="chat-actions">
                <button className="btn btn-outline-secondary btn-sm me-2">
                  <i className="fas fa-download"></i> Export
                </button>
                <button className="btn btn-outline-danger btn-sm">
                  <i className="fas fa-trash"></i> Clear
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="messages-area flex-grow-1 p-4">
          <div className="messages-wrapper">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`message-row d-flex mb-4 ${
                  message.sender === "user"
                    ? "justify-content-end"
                    : "justify-content-start"
                }`}
              >
                {message.sender === "bot" && (
                  <div className="avatar-bot-message bg-success d-flex align-items-center justify-content-center me-3">
                    <i className="fas fa-robot text-white"></i>
                  </div>
                )}

                <div
                  className={`message-bubble p-4 ${
                    message.sender === "user"
                      ? "bg-primary text-white user-message"
                      : "bg-white text-dark bot-message shadow-sm"
                  }`}
                >
                  <div className="message-content">
                    <div className="message-text mb-2">
                      {message.sender === "bot" ? (
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => <p className="mb-3">{children}</p>,
                            strong: ({ children }) => <strong className="fw-bold">{children}</strong>,
                            ul: ({ children }) => <ul className="ps-3 mb-2">{children}</ul>,
                            ol: ({ children }) => <ol className="ps-3 mb-2">{children}</ol>,
                            li: ({ children }) => <li className="mb-1">{children}</li>,
                            h1: ({ children }) => <h5 className="fw-bold mt-2 mb-2">{children}</h5>,
                            h2: ({ children }) => <h6 className="fw-bold mt-2 mb-2">{children}</h6>,
                            h3: ({ children }) => <h6 className="fw-semibold mt-2 mb-1">{children}</h6>,
                            code: ({ inline, children }) =>
                              inline ? (
                                <code className="bg-light px-1 rounded">{children}</code>
                              ) : (
                                <pre className="bg-light p-2 rounded">
                                  <code>{children}</code>
                                </pre>
                              ),
                          }}
                        >
                          {message.text}
                        </ReactMarkdown>
                      ) : (
                        message.text
                      )}
                    </div>
                    <small
                      className={`message-timestamp ${
                        message.sender === "user"
                          ? "text-white-50"
                          : "text-muted"
                      }`}
                    >
                      {message.timestamp}
                    </small>
                  </div>
                </div>

                {message.sender === "user" && (
                  <div className="avatar-user bg-primary d-flex align-items-center justify-content-center ms-3">
                    <i className="fas fa-user text-white"></i>
                  </div>
                )}
              </div>
            ))}

            {showSuggestions && messages.length === 1 && (
              <div className="suggestion-chips-container">
                <div className="d-flex flex-wrap gap-2 justify-content-center mt-4 mb-3">
                  {suggestionChips.map((chip, index) => (
                    <button
                      key={index}
                      className="suggestion-chip"
                      onClick={() => handleSuggestionClick(chip.prompt)}
                      disabled={isLoading}
                    >
                      <span className="chip-icon">{chip.icon}</span>
                      <span className="chip-text">{chip.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isLoading && (
              <div className="message-row d-flex mb-4 justify-content-start">
                <div className="avatar-bot-message bg-success d-flex align-items-center justify-content-center me-3">
                  <i className="fas fa-robot text-white"></i>
                </div>
                <div className="message-bubble p-4 bg-white bot-message shadow-sm">
                  <div className="typing-indicator d-flex align-items-center">
                    <span className="me-2">Thinking</span>
                    <div className="dots">
                      <span className="dot"></span>
                      <span className="dot"></span>
                      <span className="dot"></span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="chat-input-area bg-white border-top p-4">
          <div className="container-fluid">
            <form
              onSubmit={handleSendMessage}
              className="d-flex align-items-end"
            >
              <div className="flex-grow-1 me-3">
                <div className="input-group-custom">
                  <textarea
                    className="form-control chat-input"
                    rows="3"
                    placeholder="💬 Ask about nutrition, meal plans, or fitness guidance..."
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isLoading}
                  />
                  <div className="input-actions">
                    <button
                      type="button"
                      className="btn btn-sm btn-light"
                      onClick={() => setInputMessage("")}
                      title="Clear input"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-light"
                      title="Attach file"
                    >
                      <i className="fas fa-paperclip"></i>
                    </button>
                  </div>
                </div>
                <div className="mt-2 d-flex justify-content-between align-items-center">
                  <small className="text-muted">
                    Press Enter to send • Shift+Enter for new line
                  </small>
                  <small className="text-muted">
                    {inputMessage.length}/2000 characters
                  </small>
                </div>
              </div>
              <button
                type="submit"
                className="btn btn-success btn-lg px-4"
                disabled={!inputMessage.trim() || isLoading}
              >
                {isLoading ? (
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                  >
                    <span className="visually-hidden">Loading...</span>
                  </span>
                ) : (
                  <i className="fas fa-paper-plane me-2"></i>
                )}
                Send
              </button>
            </form>
          </div>
        </div>
      </div>

      <style>{`
        html, body {
          background-color: #f0f2f5;
          overflow-x: hidden;
          margin: 0;
          padding: 0;
        }

        .desktop-chat-container {
          height: calc(100vh - 70px);
          margin-top: 70px;
          display: flex;
          flex-direction: column;
          background: linear-gradient(135deg, #e8f5f1 0%, #f0f2f5 50%, #e3f2fd 100%);
          position: relative;
          overflow: hidden;
          width: 100%;
          max-width: 100vw;
        }

        .desktop-chat-container::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image:
            radial-gradient(circle at 20% 30%, rgba(26, 147, 111, 0.03) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, rgba(17, 75, 95, 0.03) 0%, transparent 50%);
          pointer-events: none;
        }

        .chat-header {
          flex-shrink: 0;
          height: 85px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          backdrop-filter: blur(10px);
          background: rgba(255, 255, 255, 0.95);
          border-bottom: 2px solid rgba(26, 147, 111, 0.1);
          z-index: 10;
        }

        .messages-area {
          flex: 1 1 auto;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 2rem 1rem;
          scroll-behavior: smooth;
          width: 100%;
          min-height: 0;
        }

        .messages-wrapper {
          max-width: 100%;
          width: 100%;
          margin: 0 auto;
          padding: 0 2rem;
        }

        .message-row {
          width: 100%;
        }

        .chat-input-area {
          flex-shrink: 0;
          flex-basis: auto;
          box-shadow: 0 -4px 16px rgba(0,0,0,0.08);
          background: linear-gradient(to bottom, rgba(255,255,255,0.98), rgba(255,255,255,1));
          backdrop-filter: blur(10px);
          padding: 1.5rem 1rem !important;
          border-top: 2px solid rgba(26, 147, 111, 0.1);
          z-index: 10;
        }

        .avatar-bot,
        .avatar-user,
        .avatar-bot-message {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          flex-shrink: 0;
          box-shadow: 0 4px 8px rgba(0,0,0,0.15);
          transition: all 0.3s ease;
        }

        .avatar-bot,
        .avatar-bot-message {
          background: linear-gradient(135deg, #1a936f 0%, #15a37f 100%);
          border: 3px solid white;
        }

        .avatar-user {
          background: linear-gradient(135deg, #0d6efd 0%, #0a58ca 100%);
          border: 3px solid white;
        }

        .avatar-bot:hover,
        .avatar-user:hover,
        .avatar-bot-message:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 12px rgba(0,0,0,0.2);
        }

        .message-bubble {
          max-width: 85%;
          min-width: 0;
          border-radius: 20px;
          position: relative;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          animation: messageSlideIn 0.4s ease-out;
          word-wrap: break-word;
          overflow-wrap: break-word;
          word-break: break-word;
        }

        @keyframes messageSlideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .message-bubble:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0,0,0,0.12) !important;
        }

        .bot-message {
          border: 1px solid #e3e8ef;
          border-bottom-left-radius: 8px !important;
          background: linear-gradient(135deg, #ffffff 0%, #f8fffe 100%);
          box-shadow: 0 2px 8px rgba(26, 147, 111, 0.08);
        }

        .bot-message:hover {
          border-color: #d0e8df;
          box-shadow: 0 8px 20px rgba(26, 147, 111, 0.15) !important;
        }

        .user-message {
          background: linear-gradient(135deg, #1a936f 0%, #16805f 100%) !important;
          border-bottom-right-radius: 8px !important;
          box-shadow: 0 4px 12px rgba(26, 147, 111, 0.25);
        }
        
        .input-group-custom {
          position: relative;
        }

        .chat-input {
          border: 2px solid #e3e8ef;
          border-radius: 18px;
          padding: 16px 70px 16px 24px;
          font-size: 15px;
          resize: none;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          background: #fff;
          line-height: 1.6;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }

        .chat-input:focus {
          border-color: #1a936f;
          box-shadow: 0 4px 16px rgba(26, 147, 111, 0.15), 0 0 0 4px rgba(26, 147, 111, 0.08);
          background: #fff;
          outline: none;
        }

        .chat-input::placeholder {
          color: #98a2b3;
        }

        .input-actions {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          display: flex;
          gap: 6px;
        }

        .input-actions .btn {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          background: #f0f2f5;
          color: #667085;
          transition: all 0.3s ease;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }

        .input-actions .btn:hover {
          background: #1a936f;
          color: white;
          transform: scale(1.1);
          box-shadow: 0 4px 8px rgba(26, 147, 111, 0.3);
        }

        .chat-actions .btn {
          border-radius: 10px;
          transition: all 0.3s ease;
          font-weight: 500;
        }

        .chat-actions .btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        
        .btn-success {
          background: linear-gradient(135deg, #1a936f 0%, #15a37f 100%);
          border: none;
          border-radius: 14px;
          padding: 12px 28px;
          font-weight: 600;
          font-size: 15px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 12px rgba(26, 147, 111, 0.3);
        }

        .btn-success:hover:not(:disabled) {
          background: linear-gradient(135deg, #16805f 0%, #138a6f 100%);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(26, 147, 111, 0.4);
        }

        .btn-success:active:not(:disabled) {
          transform: translateY(0);
          box-shadow: 0 2px 8px rgba(26, 147, 111, 0.3);
        }

        .btn-success:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .typing-indicator {
          color: #667085;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .typing-indicator .dots {
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .typing-indicator .dot {
          height: 10px;
          width: 10px;
          background: linear-gradient(135deg, #1a936f 0%, #15a37f 100%);
          border-radius: 50%;
          display: inline-block;
          animation: typing 1.4s infinite ease-in-out both;
          box-shadow: 0 2px 4px rgba(26, 147, 111, 0.3);
        }

        .typing-indicator .dot:nth-child(1) {
          animation-delay: -0.32s;
        }

        .typing-indicator .dot:nth-child(2) {
          animation-delay: -0.16s;
        }

        @keyframes typing {
          0%, 80%, 100% {
            transform: scale(0.7);
            opacity: 0.4;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
        }

        .messages-area::-webkit-scrollbar {
          width: 8px;
        }

        .messages-area::-webkit-scrollbar-track {
          background: transparent;
        }

        .messages-area::-webkit-scrollbar-thumb {
          background: rgba(26, 147, 111, 0.3);
          border-radius: 10px;
          border: 2px solid transparent;
        }

        .messages-area::-webkit-scrollbar-thumb:hover {
          background: rgba(26, 147, 111, 0.6);
        }

        .messages-area::-webkit-scrollbar-corner {
          background: transparent;
        }

        /* Markdown formatting */
        .message-content {
          max-width: 100%;
          overflow: hidden;
        }

        .message-text {
          font-size: 15px;
          line-height: 1.7;
          color: #1f2937;
          max-width: 100%;
          overflow-wrap: break-word;
          word-wrap: break-word;
          word-break: break-word;
        }

        .message-text p {
          margin-bottom: 0.75rem;
        }

        .message-text p:last-child {
          margin-bottom: 0 !important;
        }

        .message-text ul,
        .message-text ol {
          margin-left: 1.5rem;
          margin-bottom: 1rem;
          padding-left: 0.5rem;
          list-style: none;
        }

        .message-text ul li {
          margin-bottom: 0.75rem;
          padding-left: 1.75rem;
          position: relative;
        }

        .message-text ul li::before {
          content: '✓';
          position: absolute;
          left: 0;
          color: #1a936f;
          font-weight: 700;
          font-size: 1.1em;
          width: 1.2rem;
          height: 1.2rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .message-text ol li {
          margin-bottom: 0.75rem;
          padding-left: 0.5rem;
        }

        .message-text ol li::marker {
          color: #1a936f;
          font-weight: 700;
        }

        .message-text strong {
          color: #1a936f;
          font-weight: 700;
          text-shadow: 0 0 1px rgba(26, 147, 111, 0.1);
        }

        .message-text code {
          font-size: 0.88em;
          color: #d63384;
          background: rgba(214, 51, 132, 0.08);
          padding: 2px 6px;
          border-radius: 4px;
          font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        }

        .message-text pre {
          margin: 0.75rem 0;
          overflow-x: auto;
          background: #f8fafc;
          border: 1px solid #e3e8ef;
          border-radius: 8px;
          max-width: 100%;
          white-space: pre-wrap;
          word-wrap: break-word;
        }

        .message-text pre code {
          background: transparent;
          padding: 0;
          color: #334155;
          white-space: pre-wrap;
          word-break: break-all;
        }

        .message-text ul,
        .message-text ol {
          max-width: 100%;
        }

        .message-text h5,
        .message-text h6 {
          color: #1a936f;
          margin-top: 1.25rem;
          margin-bottom: 0.75rem;
          font-weight: 700;
          letter-spacing: -0.01em;
        }

        .message-timestamp {
          font-size: 12px;
          font-weight: 500;
          opacity: 0.8;
        }

        /* Status indicator pulse */
        .status-indicator {
          width: 8px;
          height: 8px;
          background: #1a936f;
          border-radius: 50%;
          position: relative;
          display: inline-block;
        }

        .status-indicator::before {
          content: '';
          position: absolute;
          width: 100%;
          height: 100%;
          background: #1a936f;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.8);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 0;
          }
        }

        /* Enhanced spinner */
        .spinner-border {
          animation: spinner-border 0.75s linear infinite;
        }

        /* Smooth fade-in for new messages */
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        /* Better button styles for header actions */
        .btn-outline-secondary {
          border-color: #d0d5dd;
          color: #667085;
          font-weight: 500;
          transition: all 0.3s ease;
        }

        .btn-outline-secondary:hover {
          background: #f9fafb;
          border-color: #1a936f;
          color: #1a936f;
        }

        .btn-outline-danger {
          border-color: #fda29b;
          color: #d92d20;
          font-weight: 500;
          transition: all 0.3s ease;
        }

        .btn-outline-danger:hover {
          background: #fef3f2;
          border-color: #d92d20;
          color: #d92d20;
        }

        /* Suggestion chips */
        .suggestion-chips-container {
          animation: fadeSlideUp 0.5s ease-out;
        }

        @keyframes fadeSlideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .suggestion-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          background: white;
          border: 2px solid #e3e8ef;
          border-radius: 50px;
          font-size: 14px;
          font-weight: 600;
          color: #1f2937;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }

        .suggestion-chip:hover:not(:disabled) {
          background: linear-gradient(135deg, #e8f5f1 0%, #d0e8df 100%);
          border-color: #1a936f;
          color: #1a936f;
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(26, 147, 111, 0.2);
        }

        .suggestion-chip:active:not(:disabled) {
          transform: translateY(0);
          box-shadow: 0 2px 8px rgba(26, 147, 111, 0.15);
        }

        .suggestion-chip:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .chip-icon {
          font-size: 18px;
          line-height: 1;
        }

        .chip-text {
          line-height: 1;
        }

        /* Desktop responsiveness */
        @media (min-width: 768px) {
          .messages-wrapper {
            padding: 0 3rem;
          }
        }

        @media (min-width: 1200px) {
          .message-bubble {
            max-width: 80%;
          }

          .messages-wrapper {
            padding: 0 4rem;
          }
        }

        @media (min-width: 1600px) {
          .message-bubble {
            max-width: 75%;
          }

          .messages-wrapper {
            padding: 0 6rem;
          }
        }

        @media (min-width: 1920px) {
          .message-bubble {
            max-width: 70%;
          }

          .messages-wrapper {
            padding: 0 8rem;
          }
        }
        
        /* Hide mobile-specific elements on desktop */
        @media (min-width: 992px) {
          .navbar-toggler {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}

export { Chat };
