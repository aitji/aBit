((w) => {
    'use strict'

    const toc = (w.aToc ??= {});
    (toc._parts ??= []).push((ctx) => {
        const { reduced } = toc._u

        // lock
        const lock = (id) => {
            const { state } = ctx
            state.lockId = id

            clearTimeout(state.lockTimer);
            state.lockTimer = setTimeout(unlock, 180)
        }

        const unlock = () => {
            const { state } = ctx
            clearTimeout(state.lockTimer)

            if (!state.lockId) return

            state.lockId = null
            ctx.schedule(true)
        }

        const onScroll = () => {
            const { state } = ctx

            if (state.lockId) {
                clearTimeout(state.lockTimer)
                state.lockTimer = setTimeout(unlock, 140)
            }

            ctx.schedule()
        }

        // go
        const goTo = (entry) => {
            if (!entry) return

            const { hash, scroll } = ctx.cfg
            const view = ctx.viewport()
            const y = entry.el.getBoundingClientRect().top - view.top + view.scroll - ctx.getOffset()

            lock(entry.id)
            ctx.scroller.scrollTo({
                top: Math.max(0, y),
                behavior: scroll === 'smooth' && !reduced() ? 'smooth' : 'instant'
            })

            if (hash && w.history)
                history[hash === 'push' ? 'pushState' : 'replaceState'](history.state, '', `#${entry.id}`)

            if (!entry.el.hasAttribute('tabindex')) entry.el.setAttribute('tabindex', '-1')
            entry.el.focus({ preventScroll: true })

            ctx.compute(true)
        }

        const onLinkClick = (ev) => {
            const a = ev.target.closest?.('a[data-i]')
            if (
                !a ||
                ev.defaultPrevented ||
                ev.button ||
                ev.metaKey ||
                ev.ctrlKey ||
                ev.shiftKey ||
                ev.altKey
            ) return

            ev.preventDefault()
            goTo(ctx.entries[+a.getAttribute('data-i')])

            if (ctx.ui.bar && ctx.ui.mob.mode === 'sticky') ctx.setOpen(false)
        }

        // shared
        Object.assign(ctx, {
            goTo,
            onLinkClick,
            unlock,
            onScroll
        })
    })
})(window)
