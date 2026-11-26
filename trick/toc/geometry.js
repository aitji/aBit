((w) => {
    'use strict'

    const toc = (w.aToc ??= {})
    const doc = document
    const docEl = doc.documentElement;
    (toc._parts ??= []).push((ctx) => {
        const viewport = () => { // measure
            const sc = ctx.scroller

            if (sc === w) return {
                top: 0,
                bottom: w.innerHeight,
                scroll: w.pageYOffset,
                max: docEl.scrollHeight - w.innerHeight
            }

            const r = sc.getBoundingClientRect()
            return { top: r.top, bottom: r.bottom, scroll: sc.scrollTop, max: sc.scrollHeight - sc.clientHeight }
        }

        const headerH = () => {
            const header = ctx.cfg.header && doc.querySelector(ctx.cfg.header)
            if (!header) return parseFloat(getComputedStyle(docEl).getPropertyValue('--header-h')) || 0

            const pos = getComputedStyle(header).position
            return pos === 'sticky' || pos === 'fixed' ? header.getBoundingClientRect().height : 0
        }

        const barReserve = () => {
            const { ui, state } = ctx
            const onTop = ui.bar &&
                ui.mob.mode === 'sticky' &&
                ui.mob.pos === 'top' &&
                state.mode === 'mobile'

            return onTop ? ui.bar.offsetHeight || 44 : 0
        }

        const getOffset = () => {
            const o = ctx.cfg.offset

            if (typeof o === 'function') return +o() || 0
            if (typeof o === 'number') return o

            return headerH() + barReserve() + 16
        }

        // caller
        const measure = () => {
            if (ctx.cfg.header === false) return

            docEl.style.setProperty('--toc-top', `${headerH()}px`)
            docEl.style.setProperty('--toc-offset', `${getOffset()}px`)
        }

        // mode
        const breakpoint = () => ctx.cfg.breakpoint != null
            ? +ctx.cfg.breakpoint
            : ctx.ui.fixed
                ? 1280
                : 980

        const applyMode = () => {
            const { ui, state } = ctx
            const query = `(min-width:${breakpoint()}px)`

            // query
            if (!ctx.mq || ctx.mqQuery !== query) {
                ctx.mq?.removeEventListener('change', applyMode)
                ctx.mq = w.matchMedia(query)
                ctx.mqQuery = query
                ctx.mq.addEventListener('change', applyMode)
            }

            state.mode = ctx.mq.matches ? 'desktop' : 'mobile'

            if (ui.aside) ui.aside.hidden = state.mode !== 'desktop'
            if (ui.bar) ui.bar.hidden = state.mode !== 'mobile'

            measure()
            ctx.schedule(true)
        }

        // shared
        Object.assign(ctx, {
            viewport,
            headerH,
            getOffset,
            measure,
            applyMode
        })
    })
})(window)
