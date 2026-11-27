// 这个文件由 scripts/gen-post-slugs.mjs 自动生成，别手改。
// 构建前会重跑一次（见 package.json 的 build 脚本），所以新文章提交后自动进白名单。
export const POST_SLUGS: readonly string[] = [
	'2026-10-27',
	'2026-10-28',
	'2026-10-30',
	'2026-11-01',
	'2026-11-03',
	'2026-11-05',
	'2026-11-09',
	'2026-11-12',
	'2026-11-16',
	'2026-11-17',
	'2026-11-21',
	'2026-11-25',
	'2026-9-16',
	'2026-9-17',
	'2026-9-18',
	'2026-9-19',
	'2026-9-20',
	'hello_world',
];

const KNOWN = new Set(POST_SLUGS);

/** 这个 slug 是不是一篇真文章 */
export const isKnownSlug = (slug: string): boolean => KNOWN.has(slug);
