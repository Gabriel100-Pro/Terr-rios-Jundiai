"""
Gera as versões otimizadas usadas pelo site em assets/web/ e a capa de
compartilhamento em assets/compartilhamento/. Os originais em assets/ não
são alterados. Requer Pillow (pip install pillow).

    python ferramentas/otimizar-imagens.py
"""
from pathlib import Path
from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
ORIGEM = RAIZ / "assets"
DESTINO = ORIGEM / "web"
CAPA = ORIGEM / "compartilhamento"

# arquivo original -> (nome base, larguras geradas; None = largura original)
IMAGENS = {
    # fundos (CSS): uma versão no tamanho original
    "fundo - hero.png":             ("fundo-hero",            [None]),
    "Fundo terrário vertical.png":  ("fundo-vertical",        [None]),
    "fundo terrário aberto.png":    ("fundo-aberto",          [None]),
    "fundo terrário fechado.png":   ("fundo-fechado",         [None]),
    "fundo mini terrários.png":     ("fundo-mini",            [None]),
    "fundo sessão 4.png":           ("fundo-natureza",        [None]),
    "fundo seção 5.png":            ("fundo-espacos",         [None]),
    # produtos com transparência: várias larguras para srcset
    "terrário vertical.png":        ("terrario-vertical",     [128, 480, 800, None]),
    "Terrário aberto.png":          ("terrario-aberto",       [128, 480, 800, None]),
    "Terrário fechado.png":         ("terrario-fechado",      [128, 480, 800, None]),
    "mini terrarios.png":           ("mini-terrarios",        [128, 480, 800, None]),
    "terrário sessão 4.png":        ("terrario-esfera",       [128, 640, None]),
    # os dois pendurados são o mesmo arquivo: uma versão serve aos dois
    "terrário pendurado - 1.png":   ("terrario-pendurado",    [400, 700, None]),
    "img seção 3.png":              ("essencia",              [640, 800, None]),
}


def salvar_webp(img: Image.Image, destino: Path) -> None:
    opts = {"quality": 82, "method": 6}
    if img.mode == "RGBA":
        opts["alpha_quality"] = 100   # bordas do vidro sem serrilhado
        opts["exact"] = True          # preserva a cor sob pixels semitransparentes
    img.save(destino, "WEBP", **opts)


def main() -> None:
    DESTINO.mkdir(exist_ok=True)
    CAPA.mkdir(exist_ok=True)
    total_antes = total_depois = 0

    for arquivo, (base, larguras) in IMAGENS.items():
        origem = ORIGEM / arquivo
        img = Image.open(origem)
        img = img.convert("RGBA" if img.mode in ("RGBA", "LA", "P") else "RGB")
        total_antes += origem.stat().st_size
        for largura in larguras:
            w = largura or img.width
            if w > img.width:
                continue
            h = round(img.height * w / img.width)
            nome = f"{base}.webp" if largura is None else f"{base}-{w}.webp"
            saida = DESTINO / nome
            salvar_webp(img if w == img.width else img.resize((w, h), Image.LANCZOS), saida)
            total_depois += saida.stat().st_size if largura is None else 0
            print(f"{saida.stat().st_size / 1024:7.0f} KB  {w}x{h}  {nome}")

    # Capa 1200 x 630: recorte do fundo da hero em torno do terrário e da
    # pedra (sem textos), sem distorção — só corte e redução proporcional.
    hero = Image.open(ORIGEM / "fundo - hero.png").convert("RGB")
    alt = hero.height
    larg = round(alt * 1200 / 630)
    centro = round(hero.width * 0.624)          # centro do terrário na imagem
    x0 = max(0, min(hero.width - larg, centro - larg // 2))
    capa = hero.crop((x0, 0, x0 + larg, alt)).resize((1200, 630), Image.LANCZOS)
    capa.save(CAPA / "capa.jpg", "JPEG", quality=86, optimize=True, progressive=True)
    print(f"{(CAPA / 'capa.jpg').stat().st_size / 1024:7.0f} KB  1200x630  compartilhamento/capa.jpg")

    print(f"\nOriginais: {total_antes / 1048576:.1f} MB | versões em tamanho original (WebP): {total_depois / 1048576:.1f} MB")


if __name__ == "__main__":
    main()
