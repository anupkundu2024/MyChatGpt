import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { PanelLeftClose, Search, SquarePen } from 'lucide-react';
import { useChatStore } from '../../store/chatStore.js';
import { useUiStore } from '../../store/uiStore.js';
import { groupConversations } from '../../lib/dates.js';
import Logo from '../ui/Logo.jsx';
import { ConversationListSkeleton } from '../ui/Skeleton.jsx';
import ConversationItem from './ConversationItem.jsx';
import UserMenu from './UserMenu.jsx';
import IconButton from '../ui/IconButton.jsx';

// `inert` removes hidden panels from tab order and the accessibility tree (React 18 needs a string).
const inertWhen = (hidden) => (hidden ? { inert: '' } : {});

export default function Sidebar() {
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const mobileOpen = useUiStore((s) => s.mobileSidebarOpen);
  const setMobileOpen = useUiStore((s) => s.setMobileSidebarOpen);
  const closeMobile = () => setMobileOpen(false);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (e) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      e.preventDefault(); // handled: don't also stop a streaming reply
      setMobileOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen, setMobileOpen]);

  return (
    <>
      {/* Desktop: docked, collapses to zero width. */}
      <aside
        aria-label="Chat history"
        className={`hidden shrink-0 overflow-hidden bg-sidebar transition-[width] duration-200 ease-out md:block ${
          sidebarOpen ? 'w-[260px]' : 'w-0'
        }`}
        {...inertWhen(!sidebarOpen)}
      >
        <div className="h-full w-[260px]">
          <SidebarContent onClose={toggleSidebar} onNavigate={() => {}} />
        </div>
      </aside>

      {/* Mobile: slide-in drawer over a backdrop. */}
      <div
        className={`fixed inset-0 z-40 md:hidden ${mobileOpen ? '' : 'pointer-events-none'}`}
        {...inertWhen(!mobileOpen)}
      >
        <div
          className={`absolute inset-0 bg-black/60 transition-opacity duration-200 ${
            mobileOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={closeMobile}
          aria-hidden="true"
        />
        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Chat history"
          className={`absolute inset-y-0 left-0 w-[280px] max-w-[85vw] bg-sidebar shadow-2xl transition-transform duration-200 ease-out ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <SidebarContent onClose={closeMobile} onNavigate={closeMobile} />
        </aside>
      </div>
    </>
  );
}

function SidebarContent({ onClose, onNavigate }) {
  const navigate = useNavigate();
  const conversations = useChatStore((s) => s.conversations);
  const status = useChatStore((s) => s.conversationsStatus);
  const activeId = useChatStore((s) => s.activeConversationId);
  const fetchConversations = useChatStore((s) => s.fetchConversations);
  const [query, setQuery] = useState('');

  // All conversations are already loaded, so search filters titles locally.
  const needle = query.trim().toLowerCase();
  const visible = needle ? conversations.filter((c) => c.title.toLowerCase().includes(needle)) : conversations;
  const groups = groupConversations(visible);

  const startNewChat = () => {
    navigate('/');
    onNavigate();
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center justify-between px-3">
        <Link to="/" onClick={onNavigate} className="rounded-lg p-1.5 hover:bg-surface" aria-label="Home">
          <Logo className="size-7 text-fg" />
        </Link>
        <IconButton label="Close sidebar" onClick={onClose}>
          <PanelLeftClose className="size-5" />
        </IconButton>
      </div>

      <div className="px-2">
        <button
          type="button"
          onClick={startNewChat}
          className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium hover:bg-surface focus-visible:bg-surface focus-visible:outline-none"
        >
          <SquarePen className="size-[18px]" aria-hidden="true" />
          New chat
        </button>

        <div className="relative mt-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape' && query) {
                e.preventDefault();
                setQuery('');
              }
            }}
            placeholder="Search chats"
            aria-label="Search chats by title"
            className="h-9 w-full rounded-lg border border-transparent bg-transparent pr-2.5 pl-9 text-sm text-fg outline-none placeholder:text-muted hover:bg-surface focus:border-line focus:bg-app"
          />
        </div>
      </div>

      <nav className="mt-4 flex-1 overflow-y-auto px-2 pb-4" aria-label="Conversations">
        {needle && !visible.length && (
          <p className="px-2.5 py-2 text-sm text-muted">No chats match “{query.trim()}”.</p>
        )}
        {status === 'loading' && !conversations.length && <ConversationListSkeleton />}
        {status === 'error' && !conversations.length && (
          <div className="px-2.5 py-2 text-sm text-muted">
            <p>Couldn&apos;t load your chats.</p>
            <button
              type="button"
              onClick={fetchConversations}
              className="mt-1 font-medium text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent"
            >
              Try again
            </button>
          </div>
        )}
        {status === 'ready' && !conversations.length && (
          <div className="px-2.5 py-2 text-sm text-muted">
            <p className="font-medium text-fg">No chats yet</p>
            <p className="mt-0.5">Start a new chat and it will appear here.</p>
          </div>
        )}
        {groups.map((group) => (
          <section key={group.label} className="mb-5">
            <h2 className="px-2.5 pb-1.5 text-xs font-medium text-muted">{group.label}</h2>
            <ul>
              {group.conversations.map((c) => (
                <li key={c._id}>
                  <ConversationItem conversation={c} active={c._id === activeId} onNavigate={onNavigate} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </nav>

      <div className="border-t border-line/60 p-2">
        <UserMenu />
      </div>
    </div>
  );
}
