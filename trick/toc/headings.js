((w) => {
    'use strict'

    const toc = (w.aToc ??= {})
    const doc = document

    const DATA_KEYS = Object.freeze([
        'placement', 'breakpoint',
        'highlight', 'visibleBy',
        'mobile', 'mobileOpen',
        'focusLine', 'offset',
        'levels', 'subheads',
        'ignore', 'minItems',
        'title', 'idPrefix',
        'scroll', 'hash',
        'progress'
    ]);
    (toc._parts ??= []).push((ctx) => {
        const { kebab, coerce, slug, labelOf, parseLevels } = toc._u
        const ATTRS = DATA_KEYS.map((key) => [key, `data-toc-${kebab(key)}`])

        // config
        const findRoot = () => {
            const r = ctx.opts.root
            if (typeof r === 'string') return doc.querySelector(r)
            if (r) return r

            for (const sel of toc.roots) {
                const node = doc.querySelector(sel)
                if (node) return node
            }

            return null
        }

        const readConfig = () => {
            ctx.cfg = { ...ctx.opts }
            if (!ctx.root) return

            for (const [key, attr] of ATTRS) {
                const val = ctx.root.getAttribute(attr)
                if (val !== null) ctx.cfg[key] = coerce(val)
            }
        }

        const cfgSig = () => {
            const c = ctx.cfg

            return [
                c.levels, c.subheads,
                c.minItems, c.title,
                JSON.stringify(c.mobile),
                c.placement, c.progress,
                c.mobileOpen, c.breakpoint,
                c.ignore, !!c.mount
            ].join('|')
        }

        // heading
        const ensureId = (h) => {
            if (h.id) return h.id

            const base = ctx.cfg.idPrefix + slug(labelOf(h))
            let id = base
            let n = 2
            while (doc.getElementById(id)) id = `${base}-${n++}`

            return (h.id = id)
        }

        const collect = () => {
            const { levels, subheads, ignore, filter, text } = ctx.cfg

            let used = parseLevels(levels)
            if (!used.length) used = [2, 3]
            if (!subheads) used = used.slice(0, 1)

            const out = []
            const stack = []

            for (const h of ctx.root.querySelectorAll(used.map((l) => `h${l}`).join(','))) {
                if (h.closest('[data-toc-ui]')) continue
                if (ignore && h.closest(ignore)) continue
                if (h.closest('[hidden]') || !h.getClientRects().length) continue
                if (filter && filter(h) === false) continue

                const label = text ? text(h) : labelOf(h)
                if (!label) continue

                const level = +h.tagName[1]
                while (stack.length && stack.at(-1).level >= level) stack.pop()

                const entry = {
                    el: h,
                    id: '',
                    text: label,
                    level,
                    depth: used.indexOf(level),
                    parent: stack.at(-1) || null,
                    i: out.length
                }

                out.push(entry)
                stack.push(entry)
            }

            for (const entry of out) entry.id = ensureId(entry.el)
            return out
        }

        const rebuild = (force) => {
            if (ctx.destroyed) return

            const root = findRoot()
            if (root !== ctx.root) {
                ctx.root = root
                force = true
            }

            if (!root) {
                ctx.teardownUI()
                ctx.entries = []
                ctx.sig = ''
                ctx.built = false
                return
            }

            readConfig()
            const list = collect()
            const sig = `${cfgSig()}#${list.map((e) => `${e.id}\u0001${e.level}\u0001${e.text}`).join('\u0002')}`
            const same = ctx.built
                && sig === ctx.sig
                && list.length === ctx.entries.length
                && list.every((e, i) => e.el === ctx.entries[i].el)

            if (same && !force) return ctx.schedule(true)

            ctx.sig = sig
            ctx.entries = list
            ctx.built = true
            ctx.state.focus = -1
            ctx.state.visKey = ''

            ctx.buildUI()
            ctx.applyMode()

            const info = { entries: list }
            ctx.cfg.onBuild?.(info)
            doc.dispatchEvent(new CustomEvent('toc:build', { detail: info }))
        }

        // shared

        Object.assign(ctx, { rebuild })
    })
})(window)
