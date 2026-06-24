import Link from 'next/link';

const navigation = [
  { href: '/', label: '今日', icon: '🌿' },
  { href: '/profile', label: '档案', icon: '📋' },
  { href: '/log', label: '打卡', icon: '✨' },
  { href: '/history', label: '历史', icon: '📈' },
  { href: '/settings', label: '设置', icon: '⚙️' },
  { href: '/auth', label: '登录', icon: '🔐' },
];

export function Shell({ children }: { children: React.ReactNode }) {
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
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-5 pb-10">{children}</main>
      <nav className="bottom-nav" aria-label="移动端主导航">
        {navigation.map((item) => (
          <Link key={item.href} className="py-3 text-center text-xs font-bold" href={item.href}>
            <span className="block text-lg" aria-hidden>
              {item.icon}
            </span>
            {item.label}
          </Link>
        ))}
      </nav>
      <footer className="mx-auto max-w-6xl px-5 py-6 text-sm text-[#6b665f]">
        医学免责声明：本产品仅提供生活方式参考，不做医疗诊断；如有疾病、孕产、未成年或不适，请咨询医生。
      </footer>
    </>
  );
}
