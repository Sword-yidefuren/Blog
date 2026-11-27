// POST /api/like  { slug }
// 某篇文章点赞 +1。不返回数字：页面不显示，作者从 /stats 看。
// 同一台设备前端用 localStorage 挡住重复点；这里不按 IP 去重（个人站，不存访问者 IP）。
//
// 三道门槛（2026-11-27 加）：来源校验 → 每 IP 每分钟 30 次 → slug 必须是真文章。
import { clientIp, json, overLimit, sameOrigin } from '../_lib/http';
import { isKnownSlug } from '../_lib/post-slugs';

type Env = {
	// D1 绑定，在 Cloudflare Pages → Settings → Functions → D1 里加，名字必须是 DB
	DB: {
		prepare: (sql: string) => { bind: (...args: unknown[]) => { run: () => Promise<unknown> } };
	};
};

const SLUG = /^[A-Za-z0-9_-]{1,64}$/;

export const onRequestPost = async (context: { request: Request; env: Env }): Promise<Response> => {
	const { request, env } = context;

	if (!sameOrigin(request)) return json({ ok: false, error: 'forbidden' }, 403);
	if (overLimit(`like:${clientIp(request)}`, 30, 60_000)) {
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
	// 白名单由构建脚本生成：编一个 slug 来刷，直接 404，不会在 counters 里留下脏行
	if (!isKnownSlug(slug)) return json({ ok: false, error: 'unknown-post' }, 404);

	try {
		await env.DB.prepare(
			`INSERT INTO counters (slug, likes, views, updated_at) VALUES (?1, 1, 0, datetime('now'))
			 ON CONFLICT(slug) DO UPDATE SET likes = likes + 1, updated_at = datetime('now')`,
		)
			.bind(slug)
			.run();
	} catch {
		return json({ ok: false, error: 'db' }, 500);
	}

	return json({ ok: true });
};
