import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { RawDocument } from './rawDocument';
import { getWebviewContent } from './webviewContent';

const VIEW_TYPE = 'rawViewer.raw16';
const MAX_DISPLAY_PIXELS = 2048 * 2048;
const LAST_SUCCESSFUL_RESOLUTION_KEY = 'rawViewer.lastSuccessfulResolution';
const FOLDER_PRESETS_KEY = 'rawViewer.folderPresets';

interface Resolution {
	width: number;
	height: number;
}

interface FolderSession {
	folderPath: string;
	files: string[];
	index: number;
	resolution: Resolution;
}

interface NavigationState {
	active: boolean;
	current: number;
	total: number;
	hasPrev: boolean;
	hasNext: boolean;
	folderName: string;
}

interface AutoLoadCandidate {
	description: string;
	resolution: Resolution;
}

type FolderPresetStore = Record<string, Resolution>;

const EMPTY_NAVIGATION_STATE: NavigationState = {
	active: false,
	current: 0,
	total: 0,
	hasPrev: false,
	hasNext: false,
	folderName: ''
};

export function activate(context: vscode.ExtensionContext) {
	const provider = new RawEditorProvider(context);

	context.subscriptions.push(
		vscode.window.registerCustomEditorProvider(
			VIEW_TYPE,
			provider,
			{ webviewOptions: { retainContextWhenHidden: true }, supportsMultipleEditorsPerDocument: true }
		)
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('rawViewer.openFolderSession', async (resource?: vscode.Uri) => {
			await provider.startFolderSession(resource);
		})
	);
}

class RawEditorProvider implements vscode.CustomReadonlyEditorProvider {
	private activeFolderSession: FolderSession | undefined;

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
		const folderPath = path.dirname(doc.uri.fsPath);
		const lastSuccessfulResolution = this.getLastSuccessfulResolution();
		const savedFolderPreset = this.getFolderPreset(folderPath);
		const navigation = this.getNavigationState(doc.uri.fsPath);
		const autoLoad = this.getAutoLoadCandidate(doc.uri.fsPath, fileSize);
		const initialResolution = autoLoad?.resolution ?? suggested;

		webviewPanel.webview.options = {
			enableScripts: true,
			localResourceRoots: []
		};
		webviewPanel.webview.html = getWebviewContent(webviewPanel.webview, {
			fileSize,
			suggestedWidth: suggested.width,
			suggestedHeight: suggested.height,
			fileName: path.basename(doc.uri.fsPath),
			initialWidth: initialResolution.width,
			initialHeight: initialResolution.height,
			autoLoadDescription: autoLoad?.description,
			folderPresetDescription: savedFolderPreset ? formatResolution(savedFolderPreset) : undefined,
			lastSuccessfulDescription: lastSuccessfulResolution ? formatResolution(lastSuccessfulResolution) : undefined,
			navigation
		});

		webviewPanel.webview.onDidReceiveMessage(async (msg) => {
			if (!msg || typeof msg !== 'object') return;

			if (msg.type === 'load') {
				await this.loadIntoPanel(doc.uri.fsPath, fileSize, webviewPanel, msg);
				return;
			}

			if (msg.type === 'openFolderSession') {
				await this.startFolderSession(vscode.Uri.file(folderPath));
				return;
			}

			if (msg.type === 'navigate' && (msg.direction === 'prev' || msg.direction === 'next')) {
				await this.navigateFolderSession(doc.uri.fsPath, msg.direction);
				return;
			}

			if (msg.type === 'saveCurrentAsFolderPreset') {
				const width = typeof msg.width === 'number' ? msg.width : Number.NaN;
				const height = typeof msg.height === 'number' ? msg.height : Number.NaN;
				if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
					webviewPanel.webview.postMessage({ type: 'error', message: 'No loaded resolution is available to save.' });
					return;
				}
				const resolution = { width, height };
				await this.saveFolderPreset(folderPath, resolution);
				webviewPanel.webview.postMessage({
					type: 'presetSaved',
					folderPresetDescription: formatResolution(resolution),
					message: `Saved ${formatResolution(resolution)} for this folder.`
				});
				return;
			}

			if (msg.type === 'clearFolderPreset') {
				await this.clearFolderPreset(folderPath);
				webviewPanel.webview.postMessage({
					type: 'presetCleared',
					message: 'Cleared the saved folder preset.'
				});
			}
		});
	}

	async startFolderSession(resource?: vscode.Uri): Promise<void> {
		const folderUri = await this.resolveFolderUri(resource);
		if (!folderUri) return;

		const folderPath = folderUri.fsPath;
		const files = await getRawFilesInFolder(folderPath);
		if (files.length === 0) {
			void vscode.window.showWarningMessage('No .raw files were found in the selected folder.');
			return;
		}

		const defaults = await this.getFolderSessionDefaultResolution(folderPath, files[0]);
		const width = await promptForDimension('RAW Viewer folder width', defaults.width);
		if (width === undefined) return;

		const height = await promptForDimension('RAW Viewer folder height', defaults.height);
		if (height === undefined) return;

		const applyChoice = await vscode.window.showQuickPick(
			[
				{
					label: 'Save as folder preset',
					value: 'save',
					description: 'Remember this resolution and auto-open compatible files in this folder'
				},
				{
					label: 'Use for this session only',
					value: 'session',
					description: 'Keep it only for Previous/Next navigation in the current session'
				}
			],
			{ placeHolder: 'How should this folder resolution be applied?' }
		);
		if (!applyChoice) return;

		const resolution = { width, height };
		if (applyChoice.value === 'save') {
			await this.saveFolderPreset(folderPath, resolution);
		}

		const firstCompatibleIndex = await findFirstCompatibleFileIndex(files, resolution);
		const startIndex = firstCompatibleIndex >= 0 ? firstCompatibleIndex : 0;
		this.activeFolderSession = {
			folderPath,
			files,
			index: startIndex,
			resolution
		};

		if (firstCompatibleIndex < 0) {
			void vscode.window.showWarningMessage(
				`No file in ${path.basename(folderPath)} matches ${formatResolution(resolution)} exactly. Opening the first file so you can adjust it manually.`
			);
		}

		await this.openRawFile(files[startIndex]);
	}

	private async loadIntoPanel(
		fsPath: string,
		fileSize: number,
		webviewPanel: vscode.WebviewPanel,
		msg: { width: unknown; height: unknown; rememberFolderPreset?: unknown }
	): Promise<void> {
		const width = typeof msg.width === 'number' ? msg.width : Number.NaN;
		const height = typeof msg.height === 'number' ? msg.height : Number.NaN;
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
			const result = await loadRaw16(fsPath, width, height);
			const resolution = { width, height };
			const folderPath = path.dirname(fsPath);
			await this.saveLastSuccessfulResolution(resolution);

			if (this.activeFolderSession && this.activeFolderSession.folderPath === folderPath) {
				this.activeFolderSession.resolution = resolution;
				this.activeFolderSession.index = this.activeFolderSession.files.indexOf(fsPath);
			}

			if (msg.rememberFolderPreset === true) {
				await this.saveFolderPreset(folderPath, resolution);
				webviewPanel.webview.postMessage({
					type: 'presetSaved',
					folderPresetDescription: formatResolution(resolution),
					message: `Saved ${formatResolution(resolution)} for this folder.`
				});
			}

			webviewPanel.webview.postMessage({ type: 'loaded', ...result });
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			webviewPanel.webview.postMessage({ type: 'error', message });
		}
	}

	private async navigateFolderSession(fsPath: string, direction: 'prev' | 'next'): Promise<void> {
		const session = this.getSessionForFile(fsPath);
		if (!session) {
			void vscode.window.showInformationMessage('No active folder session is available for this file.');
			return;
		}

		const currentIndex = session.files.indexOf(fsPath);
		const nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
		if (nextIndex < 0 || nextIndex >= session.files.length) {
			void vscode.window.showInformationMessage(
				direction === 'next' ? 'This is the last file in the folder session.' : 'This is the first file in the folder session.'
			);
			return;
		}

		session.index = nextIndex;
		await this.openRawFile(session.files[nextIndex]);
	}

	private async openRawFile(fsPath: string): Promise<void> {
		await vscode.commands.executeCommand('vscode.openWith', vscode.Uri.file(fsPath), VIEW_TYPE);
	}

	private getAutoLoadCandidate(fsPath: string, fileSize: number): AutoLoadCandidate | undefined {
		const session = this.getSessionForFile(fsPath);
		if (session && isResolutionCompatible(session.resolution, fileSize)) {
			return {
				description: `Auto-opened with the active folder session resolution (${formatResolution(session.resolution)}).`,
				resolution: session.resolution
			};
		}

		const config = vscode.workspace.getConfiguration('rawViewer');
		const folderPath = path.dirname(fsPath);
		if (config.get<boolean>('autoOpenWithFolderPreset', true)) {
			const folderPreset = this.getFolderPreset(folderPath);
			if (folderPreset && isResolutionCompatible(folderPreset, fileSize)) {
				return {
					description: `Auto-opened with the saved folder preset (${formatResolution(folderPreset)}).`,
					resolution: folderPreset
				};
			}
		}

		if (config.get<boolean>('autoOpenWithLastSuccessfulResolution', true)) {
			const lastSuccessful = this.getLastSuccessfulResolution();
			if (lastSuccessful && isResolutionCompatible(lastSuccessful, fileSize)) {
				return {
					description: `Auto-opened with the last successful resolution (${formatResolution(lastSuccessful)}).`,
					resolution: lastSuccessful
				};
			}
		}

		return undefined;
	}

	private getLastSuccessfulResolution(): Resolution | undefined {
		return this._context.globalState.get<Resolution | undefined>(LAST_SUCCESSFUL_RESOLUTION_KEY);
	}

	private async saveLastSuccessfulResolution(resolution: Resolution): Promise<void> {
		await this._context.globalState.update(LAST_SUCCESSFUL_RESOLUTION_KEY, resolution);
	}

	private getFolderPreset(folderPath: string): Resolution | undefined {
		const store = this._context.globalState.get<FolderPresetStore>(FOLDER_PRESETS_KEY, {});
		return store[folderPath];
	}

	private async saveFolderPreset(folderPath: string, resolution: Resolution): Promise<void> {
		const store = this._context.globalState.get<FolderPresetStore>(FOLDER_PRESETS_KEY, {});
		store[folderPath] = resolution;
		await this._context.globalState.update(FOLDER_PRESETS_KEY, store);
	}

	private async clearFolderPreset(folderPath: string): Promise<void> {
		const store = this._context.globalState.get<FolderPresetStore>(FOLDER_PRESETS_KEY, {});
		delete store[folderPath];
		await this._context.globalState.update(FOLDER_PRESETS_KEY, store);
	}

	private getNavigationState(fsPath: string): NavigationState {
		const session = this.getSessionForFile(fsPath);
		if (!session) return EMPTY_NAVIGATION_STATE;

		const currentIndex = session.files.indexOf(fsPath);
		if (currentIndex < 0) return EMPTY_NAVIGATION_STATE;

		return {
			active: true,
			current: currentIndex + 1,
			total: session.files.length,
			hasPrev: currentIndex > 0,
			hasNext: currentIndex < session.files.length - 1,
			folderName: path.basename(session.folderPath)
		};
	}

	private getSessionForFile(fsPath: string): FolderSession | undefined {
		if (!this.activeFolderSession) return undefined;
		if (this.activeFolderSession.folderPath !== path.dirname(fsPath)) return undefined;
		if (!this.activeFolderSession.files.includes(fsPath)) return undefined;
		return this.activeFolderSession;
	}

	private async resolveFolderUri(resource?: vscode.Uri): Promise<vscode.Uri | undefined> {
		if (resource) {
			const stat = await fs.promises.stat(resource.fsPath);
			if (stat.isDirectory()) return resource;
			return vscode.Uri.file(path.dirname(resource.fsPath));
		}

		const defaultUri = vscode.workspace.workspaceFolders?.[0]?.uri;
		const picked = await vscode.window.showOpenDialog({
			canSelectFiles: false,
			canSelectFolders: true,
			canSelectMany: false,
			defaultUri,
			openLabel: 'Open RAW Folder Session'
		});
		return picked?.[0];
	}

	private async getFolderSessionDefaultResolution(folderPath: string, sampleFilePath: string): Promise<Resolution> {
		const folderPreset = this.getFolderPreset(folderPath);
		if (folderPreset) return folderPreset;

		const lastSuccessful = this.getLastSuccessfulResolution();
		if (lastSuccessful) return lastSuccessful;

		const fileSize = await getFileSize(sampleFilePath);
		return suggestDimensions(fileSize);
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

function formatResolution(resolution: Resolution): string {
	return `${resolution.width}×${resolution.height}`;
}

function isResolutionCompatible(resolution: Resolution, fileSize: number): boolean {
	return resolution.width * resolution.height * 2 === fileSize;
}

async function promptForDimension(prompt: string, value: number): Promise<number | undefined> {
	const result = await vscode.window.showInputBox({
		prompt,
		value: String(value),
		validateInput: (input) => {
			if (!/^\d+$/.test(input)) return 'Enter a positive integer.';
			if (Number(input) < 1) return 'Value must be at least 1.';
			return undefined;
		}
	});

	if (result === undefined) return undefined;
	return Number(result);
}

async function getRawFilesInFolder(folderPath: string): Promise<string[]> {
	const entries = await fs.promises.readdir(folderPath, { withFileTypes: true });
	return entries
		.filter((entry) => entry.isFile() && /\.raw$/i.test(entry.name))
		.map((entry) => path.join(folderPath, entry.name))
		.sort((a, b) => path.basename(a).localeCompare(path.basename(b), undefined, { numeric: true, sensitivity: 'base' }));
}

async function findFirstCompatibleFileIndex(files: string[], resolution: Resolution): Promise<number> {
	for (let i = 0; i < files.length; i++) {
		const size = await getFileSize(files[i]);
		if (isResolutionCompatible(resolution, size)) return i;
	}
	return -1;
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
