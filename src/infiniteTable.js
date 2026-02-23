import { div } from './domUtils.js'
import { createColumnRenderer } from './columnRenderer.js'
import { createSearchFilter } from './searchFilter.js'
import { createRowSelection } from './rowSelection.js'
import { createVirtualScroller } from './virtualScroller.js'

/**
 * Main InfiniteTable component. Composes column renderer, search filter,
 * row selection, and virtual scroller into a standalone table.
 */
function createInfiniteTable({ container, columns, columnDefs, selectionStyle = 'multi' }) {

    let data = []
    let displayData = []  // After filtering — array of original indices
    let rowHandler = null

    // --- Component composition ---

    const columnRenderer = createColumnRenderer({ columns, columnDefs })

    const selection = createRowSelection({
        mode: selectionStyle,
        onSelectionChange: updateSelectionVisuals
    })

    const searchFilter = createSearchFilter({
        columns,
        onFilterChange: handleFilterChange
    })

    // --- DOM structure ---

    const root = div('infinite-table')

    // Header
    const header = div('infinite-table__header')
    header.appendChild(searchFilter.getElement())
    header.appendChild(columnRenderer.renderHeaderRow())
    root.appendChild(header)

    // Body (scrollable)
    const body = div('infinite-table__body')
    root.appendChild(body)

    const scroller = createVirtualScroller({
        container: body,
        renderRow: renderRowAtDisplayIndex,
        updateRow: updateRowAtDisplayIndex
    })

    // Delegated click handler on body
    body.addEventListener('click', (event) => {
        const row = event.target.closest('.infinite-table__row')
        if (!row) return
        const displayIndex = parseInt(row.dataset.index, 10)
        const originalIndex = displayData[displayIndex]
        selection.handleRowClick(originalIndex)
    })

    // Append to container
    if (container) {
        container.appendChild(root)
    }

    // --- Internal functions ---

    function renderRowAtDisplayIndex(displayIndex) {
        const originalIndex = displayData[displayIndex]
        const rowData = data[originalIndex]
        const row = columnRenderer.renderDataRow(rowData, displayIndex)
        if (selection.isSelected(originalIndex)) {
            row.classList.add('infinite-table__row--selected')
        }
        return row
    }

    function updateRowAtDisplayIndex(rowEl, displayIndex) {
        const originalIndex = displayData[displayIndex]
        const rowData = data[originalIndex]
        columnRenderer.updateDataRow(rowEl, rowData, displayIndex)
        if (selection.isSelected(originalIndex)) {
            rowEl.classList.add('infinite-table__row--selected')
        }
    }

    function handleFilterChange(filteredIndices) {
        const query = searchFilter.getElement().value.trim().toLowerCase()
        if (query === ':selected') {
            displayData = selection.getSelectedIndices()
            scroller.setRowCount(displayData.length)
            scroller.scrollToTop()
            updateResultCount()
            return
        }
        if (filteredIndices === null) {
            displayData = data.map((_, i) => i)
        } else {
            displayData = filteredIndices
        }
        scroller.setRowCount(displayData.length)
        scroller.scrollToTop()
        updateResultCount()
    }

    function updateSelectionVisuals() {
        scroller.refresh()
    }

    function updateResultCount() {
        // Could add a result count display in the future
    }

    // --- Public API ---

    function setData(rows) {
        data = rows || []
        displayData = data.map((_, i) => i)
        searchFilter.setData(data)
        selection.clearSelection()

        const filteredIndices = searchFilter.getFilteredIndices()
        if (filteredIndices !== null) {
            displayData = filteredIndices
        }

        scroller.setRowCount(displayData.length)
        scroller.scrollToTop()
    }

    function getData() {
        return data
    }

    function getFilteredData() {
        return displayData.map(i => data[i])
    }

    function getSelectedData() {
        return selection.getSelectedIndices().map(i => data[i]).filter(d => d !== undefined)
    }

    function getSelectedDisplayIndices() {
        const originalIndices = new Set(selection.getSelectedIndices())
        const result = []
        for (let di = 0; di < displayData.length; di++) {
            if (originalIndices.has(displayData[di])) {
                result.push(di)
            }
        }
        return result
    }

    function clearSelection() {
        selection.clearSelection()
        scroller.refresh()
    }

    function scrollToTop() {
        scroller.scrollToTop()
    }

    function setRowHandler(handler) {
        rowHandler = handler
    }

    function getRowHandler() {
        return rowHandler
    }

    function getElement() {
        return root
    }

    function getDisplayData() {
        return displayData
    }

    function destroy() {
        scroller.destroy()
        searchFilter.destroy()
        selection.destroy()
        columnRenderer.destroy()
        if (root.parentNode) {
            root.parentNode.removeChild(root)
        }
    }

    return {
        setData,
        getData,
        getFilteredData,
        getSelectedData,
        getSelectedDisplayIndices,
        clearSelection,
        scrollToTop,
        setRowHandler,
        getRowHandler,
        getElement,
        getDisplayData,
        destroy
    }
}

export { createInfiniteTable }
