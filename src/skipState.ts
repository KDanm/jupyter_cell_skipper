import * as vscode from 'vscode';

const DEFAULT_TAGS = ['skip', 'debug', 'setup', 'misc'];
const SKIPPED_TAGS_KEY = 'notebookCellSkip.skippedTags';
const AVAILABLE_TAGS_KEY = 'notebookCellSkip.availableTags';
const SKIP_UNTAGGED_KEY = 'notebookCellSkip.skipUntagged';

/**
 * Manages available tags and which are currently selected for skipping.
 * Both are persisted in workspace state.
 */
export class SkipState {
    private availableTags: string[];
    private skippedTags: string[];
    private _skipUntagged: boolean;
    private readonly _onDidChange = new vscode.EventEmitter<void>();
    readonly onDidChange = this._onDidChange.event;

    constructor(private readonly storage: vscode.Memento) {
        this.availableTags = storage.get<string[]>(AVAILABLE_TAGS_KEY) ?? [...DEFAULT_TAGS];
        this.skippedTags = storage.get<string[]>(SKIPPED_TAGS_KEY) ?? [...this.availableTags];
        this._skipUntagged = storage.get<boolean>(SKIP_UNTAGGED_KEY) ?? false;
    }

    getAvailableTags(): string[] {
        return [...this.availableTags];
    }

    getSkippedTags(): string[] {
        return [...this.skippedTags];
    }

    async setSkippedTags(tags: string[]): Promise<void> {
        this.skippedTags = [...tags];
        await this.storage.update(SKIPPED_TAGS_KEY, this.skippedTags);
        this._onDidChange.fire();
    }

    async addTag(tag: string): Promise<void> {
        if (!this.availableTags.includes(tag)) {
            this.availableTags.push(tag);
            await this.storage.update(AVAILABLE_TAGS_KEY, this.availableTags);
            this._onDidChange.fire();
        }
    }

    get skipUntagged(): boolean {
        return this._skipUntagged;
    }

    async setSkipUntagged(value: boolean): Promise<void> {
        this._skipUntagged = value;
        await this.storage.update(SKIP_UNTAGGED_KEY, value);
        this._onDidChange.fire();
    }

    async resetToDefaults(): Promise<void> {
        this.availableTags = [...DEFAULT_TAGS];
        this.skippedTags = [...DEFAULT_TAGS];
        this._skipUntagged = false;
        await this.storage.update(AVAILABLE_TAGS_KEY, undefined);
        await this.storage.update(SKIPPED_TAGS_KEY, undefined);
        await this.storage.update(SKIP_UNTAGGED_KEY, undefined);
        this._onDidChange.fire();
    }

    async removeTag(tag: string): Promise<void> {
        this.availableTags = this.availableTags.filter(t => t !== tag);
        this.skippedTags = this.skippedTags.filter(t => t !== tag);
        await this.storage.update(AVAILABLE_TAGS_KEY, this.availableTags);
        await this.storage.update(SKIPPED_TAGS_KEY, this.skippedTags);
        this._onDidChange.fire();
    }

    dispose() {
        this._onDidChange.dispose();
    }
}
