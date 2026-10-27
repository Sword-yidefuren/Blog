/** 按中文每分钟约 400 字估算阅读时长（分钟，向上取整） */
export function readingTime(body?: string): number {
	return Math.ceil((body?.length ?? 0) / 400);
}
