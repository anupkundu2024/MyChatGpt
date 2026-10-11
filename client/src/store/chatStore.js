import { create } from 'zustand';
import { api, getErrorMessage } from '../lib/api.js';
import { DEFAULT_MODEL } from '../lib/models.js';
import { streamSse } from '../lib/sse.js';
import { toast } from './toastStore.js';

// Same order as the server: pinned first, then most recently active.
const sortConversations = (list) =>
  [...list].sort(
    (a, b) => Number(b.pinned) - Number(a.pinned) || new Date(b.updatedAt) - new Date(a.updatedAt),
  );

const replace = (list, updated) =>
  sortConversations(list.map((c) => (c._id === updated._id ? updated : c)));

const patchConversation = (list, id, fields) =>
  sortConversations(list.map((c) => (c._id === id ? { ...c, ...fields } : c)));

// Ids the client made up before the server confirmed a message ("temp-", "partial-").
export const isLocalId = (id) => /^(temp|partial)-/.test(String(id));

const localMessage = (prefix, role, content) => ({
  _id: `${prefix}-${Date.now()}`,
  role,
  content,
  createdAt: new Date().toISOString(),
});

// The in-flight chat request; only one stream runs at a time.
let activeStream = null; // { controller, conversationId }

const initialState = {
  conversations: [],
  conversationsStatus: 'idle', // 'idle' | 'loading' | 'ready' | 'error'
  activeConversationId: null,
  messages: [],
  messagesStatus: 'idle', // 'idle' | 'loading' | 'ready' | 'error' | 'not_found'
  // While a reply streams: { conversationId, text, phase: 'waiting' | 'thinking' | 'writing' }
  streaming: null,
  draftModel: DEFAULT_MODEL, // model used when the next new chat is created
};

export const useChatStore = create((set, get) => {
  /**
   * Streams one turn (send, edit or regenerate) into the store.
   * `prepare(messages)` returns what to show while the reply streams. The previous list is
   * kept as a snapshot and restored if the server rejects or refuses the turn, mirroring the
   * server, which leaves the conversation untouched in that case.
   */
  async function runTurn({ kind, conversationId, url, body, prepare, optimisticUserId }) {
    if (activeStream) return { ok: false };

    const controller = new AbortController();
    activeStream = { controller, conversationId };
    const snapshot = get().messages;

    set({
      messages: prepare(snapshot),
      streaming: { conversationId, text: '', phase: 'waiting' },
    });

    const isActive = () => get().activeConversationId === conversationId;
    const updateStreaming = (fn) =>
      set((s) => (s.streaming?.conversationId === conversationId ? { streaming: fn(s.streaming) } : {}));
    const restoreSnapshot = () => isActive() && set({ messages: snapshot });

    // Deltas can arrive faster than the screen refreshes; render at most once per frame.
    let pending = '';
    let frame = null;
    const flush = () => {
      frame = null;
      if (!pending) return;
      const chunk = pending;
      pending = '';
      updateStreaming((st) => ({ ...st, text: st.text + chunk, phase: 'writing' }));
    };

    let failed = false;
    try {
      await streamSse(url, body, {
        signal: controller.signal,
        onEvent(event, data) {
          switch (event) {
            case 'user_message':
              if (isActive() && optimisticUserId) {
                set((s) => ({
                  messages: s.messages.map((m) => (m._id === optimisticUserId ? data.message : m)),
                }));
              }
              break;
            case 'status':
              updateStreaming((st) => ({ ...st, phase: st.text ? st.phase : 'thinking' }));
              break;
            case 'delta':
              pending += data.text;
              frame ??= requestAnimationFrame(flush);
              break;
            case 'done':
              cancelAnimationFrame(frame);
              frame = null;
              pending = '';
              set((s) => ({
                streaming: null,
                messages: isActive() && data.message ? [...s.messages, data.message] : s.messages,
                conversations: patchConversation(s.conversations, conversationId, {
                  updatedAt: new Date().toISOString(),
                }),
              }));
              break;
            case 'title':
              set((s) => ({
                conversations: patchConversation(s.conversations, conversationId, { title: data.title }),
              }));
              break;
            case 'refusal':
            case 'error':
              failed = true;
              (event === 'refusal' ? toast.info : toast.error)(data.message);
              restoreSnapshot();
              break;
          }
        },
      });
    } catch (err) {
      if (err.name === 'AbortError') {
        // Stopped by the user. The server keeps the partial answer; a regenerate stopped
        // before any text keeps the previous answer.
        flush();
        const partial = get().streaming?.text;
        if (partial && isActive()) {
          set((s) => ({ messages: [...s.messages, localMessage('partial', 'assistant', partial)] }));
        } else if (kind === 'regenerate') {
          restoreSnapshot();
        }
      } else {
        failed = true;
        toast.error(err.message || 'Something went wrong. Please try again.');
        // The connection may have dropped mid-stream after the server saved something;
        // reload from the server rather than guess.
        if (isActive()) get().reloadMessages();
      }
    } finally {
      cancelAnimationFrame(frame);
      if (activeStream?.controller === controller) activeStream = null;
      set((s) => (s.streaming?.conversationId === conversationId ? { streaming: null } : {}));
    }

    return { ok: !failed };
  }

  return {
    ...initialState,

    async fetchConversations() {
      set({ conversationsStatus: 'loading' });
      try {
        const { data } = await api.get('/conversations');
        set({ conversations: data.conversations, conversationsStatus: 'ready' });
      } catch (err) {
        set({ conversationsStatus: 'error' });
        toast.error(getErrorMessage(err, 'Could not load your chats.'));
      }
    },

    async createConversation(fields = {}) {
      const { data } = await api.post('/conversations', fields);
      set((s) => ({ conversations: sortConversations([data.conversation, ...s.conversations]) }));
      return data.conversation;
    },

    async selectConversation(id) {
      const { activeConversationId, messagesStatus } = get();
      // Already showing it (e.g. the URL just caught up with a chat created by sendMessage).
      if (id && id === activeConversationId && messagesStatus !== 'idle') return;

      set({ activeConversationId: id, messages: [], messagesStatus: id ? 'loading' : 'idle' });
      if (id) await get().reloadMessages();
    },

    async reloadMessages() {
      const id = get().activeConversationId;
      if (!id) return;
      try {
        const { data } = await api.get(`/conversations/${id}/messages`);
        // Ignore the response if the user switched conversations meanwhile.
        if (get().activeConversationId === id) set({ messages: data.messages, messagesStatus: 'ready' });
      } catch (err) {
        if (get().activeConversationId !== id) return;
        if (err.response?.status === 404) set({ messagesStatus: 'not_found' });
        else {
          set({ messagesStatus: 'error' });
          toast.error(getErrorMessage(err, 'Could not load this chat.'));
        }
      }
    },

    // Retry button after a failed load: show the skeleton again while it reloads.
    retryMessages() {
      set({ messagesStatus: 'loading' });
      return get().reloadMessages();
    },

    setDraftModel(model) {
      set({ draftModel: model });
    },

    /**
     * Sends a new message. Creates the conversation first when none is active and reports
     * its id through onConversationCreated so the page can update the URL straight away.
     * Resolves to { ok }; failures are shown as a toast.
     */
    async sendMessage(content, { onConversationCreated } = {}) {
      if (activeStream) return { ok: false };

      let conversationId = get().activeConversationId;
      if (!conversationId) {
        try {
          const conversation = await get().createConversation({ model: get().draftModel });
          conversationId = conversation._id;
        } catch (err) {
          toast.error(getErrorMessage(err));
          return { ok: false };
        }
        set({ activeConversationId: conversationId, messages: [], messagesStatus: 'ready' });
        onConversationCreated?.(conversationId);
      }

      const userMessage = localMessage('temp', 'user', content);
      return runTurn({
        kind: 'send',
        conversationId,
        url: `/api/chat/${conversationId}`,
        body: { content },
        optimisticUserId: userMessage._id,
        prepare: (messages) => [...messages, userMessage],
      });
    },

    // Replaces a user message with new text and drops everything after it.
    editMessage(messageId, content) {
      const conversationId = get().activeConversationId;
      const index = get().messages.findIndex((m) => m._id === messageId);
      if (!conversationId || index === -1) return Promise.resolve({ ok: false });

      const userMessage = localMessage('temp', 'user', content);
      return runTurn({
        kind: 'edit',
        conversationId,
        url: `/api/chat/${conversationId}/edit/${messageId}`,
        body: { content },
        optimisticUserId: userMessage._id,
        prepare: (messages) => [...messages.slice(0, index), userMessage],
      });
    },

    // Answers the last user message again; the old answer disappears while the new one streams.
    regenerate() {
      const conversationId = get().activeConversationId;
      const index = get().messages.findLastIndex((m) => m.role === 'user');
      if (!conversationId || index === -1) return Promise.resolve({ ok: false });

      return runTurn({
        kind: 'regenerate',
        conversationId,
        url: `/api/chat/${conversationId}/regenerate`,
        body: {},
        prepare: (messages) => messages.slice(0, index + 1),
      });
    },

    stopStreaming() {
      activeStream?.controller.abort();
    },

    // Thumbs up/down (or null to clear), applied optimistically.
    async setFeedback(messageId, feedback) {
      const conversationId = get().activeConversationId;
      const previous = get().messages.find((m) => m._id === messageId)?.feedback ?? null;
      const apply = (value) =>
        set((s) => ({
          messages: s.messages.map((m) => (m._id === messageId ? { ...m, feedback: value ?? undefined } : m)),
        }));

      apply(feedback);
      try {
        await api.patch(`/conversations/${conversationId}/messages/${messageId}/feedback`, { feedback });
      } catch (err) {
        apply(previous);
        toast.error(getErrorMessage(err, 'Could not save your feedback.'));
      }
    },

    async setConversationModel(id, model) {
      const { data } = await api.patch(`/conversations/${id}`, { model });
      set((s) => ({ conversations: replace(s.conversations, data.conversation) }));
    },

    async renameConversation(id, title) {
      const { data } = await api.patch(`/conversations/${id}`, { title });
      set((s) => ({ conversations: replace(s.conversations, data.conversation) }));
    },

    async togglePinned(id) {
      const current = get().conversations.find((c) => c._id === id);
      if (!current) return;
      const { data } = await api.patch(`/conversations/${id}`, { pinned: !current.pinned });
      set((s) => ({ conversations: replace(s.conversations, data.conversation) }));
    },

    async deleteConversation(id) {
      if (activeStream?.conversationId === id) activeStream.controller.abort();
      await api.delete(`/conversations/${id}`);
      set((s) => ({
        conversations: s.conversations.filter((c) => c._id !== id),
        ...(s.activeConversationId === id && {
          activeConversationId: null,
          messages: [],
          messagesStatus: 'idle',
        }),
      }));
    },

    reset() {
      activeStream?.controller.abort();
      activeStream = null;
      set(initialState);
    },
  };
});
