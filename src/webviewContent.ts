import * as vscode from 'vscode';

export function getWebviewContent(
	webview: vscode.Webview,
	opts: { fileSize: number; suggestedWidth: number; suggestedHeight: number; fileName: string }
): string {
	const { fileSize, suggestedWidth, suggestedHeight, fileName } = opts;
	return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>RAW 16-bit Viewer</title>
	<style>
		* { box-sizing: border-box; }
		body {
			margin: 0;
			padding: 12px;
			font-family: var(--vscode-font-family);
			font-size: var(--vscode-font-size);
			color: var(--vscode-foreground);
			background: var(--vscode-editor-background);
		}
		.controls {
			display: flex;
			flex-wrap: wrap;
			gap: 12px;
			align-items: center;
			margin-bottom: 12px;
			padding: 8px;
			background: var(--vscode-input-background);
			border: 1px solid var(--vscode-input-border);
			border-radius: 4px;
		}
		.controls label { margin-right: 4px; }
		.controls input[type="number"] {
			width: 90px;
			padding: 4px 8px;
			background: var(--vscode-input-background);
			color: var(--vscode-input-foreground);
			border: 1px solid var(--vscode-input-border);
			border-radius: 4px;
		}
		.controls button {
			padding: 6px 12px;
			background: var(--vscode-button-background);
			color: var(--vscode-button-foreground);
			border: none;
			border-radius: 4px;
			cursor: pointer;
		}
		.controls button:hover { background: var(--vscode-button-hoverBackground); }
		.controls button.secondary {
			background: var(--vscode-button-secondaryBackground);
			color: var(--vscode-button-secondaryForeground);
		}
		.window-controls {
			display: flex;
			flex-wrap: wrap;
			gap: 16px;
			align-items: center;
			margin-bottom: 12px;
			padding: 8px;
			background: var(--vscode-input-background);
			border: 1px solid var(--vscode-input-border);
			border-radius: 4px;
		}
		.window-controls label { display: inline-block; min-width: 80px; }
		.window-controls input[type="range"] { width: 120px; vertical-align: middle; }
		.window-controls .value { min-width: 60px; display: inline-block; }
		.zoom-controls {
			display: flex;
			flex-wrap: wrap;
			gap: 8px;
			align-items: center;
			margin-bottom: 12px;
			padding: 8px;
			background: var(--vscode-input-background);
			border: 1px solid var(--vscode-input-border);
			border-radius: 4px;
		}
		.zoom-controls label { margin-right: 4px; }
		.zoom-controls button {
			padding: 4px 10px;
			background: var(--vscode-button-secondaryBackground);
			color: var(--vscode-button-secondaryForeground);
			border: none;
			border-radius: 4px;
			cursor: pointer;
			font-size: 12px;
		}
		.zoom-controls button:hover { background: var(--vscode-button-secondaryHoverBackground); }
		.zoom-controls button.active {
			background: var(--vscode-button-background);
			color: var(--vscode-button-foreground);
		}
		.zoom-controls .zoom-value { min-width: 48px; color: var(--vscode-descriptionForeground); font-size: 12px; }
		#canvasWrap {
			overflow: auto;
			max-height: calc(100vh - 220px);
			text-align: center;
			background: var(--vscode-editor-background);
			border: 1px solid var(--vscode-input-border);
			border-radius: 4px;
		}
		#canvas { display: block; margin: 0 auto; cursor: crosshair; }
		#pixelInfo {
			position: fixed;
			background: var(--vscode-editorWidget-background);
			border: 1px solid var(--vscode-input-border);
			padding: 6px 10px;
			border-radius: 4px;
			font-size: 12px;
			pointer-events: none;
			z-index: 1000;
			display: none;
			box-shadow: 0 2px 8px rgba(0,0,0,0.3);
		}
		#status { margin-top: 8px; color: var(--vscode-descriptionForeground); font-size: 12px; }
		.error { color: var(--vscode-errorForeground); }
		.initial-msg { padding: 24px; color: var(--vscode-descriptionForeground); }
	</style>
</head>
<body>
	<div class="controls">
		<label>File: ${escapeHtml(fileName)}</label>
		<span>(${(fileSize / 1024 / 1024).toFixed(2)} MB)</span>
		<label>Width</label>
		<input type="number" id="width" value="${suggestedWidth}" min="1" />
		<label>Height</label>
		<input type="number" id="height" value="${suggestedHeight}" min="1" />
		<button id="btnLoad">Open</button>
	</div>
	<div id="windowSection" class="window-controls" style="display:none;">
		<button id="btnAuto" class="secondary">Auto window (1%–99%)</button>
		<label>Level (Center)</label>
		<input type="range" id="level" min="0" max="65535" value="32768" step="1" />
		<span class="value" id="levelVal">32768</span>
		<label>Window (Width)</label>
		<input type="range" id="window" min="1" max="65535" value="4096" step="1" />
		<span class="value" id="windowVal">4096</span>
	</div>
	<div id="zoomSection" class="zoom-controls" style="display:none;">
		<label>Display size</label>
		<button type="button" id="btnZoom25" data-scale="0.25">25%</button>
		<button type="button" id="btnZoom50" data-scale="0.5">50%</button>
		<button type="button" id="btnZoom75" data-scale="0.75">75%</button>
		<button type="button" id="btnZoom100" data-scale="1">100%</button>
		<button type="button" id="btnZoomFit" class="active">Fit to view</button>
		<span class="zoom-value" id="zoomVal"></span>
	</div>
	<div id="canvasWrap">
		<p id="initialMsg" class="initial-msg">Enter width and height above, then click [Open].</p>
		<canvas id="canvas" style="display:none;"></canvas>
	</div>
	<div id="pixelInfo"></div>
	<div id="status"></div>

	<script>
		const vscode = acquireVsCodeApi();
		let rawData = null;
		let meta = null;
		let zoomScale = 1;
		let zoomMode = 'fit';

		function applyZoom() {
			const canvas = document.getElementById('canvas');
			if (!meta || !canvas.width) return;
			let scale = zoomScale;
			if (zoomMode === 'fit') {
				const wrap = document.getElementById('canvasWrap');
				const maxW = wrap.clientWidth - 24;
				const maxH = Math.max(100, (wrap.clientHeight || 400) - 24);
				scale = Math.min(maxW / meta.displayWidth, maxH / meta.displayHeight, 1);
				scale = Math.max(0.1, Math.min(1, scale));
			}
			canvas.style.width = (canvas.width * scale) + 'px';
			canvas.style.height = (canvas.height * scale) + 'px';
			document.getElementById('zoomVal').textContent = Math.round(scale * 100) + '%';
			document.querySelectorAll('#zoomSection button[data-scale]').forEach(btn => {
				btn.classList.toggle('active', zoomMode !== 'fit' && parseFloat(btn.dataset.scale) === zoomScale);
			});
			document.getElementById('btnZoomFit').classList.toggle('active', zoomMode === 'fit');
		}

		document.getElementById('btnLoad').onclick = () => {
			const w = parseInt(document.getElementById('width').value, 10);
			const h = parseInt(document.getElementById('height').value, 10);
			vscode.postMessage({ type: 'load', width: w, height: h });
			document.getElementById('status').textContent = 'Loading...';
			document.getElementById('status').className = '';
		};

		window.addEventListener('message', (e) => {
			const msg = e.data;
			if (msg.type === 'error') {
				document.getElementById('status').textContent = msg.message;
				document.getElementById('status').className = 'error';
				return;
			}
			if (msg.type === 'loaded') {
				meta = {
					width: msg.width,
					height: msg.height,
					displayWidth: msg.displayWidth,
					displayHeight: msg.displayHeight,
					min: msg.min,
					max: msg.max,
					p1: msg.p1,
					p99: msg.p99
				};
				const binary = Uint8Array.from(atob(msg.imageDataBase64), c => c.charCodeAt(0));
				rawData = new Uint16Array(binary.buffer, 0, binary.length / 2);
				document.getElementById('windowSection').style.display = 'flex';
				document.getElementById('zoomSection').style.display = 'flex';
				document.getElementById('initialMsg').style.display = 'none';
				document.getElementById('canvas').style.display = 'block';
				document.getElementById('status').textContent = msg.displayWidth + '×' + msg.displayHeight + ' (original ' + msg.width + '×' + msg.height + ')  min=' + msg.min + ' max=' + msg.max + '  p1=' + msg.p1 + ' p99=' + msg.p99;
				document.getElementById('status').className = '';
				document.getElementById('level').max = Math.max(65535, msg.max);
				document.getElementById('level').value = Math.round((msg.p1 + msg.p99) / 2);
				document.getElementById('levelVal').textContent = document.getElementById('level').value;
				const winW = Math.max(1, msg.p99 - msg.p1);
				document.getElementById('window').max = Math.max(65535, msg.max - msg.min);
				document.getElementById('window').value = winW;
				document.getElementById('windowVal').textContent = winW;
				zoomMode = 'fit';
				zoomScale = 1;
				render();
				setTimeout(applyZoom, 0);
				return;
			}
		});

		function levelToMinMax() {
			const level = parseInt(document.getElementById('level').value, 10);
			const win = parseInt(document.getElementById('window').value, 10);
			const half = Math.floor(win / 2);
			return { min: Math.max(0, level - half), max: Math.min(65535, level + half) };
		}

		document.getElementById('level').oninput = () => {
			document.getElementById('levelVal').textContent = document.getElementById('level').value;
			if (rawData) render();
		};
		document.getElementById('window').oninput = () => {
			document.getElementById('windowVal').textContent = document.getElementById('window').value;
			if (rawData) render();
		};
		document.getElementById('btnAuto').onclick = () => {
			if (!meta) return;
			document.getElementById('level').value = Math.round((meta.p1 + meta.p99) / 2);
			document.getElementById('levelVal').textContent = document.getElementById('level').value;
			const winW = Math.max(1, meta.p99 - meta.p1);
			document.getElementById('window').value = winW;
			document.getElementById('windowVal').textContent = winW;
			render();
		};

		function render() {
			if (!rawData || !meta) return;
			const { min: wMin, max: wMax } = levelToMinMax();
			const range = wMax - wMin || 1;
			const canvas = document.getElementById('canvas');
			const d = meta.displayWidth;
			const e = meta.displayHeight;
			canvas.width = d;
			canvas.height = e;
			const ctx = canvas.getContext('2d');
			const imgData = ctx.createImageData(d, e);
			for (let i = 0; i < d * e; i++) {
				const v = rawData[i];
				const n = Math.max(0, Math.min(255, Math.round(((v - wMin) / range) * 255)));
				imgData.data[i * 4] = n;
				imgData.data[i * 4 + 1] = n;
				imgData.data[i * 4 + 2] = n;
				imgData.data[i * 4 + 3] = 255;
			}
			ctx.putImageData(imgData, 0, 0);
			applyZoom();
		}

		document.querySelectorAll('#zoomSection button[data-scale]').forEach(btn => {
			btn.onclick = () => {
				zoomMode = 'percent';
				zoomScale = parseFloat(btn.dataset.scale);
				applyZoom();
			};
		});
		document.getElementById('btnZoomFit').onclick = () => {
			zoomMode = 'fit';
			applyZoom();
		};
		window.addEventListener('resize', () => { if (zoomMode === 'fit') applyZoom(); });

		const pixelInfo = document.getElementById('pixelInfo');
		document.getElementById('canvas').addEventListener('mousemove', (ev) => {
			if (!rawData || !meta) return;
			const canvas = document.getElementById('canvas');
			const rect = canvas.getBoundingClientRect();
			const x = Math.floor((ev.clientX - rect.left) * (canvas.width / rect.width));
			const y = Math.floor((ev.clientY - rect.top) * (canvas.height / rect.height));
			if (x < 0 || x >= meta.displayWidth || y < 0 || y >= meta.displayHeight) {
				pixelInfo.style.display = 'none';
				return;
			}
			const idx = y * meta.displayWidth + x;
			const value = rawData[idx];
			pixelInfo.textContent = 'x: ' + x + '  y: ' + y + '  value: ' + value + ' (0x' + value.toString(16) + ')';
			pixelInfo.style.display = 'block';
			pixelInfo.style.left = (ev.clientX + 12) + 'px';
			pixelInfo.style.top = (ev.clientY + 12) + 'px';
		});
		document.getElementById('canvas').addEventListener('mouseleave', () => { pixelInfo.style.display = 'none'; });
	</script>
</body>
</html>`;
}

function escapeHtml(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}
