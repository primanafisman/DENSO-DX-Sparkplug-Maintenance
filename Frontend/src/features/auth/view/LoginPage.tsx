import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Navigate } from 'react-router-dom';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import { loginSchema } from '../model/schemas';
import type { LoginInput } from '../model/schemas';
import { useSession } from '../controller/useSession';
import { Button, Field, ErrorMessage } from '../../../shared/components/ui';
export function LoginPage() {
  const session = useSession(),
    form = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });
  if (session.user) return <Navigate to="/" replace />;
  return (
    <main className="login-page">
      <div className="login-brand">
        <div className="brand-mark">DENSO</div>
        <span>SPARKPLUG MAINTENANCE</span>
        <h1>
          Pemeriksaan lebih mudah.
          <br />
          Catatan lebih teratur.
        </h1>
        <p>Dokumentasikan hasil ukur dan tinjau kondisi proses dalam satu tempat.</p>
        <div className="login-proof">
          <ShieldCheck size={20} />
          Pembacaan CV lokal · Konfirmasi operator
        </div>
      </div>
      <section className="login-card">
        <p className="eyebrow">SELAMAT DATANG</p>
        <h2>Masuk ke workspace</h2>
        <p className="muted">Gunakan akun yang diberikan administrator.</p>
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
        <small className="muted">Akses sesuai peran · Data tersimpan di server lokal</small>
      </section>
    </main>
  );
}
