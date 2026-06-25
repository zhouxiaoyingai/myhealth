import type { Metadata } from 'next';
import { Shell } from '@/components/Shell';
import { AuthProvider } from '@/lib/supabase/AuthProvider';
import { MigrationPrompt } from '@/components/MigrationPrompt';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'MyHealth 健康助手',
  description: '本地优先的 AI 健康生活方式助手',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <AuthProvider>
          <Shell>{children}</Shell>
          <MigrationPrompt />
        </AuthProvider>
      </body>
    </html>
  );
}
