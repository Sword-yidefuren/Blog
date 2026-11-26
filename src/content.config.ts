import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
	// Load Markdown and MDX files in the `src/content/blog/` directory.
	loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
	// Type-check frontmatter using a schema
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			// Transform string to Date object
			pubDate: z.coerce.date(),
			updatedDate: z.coerce.date().optional(),
			heroImage: z.optional(image()),
			// 首页「从这里开始读」的排序号：1 是最先推荐的，不填就不进这块
			featured: z.number().int().positive().optional(),
			tags: z.array(z.enum(['生活', '学习', '工作', '心情', '摸鱼思考'])).default([]),
		}),
});

export const collections = { blog };
