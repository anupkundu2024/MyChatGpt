import { Component } from 'react';
import Button from './ui/Button.jsx';

// Last line of defence: a render error shows a friendly screen instead of a blank page.
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) console.error(error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main role="alert" className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <p className="max-w-md text-[15px] text-muted">
          The page hit an unexpected error. Your chats are saved, so reloading should get you back.
        </p>
        <Button className="mt-3" size="sm" onClick={() => window.location.reload()}>
          Reload
        </Button>
      </main>
    );
  }
}
