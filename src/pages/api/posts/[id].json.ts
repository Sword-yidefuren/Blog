import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { SITE_TITLE } from '../../../consts';

// 单篇：给机器人读正文用。body 是原始 markdown，模型直接读没障碍，也不用另外做去标签。
export const getStaticPaths: GetStaticPaths = async () => {
	const posts = await getCollection('blog');
	return posts.map((post) => ({
		params: { id: post.id },
		props: { post },
	}));
};

export const GET: APIRoute = ({ props }) => {
	const { post } = props as { post: any };
	const minutes = Math.max(1, Math.round((post.body ?? '').length / 400));

	const payload = {
		site: SITE_TITLE,
		id: post.id,
		title: post.data.title,
		description: post.data.description,
		pubDate: post.data.pubDate.toISOString().slice(0, 10),
		updatedDate: post.data.updatedDate ? post.data.updatedDate.toISOString().slice(0, 10) : null,
		tags: post.data.tags,
		url: `/blog/${post.id}/`,
		readingMinutes: minutes,
		body: post.body ?? '',
	};

	return new Response(JSON.stringify(payload, null, 2), {
		headers: {
			'content-type': 'application/json; charset=utf-8',
			'cache-control': 'public, max-age=300, s-maxage=3600',
		},
	});
};
