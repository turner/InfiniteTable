# InfiniteTable

A zero-dependency, virtual-scrolling table component with real-time search. Designed to handle datasets from dozens to millions of rows with consistent performance.

InfiniteTable renders only the rows visible in the viewport (plus a small buffer), recycling DOM nodes as you scroll. This keeps memory flat and scrolling smooth regardless of dataset size. A debounced search filter pre-computes lowercase strings per row so filtering 1M rows completes in under 100ms.

## Features

- **Virtual scrolling** — Fixed row height enables O(1) index calculation. Only ~60-80 DOM rows exist at any time, even with 500K+ data rows.
- **Real-time search** — Debounced full-text filtering across all visible columns. Results update as you type.
- **Row selection** — Single and multi-select modes. Click toggles selection in both modes. Single mode allows at most one selected row; multi mode allows any number.
- **`:selected` filter** — Type `:selected` in the search box to narrow the view to only your selected rows.
- **Column definitions** — Optional `columnDefs` map overrides display titles (e.g. `AssayType` → "Assay Type").
- **Bootstrap modal wrapper** — `createModalTable` wraps InfiniteTable in a Bootstrap 5 modal with lazy data loading, a spinner, and an OK/Cancel footer. API-compatible with [data-modal](https://github.com/igvteam/data-modal)'s `ModalTable`.
- **No dependencies** — Pure ES6 modules. No jQuery, no build step required.

## Installation

As a Git dependency in `package.json`:

```json
{
  "dependencies": {
    "infinite-table": "github:turner/InfiniteTable"
  }
}
```

Then import from source:

```javascript
import { createInfiniteTable, createModalTable } from 'infinite-table/src/index.js'
```

Add the stylesheet to your HTML:

```html
<link rel="stylesheet" href="node_modules/infinite-table/css/infinite-table.css">
```

## Usage

### Standalone table

```javascript
import { createInfiniteTable } from 'infinite-table/src/index.js'

const table = createInfiniteTable({
    container: document.getElementById('my-container'),
    columns: ['Name', 'Category', 'Value'],
    columnDefs: { Category: { title: 'Track Category' } },
    selectionStyle: 'multi'   // or 'single'
})

table.setData([
    { Name: 'Alpha', Category: 'A', Value: '100' },
    { Name: 'Beta',  Category: 'B', Value: '200' }
])

// Later:
table.getSelectedData()   // returns array of selected row objects
table.getFilteredData()   // returns rows matching current search
table.clearSelection()
table.scrollToTop()
table.destroy()
```

### Bootstrap modal table

```javascript
import { createModalTable } from 'infinite-table/src/index.js'

const modalTable = createModalTable({
    id: 'encode-modal',
    title: 'ENCODE',
    selectionStyle: 'multi',
    datasource: myDataSource,      // object with tableColumns() and tableData() async methods
    okHandler: (selected) => {
        console.log('User selected:', selected)
    }
})

// Open the modal — table builds lazily on first show
modalTable.modal.show()

// Swap data source (clears and rebuilds on next show)
modalTable.setDatasource(newDataSource)

// Update modal content
modalTable.setTitle('New Title')
modalTable.setDescription('<em>Optional HTML description</em>')

// Tear down
modalTable.remove()
```

The `datasource` object must implement:

- `async tableColumns()` — returns `string[]` of column names
- `async tableData()` — returns `object[]` of row data
- `columns` (optional) — `string[]` used to build metadata on selected rows
- `columnDefs` (optional) — `{ [column]: { title: string } }` display title overrides
- `rowHandler` (optional) — `(row) => object` transforms selected rows before returning from `okHandler`

## Test Pages

Serve the project root with any static HTTP server and open the test pages in a browser.

```bash
npx serve .
```

Then visit `http://localhost:3000/test/<page>.html`.

| Page | What it tests |
|---|---|
| [basic.html](test/basic.html) | Renders 50 rows with 4 columns. Verify headers, cell content, and alternating row colors. |
| [large-dataset.html](test/large-dataset.html) | Generates 500K rows. Verify smooth scrolling and flat DOM node count (~60-80 nodes). Performance stats displayed at top. |
| [search.html](test/search.html) | 10K rows with real-time filtering. Type to filter, verify result count updates and scroll resets to top. |
| [selection.html](test/selection.html) | Two tables side by side — multi-select and single-select. Test click-to-toggle behavior in both modes. |
| [modal.html](test/modal.html) | Bootstrap 5 modal with simulated async data loading (500ms delay). Verify spinner, row selection, and OK handler output. |
| [encode-like.html](test/encode-like.html) | Realistic ENCODE-style dataset with `columnDefs` title overrides and a `rowHandler` that transforms selections into `{name, url, color, metadata}` track config objects. |

## License

MIT
