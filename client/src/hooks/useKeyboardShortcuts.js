import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useChatStore } from '../store/chatStore.js';
import { useUiStore } from '../store/uiStore.js';

/**
 * App-wide shortcuts:
 *   Ctrl/⌘ + Shift + O   new chat
 *   Esc                  stop generating
 *
 * Listens on window (bubble phase), so it runs after the document-level handlers of menus,
 * dialogs, the edit box and the search field. Those call preventDefault() when Esc was
 * theirs (closing a menu, cancelling an edit), and this hook then leaves it alone.
 */
export function useKeyboardShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    function onKeyDown(e) {
      if (e.defaultPrevented) return;

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && !e.altKey && e.key.toLowerCase() === 'o') {
        e.preventDefault(); // Chrome otherwise opens the bookmark manager
        useUiStore.getState().setMobileSidebarOpen(false);
        navigate('/');
        return;
      }

      if (e.key === 'Escape' && useChatStore.getState().streaming) {
        e.preventDefault();
        useChatStore.getState().stopStreaming();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navigate]);
}
