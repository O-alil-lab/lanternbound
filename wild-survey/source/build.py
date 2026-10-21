#!/usr/bin/env python3
"""Compile WILD SURVEY into one self-contained HTML file."""
import base64, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'src')
ART = os.path.join(HERE, 'art')
OUT = os.path.join(os.path.dirname(HERE), 'wild-survey.html')


def read(p):
    with open(p, encoding='utf-8') as f:
        return f.read()


def art_block():
    items = []
    for name in sorted(os.listdir(ART)):
        if not name.endswith('.webp'):
            continue
        key = name[:-5]
        with open(os.path.join(ART, name), 'rb') as f:
            b64 = base64.b64encode(f.read()).decode('ascii')
        items.append('"%s":"data:image/webp;base64,%s"' % (key, b64))
    return 'window.WS_ART = {' + ','.join(items) + '};'


def main():
    html = read(os.path.join(SRC, 'template.html'))
    data = read(os.path.join(SRC, 'data.js'))
    engine = read(os.path.join(SRC, 'engine.js'))
    ui = read(os.path.join(SRC, 'ui.js'))
    world = read(os.path.join(SRC, 'world.js'))
    phaser = read(os.path.join(HERE, 'vendor', 'phaser.min.js'))
    css = read(os.path.join(SRC, 'style.css'))

    # expose content to the browser build
    data = data.replace("if (typeof module !== 'undefined') {", "window.WS_DATA = { TYPES, TYPE_CHART, eff, MOVES, CREATURES, ORDER, TRAINERS, MENTORS, STARTERS, SECONDS, ROUTE, FINAL };\nif (typeof module !== 'undefined') {")

    html = html.replace('/*__CSS__*/', css)
    html = html.replace('/*__DATA__*/', data)
    html = html.replace('/*__ART__*/', art_block())
    html = html.replace('/*__ENGINE__*/', engine)
    html = html.replace('/*__WORLD__*/', world)
    html = html.replace('/*__UI__*/', ui)
    html = html.replace('/*__PHASER__*/', phaser)

    with open(OUT, 'w', encoding='utf-8') as f:
        f.write(html)
    size = os.path.getsize(OUT)
    print('built %s  (%.1f MB)' % (OUT, size / 1048576))


if __name__ == '__main__':
    main()
