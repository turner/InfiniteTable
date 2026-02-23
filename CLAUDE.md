# CLAUDE.md

## Project Overview

InfiniteTable is a zero-dependency, virtual-scrolling table component with real-time search. It replaces jQuery DataTables (via the `data-modal` npm wrapper) in [igv-webapp](https://github.com/igvteam/igv-webapp). DataTables is igv-webapp's last jQuery dependency — this project eliminates it entirely.

**Key drivers:** GenArk datasets are ~1M rows (DataTables paginates them poorly), jQuery elimination, simpler API.

**Repo:** `github.com/turner/InfiniteTable`
**Consumer:** `github.com/igvteam/igv-webapp` (local at `~/IGVDevelopment/igv-webapp`)

## Build & Test

No build step — published as raw ES6 source modules. Consumers import directly from `src/`.

SCSS is compiled to `css/infinite-table.css` (checked in). To recompile after SCSS changes:

```bash
sass scss/infinite-table.scss css/infinite-table.css --no-source-map --style=expanded
```

To run test pages, serve the repo root and open `test/*.html`:

```bash
npx serve .
# Then visit http://localhost:3000/test/basic.html etc.
```

## Architecture

**Factory functions returning plain objects.** No classes, no inheritance. State lives in closures. Components communicate through explicit function calls (no event bus).

### Composition

```
createInfiniteTable(config)
  ├── createColumnRenderer(columns, columnDefs)
  ├── createSearchFilter(columns, onFilterChange)
  ├── createRowSelection(mode, onSelectionChange)
  └── createVirtualScroller(container, renderRow, ...)

createModalTable(config)
  └── createInfiniteTable(...)  (inside Bootstrap modal)
```

### Source Modules

| Module | Responsibility |
|---|---|
| `domUtils.js` | `createElement`, `removeChildren`, `div` helpers |
| `columnRenderer.js` | Header + data cell rendering, CSS grid layout, `columnDefs` title overrides |
| `virtualScroller.js` | Scroll engine — sentinel div for total height, `translateY` positioning, row recycling pool, `requestAnimationFrame` throttling, 20-row buffer |
| `searchFilter.js` | Debounced input filter — pre-computes concatenated lowercase string per row on `setData`, substring match on input |
| `rowSelection.js` | Selected index tracking — single mode (one row) or multi mode (click/Shift+click range/Ctrl+Cmd toggle) |
| `infiniteTable.js` | Main component — composes all four pieces, wires callbacks, manages `displayData` index mapping (original indices after filtering) |
| `modalTable.js` | Bootstrap 5 modal wrapper — lazy build on `shown.bs.modal`, spinner, OK/Cancel footer |
| `index.js` | Public exports: `createInfiniteTable`, `createModalTable` |

### DOM Structure

```html
<div class="infinite-table">
  <div class="infinite-table__header">
    <input class="infinite-table__search" placeholder="Search...">
    <div class="infinite-table__header-row">  <!-- CSS grid -->
      <div class="infinite-table__cell">Column A</div>
    </div>
  </div>
  <div class="infinite-table__body">           <!-- overflow-y: auto -->
    <div class="infinite-table__sentinel">     <!-- height: rowCount * rowHeight -->
      <div class="infinite-table__visible">    <!-- transform: translateY(...) -->
        <div class="infinite-table__row" data-index="0">
          <div class="infinite-table__cell">value</div>
        </div>
      </div>
    </div>
  </div>
</div>
```

### SCSS

BEM naming. Design tokens in `_variables.scss`. Partials: `_base`, `_header`, `_body`, `_selection`. Compiled entry: `infinite-table.scss`.

## data-modal API Compatibility Contract

`createModalTable` is a drop-in replacement for `new ModalTable(config)` from `data-modal`. The following properties and methods are used by igv-webapp consumers (`trackWidgets.js`, `genomeWidgets.js`) and must remain compatible:

### Constructor config

```javascript
createModalTable({ id, title, datasource, okHandler, selectionStyle, parent, description })
```

- `id` — unique string, used for modal element ID and child IDs (`${id}-spinner`, `${id}-table-container`)
- `title` — modal header text
- `datasource` — object implementing the datasource interface (see below)
- `okHandler(selected)` — callback receiving array of selected row objects (transformed by `rowHandler` if defined)
- `selectionStyle` — `'single'` or `'multi'` (default: `'multi'`)
- `parent` — DOM element to append modal to (default: `document.body`)
- `description` — HTML string displayed above the table

### Required properties

- **`modal`** — the `bootstrap.Modal` instance. Consumers call `modalTable.modal.show()` and `modalTable.modal.hide()`.
- **`modalElement`** — the root DOM element of the modal.

### Required methods

- **`setDatasource(datasource)`** — swap data source, clear table, rebuild on next modal show
- **`setTitle(title)`** — update `.modal-title` text
- **`setDescription(html)`** — update description div innerHTML
- **`remove()`** — destroy and remove modal element from DOM
- **`buildTable()`** — async, called automatically on `shown.bs.modal`; fetches data, creates InfiniteTable
- **`getSelectedTableRowsData()`** — returns transformed selection array or `undefined` if nothing selected

### Datasource interface

The datasource object (typically `GenericDataSource` from data-modal) must implement:

```javascript
{
    columns: string[],                          // column names
    columnDefs: { [col]: { title: string } },   // optional display title overrides
    rowHandler: (row) => object,                // optional transform for selected rows

    async tableColumns(): string[],
    async tableData(): object[]
}
```

### getSelectedTableRowsData behavior (critical)

When `rowHandler` is defined on the datasource:
1. Get selected row objects from InfiniteTable
2. For each row, call `rowHandler(row)` to get transformed object (e.g. `{name, url, color}`)
3. Attach `metadata` property: an object containing only keys present in `datasource.columns`, copied from the original row
4. Return array of transformed objects

When no `rowHandler`: return the raw selected row objects.

### GenericDataSource (kept from data-modal)

InfiniteTable does NOT replace `GenericDataSource` — it stays in `data-modal` (or gets extracted). It handles URL loading, parsing (JSON/TSV/CSV), filtering, sorting. InfiniteTable only replaces `ModalTable`.

## igv-webapp Integration Plan (Phase 2)

### Import changes

**trackWidgets.js** and **genomeWidgets.js:**
```javascript
// Before:
import {GenericDataSource, ModalTable} from '../../node_modules/data-modal/src/index.js'
// After:
import {GenericDataSource} from '../../node_modules/data-modal/src/index.js'
import {createModalTable} from '../../node_modules/infinite-table/src/index.js'
```

Construction changes from `new ModalTable(config)` to `createModalTable(config)`.

### jQuery removal in trackWidgets.js

Convert these jQuery patterns to vanilla JS:

```javascript
// Line 175: $('#igv-app-track-dropdown-menu')
//        → document.getElementById('igv-app-track-dropdown-menu')

// Line 176: $dropdownMenu.find('#igv-app-annotations-section')
//        → dropdownMenu.querySelector('#igv-app-annotations-section')

// Line 177: $divider.nextAll().remove()
//        → while (divider.nextElementSibling) divider.nextElementSibling.remove()

// Lines 372-376: createDropdownButton using $('<button>'), .text(), .attr(), .insertAfter()
//        → document.createElement('button'), .textContent, .setAttribute, .insertAdjacentElement('afterend', ...)

// .on('click', ...) → .addEventListener('click', ...)
```

### Remove CDN includes from index.html

Delete: `jquery-3.5.1.slim.min.js`, DataTables CSS (`jquery.dataTables.min.css`), DataTables JS (`jquery.dataTables.min.js`, `dataTables.select.min.js`).

Add: `<link rel="stylesheet" href="node_modules/infinite-table/css/infinite-table.css">` (or copy into `css/`).

### Verification checklist

1. Load app, open ENCODE Signals-ChIP modal, select tracks, confirm they load in igv.js
2. Switch genome, confirm modal rebuilds with new datasource
3. Open GenArk modal, search for an assembly, select it, confirm genome loads (single-select mode)
4. Open any custom track registry modal, confirm data loads and selection works
5. Verify no jQuery references remain (`grep -r 'jquery\|\\$(' js/`)
