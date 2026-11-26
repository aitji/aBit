((w) => {
    'use strict'
    const toc = (w.aToc ??= {})

    // config
    toc.roots = Object.freeze([
        '[data-toc-root]', '.post-content',
        '.legal-content', '#view',
        'main'
    ])

    toc.defaults = Object.freeze({
        // list
        root: null,
        levels: 'h2,h3',
        subheads: true,
        ignore: '.toc-ignore',
        minItems: 2,
        title: 'On this page',
        idPrefix: '',

        // highlight
        highlight: 'both',
        visibleBy: 'section',
        focusLine: 0.3,

        // scroll
        offset: 'auto',
        header: '.site-header',
        scroller: null,
        scroll: 'smooth',
        hash: false,

        // layout
        placement: 'sidebar',
        mount: null,
        breakpoint: null,
        mobile: 'sticky-top',
        mobileOpen: null,
        progress: true,
        observe: true,

        // hook
        filter: null,
        text: null,
        onBuild: null,
        onChange: null
    })

    // loader
    const script = document.currentScript
    if (!script?.src) return

    const base = script.src.replace(/[^\/]*(\?.*)?$/, '')
    const files = [
        'highlight', 'navigate',
        'utils', 'headings',
        'ui', 'geometry',
        'core'
    ]

    const auto = script.hasAttribute('data-auto')
    const queue = []
    let left = files.length

    for (const name of ['init', 'refresh', 'destroy'])
        toc[name] = (...args) => queue.push([name, args])

    const ready = () => {
        for (const [name, args] of queue) toc[name](...args)
        if (auto && !queue.some(([name]) => name === 'init')) toc.init()
        document.dispatchEvent(new CustomEvent('toc:ready'))
    }

    for (const file of files) {
        const tag = document.createElement('script')
        tag.src = `${base}${file}.js`
        tag.async = false
        tag.onload = () => --left || ready()
        tag.onerror = () => console.error(`aToc: failed to load ${tag.src}`)
        document.head.append(tag)
    }
})(window)
