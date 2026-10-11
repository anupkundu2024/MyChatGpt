import { useEffect } from 'react';
import { Outlet } from 'react-router';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts.js';
import { useChatStore } from '../../store/chatStore.js';
import SettingsModal from '../settings/SettingsModal.jsx';
import Sidebar from '../sidebar/Sidebar.jsx';

// Signed-in shell: sidebar (docked on desktop, drawer on mobile) + main chat panel.
export default function ChatLayout() {
  const fetchConversations = useChatStore((s) => s.fetchConversations);
  useKeyboardShortcuts();

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  return (
    <div className="flex h-full overflow-hidden">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col">
        <Outlet />
      </main>
      <SettingsModal />
    </div>
  );
}
