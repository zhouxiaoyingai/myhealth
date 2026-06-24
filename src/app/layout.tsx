import type { Metadata } from 'next';
import { Shell } from '@/components/Shell';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'MyHealth 健康助手',
  description: '本地优先的 AI 健康生活方式助手',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
