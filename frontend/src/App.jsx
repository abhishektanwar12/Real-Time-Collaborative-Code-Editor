import { useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';

const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const collaborationSocket = io(apiBaseUrl, { autoConnect: false });

function App() {
  const [selectedRoomId, setSelectedRoomId] = useState('demo-room');
  const [userName, setUserName] = useState('Guest');
  const [password, setPassword] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [connectedUsers, setConnectedUsers] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatMessageText, setChatMessageText] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [executionOutput, setExecutionOutput] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');
  const [statusMessage, setStatusMessage] = useState('');
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isExecutingCode, setIsExecutingCode] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [connectionError, setConnectionError] = useState('');

  const resolvedRoomId = useMemo(() => selectedRoomId || 'demo-room', [selectedRoomId]);

  useEffect(() => {
    setIsConnecting(true);
    setConnectionError('');
    collaborationSocket.connect();
    collaborationSocket.on('connect', () => {
      setIsConnected(true);
      setIsConnecting(false);
      setConnectionError('');
    });
    collaborationSocket.on('disconnect', () => {
      setIsConnected(false);
      setIsConnecting(false);
      setConnectionError('Unable to connect to the server. Please check your connection and try again.');
    });
    collaborationSocket.on('connect_error', () => {
      setIsConnected(false);
      setIsConnecting(false);
      setConnectionError('Unable to connect to the server. Please check your connection and try again.');
    });
    collaborationSocket.on('room-updated', (roomState) => {
      setConnectedUsers(roomState.users || []);
      setChatMessages(roomState.messages || []);
      if (roomState.code !== undefined) {
        setEditorContent(roomState.code);
      }
    });
    collaborationSocket.on('code-updated', ({ code: nextEditorContent }) => {
      setEditorContent(nextEditorContent);
    });

    return () => {
      collaborationSocket.off('connect');
      collaborationSocket.off('disconnect');
      collaborationSocket.off('room-updated');
      collaborationSocket.off('code-updated');
      collaborationSocket.disconnect();
    };
  }, []);

  const joinRoom = () => {
    const trimmedRoomId = resolvedRoomId.trim();
    if (!trimmedRoomId) {
      setStatusMessage('Please enter a room name before joining.');
      return;
    }

    setIsJoiningRoom(true);
    setStatusMessage(`Joining room ${trimmedRoomId}...`);
    collaborationSocket.emit('join-room', { roomId: trimmedRoomId, userName });
    setTimeout(() => setIsJoiningRoom(false), 600);
  };

  const handleRegisterLogin = async (event) => {
    event.preventDefault();
    setIsAuthenticating(true);
    setStatusMessage('');
    const endpoint = authMode === 'login' ? '/login' : '/register';
    const response = await fetch(`${apiBaseUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: userName, password })
    });

    const responseData = await response.json();
    if (!response.ok) {
      setStatusMessage(responseData.error || 'Authentication failed. Please try again.');
      setIsAuthenticating(false);
      return;
    }

    if (authMode === 'login') {
      setAuthToken(responseData.token);
      setStatusMessage(`Signed in as ${responseData.username}`);
    } else {
      setStatusMessage('Account created. You can now log in.');
    }

    setIsAuthenticating(false);
  };

  const handleCodeChange = (event) => {
    const nextEditorContent = event.target.value;
    setEditorContent(nextEditorContent);
    collaborationSocket.emit('editor-change', { roomId: resolvedRoomId, code: nextEditorContent });
  };

  const sendMessage = () => {
    if (!chatMessageText.trim()) {
      return;
    }

    collaborationSocket.emit('send-message', {
      roomId: resolvedRoomId,
      message: { user: userName, text: chatMessageText.trim() }
    });
    setChatMessageText('');
  };

  const runExecution = async () => {
    setIsExecutingCode(true);
    const response = await fetch(`${apiBaseUrl}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: selectedLanguage, code: editorContent })
    });

    const responseData = await response.json();
    setExecutionOutput(responseData.output || '');
    setIsExecutingCode(false);
  };

  return (
    <div className="app-shell">
      <header className="hero">
        <div className="hero-brand">
          <img src="/logo.svg" alt="Collab Code logo" className="brand-logo" />
          <div>
            <p className="eyebrow">Real-Time Collaborative Code Editor</p>
            <h1>Code together with instant sync, auth, and execution.</h1>
          </div>
        </div>
        <div className={`status ${isConnected ? 'online' : 'offline'}`}>
          {isConnecting ? 'Connecting…' : isConnected ? 'Connected' : 'Offline'}
        </div>
      </header>

      <form className="controls" onSubmit={handleRegisterLogin}>
        <input value={userName} onChange={(event) => setUserName(event.target.value)} placeholder="Username" />
        <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" />
        <select value={authMode} onChange={(event) => setAuthMode(event.target.value)}>
          <option value="login">Login</option>
          <option value="register">Register</option>
        </select>
        <button type="submit" disabled={isAuthenticating}>
          {isAuthenticating ? 'Please wait…' : authMode === 'login' ? 'Sign in' : 'Create account'}
        </button>
      </form>
      {statusMessage ? <p className="status-message">{statusMessage}</p> : null}
      {connectionError ? <p className="status-message error-message">{connectionError}</p> : null}

      <section className="controls">
        <input value={selectedRoomId} onChange={(event) => setSelectedRoomId(event.target.value)} placeholder="Room name" />
        <button onClick={joinRoom} disabled={isJoiningRoom || isConnecting}>
          {isJoiningRoom ? 'Joining…' : 'Join room'}
        </button>
        {authToken ? <span className="token-pill">Authenticated</span> : null}
      </section>

      <section className="workspace">
        <div className="panel editor-panel">
          <div className="editor-toolbar">
            <h2>Collaborative editor</h2>
            <select value={selectedLanguage} onChange={(event) => setSelectedLanguage(event.target.value)}>
              <option value="javascript">JavaScript</option>
            </select>
            <button onClick={runExecution} disabled={isExecutingCode}>
              {isExecutingCode ? 'Running…' : 'Run code'}
            </button>
          </div>
          {!resolvedRoomId ? (
            <div className="empty-state">Join a room to start collaborating.</div>
          ) : (
            <textarea value={editorContent} onChange={handleCodeChange} placeholder="Start typing shared code here..." />
          )}
          <div className="output-panel">
            <h3>Output</h3>
            <pre>{executionOutput}</pre>
          </div>
        </div>

        <div className="panel sidebar">
          <div>
            <h3>Active users</h3>
            {connectedUsers.length ? (
              <ul>
                {connectedUsers.map((user) => (
                  <li key={user.id}>{user.name}</li>
                ))}
              </ul>
            ) : (
              <p className="muted-text">No users in this room yet.</p>
            )}
          </div>

          <div>
            <h3>Live chat</h3>
            <div className="messages">
              {chatMessages.map((message, index) => (
                <div key={`${message.user}-${index}`}>
                  <strong>{message.user}:</strong> {message.text}
                </div>
              ))}
            </div>
            <div className="chat-input">
              <input value={chatMessageText} onChange={(event) => setChatMessageText(event.target.value)} placeholder="Type a message" />
              <button onClick={sendMessage}>Send</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default App;
