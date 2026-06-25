'use client';

import { useState, type FormEvent } from 'react';
import { useAuth } from '@/lib/supabase/AuthProvider';

export default function AuthPage() {
  const { status, user, signInWithMagicLink, signOut, configured } = useAuth();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!email) return;
    setSubmitting(true);
    setError(null);
    setMessage(null);
    const { error: err } = await signInWithMagicLink(email.trim());
    setSubmitting(false);
    if (err) {
      setError(err);
    } else {
      setMessage('登录链接已发到你的邮箱，请查收（可能在垃圾邮件里）。');
    }
  }

  if (!configured) {
    return (
      <section className="card bg-[#C5B0F4]/35">
        <h1 className="text-4xl font-black">登录与同步</h1>
        <p className="mt-4 text-lg">
          还没配置 Supabase 凭证。当前所有数据只存在本机浏览器，关页面/换设备就没了。
        </p>
        <p className="mt-3 text-sm text-[#6b665f]">
          联系开发者把 <code>SUPABASE_URL</code> / <code>SUPABASE_ANON_KEY</code> / <code>SUPABASE_SERVICE_ROLE_KEY</code> 填进
          <code> .env.local</code>，登录功能会自动启用。
        </p>
      </section>
    );
  }

  if (status === 'authenticated' && user) {
    return (
      <section className="card bg-[#C5B0F4]/35">
        <h1 className="text-4xl font-black">已登录</h1>
        <p className="mt-4 text-lg">{user.email}</p>
        <p className="mt-2 text-sm text-[#6b665f]">你的数据已上云，多端一致。</p>
        <button
          type="button"
          className="btn mt-6 bg-white"
          onClick={() => {
            void signOut();
          }}
        >
          登出
        </button>
      </section>
    );
  }

  return (
    <section className="card bg-[#C5B0F4]/35">
      <h1 className="text-4xl font-black">登录与同步</h1>
      <p className="mt-4 text-lg">
        填邮箱 → 收登录链接 → 点链接即登录。数据自动上云，多端一致；不登录也能用，数据留在本地。
      </p>

      <form onSubmit={onSubmit} className="mt-6 rounded-3xl bg-white p-5">
        <label className="label">
          邮箱
          <input
            required
            type="email"
            autoComplete="email"
            className="input mt-2"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <button
          type="submit"
          disabled={submitting || !email}
          className="btn mt-4 bg-[#5b4ad6] text-white disabled:bg-gray-300"
        >
          {submitting ? '发送中…' : '发送魔法链接'}
        </button>
        {message ? <p className="mt-3 text-sm text-green-700">{message}</p> : null}
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      </form>
    </section>
  );
}
