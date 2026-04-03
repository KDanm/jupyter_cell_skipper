import * as vscode from 'vscode';

function getCellTags(cell: vscode.NotebookCell): string[] {
    const meta = cell.metadata as Record<string, unknown>;

    // Check custom.metadata.tags (in-memory)
    const custom = meta.custom as Record<string, unknown> | undefined;
    if (custom) {
        const inner = custom.metadata as Record<string, unknown> | undefined;
        if (inner && Array.isArray(inner.tags)) {
            return inner.tags;
        }
    }

    // Check top-level metadata.tags (after save/reload)
    const topMeta = meta.metadata as Record<string, unknown> | undefined;
    if (topMeta && Array.isArray(topMeta.tags)) {
        return topMeta.tags;
    }

    return [];
}

/**
 * Get the extension-managed tag on a cell, if any.
 * Returns the first tag that matches one of the available tags, or undefined.
 */
export function getCellSkipTag(cell: vscode.NotebookCell, availableTags: string[]): string | undefined {
    const tags = getCellTags(cell);
    return tags.find(t => availableTags.includes(t));
}

/**
 * Check if a cell should be skipped based on which tags are currently active for skipping.
 */
export function isCellSkipped(cell: vscode.NotebookCell, availableTags: string[], skippedTags: string[]): boolean {
    const tag = getCellSkipTag(cell, availableTags);
    return tag !== undefined && skippedTags.includes(tag);
}

/**
 * Set the tag on a cell. Pass undefined to remove any extension-managed tag.
 */
export async function setCellTag(cell: vscode.NotebookCell, availableTags: string[], newTag: string | undefined): Promise<void> {
    const fullMeta = JSON.parse(JSON.stringify(cell.metadata ?? {})) as Record<string, unknown>;

    // Determine which path holds tags
    const custom = fullMeta.custom as Record<string, unknown> | undefined;
    let tagsHolder: Record<string, unknown>;

    if (custom) {
        tagsHolder = (custom.metadata ?? {}) as Record<string, unknown>;
        custom.metadata = tagsHolder;
    } else {
        tagsHolder = (fullMeta.metadata ?? {}) as Record<string, unknown>;
        fullMeta.metadata = tagsHolder;
    }

    // Remove any existing extension-managed tags
    let tags: string[] = Array.isArray(tagsHolder.tags) ? [...tagsHolder.tags] : [];
    tags = tags.filter(t => !availableTags.includes(t));

    // Add the new tag if specified
    if (newTag) {
        tags.push(newTag);
    }

    tagsHolder.tags = tags;

    const edit = new vscode.WorkspaceEdit();
    const nbEdit = vscode.NotebookEdit.updateCellMetadata(cell.index, fullMeta);
    edit.set(cell.notebook.uri, [nbEdit]);
    await vscode.workspace.applyEdit(edit);
}
