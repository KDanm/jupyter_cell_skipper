import * as vscode from 'vscode';
import { isCellSkipped, setCellSkipped } from './metadata';

export function registerCommands(
    context: vscode.ExtensionContext,
    onMetadataChanged: vscode.EventEmitter<void>
): void {
    // Toggle skip flag on the currently selected cell(s)
    context.subscriptions.push(
        vscode.commands.registerCommand('notebook-cell-skip.toggleSkip', async (cell?: vscode.NotebookCell) => {
            const editor = vscode.window.activeNotebookEditor;
            if (!editor) {
                return;
            }

            // If invoked from cell toolbar, we get the cell as argument
            if (cell) {
                await setCellSkipped(cell, !isCellSkipped(cell));
                onMetadataChanged.fire();
                return;
            }

            // Otherwise toggle all selected cells
            for (const selection of editor.selections) {
                for (let i = selection.start; i < selection.end; i++) {
                    const c = editor.notebook.cellAt(i);
                    if (c.kind === vscode.NotebookCellKind.Code) {
                        await setCellSkipped(c, !isCellSkipped(c));
                    }
                }
            }
            onMetadataChanged.fire();
        })
    );

    // Run All but skip marked cells
    context.subscriptions.push(
        vscode.commands.registerCommand('notebook-cell-skip.executeNotebook', async () => {
            const editor = vscode.window.activeNotebookEditor;
            if (!editor) {
                return;
            }

            const notebook = editor.notebook;
            const ranges: vscode.NotebookRange[] = [];
            let rangeStart: number | null = null;

            // Build contiguous ranges of non-skipped code cells
            for (let i = 0; i < notebook.cellCount; i++) {
                const cell = notebook.cellAt(i);
                const shouldRun = cell.kind === vscode.NotebookCellKind.Code && !isCellSkipped(cell);

                if (shouldRun) {
                    if (rangeStart === null) {
                        rangeStart = i;
                    }
                } else {
                    if (rangeStart !== null) {
                        ranges.push(new vscode.NotebookRange(rangeStart, i));
                        rangeStart = null;
                    }
                }
            }
            if (rangeStart !== null) {
                ranges.push(new vscode.NotebookRange(rangeStart, notebook.cellCount));
            }

            if (ranges.length === 0) {
                vscode.window.showInformationMessage('No executable cells (all code cells are marked as skip).');
                return;
            }

            // Execute each range via the built-in notebook cell execute command
            for (const range of ranges) {
                await vscode.commands.executeCommand('notebook.cell.execute', {
                    ranges: [{ start: range.start, end: range.end }],
                    document: notebook.uri,
                });
            }
        })
    );

    // Add a new code cell pre-marked as skip below the current cell
    context.subscriptions.push(
        vscode.commands.registerCommand('notebook-cell-skip.addSkipCell', async () => {
            const editor = vscode.window.activeNotebookEditor;
            if (!editor) {
                return;
            }

            // Insert below current selection
            const currentIndex = editor.selections.length > 0
                ? editor.selections[editor.selections.length - 1].end
                : editor.notebook.cellCount;

            const edit = new vscode.WorkspaceEdit();

            // Build metadata with skip flag
            const metadata: Record<string, unknown> = {};
            const ipynbExt = vscode.extensions.getExtension('vscode.ipynb');
            const useCustom = ipynbExt?.exports?.dropCustomMetadata
                ? !ipynbExt.exports.dropCustomMetadata()
                : true;

            if (useCustom) {
                metadata.custom = { metadata: { skip_on_run_all: true } };
            } else {
                metadata.metadata = { skip_on_run_all: true };
            }

            const newCell = new vscode.NotebookCellData(
                vscode.NotebookCellKind.Code,
                '# This cell is skipped on Run All\n',
                'python'
            );
            newCell.metadata = metadata;

            const nbEdit = vscode.NotebookEdit.insertCells(currentIndex, [newCell]);
            edit.set(editor.notebook.uri, [nbEdit]);
            await vscode.workspace.applyEdit(edit);

            // Focus the new cell
            const newRange = new vscode.NotebookRange(currentIndex, currentIndex + 1);
            editor.selections = [newRange];
            editor.revealRange(newRange);

            onMetadataChanged.fire();
        })
    );
}
