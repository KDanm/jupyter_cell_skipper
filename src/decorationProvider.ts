import * as vscode from 'vscode';

// Decoration provider is disabled — the cell status bar indicator
// ("Skipped on Run All") provides sufficient visual feedback.

export function registerDecorationProvider(
    _context: vscode.ExtensionContext,
    _onMetadataChanged: vscode.Event<void>
): void {
    // no-op
}
