import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { fetchContacts, removeContact, restoreContact } from '../api';
import { MESSAGE_MAX_LENGTH } from '../constants/sketchLimits';
import UserAvatar from './UserAvatar';
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

export default function MessagesPage({ user }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedContactId = searchParams.get('userId');
  const [contacts, setContacts] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loadedRequestKey, setLoadedRequestKey] = useState(null);
  const [contactsErrorState, setContactsErrorState] = useState({ key: null, message: '' });
  const [removeError, setRemoveError] = useState('');
  const [removingContact, setRemovingContact] = useState(false);
  const requestKey = `${user.id}:${requestedContactId || ''}`;
  const loading = loadedRequestKey !== requestKey;
  const contactsError = contactsErrorState.key === requestKey ? contactsErrorState.message : '';

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const loadContacts = async () => {
      try {
        if (requestedContactId) {
          await restoreContact(requestedContactId);
        }
        const { data } = await fetchContacts({ signal: controller.signal });
        if (!active) return;
        setContacts(data);
        const requestedContact = data.find((contact) => String(contact.id) === requestedContactId);
        setSelectedId(requestedContact?.id ?? data[0]?.id ?? null);
        setContactsErrorState({ key: requestKey, message: '' });
      } catch (requestError) {
        if (active && !controller.signal.aborted) {
          setContactsErrorState({
            key: requestKey,
            message: requestError.response?.data?.error || 'Не удалось загрузить список пользователей.'
          });
        }
      } finally {
        if (active) setLoadedRequestKey(requestKey);
      }
    };

    loadContacts();

    return () => {
      active = false;
      controller.abort();
    };
  }, [requestKey, requestedContactId]);

  const selectedContactId = requestedContactId ? Number(requestedContactId) : selectedId;
  const selectedContact = contacts.find((contact) => contact.id === selectedContactId);

  const handleSelectContact = (contactId) => {
    setSelectedId(contactId);
    setSearchParams({ userId: String(contactId) }, { replace: true });
  };

  const handleRemoveContact = async (contact) => {
    setRemovingContact(true);
    setRemoveError('');
    try {
      await removeContact(contact.id);
      const remainingContacts = contacts.filter((item) => item.id !== contact.id);
      setContacts(remainingContacts);
      if (selectedId === contact.id) {
        const nextContactId = remainingContacts[0]?.id ?? null;
        setSelectedId(nextContactId);
        setSearchParams(nextContactId ? { userId: String(nextContactId) } : {}, { replace: true });
      }
    } catch (requestError) {
      setRemoveError(requestError.response?.data?.error || 'Не удалось удалить собеседника из списка.');
    } finally {
      setRemovingContact(false);
    }
  };

  return (
    <main className="messages-page">
      <header className="messages-page-heading">
        <h1>Личные сообщения</h1>
        <p>Приватные переписки с другими обитателями чердака.</p>
      </header>

      <div className="messages-layout">
        <aside className="contacts-panel">
          <h2>Собеседники</h2>
          {removeError && <p className="form-error" role="alert">{removeError}</p>}
          {loading ? (
            <p className="field-hint">Загружаем пользователей...</p>
          ) : contactsError ? (
            <p className="form-error" role="alert">{contactsError}</p>
          ) : contacts.length === 0 ? (
            <p className="field-hint">Пока нет других пользователей.</p>
          ) : (
            <div className="contacts-list">
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  className={`contact-entry ${selectedId === contact.id ? 'active' : ''}`}
                >
                  <button
                    type="button"
                    className="contact-button"
                    onClick={() => handleSelectContact(contact.id)}
                    aria-pressed={selectedId === contact.id}
                  >
                    <UserAvatar user={contact} />
                    <span>{contact.name}</span>
                  </button>
                  <button
                    type="button"
                    className="contact-remove-button"
                    onClick={() => handleRemoveContact(contact)}
                    disabled={removingContact}
                    aria-label={`Удалить ${contact.name} из собеседников`}
                    title="Убрать из списка собеседников"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </aside>

        <section className="direct-chat-panel" aria-label="Личная переписка">
          {loading ? (
            <p className="field-hint">Открываем переписку...</p>
          ) : contactsError ? (
            <p className="form-error" role="alert">{contactsError}</p>
          ) : selectedContact ? (
            <DirectConversation key={`${user.id}:${selectedContact.id}`} contact={selectedContact} user={user} />
          ) : (
            <p className="field-hint">Выберите собеседника, чтобы открыть переписку.</p>
          )}
        </section>
      </div>
    </main>
  );
}

function DirectConversation({ contact, user }) {
  const socketRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const token = getSessionToken();
    const socket = io(SOCKET_URL, { auth: token ? { token } : {} });
    socketRef.current = socket;

    const handleConnect = () => {
      setConnected(true);
      setError('');
      socket.emit('direct:join', { recipientId: contact.id });
    };
    const handleHistory = ({ recipientId, messages: history }) => {
      if (recipientId === contact.id) {
        setMessages((current) => mergeMessages(current, history));
      }
    };
    const handleMessage = (message) => {
      setMessages((current) => mergeMessages(current, [message]));
    };
    const handleError = ({ message }) => setError(message);
    const handleDisconnect = () => {
      setConnected(false);
      setSending(false);
    };
    const handleConnectError = (connectionError) => {
      setConnected(false);
      setSending(false);
      setError(`Не удалось подключиться: ${connectionError.message}`);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('direct:history', handleHistory);
    socket.on('direct:message', handleMessage);
    socket.on('direct:error', handleError);

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [contact.id]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content || content.length > MESSAGE_MAX_LENGTH || !socketRef.current || sending) return;

    setSending(true);
    setError('');
    socketRef.current.emit('direct:message', { recipientId: contact.id, content }, (response) => {
      setSending(false);
      if (!response || response.error) {
        setError(response?.error || 'Сервер не подтвердил отправку сообщения.');
        return;
      }
      setDraft('');
    });
  };

  return (
    <>
      <header className="direct-chat-heading">
        <UserAvatar user={contact} />
        <div>
          <h2><Link to={`/users/${contact.id}`} className="direct-profile-link">{contact.name}</Link></h2>
          <span className={connected ? 'connection-online' : 'connection-offline'}>
            {connected ? 'В сети' : 'Нет соединения'}
          </span>
        </div>
      </header>

      {error && <p className="form-error" role="alert">{error}</p>}

      <div className="direct-chat-messages" aria-live="polite">
        {messages.length === 0 ? (
          <p className="field-hint">Сообщений пока нет. Напишите первым.</p>
        ) : messages.map((message) => (
          <article
            className={`direct-message ${message.senderId === user.id ? 'own' : ''}`}
            key={message._id}
          >
            <div className="direct-message-meta">
              <strong>{message.author}</strong>
              <time dateTime={message.createdAt}>
                {new Date(message.createdAt).toLocaleString('ru-RU')}
              </time>
            </div>
            <p>{message.content}</p>
          </article>
        ))}
      </div>

      <form className="direct-message-form" onSubmit={handleSubmit}>
        <label htmlFor="direct-message-input">Сообщение</label>
        <textarea
          id="direct-message-input"
          className="form-control"
          rows="3"
          value={draft}
          maxLength={MESSAGE_MAX_LENGTH}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Напишите сообщение..."
          required
        />
        <div className="discussion-form-footer">
          <span>{draft.length}/{MESSAGE_MAX_LENGTH}</span>
          <button
            className="btn-primary"
            type="submit"
            disabled={!connected || sending || !draft.trim()}
          >
            Отправить
          </button>
        </div>
      </form>
    </>
  );
}
