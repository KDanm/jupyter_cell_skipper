import * as vscode from 'vscode';

const SKIP_KEY = 'skip_on_run_all';

/**
 * Check whether the vscode.ipynb built-in extension uses the "custom" wrapper
 * for cell metadata. This mirrors the approach used by vscode-jupyter-cell-tags.
 */
function useCustomMetadata(): boolean {
    const ipynbExt = vscode.extensions.getExtension('vscode.ipynb');
    if (ipynbExt) {
        const exports = ipynbExt.exports;
        if (exports && typeof exports.dropCustomMetadata === 'function') {
            return !exports.dropCustomMetadata();
        }
    }
    // Default: older VS Code versions use custom nesting
    return true;
}

function getCellMetadataObj(cell: vscode.NotebookCell): Record<string, unknown> {
    const meta = cell.metadata as Record<string, unknown>;
    if (useCustomMetadata()) {
        const custom = (meta.custom ?? {}) as Record<string, unknown>;
        return (custom.metadata ?? {}) as Record<string, unknown>;
    }
    return (meta.metadata ?? {}) as Record<string, unknown>;
}

export function isCellSkipped(cell: vscode.NotebookCell): boolean {
    const cellMeta = getCellMetadataObj(cell);
    return cellMeta[SKIP_KEY] === true;
}

export async function setCellSkipped(cell: vscode.NotebookCell, skipped: boolean): Promise<void> {
    const fullMeta = JSON.parse(JSON.stringify(cell.metadata ?? {})) as Record<string, unknown>;

    if (useCustomMetadata()) {
        const custom = (fullMeta.custom ?? {}) as Record<string, unknown>;
        const innerMeta = (custom.metadata ?? {}) as Record<string, unknown>;
        if (skipped) {
            innerMeta[SKIP_KEY] = true;
        } else {
            delete innerMeta[SKIP_KEY];
        }
        custom.metadata = innerMeta;
        fullMeta.custom = custom;
    } else {
        const innerMeta = (fullMeta.metadata ?? {}) as Record<string, unknown>;
        if (skipped) {
            innerMeta[SKIP_KEY] = true;
        } else {
            delete innerMeta[SKIP_KEY];
        }
        fullMeta.metadata = innerMeta;
    }

    const edit = new vscode.WorkspaceEdit();
    const nbEdit = vscode.NotebookEdit.updateCellMetadata(cell.index, fullMeta);
    edit.set(cell.notebook.uri, [nbEdit]);
    await vscode.workspace.applyEdit(edit);
}
