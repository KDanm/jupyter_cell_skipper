import * as vscode from 'vscode';
import { getCellSkipTag } from './metadata';
import { SkipState } from './skipState';

export class SkipCellStatusBarProvider implements vscode.NotebookCellStatusBarItemProvider {
    private readonly _onDidChangeCellStatusBarItems = new vscode.EventEmitter<void>();
    readonly onDidChangeCellStatusBarItems = this._onDidChangeCellStatusBarItems.event;

    constructor(
        private readonly skipState: SkipState,
        onMetadataChanged: vscode.Event<void>
    ) {
        onMetadataChanged(() => this._onDidChangeCellStatusBarItems.fire());
        skipState.onDidChange(() => this._onDidChangeCellStatusBarItems.fire());
    }

    provideCellStatusBarItems(
        cell: vscode.NotebookCell
    ): vscode.NotebookCellStatusBarItem[] {
        if (cell.kind !== vscode.NotebookCellKind.Code) {
            return [];
        }

        const tag = getCellSkipTag(cell, this.skipState.getAvailableTags());

        // Tagged cell with a skipped tag
        if (tag) {
            const skippedTags = this.skipState.getSkippedTags();
            if (skippedTags.includes(tag)) {
                const item = new vscode.NotebookCellStatusBarItem(
                    `$(debug-step-over) [${tag}] Skipped on Run All`,
                    vscode.NotebookCellStatusBarAlignment.Left
                );
                item.command = {
                    title: 'Cycle tag',
                    command: 'notebook-cell-skip.toggleSkip',
                };
                item.tooltip = `Tag "${tag}" is set to skip. Click to cycle tag.`;
                return [item];
            }
            return [];
        }

        // Untagged cell when skip-untagged is on
        if (this.skipState.skipUntagged) {
            const item = new vscode.NotebookCellStatusBarItem(
                '$(debug-step-over) Skipped on Run All (untagged)',
                vscode.NotebookCellStatusBarAlignment.Left
            );
            item.command = {
                title: 'Cycle tag',
                command: 'notebook-cell-skip.toggleSkip',
            };
            item.tooltip = 'Untagged cells are set to skip. Click to add a tag.';
            return [item];
        }

        return [];
    }
}

export function registerCellStatusBarProvider(
    context: vscode.ExtensionContext,
    onMetadataChanged: vscode.Event<void>,
    skipState: SkipState
): void {
    const provider = new SkipCellStatusBarProvider(skipState, onMetadataChanged);
    context.subscriptions.push(
        vscode.notebooks.registerNotebookCellStatusBarItemProvider(
            'jupyter-notebook',
            provider
        )
    );
}
