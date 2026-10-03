"""Събира играта в един самостоятелен HTML файл (CSS, JS и картинки вградени)."""
import base64, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / 'deadly_forest_game'
OUT = ROOT / 'monsters-and-survivors.html'

def data_uri(path, mime):
    return f"data:{mime};base64," + base64.b64encode(path.read_bytes()).decode()

html = (SRC / 'index.html').read_text(encoding='utf-8')
css = (SRC / 'style.css').read_text(encoding='utf-8')
css = css.replace('url(assets/poster.jpg)', 'url(' + data_uri(SRC / 'assets/poster.jpg', 'image/jpeg') + ')')
html = html.replace('<link rel="stylesheet" href="style.css">', '<style>\n' + css + '\n</style>')

def inline_script(m):
    js = (SRC / m.group(1)).read_text(encoding='utf-8')
    js = js.replace("'assets/heroes.png'", "'" + data_uri(SRC / 'assets/heroes.png', 'image/png') + "'")
    return '<script>\n' + js + '\n</script>'

html = re.sub(r'<script src="([^"]+)"></script>', inline_script, html)
assert 'src="js/' not in html and 'href="style.css"' not in html
OUT.write_text(html, encoding='utf-8')
print(OUT, round(OUT.stat().st_size / 1024), 'KB')

# Версия за публикуване като страница (без собствен doctype/html/head/body)
import sys
if '--page' in sys.argv:
    page = html
    for tag in ['<!doctype html>', '<html lang="bg">', '<head>', '</head>', '<body>', '</body>', '</html>',
                '<meta charset="utf-8">',
                '<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no,viewport-fit=cover">']:
        page = page.replace(tag, '')
    out = pathlib.Path(sys.argv[sys.argv.index('--page') + 1])
    out.write_text(page.strip() + '\n', encoding='utf-8')
    print(out, round(out.stat().st_size / 1024), 'KB')
