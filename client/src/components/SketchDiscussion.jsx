import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { MESSAGE_MAX_LENGTH } from '../constants/sketchLimits';
import { getSessionToken } from '../authStorage';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3000';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || new URL(API_URL).origin;
function mergeMessages(current, incoming) {
  const messages = new Map(current.map((message) => [message._id, message]));
  incoming.forEach((message) => messages.set(message._id, message));

  return [...messages.values()]
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .slice(-100);
}

export default function SketchDiscussion({ sketchId, user }) {
  const socketRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [connection, setConnection] = useState('connecting');
  const [online, setOnline] = useState(0);
  const [error, setError] = useState('');
  const [activity, setActivity] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const token = getSessionToken();
    const socket = io(SOCKET_URL, { auth: token ? { token } : {} });
    let activityTimer;
    socketRef.current = socket;

    const showActivity = (message) => {
      setActivity(message);
      window.clearTimeout(activityTimer);
      activityTimer = window.setTimeout(() => setActivity(''), 4000);
    };
    const handleConnect = () => {
      setConnection('connected');
      setError('');
      socket.emit('sketch:join', { sketchId });
    };
    const handleHistory = ({ messages: history }) => {
      setMessages((current) => mergeMessages(current, history));
    };
    const handleMessage = (message) => {
      setMessages((current) => mergeMessages(current, [message]));
    };
    const handleJoined = ({ name }) => showActivity(`${name} подключился к обсуждению.`);
    const handleLeft = ({ name }) => showActivity(`${name} отключился от обсуждения.`);
    const handlePresence = ({ online: count }) => setOnline(count);
    const handleError = ({ message }) => setError(message);
    const handleDisconnect = () => {
      setConnection('disconnected');
      setSending(false);
    };
    const handleConnectError = (connectionError) => {
      setConnection('disconnected');
      setSending(false);
      setError(`Не удалось подключиться к обсуждению: ${connectionError.message}`);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('sketch:history', handleHistory);
    socket.on('sketch:message', handleMessage);
    socket.on('sketch:user-joined', handleJoined);
    socket.on('sketch:user-left', handleLeft);
    socket.on('sketch:presence', handlePresence);
    socket.on('sketch:error', handleError);

    return () => {
      window.clearTimeout(activityTimer);
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [sketchId]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!user || !draft.trim() || sending || !socketRef.current) return;

    setSending(true);
    setError('');
    socketRef.current.emit('sketch:message', { content: draft }, (response) => {
      setSending(false);
      if (response.error) {
        setError(response.error);
        return;
      }
      setDraft('');
    });
  };

  return (
    <section className="discussion-panel">
      <div className="discussion-heading">
        <h2>Обсуждение</h2>
        <span>
          {connection === 'connected' ? 'В сети' : 'Нет соединения'} · {online} онлайн
        </span>
      </div>

      {activity && <p className="discussion-activity" role="status">{activity}</p>}
      {error && <p className="auth-error" role="alert">{error}</p>}

      <div className="discussion-messages" aria-live="polite">
        {messages.length === 0 ? (
          <p className="discussion-empty">Пока нет сообщений. Начните обсуждение.</p>
        ) : messages.map((message) => (
          <article className="discussion-message" key={message._id}>
            <div className="discussion-message-heading">
              <strong>{message.author}</strong>
              <time dateTime={message.createdAt}>
                {new Date(message.createdAt).toLocaleString('ru-RU')}
              </time>
            </div>
            <p>{message.content}</p>
          </article>
        ))}
      </div>

      {user ? (
        <form className="discussion-form" onSubmit={handleSubmit}>
          <label htmlFor="discussion-message">Ваше сообщение</label>
          <textarea
            id="discussion-message"
            className="form-control"
            rows="3"
            maxLength={MESSAGE_MAX_LENGTH}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Поделитесь мыслью..."
            required
          />
          <div className="discussion-form-footer">
            <span>{draft.length}/{MESSAGE_MAX_LENGTH}</span>
            <button
              className="btn-primary"
              type="submit"
              disabled={connection !== 'connected' || sending || !draft.trim()}
            >
              Отправить
            </button>
          </div>
        </form>
      ) : (
        <p className="discussion-signin">Войдите, чтобы отправлять сообщения.</p>
      )}
    </section>
  );
}
