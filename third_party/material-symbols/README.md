# Material Symbols (ícones do app)

- **O que é:** 76 ícones do conjunto *Material Symbols Rounded* do Google, peso 300 — os mesmos da versão Linux e do app Android. No Finan+ web eles ficam embutidos em `js/icons.js` como caminhos SVG (`<path d="…">`), sem fonte nem arquivo externo, e são pintados com a cor do tema (`fill: currentColor`).
- **Origem:** https://github.com/google/material-design-icons (pasta `symbols/web/<nome>/materialsymbolsrounded/<nome>_wght300_24px.svg`).
- **Licença:** Apache License 2.0. O texto está em `LICENSE`, nesta pasta, em `licenca/APACHE-2.0.txt` e dentro do app em *Ajustes › Sobre*. A Apache 2.0 é compatível com a GPL-3.0 do Finan+.
- **O que foi alterado:** nada nos traços. Só a forma de guardar: o atributo `d` de cada SVG foi copiado para `js/icons.js`, com o nome do ícone como chave.
- **Também:** os ícones do app (`icons/*.png`) são o ícone do Finan+ do app Android (autoria do projeto, GPL-3.0-or-later). O selo das notificações (`icons/badge-96.png`) é o símbolo *account_balance_wallet* em branco.
