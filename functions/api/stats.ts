// POST /api/stats
// Authorization: Bearer <口令>
// 只有自己看：返回每篇的浏览数与点赞数。口令来自 Pages 环境变量 STATS_TOKEN。
//
// 2026-11-27 改：
//   - 口令从 URL query 挪到请求头（query 会进 CF 日志和浏览器历史）
//   - 比较前先各自 SHA-256，再定长逐字节比
//   - 同一个 IP 连错 5 次锁 15 分钟；GET 一律 404，不再有「带 token 的 GET」这条路
//   - 没设口令、口令不对、被锁，全都 404，不泄漏这里有个统计接口
import { clientIp, equalSecret, isLocked, json, noteFailure, overLimit } from '../_lib/http';

type Env = {
	STATS_TOKEN?: string;
	DB: {
		prepare: (sql: string) => { all: () => Promise<{ results?: unknown[] }> };
	};
};

const LOCK_AFTER = 5;
const LOCK_MS = 15 * 60_000;

export const onRequestPost = async (context: { request: Request; env: Env }): Promise<Response> => {
	const { request, env } = context;
	const expected = env.STATS_TOKEN ?? '';
	if (!expected) return json({ ok: false }, 404);

	const ip = clientIp(request);
	// 连错 5 次锁 15 分钟：锁着的时候连口令都不比
	if (isLocked(`stats-fail:${ip}`)) return json({ ok: false }, 404);
	// 总闸：同一 IP 每分钟最多 20 次，防止拿字典硬撞
	if (overLimit(`stats:${ip}`, 20, 60_000)) return json({ ok: false }, 404);

	const header = request.headers.get('authorization') ?? '';
	const given = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';

	if (!(await equalSecret(given, expected))) {
		noteFailure(`stats-fail:${ip}`, LOCK_AFTER, LOCK_MS);
		return json({ ok: false }, 404);
	}

	try {
		const { results } = await env.DB.prepare(
			`SELECT slug, views, likes, updated_at FROM counters ORDER BY views DESC, slug DESC`,
		).all();
		return json({ ok: true, rows: results ?? [] });
	} catch {
		return json({ ok: false, error: 'db' }, 500);
	}
};

// 旧的 GET ?token= 路子直接关掉
export const onRequestGet = async (): Promise<Response> => json({ ok: false }, 404);
