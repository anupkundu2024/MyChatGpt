import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import AuthLayout, { FormError } from '../components/auth/AuthLayout.jsx';
import Button from '../components/ui/Button.jsx';
import TextField from '../components/ui/TextField.jsx';
import { getErrorMessage, getFieldErrors } from '../lib/api.js';
import { hasErrors, validateEmail, validateNewPassword } from '../lib/validation.js';
import { useAuthStore } from '../store/authStore.js';

export default function RegisterPage() {
  const register = useAuthStore((s) => s.register);
  const location = useLocation();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
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
      name: form.name.trim() ? undefined : 'Name is required',
      email: validateEmail(form.email),
      password: validateNewPassword(form.password),
    };
    setErrors(nextErrors);
    setFormError('');
    if (hasErrors(nextErrors)) return;

    setSubmitting(true);
    try {
      await register({ name: form.name.trim(), email: form.email.trim(), password: form.password });
    } catch (err) {
      const fieldErrors = getFieldErrors(err);
      setErrors(fieldErrors);
      // Field-level problems are shown under the inputs; only show the banner otherwise.
      setFormError(hasErrors(fieldErrors) ? '' : getErrorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start chatting in seconds"
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" state={location.state} className="font-medium text-accent hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <FormError message={formError} />
        <TextField
          label="Name"
          name="name"
          autoComplete="name"
          autoFocus
          value={form.name}
          onChange={update('name')}
          error={errors.name}
        />
        <TextField
          label="Email address"
          type="email"
          name="email"
          autoComplete="email"
          value={form.email}
          onChange={update('email')}
          error={errors.email}
        />
        <TextField
          label="Password"
          type="password"
          name="password"
          autoComplete="new-password"
          value={form.password}
          onChange={update('password')}
          error={errors.password}
          hint="At least 8 characters"
        />
        <Button type="submit" loading={submitting} className="mt-2 w-full">
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}
