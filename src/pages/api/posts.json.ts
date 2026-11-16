import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { SITE_DESCRIPTION, SITE_TITLE } from '../../consts';

// 只读接口：给大肥鱼（QQ 机器人）或任何客户端拉文章列表。
// 和 /api/like、/api/view 那几个后端函数不冲突：这个是在构建期就生成好的静态 JSON。
export const GET: APIRoute = async () => {
	const posts = (await getCollection('blog')).sort(
		(a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
	);

	const payload = {
		site: SITE_TITLE,
		description: SITE_DESCRIPTION,
		count: posts.length,
		updated: new Date().toISOString().slice(0, 10),
		posts: posts.map((post) => ({
			id: post.id,
			title: post.data.title,
			description: post.data.description,
			pubDate: post.data.pubDate.toISOString().slice(0, 10),
			tags: post.data.tags,
			url: `/blog/${post.id}/`,
			json: `/api/posts/${post.id}.json`,
		})),
	};

	return new Response(JSON.stringify(payload, null, 2), {
		headers: {
			'content-type': 'application/json; charset=utf-8',
			// 构建产物本来就是静态的，让 CDN 多缓存一会儿
			'cache-control': 'public, max-age=300, s-maxage=3600',
		},
	});
};
