export default function AuthPage() {
  return (
    <section className="card bg-[#C5B0F4]/35">
      <h1 className="text-4xl font-black">登录与同步</h1>
      <p className="mt-4 text-lg">当前 MVP 使用浏览器本地数据库，不需要登录也能完整体验。</p>
      <div className="mt-6 rounded-3xl bg-white p-5">
        <label className="label">
          邮箱（即将支持 Supabase 魔法链接）
          <input disabled className="input mt-2" placeholder="you@example.com" />
        </label>
        <button disabled className="btn mt-4 bg-gray-300 text-gray-600" type="button">
          发送魔法链接（待接入）
        </button>
      </div>
    </section>
  );
}
