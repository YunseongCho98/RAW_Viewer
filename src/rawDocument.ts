import * as vscode from 'vscode';

export class RawDocument implements vscode.CustomDocument {
	constructor(public readonly uri: vscode.Uri) {}
	dispose(): void {}
}
