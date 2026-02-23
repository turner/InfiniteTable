import { div } from './domUtils.js'

/**
 * Virtual scrolling engine. Fixed row height enables O(1) index calculation.
 * Only renders visible rows + buffer, recycling DOM nodes for performance.
 */
function createVirtualScroller({ container, rowHeight = 28, bufferSize = 20, renderRow, updateRow }) {

    let rowCount = 0
    let measuredRowHeight = rowHeight
    let hasMeasured = false
    let lastRenderStart = -1
    let lastRenderEnd = -1
    let rafId = null
    let pool = []

    // Sentinel sets total scrollable height
    const sentinel = div('infinite-table__sentinel')
    sentinel.style.position = 'relative'

    // Visible rows container, positioned via transform
    const visible = div('infinite-table__visible')
    visible.style.position = 'absolute'
    visible.style.left = '0'
    visible.style.right = '0'
    visible.style.top = '0'

    container.appendChild(sentinel)
    sentinel.appendChild(visible)

    container.addEventListener('scroll', onScroll, { passive: true })

    function measureRowHeight() {
        if (hasMeasured || rowCount === 0) return
        // Render a probe row, measure it, remove it
        const probe = renderRow(0)
        probe.style.visibility = 'hidden'
        visible.appendChild(probe)
        const rect = probe.getBoundingClientRect()
        if (rect.height > 0) {
            measuredRowHeight = rect.height
            hasMeasured = true
        }
        visible.removeChild(probe)
        pool.push(probe)
        probe.style.visibility = ''
    }

    function updateSentinelHeight() {
        sentinel.style.height = `${rowCount * measuredRowHeight}px`
    }

    function onScroll() {
        if (rafId !== null) return
        rafId = requestAnimationFrame(() => {
            rafId = null
            renderVisibleRows()
        })
    }

    function renderVisibleRows() {
        if (rowCount === 0) {
            removeAllChildren()
            lastRenderStart = -1
            lastRenderEnd = -1
            return
        }

        const scrollTop = container.scrollTop
        const viewportHeight = container.clientHeight
        const totalHeight = rowCount * measuredRowHeight

        let startIndex = Math.floor(scrollTop / measuredRowHeight) - bufferSize
        let endIndex = Math.ceil((scrollTop + viewportHeight) / measuredRowHeight) + bufferSize

        startIndex = Math.max(0, startIndex)
        endIndex = Math.min(rowCount, endIndex)

        if (startIndex === lastRenderStart && endIndex === lastRenderEnd) return

        // Recycle existing rows that are out of range
        const existingRows = Array.from(visible.children)
        for (const row of existingRows) {
            const idx = parseInt(row.dataset.index, 10)
            if (idx < startIndex || idx >= endIndex) {
                visible.removeChild(row)
                pool.push(row)
            }
        }

        // Determine which indices are already rendered
        const rendered = new Set()
        for (const row of visible.children) {
            rendered.add(parseInt(row.dataset.index, 10))
        }

        // Render missing rows
        const fragment = document.createDocumentFragment()
        for (let i = startIndex; i < endIndex; i++) {
            if (!rendered.has(i)) {
                let row
                if (pool.length > 0 && updateRow) {
                    row = pool.pop()
                    updateRow(row, i)
                } else if (pool.length > 0) {
                    pool.pop() // discard — no updateRow provided
                    row = renderRow(i)
                } else {
                    row = renderRow(i)
                }
                fragment.appendChild(row)
            }
        }
        visible.appendChild(fragment)

        // Position visible container
        visible.style.transform = `translateY(${startIndex * measuredRowHeight}px)`

        lastRenderStart = startIndex
        lastRenderEnd = endIndex
    }

    function removeAllChildren() {
        while (visible.firstChild) {
            pool.push(visible.firstChild)
            visible.removeChild(visible.firstChild)
        }
    }

    function setRowCount(count) {
        rowCount = count
        measureRowHeight()
        updateSentinelHeight()
        lastRenderStart = -1
        lastRenderEnd = -1
        removeAllChildren()
        renderVisibleRows()
    }

    function scrollToTop() {
        container.scrollTop = 0
        renderVisibleRows()
    }

    function scrollToRow(index) {
        container.scrollTop = index * measuredRowHeight
        renderVisibleRows()
    }

    function refresh() {
        lastRenderStart = -1
        lastRenderEnd = -1
        removeAllChildren()
        pool = []
        renderVisibleRows()
    }

    function destroy() {
        container.removeEventListener('scroll', onScroll)
        if (rafId !== null) {
            cancelAnimationFrame(rafId)
            rafId = null
        }
        removeAllChildren()
        pool = []
        if (sentinel.parentNode) {
            sentinel.parentNode.removeChild(sentinel)
        }
    }

    return { setRowCount, scrollToTop, scrollToRow, refresh, destroy }
}

export { createVirtualScroller }
