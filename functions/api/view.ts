// POST /api/view  { slug }
// 文章页每打开一次 +1。前端用 sessionStorage 保证同一标签页刷新/前进后退不重复计数。
//
// 跟 like 同一套门槛（2026-11-27 加）：来源校验 → 每 IP 每分钟 60 次 → slug 必须是真文章。
import { clientIp, json, overLimit, sameOrigin } from '../_lib/http';
import { isKnownSlug } from '../_lib/post-slugs';

type Env = {
	DB: {
		prepare: (sql: string) => { bind: (...args: unknown[]) => { run: () => Promise<unknown> } };
	};
};

const SLUG = /^[A-Za-z0-9_-]{1,64}$/;

export const onRequestPost = async (context: { request: Request; env: Env }): Promise<Response> => {
	const { request, env } = context;

	if (!sameOrigin(request)) return json({ ok: false, error: 'forbidden' }, 403);
	// 浏览量按页算，一次正常阅读也就 1 次，60/分钟足够宽松
	if (overLimit(`view:${clientIp(request)}`, 60, 60_000)) {
		return json({ ok: false, error: 'slow-down' }, 429);
	}

	let slug = '';
	try {
		const payload = (await request.json()) as { slug?: unknown };
		if (typeof payload.slug === 'string') slug = payload.slug.trim();
	} catch {
		return json({ ok: false, error: 'bad-json' }, 400);
	}
	if (!SLUG.test(slug)) return json({ ok: false, error: 'bad-slug' }, 400);
	if (!isKnownSlug(slug)) return json({ ok: false, error: 'unknown-post' }, 404);

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
