// 页面音效：默认关闭，只有「复制成功」和「点回到顶部」两处会响，外加打开开关时的一声确认。
// 音源在运行时合成成 40ms 的 WAV（约 3.5KB），不引任何第三方音频文件。

const STORE_KEY = 'sword:sound';

export type Cue = 'copy' | 'top' | 'toggle';

// 复制：短促的高一点，像「收到了」；回顶：低一点，像「收束」；开关：介于两者之间
const PITCH: Record<Cue, number> = {
	copy: 1046,
	top: 784,
	toggle: 988,
};

const wavCache = new Map<Cue, string>();

export function isSoundOn(): boolean {
	try {
		return localStorage.getItem(STORE_KEY) === 'on';
	} catch {
		return false;
	}
}

export function setSoundOn(on: boolean): void {
	try {
		localStorage.setItem(STORE_KEY, on ? 'on' : 'off');
	} catch {
		/* 隐私模式写不进去：本次仍按按钮状态生效，刷新后回到默认关 */
	}
}

// 合成一段 44.1kHz / 16bit 单声道 WAV，转成 data URI：3ms 起音 + 12ms 指数衰减，尾巴自然消失
// 振幅 0.16：按 0.12 算峰值只有 −22dBFS，笔记本外放基本听不见；0.16 实测峰值约 −19dBFS
function makeWav(freq: number, ms = 40, amp = 0.16): string {
	const rate = 44100;
	const count = Math.max(1, Math.round((rate * ms) / 1000));
	const buffer = new ArrayBuffer(44 + count * 2);
	const view = new DataView(buffer);
	const writeText = (offset: number, text: string) => {
		for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
	};

	writeText(0, 'RIFF');
	view.setUint32(4, 36 + count * 2, true);
	writeText(8, 'WAVEfmt ');
	view.setUint32(16, 16, true); // fmt 块长度
	view.setUint16(20, 1, true); // PCM
	view.setUint16(22, 1, true); // 单声道
	view.setUint32(24, rate, true);
	view.setUint32(28, rate * 2, true); // 字节率
	view.setUint16(32, 2, true); // 块对齐
	view.setUint16(34, 16, true); // 位深
	writeText(36, 'data');
	view.setUint32(40, count * 2, true);

	for (let i = 0; i < count; i++) {
		const t = i / rate;
		const envelope = Math.min(1, t / 0.003) * Math.exp(-t / 0.012);
		const wave = Math.sin(2 * Math.PI * freq * t) * 0.85 + Math.sin(2 * Math.PI * freq * 2 * t) * 0.15;
		const sample = Math.max(-1, Math.min(1, wave * envelope * amp));
		view.setInt16(44 + i * 2, Math.round(sample * 0x7fff), true);
	}

	let binary = '';
	const bytes = new Uint8Array(buffer);
	for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
	return `data:audio/wav;base64,${btoa(binary)}`;
}

export function playCue(cue: Cue): void {
	if (!isSoundOn()) return;

	let src = wavCache.get(cue);
	if (!src) {
		src = makeWav(PITCH[cue]);
		wavCache.set(cue, src);
	}

	const audio = new Audio(src);
	audio.play().catch(() => {
		/* 被浏览器拦下就静默吞掉，不弹提示 */
	});
}

// 页脚的 ♪ 开关：关着时带一道斜线，开着青色；状态记在 localStorage
export function mountSoundToggle(btn: HTMLButtonElement): void {
	const sync = (on: boolean) => {
		btn.setAttribute('aria-pressed', String(on));
		btn.title = on ? '声音：开' : '声音：关';
	};

	sync(isSoundOn());

	btn.addEventListener('click', () => {
		const on = btn.getAttribute('aria-pressed') !== 'true';
		setSoundOn(on);
		sync(on);
		if (on) playCue('toggle');
	});
}
