"""Събира играта в един самостоятелен HTML файл (CSS, JS и картинки вградени)."""
import base64, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / 'deadly_forest_game'
OUT = ROOT / 'smartonosnata-gora.html'

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
