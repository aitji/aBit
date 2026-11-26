# aToc

table of content,\
pairs with `components/toc.css`

## usage

```html
<script src="https://cdn.jsdelivr.net/gh/aitji/aBit@bundle/trick/toc/global.js" data-auto></script>
```

`data-auto` = *init on load*\
or init with scripts

```html
<script src="https://cdn.jsdelivr.net/gh/aitji/aBit@bundle/trick/toc/global.js"></script>
<script>aToc.init({ highlight: 'visible', mobile: 'sticky-bottom' })</script>
```

```jsonc
"defaults": { // default settings
    "placement": "sidebar",
    "highlight": "both",
    "visibleBy": "section",
    "subheads": true,
    "mobile": "sticky-top"
}
```

```html
<article data-toc-root data-toc-subheads="false" data-toc-mobile="element-top">
```

before **init**, update settings by `aToc.defaults.highlight = 'focus'`

## API

- `aToc.init(opts)`
- `aToc.refresh()`
- `aToc.destroy()`
- `aToc.instance`
    - `.update(opts)`
    - `.goTo(id|i)`
    - `.open()`
    - `.close()`
    - `.entries`
    - `.active`
    - `.mode`

## license
protected by [Mozilla Public License Version 2.0](https://raw.githubusercontent.com/aitji/aBit/refs/heads/bundle/LICENSE)