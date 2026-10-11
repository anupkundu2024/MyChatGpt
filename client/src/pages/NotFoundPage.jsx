import { Link } from 'react-router';

export default function NotFoundPage() {
  return (
    <main className="flex h-full flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <Link to="/" className="font-medium text-accent hover:underline">
        Go home
      </Link>
    </main>
  );
}
