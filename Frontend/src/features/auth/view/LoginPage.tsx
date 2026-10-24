import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Navigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { loginSchema } from '../model/schemas';
import type { LoginInput } from '../model/schemas';
import { useSession } from '../controller/useSession';
import { BrandLogo } from '../../../shared/components/layout/BrandLogo';
import { Button, Field, ErrorMessage } from '../../../shared/components/ui';
export function LoginPage() {
  const session = useSession(),
    form = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });
  if (session.user) return <Navigate to="/" replace />;
  return (
    <main className="login-page">
      <div className="login-brand">
        <BrandLogo />
        <h1>Sparkplug Maintenance</h1>
      </div>
      <section className="login-card">
        <h2>Masuk</h2>

        <form onSubmit={form.handleSubmit((input) => session.login.mutate(input))}>
          <Field label="User ID">
            <input autoComplete="username" {...form.register('username')} required />
          </Field>
          <Field label="Kata sandi">
            <input
              type="password"
              autoComplete="current-password"
              {...form.register('password')}
              required
            />
          </Field>
          <ErrorMessage error={session.login.error} />
          <Button type="submit" disabled={session.login.isPending}>
            {session.login.isPending ? 'Memproses…' : 'Masuk'}
            <ArrowRight size={18} />
          </Button>
        </form>
      </section>
    </main>
  );
}
