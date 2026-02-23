/**
 * Tracks selected indices. Supports single and multi modes.
 * Single: click toggles one row; at most one selected at a time.
 * Multi: each click toggles that row independently.
 */
function createRowSelection({ mode = 'multi', onSelectionChange }) {

    const selected = new Set()

    function handleRowClick(index) {
        if (mode === 'single') {
            if (selected.has(index)) {
                selected.delete(index)
            } else {
                selected.clear()
                selected.add(index)
            }
        } else {
            // Multi mode — toggle
            if (selected.has(index)) {
                selected.delete(index)
            } else {
                selected.add(index)
            }
        }

        if (onSelectionChange) {
            onSelectionChange(getSelectedIndices())
        }
    }

    function getSelectedIndices() {
        return Array.from(selected).sort((a, b) => a - b)
    }

    function getSelectedData(data) {
        return getSelectedIndices().map(i => data[i]).filter(d => d !== undefined)
    }

    function clearSelection() {
        selected.clear()
        if (onSelectionChange) {
            onSelectionChange([])
        }
    }

    function isSelected(index) {
        return selected.has(index)
    }

    function destroy() {
        selected.clear()
    }

    return { handleRowClick, getSelectedIndices, getSelectedData, clearSelection, isSelected, destroy }
}

export { createRowSelection }
