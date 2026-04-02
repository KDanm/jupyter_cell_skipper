import * as vscode from 'vscode';

const SKIP_TAG = 'skip_on_run_all';

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

export function isCellSkipped(cell: vscode.NotebookCell): boolean {
    return getCellTags(cell).includes(SKIP_TAG);
}

export async function setCellSkipped(cell: vscode.NotebookCell, skipped: boolean): Promise<void> {
    const fullMeta = JSON.parse(JSON.stringify(cell.metadata ?? {})) as Record<string, unknown>;

    // Determine which path holds tags and update there
    const custom = fullMeta.custom as Record<string, unknown> | undefined;
    let tagsHolder: Record<string, unknown>;

    if (custom) {
        tagsHolder = (custom.metadata ?? {}) as Record<string, unknown>;
        custom.metadata = tagsHolder;
    } else {
        tagsHolder = (fullMeta.metadata ?? {}) as Record<string, unknown>;
        fullMeta.metadata = tagsHolder;
    }

    const tags: string[] = Array.isArray(tagsHolder.tags) ? [...tagsHolder.tags] : [];

    if (skipped && !tags.includes(SKIP_TAG)) {
        tags.push(SKIP_TAG);
    } else if (!skipped) {
        const idx = tags.indexOf(SKIP_TAG);
        if (idx !== -1) {
            tags.splice(idx, 1);
        }
    }

    tagsHolder.tags = tags;

    const edit = new vscode.WorkspaceEdit();
    const nbEdit = vscode.NotebookEdit.updateCellMetadata(cell.index, fullMeta);
    edit.set(cell.notebook.uri, [nbEdit]);
    await vscode.workspace.applyEdit(edit);
}
