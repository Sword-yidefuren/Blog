// 云函数共用的小工具：统一 JSON 响应、来源校验、按 IP 的简易限流、口令的定长比较。
//
// 限流状态放在 isolate 内存里（Map），冷启动或换实例就清零——它只能挡住「同一个实例上的连点」，
// 不是真正的配额。真要拦刷量，去 Cloudflare 后台给 /api/like、/api/view 加 Rate limiting 规则，
// 步骤见 统计-部署说明.md。这里只做一道「别让一条 curl 循环把表写满」的最低防线。

export const json = (body: unknown, status = 200): Response =>
	new Response(JSON.stringify(body), {
		status,
		headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
	});

/** 允许发起写请求的 host（自定义域名上线后加在这里） */
export const SITE_HOSTS = ['blog-5yo.pages.dev', 'localhost:4321', '127.0.0.1:4321'];

/** 只收自己人的请求。curl 不带 Origin，挡不住；但别的网页偷偷 POST 会被挡下 */
export function sameOrigin(request: Request): boolean {
	const ref = request.headers.get('origin') ?? request.headers.get('referer');
	if (!ref) return true;
	try {
		return SITE_HOSTS.includes(new URL(ref).host);
	} catch {
		return false;
	}
}

export function clientIp(request: Request): string {
	const direct = request.headers.get('cf-connecting-ip');
	if (direct) return direct;
	const forwarded = request.headers.get('x-forwarded-for');
	return forwarded?.split(',')[0]?.trim() || 'unknown';
}

type Window = { count: number; reset: number };
const windows = new Map<string, Window>();

/** 固定窗口计数：同一个 key 在 windowMs 内超过 limit 次就返回 true（= 该慢一点了） */
export function overLimit(key: string, limit: number, windowMs: number): boolean {
	const now = Date.now();
	const w = windows.get(key);
	if (!w || now > w.reset) {
		// 顺手清掉已经过期的，避免 Map 无限长
		if (windows.size > 500) for (const [k, v] of windows) if (now > v.reset) windows.delete(k);
		windows.set(key, { count: 1, reset: now + windowMs });
		return false;
	}
	w.count += 1;
	return w.count > limit;
}

type Fail = { count: number; max: number; until: number };
const fails = new Map<string, Fail>();

/** 现在是不是还在锁定期（只看，不计数） */
export function isLocked(key: string): boolean {
	const f = fails.get(key);
	if (!f) return false;
	if (Date.now() > f.until) {
		fails.delete(key);
		return false;
	}
	return f.count >= f.max;
}

/** 记一次失败。窗口按「最后一次失败」往后滑，锁满 windowMs */
export function noteFailure(key: string, max: number, windowMs: number): void {
	const now = Date.now();
	const f = fails.get(key);
	if (!f || now > f.until) fails.set(key, { count: 1, max, until: now + windowMs });
	else f.count += 1;
}

const encoder = new TextEncoder();

/**
 * 比较两个口令。先把两边都哈希成定长的 32 字节再逐字节异或，
 * 这样长度不同也不会在「先比长度」上泄漏信息；哈希让逐字节比较的耗时与内容无关。
 */
export async function equalSecret(given: string, expected: string): Promise<boolean> {
	if (!given || !expected) return false;
	const [a, b] = await Promise.all([
		crypto.subtle.digest('SHA-256', encoder.encode(given)),
		crypto.subtle.digest('SHA-256', encoder.encode(expected)),
	]);
	const x = new Uint8Array(a);
	const y = new Uint8Array(b);
	if (x.length !== y.length) return false;
	let diff = 0;
	for (let i = 0; i < x.length; i += 1) diff |= x[i] ^ y[i];
	return diff === 0;
}
