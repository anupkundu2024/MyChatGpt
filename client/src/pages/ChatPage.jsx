import { useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router';
import { MessageSquare, RotateCw } from 'lucide-react';
import ChatHeader from '../components/chat/ChatHeader.jsx';
import Composer from '../components/chat/Composer.jsx';
import EmptyState from '../components/chat/EmptyState.jsx';
import MessageList from '../components/chat/MessageList.jsx';
import Button from '../components/ui/Button.jsx';
import { MessageListSkeleton } from '../components/ui/Skeleton.jsx';
import { getErrorMessage } from '../lib/api.js';
import { useAuthStore } from '../store/authStore.js';
import { useChatStore } from '../store/chatStore.js';
import { toast } from '../store/toastStore.js';

// Serves both "/" (new chat) and "/c/:conversationId".
export default function ChatPage() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const composerRef = useRef(null);

  const userName = useAuthStore((s) => s.user?.name.split(' ')[0]);
  const activeId = useChatStore((s) => s.activeConversationId);
  const messages = useChatStore((s) => s.messages);
  const messagesStatus = useChatStore((s) => s.messagesStatus);
  const streaming = useChatStore((s) => s.streaming);
  const draftModel = useChatStore((s) => s.draftModel);
  const conversation = useChatStore((s) => s.conversations.find((c) => c._id === conversationId));
  const {
    selectConversation,
    sendMessage,
    editMessage,
    regenerate,
    setFeedback,
    stopStreaming,
    setDraftModel,
    setConversationModel,
    retryMessages,
  } = useChatStore.getState();

  useEffect(() => {
    selectConversation(conversationId ?? null);
  }, [conversationId, selectConversation]);

  // Unknown or someone else's conversation id in the URL.
  useEffect(() => {
    if (messagesStatus === 'not_found') navigate('/', { replace: true });
  }, [messagesStatus, navigate]);

  // Keep the tab title in sync with the conversation.
  useEffect(() => {
    document.title = conversation?.title ?? 'ChatGPT Clone';
  }, [conversation?.title]);

  const streamingHere = streaming && streaming.conversationId === activeId ? streaming : null;
  const busyElsewhere = Boolean(streaming) && !streamingHere;

  async function handleSend(text) {
    const result = await sendMessage(text, {
      onConversationCreated: (id) => navigate(`/c/${id}`),
    });
    // Give the user their text back so they can retry or edit it.
    if (!result.ok) composerRef.current?.restore(text);
  }

  // New chat: remember the choice for when it's created. Existing chat: save it on the
  // conversation; the next reply uses it.
  function handleModelChange(model) {
    if (!conversationId) return setDraftModel(model);
    setConversationModel(conversationId, model).catch((err) =>
      toast.error(getErrorMessage(err, 'Could not change the model.')),
    );
  }

  const composer = (
    <Composer
      ref={composerRef}
      autoFocus
      onSend={handleSend}
      onStop={stopStreaming}
      isStreaming={Boolean(streamingHere)}
      sendDisabled={busyElsewhere}
    />
  );

  const footnote = (
    <p className="px-2 pt-2 pb-3 text-center text-xs text-muted">
      Gemini can make mistakes. Check important info.
    </p>
  );

  const header = (
    <ChatHeader model={conversation?.model ?? draftModel} onModelChange={handleModelChange} />
  );

  if (!conversationId && !messages.length) {
    return (
      <div className="flex h-full flex-col">
        {header}
        <EmptyState
          userName={userName}
          disabled={busyElsewhere}
          onSuggestion={handleSend}
          composer={composer}
        />
        {footnote}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {header}
      {messagesStatus === 'loading' ? (
        <MessageListSkeleton />
      ) : messagesStatus === 'error' && !messages.length ? (
        <CenteredNotice
          title="Couldn't load this chat"
          body="Check your connection, then try again."
          action={
            <Button size="sm" variant="secondary" onClick={retryMessages}>
              <RotateCw className="size-4" aria-hidden="true" />
              Try again
            </Button>
          }
        />
      ) : !messages.length && !streamingHere ? (
        <CenteredNotice
          icon={MessageSquare}
          title="No messages yet"
          body="Send a message below to start the conversation."
        />
      ) : (
        <MessageList
          conversationId={conversationId}
          messages={messages}
          streaming={streamingHere}
          busy={Boolean(streaming)}
          onEdit={editMessage}
          onRegenerate={regenerate}
          onFeedback={setFeedback}
        />
      )}
      <div className="px-3 sm:px-6">
        <div className="mx-auto w-full max-w-3xl">
          {composer}
          {footnote}
        </div>
      </div>
    </div>
  );
}

// Fills the transcript area when there is nothing to show (failed load, empty chat).
function CenteredNotice({ icon: Icon, title, body, action }) {
  return (
    <div role="status" className="flex flex-1 flex-col items-center justify-center gap-2 px-4 text-center">
      {Icon && <Icon className="mb-1 size-8 text-muted" aria-hidden="true" />}
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="max-w-sm text-[15px] text-muted">{body}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
