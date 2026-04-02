import * as vscode from 'vscode';
import { isCellSkipped } from './metadata';

export class SkipCellStatusBarProvider implements vscode.NotebookCellStatusBarItemProvider {
    private readonly _onDidChangeCellStatusBarItems = new vscode.EventEmitter<void>();
    readonly onDidChangeCellStatusBarItems = this._onDidChangeCellStatusBarItems.event;

    constructor(onMetadataChanged: vscode.Event<void>) {
        onMetadataChanged(() => this._onDidChangeCellStatusBarItems.fire());
    }

    provideCellStatusBarItems(
        cell: vscode.NotebookCell
    ): vscode.NotebookCellStatusBarItem[] {
        if (cell.kind !== vscode.NotebookCellKind.Code) {
            return [];
        }

        if (isCellSkipped(cell)) {
            const item = new vscode.NotebookCellStatusBarItem(
                '$(debug-step-over) Skipped on Run All',
                vscode.NotebookCellStatusBarAlignment.Left
            );
            item.command = {
                title: 'Include in Run All',
                command: 'notebook-cell-skip.toggleSkip',
            };
            item.tooltip = 'This cell will be skipped during Run All. Click to include it.';
            return [item];
        }

        return [];
    }
}

export function registerCellStatusBarProvider(
    context: vscode.ExtensionContext,
    onMetadataChanged: vscode.Event<void>
): void {
    const provider = new SkipCellStatusBarProvider(onMetadataChanged);
    context.subscriptions.push(
        vscode.notebooks.registerNotebookCellStatusBarItemProvider(
            'jupyter-notebook',
            provider
        )
    );
}
