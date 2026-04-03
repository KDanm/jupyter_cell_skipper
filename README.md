# Notebook Cell Skip

Mark Jupyter notebook cells to be **skipped during "Run All"** while keeping them individually executable.

Perfect for cells containing one-time setup, debugging snippets, or exploratory code that shouldn't run as part of your full notebook pipeline.

![Showcase](https://raw.githubusercontent.com/KDanm/jupyter_cell_skipper/main/assets/showcase.png)

## Features

### Cycle Cell Tag
Click the skip icon in the cell toolbar (right side of each code cell) to cycle through tags: `skip` → `debug` → `setup` → `misc` → *(no tag)*. The current tag and skip status are shown in the cell's status bar (e.g. `[setup] Skipped on Run All`).

### Run All (Skip Selected)
Located in the notebook toolbar next to the built-in Run All. Runs all cells except those tagged with a currently skipped tag.

### Select Tags to Skip
Click the filter icon in the notebook toolbar to open a dropdown where you can:
- **Check/uncheck tags** to control which are skipped on Run All
- **Add new tags** to extend the tag list
- **Remove tags** you no longer need
- **Skip untagged cells** to only run explicitly tagged cells that aren't marked for skipping

### Add Tagged Cell
Available from the command palette (`Notebook Cell Skip: Add Tagged Cell`). Inserts a new code cell pre-tagged with the first available tag.

### Reset Tags to Defaults
Available from the command palette (`Notebook Cell Skip: Reset Tags to Defaults`). Resets the tag list and skip selections back to defaults.

## How It Works

- Tags are stored as standard **Jupyter cell tags**, so they persist across saves, reopens, and version control.
- By default, all four tags (`skip`, `debug`, `setup`, `misc`) are selected for skipping.
- The available tag list and skip selections are stored per workspace.
- No dependency on specific Jupyter extension versions — uses only stable VS Code Notebook APIs.
- Running a tagged cell individually works exactly as normal. Tags only affect the "Run All (Skip Selected)" command.

## License

MIT
