// 生成云函数用的文章 slug 白名单（构建前跑一次，Cloudflare Pages 的 build 里已经挂上）
// 只有列表里的 slug 才允许写计数：随便编一个 slug 刷接口，现在会被 404 挡住。
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const BLOG_DIR = path.join('src', 'content', 'blog');
const OUT = path.join('functions', '_lib', 'post-slugs.ts');

const files = await readdir(BLOG_DIR);
const slugs = files
	.filter((f) => f.endsWith('.md') || f.endsWith('.mdx'))
	.map((f) => f.replace(/\.mdx?$/, ''))
	.sort();

const body = `// 这个文件由 scripts/gen-post-slugs.mjs 自动生成，别手改。
// 构建前会重跑一次（见 package.json 的 build 脚本），所以新文章提交后自动进白名单。
export const POST_SLUGS: readonly string[] = [
${slugs.map((s) => `\t'${s}',`).join('\n')}
];

const KNOWN = new Set(POST_SLUGS);

/** 这个 slug 是不是一篇真文章 */
export const isKnownSlug = (slug: string): boolean => KNOWN.has(slug);
`;

let prev = '';
try {
	prev = await readFile(OUT, 'utf8');
} catch {
	/* 第一次生成 */
}

if (prev === body) {
	console.log(`post-slugs: ${slugs.length} 篇，没有变化`);
} else {
	await writeFile(OUT, body, 'utf8');
	console.log(`post-slugs: 写入 ${OUT}（${slugs.length} 篇）`);
}
