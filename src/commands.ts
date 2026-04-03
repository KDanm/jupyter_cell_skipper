import * as vscode from 'vscode';
import { getCellSkipTag, isCellSkipped, setCellTag } from './metadata';
import { SkipState } from './skipState';

export function registerCommands(
    context: vscode.ExtensionContext,
    onMetadataChanged: vscode.EventEmitter<void>,
    skipState: SkipState
): void {
    // Cycle through tags on the current cell
    context.subscriptions.push(
        vscode.commands.registerCommand('notebook-cell-skip.toggleSkip', async (cell?: vscode.NotebookCell) => {
            const editor = vscode.window.activeNotebookEditor;
            if (!editor) {
                return;
            }

            const tags = skipState.getAvailableTags();
            if (tags.length === 0) {
                vscode.window.showInformationMessage('No tags configured. Use the filter button to add tags.');
                return;
            }

            const cycleCellTag = async (c: vscode.NotebookCell) => {
                const current = getCellSkipTag(c, tags);
                if (!current) {
                    await setCellTag(c, tags, tags[0]);
                } else {
                    const idx = tags.indexOf(current);
                    if (idx === tags.length - 1) {
                        await setCellTag(c, tags, undefined);
                    } else {
                        await setCellTag(c, tags, tags[idx + 1]);
                    }
                }
            };

            if (cell) {
                await cycleCellTag(cell);
                onMetadataChanged.fire();
                return;
            }

            for (const selection of editor.selections) {
                for (let i = selection.start; i < selection.end; i++) {
                    const c = editor.notebook.cellAt(i);
                    if (c.kind === vscode.NotebookCellKind.Code) {
                        await cycleCellTag(c);
                    }
                }
            }
            onMetadataChanged.fire();
        })
    );

    // Select which tags to skip, add new tags, or remove tags
    context.subscriptions.push(
        vscode.commands.registerCommand('notebook-cell-skip.selectSkippedTags', async () => {
            const showPicker = async (): Promise<void> => {
                const tags = skipState.getAvailableTags();
                const currentlySkipped = skipState.getSkippedTags();

                const ADD_LABEL = '$(add) Add new tag...';
                const REMOVE_LABEL = '$(trash) Remove a tag...';
                const SKIP_UNTAGGED_LABEL = 'Skip untagged cells';

                const actionItems = [
                    { label: ADD_LABEL, picked: false },
                    { label: REMOVE_LABEL, picked: false },
                    { label: SKIP_UNTAGGED_LABEL, picked: skipState.skipUntagged },
                ];
                const separator = { label: '', kind: vscode.QuickPickItemKind.Separator } as vscode.QuickPickItem & { picked?: boolean };
                const tagItems = tags.map(tag => ({
                    label: tag,
                    picked: currentlySkipped.includes(tag),
                }));

                const selected = await vscode.window.showQuickPick(
                    [...actionItems, separator, ...tagItems],
                    {
                        canPickMany: true,
                        title: 'Select tags to skip on Run All',
                        placeHolder: 'Checked tags will be skipped',
                    }
                );

                if (!selected) {
                    return;
                }

                const selectedLabels = selected.map(s => s.label);

                // Update skip-untagged state
                await skipState.setSkipUntagged(selectedLabels.includes(SKIP_UNTAGGED_LABEL));

                // Handle "Add new tag"
                if (selectedLabels.includes(ADD_LABEL)) {
                    const newTag = await vscode.window.showInputBox({
                        prompt: 'Enter a new tag name',
                        placeHolder: 'e.g. experimental',
                        validateInput: (value) => {
                            if (!value.trim()) {
                                return 'Tag name cannot be empty';
                            }
                            if (tags.includes(value.trim())) {
                                return 'Tag already exists';
                            }
                            return undefined;
                        },
                    });

                    if (newTag) {
                        await skipState.addTag(newTag.trim());
                    }

                    return showPicker();
                }

                // Handle "Remove a tag"
                if (selectedLabels.includes(REMOVE_LABEL)) {
                    const tagToRemove = await vscode.window.showQuickPick(
                        tags.map(t => ({ label: t })),
                        {
                            title: 'Select a tag to remove',
                            placeHolder: 'This tag will be removed from the list',
                        }
                    );

                    if (tagToRemove) {
                        await skipState.removeTag(tagToRemove.label);
                    }

                    return showPicker();
                }

                // Normal case: update which tags are skipped
                const skippedSelection = selected
                    .filter(s => s.label !== ADD_LABEL && s.label !== REMOVE_LABEL && s.label !== SKIP_UNTAGGED_LABEL)
                    .map(s => s.label);
                await skipState.setSkippedTags(skippedSelection);
                onMetadataChanged.fire();
            };

            await showPicker();
        })
    );

    // Run All but skip cells with selected tags
    context.subscriptions.push(
        vscode.commands.registerCommand('notebook-cell-skip.executeNotebook', async () => {
            const editor = vscode.window.activeNotebookEditor;
            if (!editor) {
                return;
            }

            const notebook = editor.notebook;
            const availableTags = skipState.getAvailableTags();
            const skippedTags = skipState.getSkippedTags();
            const skipUntagged = skipState.skipUntagged;
            const ranges: vscode.NotebookRange[] = [];
            let rangeStart: number | null = null;

            for (let i = 0; i < notebook.cellCount; i++) {
                const cell = notebook.cellAt(i);
                const isCode = cell.kind === vscode.NotebookCellKind.Code;
                const isTagSkipped = isCellSkipped(cell, availableTags, skippedTags);
                const isUntaggedSkipped = skipUntagged && isCode && !getCellSkipTag(cell, availableTags);
                const shouldRun = isCode && !isTagSkipped && !isUntaggedSkipped;

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

            for (const range of ranges) {
                await vscode.commands.executeCommand('notebook.cell.execute', {
                    ranges: [{ start: range.start, end: range.end }],
                    document: notebook.uri,
                });
            }
        })
    );

    // Add a new code cell pre-marked with the first configured tag
    context.subscriptions.push(
        vscode.commands.registerCommand('notebook-cell-skip.addSkipCell', async () => {
            const editor = vscode.window.activeNotebookEditor;
            if (!editor) {
                return;
            }

            const currentIndex = editor.selections.length > 0
                ? editor.selections[editor.selections.length - 1].end
                : editor.notebook.cellCount;

            const tags = skipState.getAvailableTags();
            if (tags.length === 0) {
                vscode.window.showInformationMessage('No tags configured. Use the filter button to add tags.');
                return;
            }
            const metadata: Record<string, unknown> = {
                metadata: { tags: [tags[0]] },
            };

            const newCell = new vscode.NotebookCellData(
                vscode.NotebookCellKind.Code,
                '',
                'python'
            );
            newCell.metadata = metadata;

            const edit = new vscode.WorkspaceEdit();
            const nbEdit = vscode.NotebookEdit.insertCells(currentIndex, [newCell]);
            edit.set(editor.notebook.uri, [nbEdit]);
            await vscode.workspace.applyEdit(edit);

            const newRange = new vscode.NotebookRange(currentIndex, currentIndex + 1);
            editor.selections = [newRange];
            editor.revealRange(newRange);

            onMetadataChanged.fire();
        })
    );

    // Reset tags to defaults
    context.subscriptions.push(
        vscode.commands.registerCommand('notebook-cell-skip.resetDefaults', async () => {
            await skipState.resetToDefaults();
            onMetadataChanged.fire();
            vscode.window.showInformationMessage('Notebook Cell Skip: tags reset to defaults.');
        })
    );
}
