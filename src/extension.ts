import * as vscode from 'vscode';
import { registerCommands } from './commands';
import { registerCellStatusBarProvider } from './statusBarProvider';
import { SkipState } from './skipState';

export function activate(context: vscode.ExtensionContext) {
    const metadataChanged = new vscode.EventEmitter<void>();
    context.subscriptions.push(metadataChanged);

    const skipState = new SkipState(context.workspaceState);
    context.subscriptions.push({ dispose: () => skipState.dispose() });

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

    registerCommands(context, metadataChanged, skipState);
    registerCellStatusBarProvider(context, metadataChanged.event, skipState);
}

export function deactivate() {}
