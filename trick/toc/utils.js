((w) => {
    'use strict'

    const toc = (w.aToc ??= {})
    const doc = document
    const rQ = w.matchMedia?.('(prefers-reduced-motion: reduce)')
    const HSEL = 'h1,h2,h3,h4,h5,h6'

    const el = (tag, cls) => {
        const node = doc.createElement(tag)
        if (cls) node.className = cls
        return node
    }

    const toEl = (x) => !x ? null : typeof x === 'string' ? doc.querySelector(x) : x
    const clamp = (v, min, max) => Math.min(max, Math.max(min, v))
    const kebab = (s) => s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)

    const coerce = (v) => {
        if (v === '' || v === 'true') return true
        if (v === 'false') return false
        return isNaN(v) ? v : +v
    }

    const pLvl = (v) => {
        const nums = (Array.isArray(v) ? v.join(',') : String(v)).match(/[1-6]/g) || []
        return [...new Set(nums.map(Number))].sort()
    }

    const parseMobile = (v) => {
        if (!v) return null

        if (typeof v === 'object') return {
            mode: v.mode === 'element' ? 'element' : 'sticky',
            pos: v.position === 'bottom' ? 'bottom' : 'top'
        }

        const s = String(v).toLowerCase()
        return {
            mode: s.includes('element') ? 'element' : 'sticky',
            pos: s.includes('bottom') ? 'bottom' : 'top'
        }
    }

    const slug = (text) => {
        const s = text.normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}\p{M}]+/gu, '-').replace(/^-+|-+$/g, '')
        return s || 'section'
    }

    const labelOf = (h) => {
        if (h.dataset?.tocText) return h.dataset.tocText.trim()

        const clone = h.cloneNode(true)
        for (const n of clone.querySelectorAll('[aria-hidden="true"],.toc-ignore,.anchor,[data-toc-skip]'))
            n.remove()

        return clone.textContent.replace(/\s+/g, ' ').trim()
    }

    const reduced = () => !!rQ?.matches
    const hasHeading = (n) => n.nodeType === 1 && (
        n.matches(HSEL) ||
        !!n.querySelector(HSEL)
    )

    const isRelevant = (records) => {
        for (const r of records) {
            let target = r.target
            if (target.nodeType === 3) target = target.parentNode

            if (!target?.closest || target.closest('[data-toc-ui]')) continue
            if (target.closest(HSEL)) return true
            if (r.type !== 'childList') continue
            if ([...r.addedNodes, ...r.removedNodes].some(hasHeading)) return true
        }

        return false
    }

    // caller
    toc._u = Object.freeze({ el, toEl, clamp, kebab, coerce, parseLevels: pLvl, parseMobile, slug, labelOf, reduced, isRelevant })
})(window)
