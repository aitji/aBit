((w) => {
    'use strict'

    const toc = (w.aToc ??= {})
    const doc = document
    const docEl = doc.documentElement
    const passive = Object.freeze({ passive: true })

    let cur = null
    const create = (userOpts) => {
        const { toEl, isRelevant } = toc._u
        const opts = { ...toc.defaults, ...userOpts }
        const scroller = opts.scroller ? toEl(opts.scroller) : w

        const ctx = {
            opts, scroller,
            cfg: opts,
            root: null, entries: [],
            sig: '', built: false,
            destroyed: false,
            ui: null, mq: null,
            mqQuery: '', mo: null,
            ro: null,
            state: {
                focus: -1, visKey: '',
                mode: 'desktop', lockId: null,
                lockTimer: 0, force: false,
                raf: 0, mutTimer: 0,
                active: null
            }
        }

        for (const part of toc._parts) part(ctx)
        ctx.ui = ctx.blankUI()

        const { state } = ctx
        const onResize = () => {
            ctx.measure()
            ctx.schedule(true)
        }

        const listeners = [
            [scroller, 'scroll', ctx.onScroll, passive],
            [w, 'wheel', ctx.unlock, passive],
            [w, 'touchstart', ctx.unlock, passive],
            [w, 'resize', onResize, passive],
            [w, 'load', onResize],
            [doc, 'pointerdown', ctx.onDocDown, true],
            [doc, 'keydown', ctx.onKey]
        ]

        if ('onscrollend' in w)
            listeners.push([scroller, 'scrollend', ctx.unlock])

        const start = () => {
            for (const [target, type, fn, o] of listeners) target.addEventListener(type, fn, o)

            doc.fonts?.ready.then(onResize)
            if (ctx.cfg.observe !== false && w.MutationObserver) {
                ctx.mo = new MutationObserver((records) => {
                    if (!isRelevant(records)) return

                    clearTimeout(state.mutTimer)
                    state.mutTimer = setTimeout(() => ctx.rebuild(false), 60)
                })

                ctx.mo.observe(doc.body, { childList: true, subtree: true, characterData: true })
            }

            if (w.ResizeObserver) {
                ctx.ro = new ResizeObserver(() => ctx.schedule(true))
                ctx.ro.observe(doc.body)
            }

            ctx.rebuild(true)
        }

        const destroy = () => {
            ctx.destroyed = true
            for (const [target, type, fn, o] of listeners)
                target.removeEventListener(type, fn, o)

            ctx.mq?.removeEventListener('change', ctx.applyMode)
            ctx.mo?.disconnect()
            ctx.ro?.disconnect()

            cancelAnimationFrame(state.raf)
            clearTimeout(state.mutTimer)
            clearTimeout(state.lockTimer)

            ctx.teardownUI()
            docEl.style.removeProperty('--toc-top')
            docEl.style.removeProperty('--toc-offset')
        }
        start()

        // instance handle
        return {
            refresh: (force) => ctx.rebuild(!!force),
            update: (o) => {
                Object.assign(ctx.opts, o)
                ctx.rebuild(true)
            },
            destroy,
            goTo: (idOrIndex) => ctx.goTo(typeof idOrIndex === 'number' ? ctx.entries[idOrIndex] : ctx.entries.find((e) => e.id === idOrIndex)),
            open: () => ctx.setOpen(true),
            close: () => ctx.setOpen(false),
            get entries() { return ctx.entries.slice() },
            get active() { return state.active },
            get mode() { return state.mode }
        }
    }

    // caller
    const init = (o) => {
        cur?.destroy()
        return (cur = create(o))
    }
    const refresh = () => cur?.refresh()
    const destroy = () => {
        cur?.destroy()
        cur = null
    }

    Object.assign(toc, { version: '1.0.0', create, init, refresh, destroy })
    Object.defineProperty(toc, 'instance', { get: () => cur, configurable: true })

    if (typeof module !== 'undefined' && module.exports) module.exports = toc

    const script = doc.currentScript
    if (!script?.hasAttribute('data-auto')) return

    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', () => init())
    else init()
})(window)
