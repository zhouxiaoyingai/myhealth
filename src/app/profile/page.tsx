'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { sampleProfile } from '@/domain/advice';
import { repo } from '@/lib/store';

const profileSchema = z.object({
  gender: z.enum(['female', 'male', 'other']),
  age: z.coerce.number().min(18, '年龄需不低于 18 岁').max(100, '年龄需不超过 100 岁'),
  heightCm: z.coerce.number().min(120, '身高需不低于 120cm').max(230, '身高需不超过 230cm'),
  weightKg: z.coerce.number().min(35, '体重需不低于 35kg').max(250, '体重需不超过 250kg'),
  goal: z.enum(['fat_loss', 'muscle_gain', 'maintenance']),
  activity: z.enum(['sedentary', 'light', 'moderate', 'active']),
  dietPlan: z.enum(['balanced', 'mediterranean', 'dash', 'mind', 'low_carb', 'high_protein', 'vegetarian', 'plant_based', 'intermittent_168']),
  notes: z.string().max(300, '备注最多 300 字'),
});

type ProfileForm = z.infer<typeof profileSchema>;

const selectFields = [
  { name: 'gender', label: '性别', options: [['female', '女'], ['male', '男'], ['other', '其他']] },
  { name: 'goal', label: '目标', options: [['fat_loss', '减脂'], ['muscle_gain', '增肌'], ['maintenance', '维持']] },
  { name: 'activity', label: '活动水平', options: [['sedentary', '久坐'], ['light', '轻度'], ['moderate', '中等'], ['active', '活跃']] },
  {
    name: 'dietPlan',
    label: '饮食方案',
    options: [
      ['balanced', '均衡'],
      ['mediterranean', '地中海'],
      ['dash', 'DASH'],
      ['mind', 'MIND'],
      ['low_carb', '低碳'],
      ['high_protein', '高蛋白'],
      ['vegetarian', '蛋奶素'],
      ['plant_based', '植物基'],
      ['intermittent_168', '16+8'],
    ],
  },
] as const;

export default function ProfilePage() {
  const [formError, setFormError] = useState('');
  const [saved, setSaved] = useState(false);
  const { register, handleSubmit, reset } = useForm<ProfileForm>({ defaultValues: sampleProfile });

  useEffect(() => {
    reset(repo.getProfile() || sampleProfile);
  }, [reset]);

  function onSubmit(values: ProfileForm) {
    const parsed = profileSchema.safeParse(values);
    if (!parsed.success) {
      setSaved(false);
      setFormError(parsed.error.issues[0]?.message || '请检查表单字段');
      return;
    }

    repo.saveProfile(parsed.data);
    setFormError('');
    setSaved(true);
  }

  return (
    <section className="card">
      <h1 className="text-4xl font-black">个人档案</h1>
      <p className="mt-2 text-[#6b665f]">8 个字段会保存在浏览器本地，用于生成每日生活方式建议。</p>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 grid gap-4 md:grid-cols-2">
        {selectFields.map((field) => (
          <label className="label" key={field.name}>
            {field.label}
            <select className="input mt-1" {...register(field.name)}>
              {field.options.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        ))}

        {[
          ['age', '年龄'],
          ['heightCm', '身高 cm'],
          ['weightKg', '体重 kg'],
        ].map(([name, label]) => (
          <label className="label" key={name}>
            {label}
            <input className="input mt-1" type="number" step="0.1" {...register(name as 'age' | 'heightCm' | 'weightKg')} />
          </label>
        ))}

        <label className="label md:col-span-2">
          备注
          <textarea className="input mt-1" rows={4} {...register('notes')} />
        </label>
        <button className="btn btn-primary md:col-span-2" type="submit">
          保存档案
        </button>
        {formError ? <p className="font-bold text-red-600 md:col-span-2">{formError}</p> : null}
        {saved ? <p className="font-bold text-green-700 md:col-span-2">已保存到本地数据库。</p> : null}
      </form>
    </section>
  );
}
