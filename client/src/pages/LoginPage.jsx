import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import AuthLayout, { FormError } from '../components/auth/AuthLayout.jsx';
import Button from '../components/ui/Button.jsx';
import TextField from '../components/ui/TextField.jsx';
import { getErrorMessage, getFieldErrors } from '../lib/api.js';
import { hasErrors, validateEmail } from '../lib/validation.js';
import { useAuthStore } from '../store/authStore.js';

export default function LoginPage() {
  const login = useAuthStore((s) => s.login);
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const update = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((errs) => ({ ...errs, [field]: undefined }));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    const nextErrors = {
      email: validateEmail(form.email),
      password: form.password ? undefined : 'Password is required',
    };
    setErrors(nextErrors);
    setFormError('');
    if (hasErrors(nextErrors)) return;

    setSubmitting(true);
    try {
      // On success GuestRoute redirects to the page the user originally asked for.
      await login({ email: form.email.trim(), password: form.password });
    } catch (err) {
      const fieldErrors = getFieldErrors(err);
      setErrors(fieldErrors);
      setFormError(hasErrors(fieldErrors) ? '' : getErrorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to continue your conversations"
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link to="/register" state={location.state} className="font-medium text-accent hover:underline">
            Sign up
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <FormError message={formError} />
        <TextField
          label="Email address"
          type="email"
          name="email"
          autoComplete="email"
          autoFocus
          value={form.email}
          onChange={update('email')}
          error={errors.email}
        />
        <TextField
          label="Password"
          type="password"
          name="password"
          autoComplete="current-password"
          value={form.password}
          onChange={update('password')}
          error={errors.password}
        />
        <Button type="submit" loading={submitting} className="mt-2 w-full">
          Continue
        </Button>
      </form>
    </AuthLayout>
  );
}
