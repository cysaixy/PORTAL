import { Request, Response } from 'express';
import prisma from '../config/database';
import { audit, HttpError } from '../lib/http';
import { settingSchema } from '../lib/validation';

/** Settings the UI may edit, with validation per key. */
const EDITABLE: Record<string, (v: string) => string | null> = {
  passing_score: (v) => (/^\d+$/.test(v) && +v >= 60 && +v <= 100 ? null : 'Passing score must be a whole number from 60 to 100'),
  school_name: (v) => (v.length <= 120 ? null : 'Too long'),
  school_address: (v) => (v.length <= 200 ? null : 'Too long'),
  current_quarter: (v) => (/^[1-4]$/.test(v) ? null : 'Quarter must be 1-4'),
};

/** GET /api/admin/settings */
export async function listSettings(_req: Request, res: Response) {
  const settings = await prisma.setting.findMany({ orderBy: { key: 'asc' } });
  res.json({ settings: Object.fromEntries(settings.map((s) => [s.key, s.value])) });
}

/** PUT /api/admin/settings/:key */
export async function upsertSetting(req: Request, res: Response) {
  const { key } = req.params;
  const validate = EDITABLE[key];
  if (!validate) throw new HttpError(400, `Unknown setting: ${key}`);
  const { value } = settingSchema.parse(req.body);
  const problem = validate(value);
  if (problem) throw new HttpError(400, problem);

  const before = await prisma.setting.findUnique({ where: { key } });
  const setting = await prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
  await audit(req, 'UPDATE', 'Setting', key, before ? { value: before.value } : undefined, { value });
  res.json({ setting });
}
