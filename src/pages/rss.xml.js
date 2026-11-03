import { getCollection } from 'astro:content';
import rss from '@astrojs/rss';
import { SITE_DESCRIPTION, SITE_TITLE } from '../consts';
import { buildRssItems } from '../utils/rssContent';

export async function GET(context) {
	const posts = (await getCollection('blog')).sort(
		// 新的在前：订阅器按 feed 顺序显示，排好省得读者自己找
		(a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
	);
	// 全文进 content:encoded：订阅器里能直接读完，不用点回来
	const items = await buildRssItems(posts, context.site);
	return rss({
		title: SITE_TITLE,
		description: SITE_DESCRIPTION,
		site: context.site,
		items,
	});
}
