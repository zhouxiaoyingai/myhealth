import type { SupabaseClient } from '@supabase/supabase-js';
import type { Advice, DailyLog, Profile, Settings } from '@/domain/types';
import {
  adviceToRow,
  logToRow,
  profileToRow,
  rowToAdvice,
  rowToLog,
  rowToProfile,
  type DbAdviceRow,
  type DbLogRow,
  type DbProfileRow,
  type Repository,
} from './types';

export class SupabaseRepository implements Repository {
  readonly mode = 'supabase' as const;

  constructor(private readonly supabase: SupabaseClient, private readonly userId: string) {}

  private get db() {
    return this.supabase;
  }

  async getProfile(): Promise<Profile | null> {
    const { data, error } = await this.db.from('profiles').select('*').eq('id', this.userId).maybeSingle<DbProfileRow>();
    if (error) throw error;
    return data ? rowToProfile(data) : null;
  }

  async saveProfile(profile: Profile): Promise<void> {
    const row = profileToRow(profile, this.userId);
    const { error } = await this.db.from('profiles').upsert(row);
    if (error) throw error;
  }

  async getAdvice(date: string): Promise<Advice | null> {
    const { data, error } = await this.db
      .from('daily_advices')
      .select('*')
      .eq('user_id', this.userId)
      .eq('date', date)
      .maybeSingle<DbAdviceRow>();
    if (error) throw error;
    return data ? rowToAdvice(data) : null;
  }

  async saveAdvice(advice: Advice): Promise<void> {
    const row = adviceToRow(advice, this.userId);
    const { error } = await this.db
      .from('daily_advices')
      .upsert(row, { onConflict: 'user_id,date' });
    if (error) throw error;
  }

  async listAdvices(limit = 30): Promise<Advice[]> {
    const { data, error } = await this.db
      .from('daily_advices')
      .select('*')
      .eq('user_id', this.userId)
      .order('date', { ascending: false })
      .limit(limit)
      .returns<DbAdviceRow[]>();
    if (error) throw error;
    return (data ?? []).map(rowToAdvice);
  }

  async getLog(date: string): Promise<DailyLog | null> {
    const { data, error } = await this.db
      .from('daily_logs')
      .select('*')
      .eq('user_id', this.userId)
      .eq('date', date)
      .maybeSingle<DbLogRow>();
    if (error) throw error;
    return data ? rowToLog(data) : null;
  }

  async upsertLog(log: DailyLog): Promise<void> {
    const row = logToRow(log, this.userId);
    const { error } = await this.db
      .from('daily_logs')
      .upsert(row, { onConflict: 'user_id,date' });
    if (error) throw error;
  }

  async listLogs(limit = 30): Promise<DailyLog[]> {
    const { data, error } = await this.db
      .from('daily_logs')
      .select('*')
      .eq('user_id', this.userId)
      .order('date', { ascending: false })
      .limit(limit)
      .returns<DbLogRow[]>();
    if (error) throw error;
    return (data ?? []).map(rowToLog);
  }

  async getSettings(): Promise<Settings> {
    // Settings 当前比较轻：theme 存在 profiles.notes 之外的 metadata 表；
    // 第一版简化：存在 profiles.notes 之外的独立小表 settings(user_id pk, theme)
    // 但为了不增加 migration 范围，先存到 profile.notes 不优雅 ——
    // 这里走 kv 旁路：复用 profiles.notes 字段做 JSON 太丑。
    // 折中：第一版 settings 仍走 localStorage；登录用户 settings 同步在后续版本再加。
    return { theme: 'system' };
  }

  async saveSettings(settings: Settings): Promise<void> {
    // 同上：暂未实现云端 settings 同步
    void settings;
  }

  async exportJson(): Promise<string> {
    const [profile, advices, logs] = await Promise.all([this.getProfile(), this.listAdvices(365), this.listLogs(365)]);
    return JSON.stringify({ profile, advices, logs }, null, 2);
  }

  async clear(): Promise<void> {
    // 清空云端该用户所有数据（保留账号）
    await Promise.all([
      this.db.from('daily_advices').delete().eq('user_id', this.userId),
      this.db.from('daily_logs').delete().eq('user_id', this.userId),
      this.db.from('profiles').delete().eq('id', this.userId),
    ]);
  }
}
