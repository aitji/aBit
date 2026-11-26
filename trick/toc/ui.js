((w) => {
    'use strict'

    const toc = (w.aToc ??= {})
    const doc = document
    const HOST_SEL = '.toc:not([data-toc-ui]),[data-toc]:not([data-toc-ui])'
    let uid = 0;

    (toc._parts ??= []).push((ctx) => {
        const { el, toEl, parseMobile } = toc._u
        const blankUI = () => ({
            created: [], adopted: [],
            undo: [], lists: [],

            aside: null, bar: null,
            btn: null, title: null,
            count: null, mob: null,
            grid: null, fixed: false
        })

        const addClass = (node, cls) => {
            if (node.classList.contains(cls)) return

            node.classList.add(cls)
            ctx.ui.undo.push(() => node.classList.remove(cls))
        }

        const makeList = () => {
            const track = el('div', 'toc-track')
            const ul = el('ul', 'toc-list')
            const rail = el('span', 'toc-rail')
            rail.setAttribute('aria-hidden', 'true')

            const items = ctx.entries.map((e) => {
                const li = el('li', `toc-item toc-h${e.level}${e.depth > 0 ? ' toc-sub' : ''}`)
                li.style.setProperty('--d', e.depth)

                const a = el('a')
                a.href = `#${e.id}`
                a.textContent = e.text
                a.setAttribute('data-i', e.i)

                li.append(a)
                ul.append(li)

                return li
            })

            track.append(ul, rail)
            ul.addEventListener('click', ctx.onLinkClick)

            const lst = {
                track, rail,
                items, scroll: null,
                init: false
            }

            ctx.ui.lists.push(lst)
            return lst
        }

        const buildDesktop = () => {
            const { cfg, ui } = ctx
            if (cfg.placement === 'none') return

            const scope = ctx.root.closest('.with-toc')
            const wantFixed = cfg.placement === 'fixed'

            let host = toEl(cfg.mount)
            if (!host && !wantFixed) host = (scope || doc).querySelector(HOST_SEL)

            if (host) {
                ui.adopted.push(host)
                addClass(host, 'toc')
            } else {
                host = el('aside', 'toc')

                const floating = wantFixed || !scope
                if (floating) host.classList.add('toc--fixed');
                (floating ? doc.body : scope).append(host)

                ui.created.push(host)
            }

            if (wantFixed) addClass(host, 'toc--fixed')

            ui.fixed = host.classList.contains('toc--fixed')
            host.setAttribute('data-toc-ui', '')
            host.textContent = ''

            const inner = el('div', 'toc-inner')
            const label = el('p', 'toc-label')
            const scroll = el('div', 'toc-scroll')
            const nav = el('nav')
            label.textContent = cfg.title
            nav.setAttribute('aria-label', cfg.title)

            const lst = makeList()
            lst.scroll = scroll

            nav.append(lst.track)
            scroll.append(nav)
            inner.append(label, scroll)
            host.append(inner)

            ui.aside = host
        }

        const buildBar = () => {
            const { cfg, ui, root } = ctx
            const mob = parseMobile(cfg.mobile)
            if (!mob) return

            ui.mob = mob

            const sticky = mob.mode === 'sticky'
            const panelId = `toc-panel-${++uid}`
            const open = cfg.mobileOpen != null ? !!cfg.mobileOpen : !sticky && mob.pos === 'bottom'

            const bar = el('div', `toc-bar toc-bar--${mob.mode} toc-bar--${mob.pos}`)
            bar.setAttribute('data-toc-ui', '')
            bar.setAttribute('data-open', open)

            const head = el('div', 'toc-bar-in')
            const btn = el('button', 'toc-bar-btn')
            const title = el('span', 'toc-bar-title')
            const count = el('span', 'toc-bar-count')
            const chev = el('span', 'toc-bar-chev')

            btn.type = 'button'
            btn.setAttribute('aria-expanded', open)
            btn.setAttribute('aria-controls', panelId)
            chev.setAttribute('aria-hidden', 'true')
            title.textContent = cfg.title

            btn.append(title, count, chev)
            btn.addEventListener('click', () => setOpen(bar.getAttribute('data-open') !== 'true'))
            head.append(btn)

            const panel = el('div', 'toc-panel')
            const panelIn = el('div', 'toc-panel-in')
            const pad = el('div', 'toc-bar-in')
            const scroll = el('div', 'toc-scroll')
            const nav = el('nav')

            panel.id = panelId
            nav.setAttribute('aria-label', cfg.title)

            const lst = makeList()
            lst.scroll = scroll

            nav.append(lst.track)
            scroll.append(nav)
            pad.append(scroll)
            panelIn.append(pad)
            panel.append(panelIn)
            bar.append(head, panel)

            if (sticky && cfg.progress) {
                const progress = el('div', 'toc-bar-progress')
                progress.setAttribute('aria-hidden', 'true')
                progress.append(el('i'))
                bar.append(progress)
            }

            // place it
            if (sticky) doc.body.append(bar)
            else if (mob.pos === 'top') root.before(bar)
            else root.after(bar)

            ui.created.push(bar)
            ui.bar = bar
            ui.btn = btn
            ui.title = title
            ui.count = count
        };

        const teardownUI = () => {
            const { ui } = ctx
            for (const node of ui.created) node.remove()
            for (const host of ui.adopted) {
                host.textContent = ''
                host.removeAttribute('data-toc-ui')
                host.hidden = false
            }

            for (const undo of ui.undo) undo()
            ui.grid?.classList.remove('toc-empty')
            ctx.ui = blankUI()
        }

        const buildUI = () => {
            teardownUI()
            const { ui } = ctx
            ui.grid = ctx.root.closest('.with-toc')

            if (ctx.entries.length < ctx.cfg.minItems)
                return ui.grid?.classList.add('toc-empty')

            buildDesktop()
            buildBar()
        }

        const isOpen = () => ctx.ui.bar?.getAttribute('data-open') === 'true'
        const setOpen = (open) => {
            const { ui } = ctx
            if (!ui.bar) return

            ui.bar.setAttribute('data-open', !!open)
            ui.btn.setAttribute('aria-expanded', !!open)

            if (!open) return
            for (const lst of ui.lists)
                if (lst.scroll && ui.bar.contains(lst.track))
                    ctx.keepInView(lst, ctx.state.focus, true)
        }

        const onDocDown = (ev) => {
            const { ui } = ctx
            if (
                ui.bar &&
                ui.mob.mode === 'sticky' &&
                isOpen() &&
                !ui.bar.contains(ev.target)
            ) setOpen(false)
        }

        const onKey = (ev) => {
            const { ui, state } = ctx
            if (state.lockId && !ev.metaKey && !ev.ctrlKey) ctx.unlock()
            if (
                ev.key !== 'Escape' ||
                !ui.bar ||
                ui.mob.mode !== 'sticky' ||
                !isOpen()
            ) return

            setOpen(false)
            ui.btn.focus()
        }

        // shared
        Object.assign(ctx, {
            blankUI,
            teardownUI,
            buildUI,
            setOpen,
            onDocDown,
            onKey
        })
    })
})(window)
