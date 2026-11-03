// RSS 全文用：把每篇文章的 markdown 渲染成 HTML，并把站内绝对路径补成完整网址
// （订阅器不在你的域名下，`/images/x.jpg` 这种相对路径在那边是坏的）
import { satteri } from '@astrojs/markdown-satteri';

// 只处理以单个 / 开头的站内链接，`//cdn...`、`#锚点`、`https://` 都不动
const absolutize = (html, origin) => html.replace(/(src|href)="\/(?!\/)/g, `$1="${origin}/`);

export async function buildRssItems(posts, site) {
	const origin = String(site ?? '').replace(/\/+$/, '');
	const renderer = await satteri().createRenderer({});

	return Promise.all(
		posts.map(async (post) => {
			let html = '';
			if (post.body) {
				const rendered = await renderer.render(post.body);
				html = absolutize(rendered.code, origin);
			}
			return {
				...post.data,
				link: `/blog/${post.id}/`,
				// @astrojs/rss 会把它塞进 <content:encoded>，并自动声明 content 命名空间
				content: html || undefined,
				// 摘要仍保留：不想读全文的订阅器可以只显示它
				description: post.data.description,
			};
		}),
	);
}
