import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { RawDocument } from './rawDocument';
import { getWebviewContent } from './webviewContent';

const VIEW_TYPE = 'rawViewer.raw16';
const MAX_DISPLAY_PIXELS = 2048 * 2048;

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.window.registerCustomEditorProvider(
			VIEW_TYPE,
			new RawEditorProvider(context),
			{ webviewOptions: { retainContextWhenHidden: true }, supportsMultipleEditorsPerDocument: true }
		)
	);
}

class RawEditorProvider implements vscode.CustomReadonlyEditorProvider {
	constructor(private readonly _context: vscode.ExtensionContext) {}

	openCustomDocument(uri: vscode.Uri): vscode.CustomDocument {
		return new RawDocument(uri);
	}

	async resolveCustomEditor(
		document: vscode.CustomDocument,
		webviewPanel: vscode.WebviewPanel,
		_token: vscode.CancellationToken
	): Promise<void> {
		const doc = document as RawDocument;
		const fileSize = await getFileSize(doc.uri.fsPath);
		const suggested = suggestDimensions(fileSize);

		webviewPanel.webview.options = {
			enableScripts: true,
			localResourceRoots: []
		};
		webviewPanel.webview.html = getWebviewContent(webviewPanel.webview, {
			fileSize,
			suggestedWidth: suggested.width,
			suggestedHeight: suggested.height,
			fileName: path.basename(doc.uri.fsPath)
		});

		webviewPanel.webview.onDidReceiveMessage(async (msg) => {
			if (msg.type === 'load') {
				const { width, height } = msg;
				if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
					webviewPanel.webview.postMessage({ type: 'error', message: 'Enter valid width and height.' });
					return;
				}
				const expectedBytes = width * height * 2;
				if (fileSize !== expectedBytes) {
					webviewPanel.webview.postMessage({
						type: 'error',
						message: `File size mismatch: ${fileSize} bytes, ${width}×${height} expects ${expectedBytes} bytes`
					});
					return;
				}
				try {
					const result = await loadRaw16(doc.uri.fsPath, width, height);
					webviewPanel.webview.postMessage({ type: 'loaded', ...result });
				} catch (e) {
					const message = e instanceof Error ? e.message : String(e);
					webviewPanel.webview.postMessage({ type: 'error', message });
				}
			}
		});
	}
}

function getFileSize(fsPath: string): Promise<number> {
	return new Promise((resolve, reject) => {
		fs.stat(fsPath, (err, stat) => (err ? reject(err) : resolve(stat.size)));
	});
}

function suggestDimensions(fileSize: number): { width: number; height: number } {
	const pixels = Math.floor(fileSize / 2);
	if (pixels <= 0) return { width: 1, height: 1 };
	const sqrt = Math.round(Math.sqrt(pixels));
	const known: [number, number][] = [
		[3072, 3072], [2048, 2048], [1536, 1536], [1536, 1024],
		[2816, 3582], [2560, 3072]
	];
	for (const [w, h] of known) {
		if (w * h === pixels) return { width: w, height: h };
	}
	if (sqrt * sqrt === pixels) return { width: sqrt, height: sqrt };
	return { width: sqrt, height: Math.round(pixels / sqrt) };
}

interface LoadResult {
	width: number;
	height: number;
	displayWidth: number;
	displayHeight: number;
	min: number;
	max: number;
	p1: number;
	p99: number;
	imageDataBase64: string;
}

function loadRaw16(fsPath: string, width: number, height: number): Promise<LoadResult> {
	return new Promise((resolve, reject) => {
		fs.readFile(fsPath, (err, buf) => {
			if (err) return reject(err);
			const numPixels = width * height;
			if (buf.length < numPixels * 2) {
				return reject(new Error(`File too short: ${buf.length} bytes`));
			}
			const raw = new Uint16Array(numPixels);
			for (let i = 0; i < numPixels; i++) {
				raw[i] = buf.readUInt16LE(i * 2);
			}
			let min = 0xffff, max = 0;
			for (let i = 0; i < numPixels; i++) {
				const v = raw[i];
				if (v < min) min = v;
				if (v > max) max = v;
			}
			const sampleSize = Math.min(numPixels, 500000);
			const step = Math.max(1, Math.floor(numPixels / sampleSize));
			const sample: number[] = [];
			for (let i = 0; i < numPixels; i += step) sample.push(raw[i]);
			sample.sort((a, b) => a - b);
			const p1 = sample[Math.floor(sample.length * 0.01)] ?? min;
			const p99 = sample[Math.floor(sample.length * 0.99)] ?? max;

			let displayW = width;
			let displayH = height;
			if (numPixels > MAX_DISPLAY_PIXELS) {
				const scale = Math.sqrt(MAX_DISPLAY_PIXELS / numPixels);
				displayW = Math.max(1, Math.round(width * scale));
				displayH = Math.max(1, Math.round(height * scale));
			}
			const downscaled = downscale(raw, width, height, displayW, displayH);
			const imageDataBase64 = Buffer.from(downscaled.buffer).toString('base64');
			resolve({
				width,
				height,
				displayWidth: displayW,
				displayHeight: displayH,
				min,
				max,
				p1,
				p99,
				imageDataBase64
			});
		});
	});
}

function downscale(
	src: Uint16Array,
	srcW: number,
	srcH: number,
	dstW: number,
	dstH: number
): Uint16Array {
	const dst = new Uint16Array(dstW * dstH);
	const scaleX = srcW / dstW;
	const scaleY = srcH / dstH;
	for (let dy = 0; dy < dstH; dy++) {
		for (let dx = 0; dx < dstW; dx++) {
			const sx = Math.min(Math.floor(dx * scaleX), srcW - 1);
			const sy = Math.min(Math.floor(dy * scaleY), srcH - 1);
			dst[dy * dstW + dx] = src[sy * srcW + sx];
		}
	}
	return dst;
}
