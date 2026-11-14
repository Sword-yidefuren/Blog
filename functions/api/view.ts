// POST /api/view  { slug }
// 文章页每打开一次 +1。前端用 sessionStorage 保证同一标签页刷新/前进后退不重复计数。

type Env = {
	DB: {
		prepare: (sql: string) => { bind: (...args: unknown[]) => { run: () => Promise<unknown> } };
	};
};

const SLUG = /^[A-Za-z0-9_-]{1,64}$/;

const json = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), {
		status,
		headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
	});

export const onRequestPost = async (context: { request: Request; env: Env }): Promise<Response> => {
	const { request, env } = context;

	let slug = '';
	try {
		const payload = (await request.json()) as { slug?: unknown };
		if (typeof payload.slug === 'string') slug = payload.slug.trim();
	} catch {
		return json({ ok: false, error: 'bad-json' }, 400);
	}
	if (!SLUG.test(slug)) return json({ ok: false, error: 'bad-slug' }, 400);

	try {
		await env.DB.prepare(
			`INSERT INTO counters (slug, likes, views, updated_at) VALUES (?1, 0, 1, datetime('now'))
			 ON CONFLICT(slug) DO UPDATE SET views = views + 1, updated_at = datetime('now')`,
		)
			.bind(slug)
			.run();
	} catch {
		return json({ ok: false, error: 'db' }, 500);
	}

	return json({ ok: true });
};
