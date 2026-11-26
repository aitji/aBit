((w) => {
    'use strict'

    const toc = (w.aToc ??= {})
    const doc = document;
    (toc._parts ??= []).push((ctx) => {
        const { clamp, reduced } = toc._u

        // loop
        const schedule = (force) => {
            const { state } = ctx
            if (force) state.force = true
            if (state.raf) return

            state.raf = requestAnimationFrame(() => {
                const f = state.force
                state.force = false
                compute(f)
            })
        }

        const compute = (force) => {
            const { state, entries, root, cfg } = ctx
            state.raf = 0

            const n = entries.length
            if (
                !n ||
                !root ||
                ctx.destroyed ||
                !ctx.ui.lists.length
            ) return

            const view = ctx.viewport()
            const edge = view.top + ctx.getOffset()
            const bottom = view.bottom
            const line = edge + (bottom - edge) * clamp(+cfg.focusLine, 0, 1)

            const tops = new Array(n)
            const bots = new Array(n)

            for (let i = 0; i < n; i++) {
                const r = entries[i].el.getBoundingClientRect()
                tops[i] = r.top
                bots[i] = r.bottom
            }

            const rootRect = root.getBoundingClientRect()

            let focus = -1
            for (let i = 0; i < n; i++) if (tops[i] <= line) focus = i

            if (
                view.max > 2 &&
                view.scroll >= view.max - 2 &&
                tops[n - 1] < bottom
            ) focus = n - 1

            if (state.lockId)
                for (let i = 0; i < n; i++)
                    if (entries[i].id === state.lockId) focus = i

            const byHeading = cfg.visibleBy === 'heading'
            const vis = []

            for (let i = 0; i < n; i++) {
                const end = byHeading
                    ? bots[i]
                    : i + 1 < n
                        ? tops[i + 1]
                        : Math.max(rootRect.bottom, bots[i])

                if (end > edge && tops[i] < bottom) vis.push(i)
            }

            const key = vis.join(',')
            if (force || focus !== state.focus || key !== state.visKey) {
                const prev = state.focus
                state.focus = focus
                state.visKey = key

                paint(focus, vis)
                if (focus !== prev) emitChange()
            }

            updateBar(rootRect, view, edge, bottom)
        }

        // paint
        const updateBar = (rootRect, view, edge, bottom) => {
            const { ui, state } = ctx
            if (!ui.bar) return

            const span = rootRect.height - (bottom - edge)
            const progress = span > 0
                ? clamp((edge - rootRect.top) / span, 0, 1)
                : rootRect.top <= edge
                    ? 1
                    : 0

            ui.bar.style.setProperty('--toc-progress', progress.toFixed(4))
            if (ui.mob.mode !== 'sticky') return

            let show = false
            if (state.mode === 'mobile') {
                const barH = ui.bar.offsetHeight || 44

                if (ui.mob.pos === 'top') {
                    const inset = view.top + ctx.headerH()
                    show = rootRect.top <= inset + 1 && rootRect.bottom > inset + barH
                } else show = rootRect.top < bottom - barH && rootRect.bottom > bottom - barH
            }

            if (String(show) === ui.bar.getAttribute('data-show')) return
            ui.bar.setAttribute('data-show', show)
            if (!show) ctx.setOpen(false)
        }

        const paint = (focus, vis) => {
            const { entries, ui, cfg } = ctx
            const mode = cfg.highlight
            const useFocus = mode === 'focus' || mode === 'both'
            const useVis = mode === 'visible' || mode === 'both'

            const visSet = new Set(vis)
            const ancestors = new Set()

            if (useFocus && focus > -1)
                for (let p = entries[focus].parent; p; p = p.parent)
                    ancestors.add(p.i)


            for (const lst of ui.lists) {
                const { items } = lst

                for (let i = 0; i < items.length; i++) {
                    const li = items[i]
                    const isFocus = i === focus

                    li.classList.toggle('is-active', useFocus && isFocus)
                    li.classList.toggle('is-visible', useVis && visSet.has(i))
                    li.classList.toggle('is-ancestor', ancestors.has(i))

                    if (mode !== 'none' && isFocus) li.firstChild.setAttribute('aria-current', 'location')
                    else li.firstChild.removeAttribute('aria-current')
                }

                let first = -1
                let last = -1

                if (useVis && vis.length) [first, last] = [vis[0], vis.at(-1)]
                else if (useFocus && focus > -1) first = last = focus

                placeRail(lst, first, last)

                const keep = useFocus ? focus : vis.length ? vis[0] : -1
                if (keep > -1) keepInView(lst, keep, false)
            }

            if (!ui.title) return

            ui.title.textContent = focus > -1 ? entries[focus].text : cfg.title
            ui.count.textContent = focus > -1 ? `${focus + 1}/${entries.length}` : ''
        }

        const placeRail = (lst, first, last) => {
            const { rail, track, items } = lst

            if (first < 0) return track.removeAttribute('data-rail')

            const y = items[first].offsetTop
            const h = items[last].offsetTop + items[last].offsetHeight - y

            if (!lst.init) rail.style.transition = 'none'

            rail.style.setProperty('--rail-y', `${y}px`)
            rail.style.setProperty('--rail-h', `${h}px`)

            if (!lst.init) {
                void rail.offsetHeight
                rail.style.transition = ''
                lst.init = true
            }

            track.setAttribute('data-rail', 'on')
        }

        const keepInView = (lst, i, center) => {
            const { scroll } = lst
            const li = lst.items[i]
            if (!scroll || !li || scroll.scrollHeight <= scroll.clientHeight + 1) return

            const box = scroll.getBoundingClientRect()
            const row = li.getBoundingClientRect()
            const pad = 12
            let d = 0

            if (center) d = row.top + row.height / 2 - (box.top + box.height / 2)
            else if (row.top < box.top + pad) d = row.top - box.top - pad
            else if (row.bottom > box.bottom - pad) d = row.bottom - box.bottom + pad

            if (!d) return
            scroll.scrollTo({
                top: scroll.scrollTop + d,
                behavior: center || reduced() ? 'instant' : 'smooth'
            })
        }

        const emitChange = () => {
            const { state, entries } = ctx
            const e = state.focus > -1 ? entries[state.focus] : null

            const info = {
                id: e && e.id,
                index: state.focus,
                text: e && e.text,
                el: e && e.el,
                entries
            }
            state.active = e

            ctx.cfg.onChange?.(info)
            doc.dispatchEvent(new CustomEvent('toc:change', { detail: info }))
        }

        // shared
        Object.assign(ctx, {
            schedule,
            compute,
            keepInView
        })
    })
})(window)
