import { UserButton, useAuth, useUser } from "@clerk/clerk-react";
import { Link } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import Navbar from "./Navbar";

function Chat() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();

  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hello! I'm your FitPlanner assistant. How can I help you today?",
      sender: "bot",
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

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
        "https://noticeably-thorough-aardvark.ngrok-free.app/agent",
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
                <h4 className="mb-0 fw-bold text-dark">FitPlanner Assistant</h4>
                <small className="text-success">
                  <i className="fas fa-circle me-1"></i> Active now
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
                    <div className="message-text mb-2">{message.text}</div>
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
                    placeholder="Ask about nutrition, workouts, meal plans, or anything fitness related..."
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
        body {
          background-color: #f8f9fa;
        }
        
        .desktop-chat-container {
          height: 100vh;
          padding-top: 70px;
          display: flex;
          flex-direction: column;
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        }
        
        .chat-header {
          flex-shrink: 0;
          min-height: 80px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        
        .messages-area {
          flex-grow: 1;
          overflow-y: auto;
          background-image: 
            radial-gradient(circle at 25px 25px, rgba(26, 147, 111, 0.02) 2px, transparent 0),
            radial-gradient(circle at 75px 75px, rgba(17, 75, 95, 0.02) 2px, transparent 0);
          background-size: 100px 100px;
        }
        
        .messages-wrapper {
          max-width: 1200px;
          margin: 0 auto;
        }
        
        .chat-input-area {
          flex-shrink: 0;
          box-shadow: 0 -2px 10px rgba(0,0,0,0.05);
          background: white;
        }
        
        .avatar-bot,
        .avatar-user,
        .avatar-bot-message {
          width: 45px;
          height: 45px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        
        .message-bubble {
          max-width: 70%;
          border-radius: 20px;
          position: relative;
          transition: all 0.2s ease;
        }
        
        .message-bubble:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important;
        }
        
        .bot-message {
          border: 1px solid #e9ecef;
          border-bottom-left-radius: 8px !important;
        }
        
        .user-message {
          background: linear-gradient(135deg, #1a936f 0%, #114b5f 100%) !important;
          border-bottom-right-radius: 8px !important;
        }
        
        .input-group-custom {
          position: relative;
        }
        
        .chat-input {
          border: 2px solid #e9ecef;
          border-radius: 15px;
          padding: 15px 60px 15px 20px;
          font-size: 16px;
          resize: none;
          transition: all 0.2s ease;
          background: #fff;
        }
        
        .chat-input:focus {
          border-color: #1a936f;
          box-shadow: 0 0 0 0.2rem rgba(26, 147, 111, 0.15);
          background: #fff;
        }
        
        .input-actions {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          display: flex;
          gap: 5px;
        }
        
        .input-actions .btn {
          width: 35px;
          height: 35px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          background: #f8f9fa;
          color: #6c757d;
          transition: all 0.2s ease;
        }
        
        .input-actions .btn:hover {
          background: #e9ecef;
          color: #495057;
        }
        
        .chat-actions .btn {
          border-radius: 8px;
        }
        
        .typing-indicator {
          color: #6c757d;
        }
        
        .typing-indicator .dots {
          display: inline-flex;
          align-items: center;
        }
        
        .typing-indicator .dot {
          height: 8px;
          width: 8px;
          margin: 0 2px;
          background-color: #1a936f;
          border-radius: 50%;
          display: inline-block;
          animation: typing 1.4s infinite ease-in-out both;
        }
        
        .typing-indicator .dot:nth-child(1) {
          animation-delay: -0.32s;
        }
        
        .typing-indicator .dot:nth-child(2) {
          animation-delay: -0.16s;
        }
        
        @keyframes typing {
          0%, 80%, 100% {
            transform: scale(0.8);
            opacity: 0.5;
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
          background: #f1f1f1;
          border-radius: 10px;
        }
        
        .messages-area::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 10px;
        }
        
        .messages-area::-webkit-scrollbar-thumb:hover {
          background: #1a936f;
        }
        
        /* Desktop responsiveness */
        @media (min-width: 1200px) {
          .message-bubble {
            max-width: 60%;
          }
          
          .messages-wrapper {
            padding: 0 2rem;
          }
        }
        
        @media (min-width: 1400px) {
          .message-bubble {
            max-width: 50%;
          }
          
          .messages-wrapper {
            padding: 0 4rem;
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
