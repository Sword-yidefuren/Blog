// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig, fontProviders } from 'astro/config';

import expressiveCode from 'astro-expressive-code';
import { pluginLineNumbers } from '@expressive-code/plugin-line-numbers';

// https://astro.build/config
export default defineConfig({
    site: 'https://blog-5yo.pages.dev',
    // 悬停/进入视口就预取下一页，点进去几乎瞬开（静态站每页才几十 KB）
    prefetch: { prefetchAll: true },
    integrations: [
        expressiveCode({
            plugins: [pluginLineNumbers()],
            // 代码块主题跟随 html[data-theme]（与全站手动切换保持一致）：
            // 指定一深一浅两套主题，并把主题名改成 dark/light，
            // 默认的 data-theme 选择器即可命中；关掉媒体查询避免和手动选择打架。
            themes: ['github-dark', 'github-light'],
            useDarkModeMediaQuery: false,
            customizeTheme: (theme) => {
                theme.name = theme.name.includes('dark') ? 'dark' : 'light';
            },
        }),
        sitemap(),
        mdx(),
    ],
    fonts: [
        {
            provider: fontProviders.local(),
            name: 'Atkinson',
            cssVariable: '--font-atkinson',
            fallbacks: ['sans-serif'],
            options: {
                variants: [
                    {
                        src: ['./src/assets/fonts/atkinson-regular.woff'],
                        weight: 400,
                        style: 'normal',
                        display: 'swap',
                    },
                    {
                        src: ['./src/assets/fonts/atkinson-bold.woff'],
                        weight: 700,
                        style: 'normal',
                        display: 'swap',
                    },
                ],
            },
        },
    ],
});