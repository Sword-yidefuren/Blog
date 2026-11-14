-- 浏览 / 点赞计数表（Cloudflare D1）
-- 建库后在控制台执行：wrangler d1 execute <库名> --file=functions/schema.sql
-- 或者在 Cloudflare 后台 → D1 → 你的库 → Console 里粘贴执行
CREATE TABLE IF NOT EXISTS counters (
	slug TEXT PRIMARY KEY,
	likes INTEGER NOT NULL DEFAULT 0,
	views INTEGER NOT NULL DEFAULT 0,
	updated_at TEXT
);
