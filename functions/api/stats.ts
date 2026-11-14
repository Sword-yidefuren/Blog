// GET /api/stats?token=xxx
// 只有自己看：返回每篇的浏览数与点赞数。口令来自 Pages 环境变量 STATS_TOKEN。
// 没设口令或口令不对，一律 404，不泄漏「这里有个统计接口」。

type Env = {
	STATS_TOKEN?: string;
	DB: {
		prepare: (sql: string) => { all: () => Promise<{ results?: unknown[] }> };
	};
};

const json = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), {
		status,
		headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
	});

export const onRequestGet = async (context: { request: Request; env: Env }): Promise<Response> => {
	const { request, env } = context;
	const token = new URL(request.url).searchParams.get('token') ?? '';
	const expected = env.STATS_TOKEN ?? '';

	if (!expected || token !== expected) return json({ ok: false }, 404);

	try {
		const { results } = await env.DB.prepare(
			`SELECT slug, views, likes, updated_at FROM counters ORDER BY views DESC, slug DESC`,
		).all();
		return json({ ok: true, rows: results ?? [] });
	} catch {
		return json({ ok: false, error: 'db' }, 500);
	}
};
