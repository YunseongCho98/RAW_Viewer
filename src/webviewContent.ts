import * as vscode from 'vscode';

interface NavigationState {
	active: boolean;
	current: number;
	total: number;
	hasPrev: boolean;
	hasNext: boolean;
	folderName: string;
}

export function getWebviewContent(
	webview: vscode.Webview,
	opts: {
		fileSize: number;
		suggestedWidth: number;
		suggestedHeight: number;
		fileName: string;
		initialWidth: number;
		initialHeight: number;
		autoLoadDescription?: string;
		folderPresetDescription?: string;
		lastSuccessfulDescription?: string;
		navigation: NavigationState;
	}
): string {
	const {
		fileSize,
		suggestedWidth,
		suggestedHeight,
		fileName,
		initialWidth,
		initialHeight,
		autoLoadDescription,
		folderPresetDescription,
		lastSuccessfulDescription,
		navigation
	} = opts;

	const initialState = JSON.stringify({
		autoLoadDescription,
		folderPresetDescription,
		lastSuccessfulDescription,
		navigation
	});

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
			padding: 14px;
			font-family: var(--vscode-font-family);
			font-size: var(--vscode-font-size);
			color: var(--vscode-foreground);
			background: var(--vscode-editor-background);
		}
		.layout {
			display: grid;
			gap: 12px;
		}
		.panel {
			background: var(--vscode-input-background);
			border: 1px solid var(--vscode-input-border);
			border-radius: 8px;
			padding: 10px 12px;
		}
		.panel-title {
			margin: 0 0 8px;
			font-size: 11px;
			font-weight: 600;
			letter-spacing: 0.08em;
			text-transform: uppercase;
			color: var(--vscode-descriptionForeground);
		}
		.top-grid,
		.view-grid {
			display: grid;
			gap: 12px;
		}
		.top-grid {
			grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		}
		.view-grid {
			grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		}
		.meta-name {
			font-size: 13px;
			font-weight: 600;
			word-break: break-word;
			margin-bottom: 6px;
		}
		.meta-line,
		.hint-line,
		.panel-note,
		.session-text,
		#loadedMeta {
			font-size: 12px;
			color: var(--vscode-descriptionForeground);
		}
		.meta-line + .meta-line,
		.hint-line + .hint-line {
			margin-top: 4px;
		}
		.panel-note {
			margin-top: 8px;
			line-height: 1.45;
		}
		.form-row {
			display: flex;
			flex-wrap: wrap;
			gap: 8px;
			align-items: end;
		}
		.field {
			display: flex;
			flex-direction: column;
			gap: 4px;
		}
		.field label {
			font-size: 12px;
			color: var(--vscode-descriptionForeground);
		}
		input[type="number"] {
			width: 96px;
			padding: 6px 8px;
			background: var(--vscode-input-background);
			color: var(--vscode-input-foreground);
			border: 1px solid var(--vscode-input-border);
			border-radius: 6px;
		}
		button {
			padding: 6px 12px;
			border: none;
			border-radius: 6px;
			cursor: pointer;
			background: var(--vscode-button-background);
			color: var(--vscode-button-foreground);
		}
		button:hover {
			background: var(--vscode-button-hoverBackground);
		}
		button.secondary {
			background: var(--vscode-button-secondaryBackground);
			color: var(--vscode-button-secondaryForeground);
		}
		button.secondary:hover {
			background: var(--vscode-button-secondaryHoverBackground);
		}
		button:disabled {
			opacity: 0.5;
			cursor: default;
		}
		.button-row {
			display: flex;
			flex-wrap: wrap;
			gap: 8px;
		}
		.checkbox {
			display: flex;
			align-items: center;
			gap: 6px;
			margin-top: 8px;
			font-size: 12px;
			color: var(--vscode-descriptionForeground);
		}
		.compact-stack {
			display: grid;
			gap: 8px;
		}
		.slider-row {
			display: grid;
			grid-template-columns: 88px 1fr 52px;
			gap: 8px;
			align-items: center;
		}
		.slider-row label {
			font-size: 12px;
			color: var(--vscode-descriptionForeground);
		}
		.slider-row input[type="range"] {
			width: 100%;
		}
		.value {
			font-size: 12px;
			text-align: right;
			color: var(--vscode-descriptionForeground);
		}
		.segmented {
			display: flex;
			flex-wrap: wrap;
			gap: 8px;
			align-items: center;
		}
		.segmented button {
			padding: 4px 10px;
			font-size: 12px;
		}
		.segmented button.active {
			background: var(--vscode-button-background);
			color: var(--vscode-button-foreground);
		}
		#zoomVal {
			min-width: 42px;
			font-size: 12px;
			color: var(--vscode-descriptionForeground);
		}
		#canvasWrap {
			overflow: auto;
			max-height: calc(100vh - 320px);
			text-align: center;
			background: var(--vscode-editor-background);
			border: 1px solid var(--vscode-input-border);
			border-radius: 8px;
		}
		#canvas {
			display: block;
			margin: 0 auto;
			cursor: crosshair;
		}
		.initial-msg {
			padding: 28px 20px;
			color: var(--vscode-descriptionForeground);
			font-size: 12px;
		}
		#pixelInfo {
			position: fixed;
			display: none;
			z-index: 1000;
			pointer-events: none;
			padding: 6px 10px;
			border-radius: 6px;
			background: var(--vscode-editorWidget-background);
			border: 1px solid var(--vscode-input-border);
			box-shadow: 0 2px 8px rgba(0,0,0,0.3);
			font-size: 12px;
		}
		#error,
		.error {
			color: var(--vscode-errorForeground);
		}
	</style>
</head>
<body>
	<div class="layout">
		<div class="top-grid">
			<section class="panel">
				<h2 class="panel-title">File</h2>
				<div class="meta-name">${escapeHtml(fileName)}</div>
				<div class="meta-line">${(fileSize / 1024 / 1024).toFixed(2)} MB</div>
				<div class="meta-line">Suggested: ${suggestedWidth}×${suggestedHeight}</div>
			</section>

			<section class="panel">
				<h2 class="panel-title">Open</h2>
				<div class="form-row">
					<div class="field">
						<label for="width">Width</label>
						<input type="number" id="width" value="${initialWidth}" min="1" />
					</div>
					<div class="field">
						<label for="height">Height</label>
						<input type="number" id="height" value="${initialHeight}" min="1" />
					</div>
					<button id="btnLoad">Open</button>
				</div>
				<label class="checkbox">
					<input type="checkbox" id="rememberFolderPreset" />
					<span>Save as folder default</span>
				</label>
				<div class="panel-note">Use this for one file, or for the first file before saving a folder default.</div>
			</section>

			<section class="panel">
				<h2 class="panel-title">Presets</h2>
				<div id="autoInfo" class="hint-line" style="display:none;"></div>
				<div id="folderPresetInfo" class="hint-line" style="display:none;"></div>
				<div id="lastSuccessfulInfo" class="hint-line" style="display:none;"></div>
				<div class="button-row" style="margin-top:8px;">
					<button id="btnSavePreset" class="secondary" disabled>Save Current</button>
					<button id="btnClearPreset" class="secondary"${folderPresetDescription ? '' : ' style="display:none;"'}>Clear</button>
				</div>
				<div class="panel-note">A folder default is reused automatically when another RAW file in the same folder has the exact same byte size.</div>
			</section>

			<section class="panel">
				<h2 class="panel-title">Folder</h2>
				<div id="sessionLabel" class="session-text">Session inactive</div>
				<div class="button-row" style="margin-top:8px;">
					<button id="btnOpenFolderSession" class="secondary">Start Session</button>
					<button type="button" id="btnPrev" class="secondary"${navigation.hasPrev ? '' : ' disabled'}>Previous</button>
					<button type="button" id="btnNext" class="secondary"${navigation.hasNext ? '' : ' disabled'}>Next</button>
				</div>
				<div class="panel-note">Use a session when you want to review many RAW files in order with one shared resolution.</div>
			</section>
		</div>

		<div class="view-grid">
			<section id="windowSection" class="panel" style="display:none;">
				<h2 class="panel-title">Window</h2>
				<div class="compact-stack">
					<div class="button-row">
						<button id="btnAuto" class="secondary">Auto</button>
					</div>
					<div class="slider-row">
						<label for="level">Level</label>
						<input type="range" id="level" min="0" max="65535" value="32768" step="1" />
						<span class="value" id="levelVal">32768</span>
					</div>
					<div class="slider-row">
						<label for="window">Width</label>
						<input type="range" id="window" min="1" max="65535" value="4096" step="1" />
						<span class="value" id="windowVal">4096</span>
					</div>
				</div>
				<div class="panel-note">Auto uses the 1%-99% range of the loaded image to set a useful default contrast.</div>
			</section>

			<section id="zoomSection" class="panel" style="display:none;">
				<h2 class="panel-title">Display</h2>
				<div class="segmented">
					<button type="button" id="btnZoom25" data-scale="0.25">25%</button>
					<button type="button" id="btnZoom50" data-scale="0.5">50%</button>
					<button type="button" id="btnZoom75" data-scale="0.75">75%</button>
					<button type="button" id="btnZoom100" data-scale="1">100%</button>
					<button type="button" id="btnZoomFit" class="active">Fit</button>
					<span id="zoomVal"></span>
				</div>
				<div class="panel-note">Fit keeps the whole image inside the viewer. Percentage buttons use a fixed zoom level.</div>
			</section>
		</div>

		<div id="canvasWrap">
			<p id="initialMsg" class="initial-msg">Set a resolution and open the RAW file.</p>
			<canvas id="canvas" style="display:none;"></canvas>
		</div>
	</div>

	<div id="pixelInfo"></div>

	<script>
		const vscode = acquireVsCodeApi();
		const initialState = ${initialState};
		let rawData = null;
		let meta = null;
		let loadedResolution = null;
		let zoomScale = 1;
		let zoomMode = 'fit';

		function setText(id, text) {
			const el = document.getElementById(id);
			el.textContent = text || '';
		}

		function setOptionalText(id, text) {
			const el = document.getElementById(id);
			el.textContent = text || '';
			el.style.display = text ? 'block' : 'none';
		}

		function refreshInfoPanel() {
			setOptionalText(
				'autoInfo',
				extractResolution(initialState.autoLoadDescription)
					? 'Auto  ' + extractResolution(initialState.autoLoadDescription)
					: ''
			);
			setOptionalText(
				'folderPresetInfo',
				initialState.folderPresetDescription ? 'Folder  ' + initialState.folderPresetDescription : ''
			);
			setOptionalText(
				'lastSuccessfulInfo',
				initialState.lastSuccessfulDescription ? 'Last  ' + initialState.lastSuccessfulDescription : ''
			);
		}

		function extractResolution(text) {
			if (!text) return '';
			const match = text.match(/\\(([^)]+)\\)/);
			return match ? match[1] : '';
		}

		function refreshSessionState() {
			if (!initialState.navigation.active) {
				setText('sessionLabel', 'Session inactive');
				document.getElementById('btnPrev').disabled = true;
				document.getElementById('btnNext').disabled = true;
				return;
			}
			setText(
				'sessionLabel',
				initialState.navigation.folderName + '  ' + initialState.navigation.current + '/' + initialState.navigation.total
			);
			document.getElementById('btnPrev').disabled = !initialState.navigation.hasPrev;
			document.getElementById('btnNext').disabled = !initialState.navigation.hasNext;
		}

		function requestLoad(statusMessage) {
			const w = parseInt(document.getElementById('width').value, 10);
			const h = parseInt(document.getElementById('height').value, 10);
			const rememberFolderPreset = document.getElementById('rememberFolderPreset').checked;
			vscode.postMessage({ type: 'load', width: w, height: h, rememberFolderPreset });
		}

		function updateLoadedMeta() {
			return;
		}

		function applyZoom() {
			const canvas = document.getElementById('canvas');
			if (!meta || !canvas.width) return;
			let scale = zoomScale;
			if (zoomMode === 'fit') {
				const wrap = document.getElementById('canvasWrap');
				const maxW = Math.max(100, wrap.clientWidth - 24);
				const wrapRect = wrap.getBoundingClientRect();
				const viewportAvailableH = window.innerHeight - wrapRect.top - 24;
				const maxH = Math.max(100, viewportAvailableH);
				scale = Math.min(maxW / meta.displayWidth, maxH / meta.displayHeight, 1);
				scale = Math.max(0.1, Math.min(1, scale));
			}
			canvas.style.width = (canvas.width * scale) + 'px';
			canvas.style.height = (canvas.height * scale) + 'px';
			setText('zoomVal', Math.round(scale * 100) + '%');
			document.querySelectorAll('#zoomSection button[data-scale]').forEach(btn => {
				btn.classList.toggle('active', zoomMode !== 'fit' && parseFloat(btn.dataset.scale) === zoomScale);
			});
			document.getElementById('btnZoomFit').classList.toggle('active', zoomMode === 'fit');
		}

		document.getElementById('btnLoad').onclick = () => {
			requestLoad('Loading...');
		};
		document.getElementById('btnOpenFolderSession').onclick = () => {
			vscode.postMessage({ type: 'openFolderSession' });
		};
		document.getElementById('btnPrev').onclick = () => {
			vscode.postMessage({ type: 'navigate', direction: 'prev' });
		};
		document.getElementById('btnNext').onclick = () => {
			vscode.postMessage({ type: 'navigate', direction: 'next' });
		};
		document.getElementById('btnSavePreset').onclick = () => {
			if (!loadedResolution) return;
			vscode.postMessage({
				type: 'saveCurrentAsFolderPreset',
				width: loadedResolution.width,
				height: loadedResolution.height
			});
		};
		document.getElementById('btnClearPreset').onclick = () => {
			vscode.postMessage({ type: 'clearFolderPreset' });
		};

		window.addEventListener('message', (e) => {
			const msg = e.data;
			if (msg.type === 'error') {
				return;
			}
			if (msg.type === 'loaded') {
				loadedResolution = { width: msg.width, height: msg.height };
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
				document.getElementById('width').value = String(msg.width);
				document.getElementById('height').value = String(msg.height);
				document.getElementById('btnSavePreset').disabled = false;
				document.getElementById('windowSection').style.display = 'block';
				document.getElementById('zoomSection').style.display = 'block';
				document.getElementById('initialMsg').style.display = 'none';
				document.getElementById('canvas').style.display = 'block';
				updateLoadedMeta();
				document.getElementById('level').max = Math.max(65535, msg.max);
				document.getElementById('level').value = Math.round((msg.p1 + msg.p99) / 2);
				setText('levelVal', document.getElementById('level').value);
				const winW = Math.max(1, msg.p99 - msg.p1);
				document.getElementById('window').max = Math.max(65535, msg.max - msg.min);
				document.getElementById('window').value = winW;
				setText('windowVal', String(winW));
				zoomMode = 'fit';
				zoomScale = 1;
				render();
				setTimeout(applyZoom, 0);
				return;
			}
			if (msg.type === 'presetSaved') {
				initialState.folderPresetDescription = msg.folderPresetDescription || initialState.folderPresetDescription;
				document.getElementById('btnClearPreset').style.display = '';
				refreshInfoPanel();
				return;
			}
			if (msg.type === 'presetCleared') {
				initialState.folderPresetDescription = undefined;
				document.getElementById('btnClearPreset').style.display = 'none';
				refreshInfoPanel();
			}
		});

		function levelToMinMax() {
			const level = parseInt(document.getElementById('level').value, 10);
			const win = parseInt(document.getElementById('window').value, 10);
			const half = Math.floor(win / 2);
			return { min: Math.max(0, level - half), max: Math.min(65535, level + half) };
		}

		document.getElementById('level').oninput = () => {
			setText('levelVal', document.getElementById('level').value);
			if (rawData) render();
		};
		document.getElementById('window').oninput = () => {
			setText('windowVal', document.getElementById('window').value);
			if (rawData) render();
		};
		document.getElementById('btnAuto').onclick = () => {
			if (!meta) return;
			document.getElementById('level').value = Math.round((meta.p1 + meta.p99) / 2);
			setText('levelVal', document.getElementById('level').value);
			const winW = Math.max(1, meta.p99 - meta.p1);
			document.getElementById('window').value = winW;
			setText('windowVal', String(winW));
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
		window.addEventListener('resize', () => {
			if (zoomMode === 'fit') applyZoom();
		});

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
		document.getElementById('canvas').addEventListener('mouseleave', () => {
			pixelInfo.style.display = 'none';
		});

		refreshInfoPanel();
		refreshSessionState();
		updateLoadedMeta();
		if (initialState.autoLoadDescription) {
			requestLoad(initialState.autoLoadDescription);
		}
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
