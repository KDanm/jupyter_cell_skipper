import * as vscode from 'vscode';
import { registerCommands } from './commands';
import { registerCellStatusBarProvider } from './statusBarProvider';

export function activate(context: vscode.ExtensionContext) {
    // Shared event emitter so all components react to metadata changes
    const metadataChanged = new vscode.EventEmitter<void>();
    context.subscriptions.push(metadataChanged);

    // Also fire on any notebook document change that might include metadata edits
    context.subscriptions.push(
        vscode.workspace.onDidChangeNotebookDocument((e) => {
            const hasMetadataChange = e.cellChanges.some(
                (change) => change.metadata !== undefined
            );
            if (hasMetadataChange) {
                metadataChanged.fire();
            }
        })
    );

    registerCommands(context, metadataChanged);
    registerCellStatusBarProvider(context, metadataChanged.event);
}

export function deactivate() {}
