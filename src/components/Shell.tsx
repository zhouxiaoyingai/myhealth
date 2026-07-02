'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/supabase/AuthProvider';

const navigation = [
  { href: '/', label: '今日', icon: '🌿' },
  { href: '/profile', label: '档案', icon: '📋' },
  { href: '/log', label: '打卡', icon: '✨' },
  { href: '/history', label: '历史', icon: '📈' },
  { href: '/settings', label: '设置', icon: '⚙️' },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const { status, user, signOut, configured } = useAuth();
  const showAuthLink = !configured || status !== 'authenticated';
  const userEmail = user?.email;

  return (
    <>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Link href="/" className="text-2xl font-black tracking-tight">
          🌿 MyHealth
        </Link>
        <nav className="hidden gap-2 md:flex" aria-label="主导航">
          {navigation.map((item) => (
            <Link key={item.href} className="btn hover:bg-white" href={item.href}>
              <span aria-hidden>{item.icon}</span> {item.label}
            </Link>
          ))}
          {showAuthLink ? (
            <Link className="btn bg-[#C5B0F4]/40 hover:bg-white" href="/auth">
              <span aria-hidden>🔐</span> 登录
            </Link>
          ) : (
            <button
              className="btn bg-white hover:bg-[#C5B0F4]/30"
              type="button"
              onClick={() => {
                void signOut();
              }}
            >
              <span aria-hidden>👤</span> {userEmail ?? '已登录'} · 登出
            </button>
          )}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-5 pb-8 md:pb-10">{children}</main>
      <nav className="bottom-nav" aria-label="移动端主导航">
        {navigation.map((item) => (
          <Link key={item.href} className="py-3 text-center text-xs font-bold" href={item.href}>
            <span className="block text-lg" aria-hidden>
              {item.icon}
            </span>
            {item.label}
          </Link>
        ))}
        {showAuthLink ? (
          <Link className="py-3 text-center text-xs font-bold" href="/auth">
            <span className="block text-lg" aria-hidden>
              🔐
            </span>
            登录
          </Link>
        ) : (
          <span className="py-3 text-center text-xs font-bold text-[#6b665f]">
            <span className="block text-lg" aria-hidden>
              👤
            </span>
            {userEmail?.split('@')[0] ?? '已登录'}
          </span>
        )}
      </nav>
      <footer className="mx-auto max-w-6xl px-5 py-6 text-sm text-[#6b665f]">
        医学免责声明：本产品仅提供生活方式参考，不做医疗诊断；如有疾病、孕产、未成年或不适，请咨询医生。
      </footer>
    </>
  );
}
