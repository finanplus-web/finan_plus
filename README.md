# Finan+ web (PWA)

Controle financeiro pessoal **simples, privado e offline**, no navegador do celular ou do computador. Tem tudo o que o app Android faz — receitas, despesas, contas, cartões e faturas, parcelas, recorrências, limites, metas, relatórios, relatório em PDF, assistente no aparelho, PIN e backup compatível — com um **layout próprio para computador e notebook**.

![Início no computador](docs/inicio-computador.png)

| Lançamentos | Relatórios |
|---|---|
| ![Lançamentos](docs/lancamentos-computador.png) | ![Relatórios](docs/relatorios-computador.png) |
| **Ajustes (tema Tokyo Night)** | **Celular** |
| ![Ajustes](docs/ajustes-tokyo.png) | ![Celular](docs/celular.png) |

- Lista completa do que o app faz: [FUNCIONALIDADES.md](FUNCIONALIDADES.md)
- Calendário de lançamentos: [CALENDARIO.md](CALENDARIO.md)
- Simulador "E se…?": [SIMULADOR.md](SIMULADOR.md)
- Como o assistente decide cada coisa: [ASSISTENTE.md](ASSISTENTE.md)
- O que foi feito nesta versão: [CHANGELOG.md](CHANGELOG.md)

**Usar agora:** https://finanplus-web.github.io/finan_plus/ · **Versão para Linux:** [baixar o .deb](https://github.com/finanplus-web/finan_plus_linux/releases/latest) ([código-fonte](https://github.com/finanplus-web/finan_plus_linux))

## Publicar no GitHub Pages

Tudo já está configurado (`.github/workflows/pages.yml`). A cada envio para a branch `main`, o GitHub instala, gera o bundle, **roda os testes** (95 hoje) (se algum falhar, nada é publicado), monta o site e publica. A versão do service worker é carimbada com o commit, então os aparelhos recebem a atualização sozinhos.

1. Crie um repositório no GitHub (ex.: `finan-plus-web`), público ou privado (Pages em repositório privado exige plano pago).
2. Nesta pasta (use o seu e-mail "noreply" do GitHub, em Settings › Emails, para não deixar seu e-mail pessoal público no histórico):
   ```sh
   git init -b main
   git config user.name "Seu nome ou apelido"
   git config user.email "SEU-ID+usuario@users.noreply.github.com"
   git add .
   git commit -m "Finan+ web 1.1.0"
   git remote add origin https://github.com/SEU-USUARIO/finan-plus-web.git
   git push -u origin main
   ```
3. No GitHub: **Settings › Pages › Build and deployment › Source: GitHub Actions**.
4. Abra a aba **Actions** e espere o "Publicar no GitHub Pages" ficar verde (1–2 min). O endereço aparece lá e em Settings › Pages: `https://SEU-USUARIO.github.io/finan-plus-web/`.

Para publicar uma mudança: edite, `git commit` e `git push`. Para ver localmente exatamente o que vai ao ar: `npm run preview` (abre em `http://localhost:8000`).

Funciona no endereço com subpasta do GitHub Pages (todos os caminhos são relativos) e também em domínio próprio. O site publicado contém só o necessário: `index.html`, `style.css`, `sw.js`, `manifest.webmanifest`, `js/` (o bundle e o código-fonte legível), `icons/`, `assistente/`, `licenca/`, `third_party/` e a documentação.

## Usar

O Finan+ web é um site estático: pode ir para o GitHub Pages (acima) ou para qualquer hospedagem com **HTTPS** (Netlify, Cloudflare Pages, um servidor próprio…); nesse caso, publique o conteúdo de `_site/` gerado por `npm run build && npm run site`. Não há servidor de aplicação, banco de dados nem conta: tudo roda e fica no navegador.

- **Instalar:** abra o endereço e use "Instalar app" (Chrome/Edge no computador), "Adicionar à tela inicial" (Android) ou Compartilhar › "Adicionar à Tela de Início" (iPhone).
- **Abrir direto da pasta:** dê dois cliques no `index.html` (endereço `file://…`). Funciona sem instalar nada, com os dados criptografados. Nesse modo não há instalação como app nem cache offline (o arquivo já está no computador), e os dados ficam separados dos de um endereço `https://`. Se o navegador não oferecer o armazenamento criptografado para arquivos locais, o app avisa e guarda sem criptografia.
- **Testar como site no computador:** `python3 -m http.server 8000` nesta pasta e abra `http://localhost:8000`.
- **Atualizar:** `npm run site` carimba uma versão nova no `sw.js` de `_site/` (no GitHub Pages isso é automático). Na próxima abertura o navegador baixa os arquivos novos.

### Vindo do "Minhas Finanças" (Finan+ web 0.5.0)

Publique esta versão **no mesmo endereço** da antiga. Na primeira abertura, os dados antigos são migrados e passam a ficar criptografados; o PIN antigo continua valendo. Os dados de um site ficam presos ao endereço dele: num endereço novo, use o backup JSON da versão antiga (Ajustes › Dados › Restaurar).

## Seus dados

| O quê | Onde |
|---|---|
| Dados (criptografados, AES-256-GCM) | IndexedDB do site, banco `finan-plus`: versão atual e anterior |
| Chave | IndexedDB do site, como chave **não extraível** do WebCrypto |
| Configurações deste aparelho | localStorage `finanplus_device`: hash do PIN, avisos, assistente, dicas dispensadas. Não vão para o backup |

O backup JSON (Ajustes › Dados) é o mesmo formato do app Android e da versão Linux: dá para levar os dados entre os três. "Limpar dados do site" no navegador apaga tudo: faça backups.

## Desenvolvimento

O código-fonte legível está em `js/*.js` (módulos). O navegador carrega `js/app.bundle.js`, que junta esses módulos num arquivo comum para o app abrir também direto da pasta (`file://`, onde os navegadores bloqueiam módulos). Depois de mudar qualquer arquivo em `js/`, o dicionário ou as licenças, gere de novo:

```sh
npm install        # instala esbuild (gera o bundle) e fake-indexeddb (testes); só para desenvolvimento
npm run build      # gera js/app.bundle.js e js/embedded-data.js
npm test           # 95 testes (node --test)
```

```
index.html, style.css     estrutura e visual (Liquid Glass, 6 temas, layout de computador)
js/core.js                núcleo sem interface (testado): modelo, dinheiro, finanças, operações, backup
js/assist.js              assistente: texto, dicionário, categorias, resumo, dicas, perguntas
js/report.js, js/pdf.js   números do relatório e gerador de PDF próprio
js/store.js               armazenamento criptografado, migração, PIN
js/app.js                 início, bloqueio, navegação, atalhos, avisos, virada do dia
js/screens.js             telas (Início, Lançamentos, Relatórios, Assistente, Ajustes)
js/simulator.js           contas do simulador "E se…?" e comparação dos Relatórios
js/simsheet.js            folha do simulador
js/editors.js             editores e diálogos (lançamento, meta, conta, cartão, fatura…)
js/ui.js, js/ctx.js       utilidades de interface e estado compartilhado
js/icons.js               ícones Material Symbols embutidos
js/app.bundle.js          GERADO: todos os módulos num arquivo (é o que o index.html carrega)
js/embedded-data.js       GERADO: dicionário e licenças embutidos
sw.js, manifest.webmanifest   funcionamento offline e instalação
assistente/dicionario.txt dicionário aberto do assistente
tests/                    testes (node --test)
tools/build.mjs           gera o bundle (npm run build)
tools/site.mjs            monta _site/ para publicar (npm run site)
.github/workflows/        publicação automática no GitHub Pages
tools/demo-data.js        dados fictícios para capturas de tela
licenca/, third_party/    licenças e créditos
```

Nenhuma biblioteca é carregada pelo app. As dependências de desenvolvimento são o `esbuild` (MIT), que só junta os arquivos, e o `fake-indexeddb` (Apache 2.0), usado nos testes; nenhuma delas vai para o app.

## Licença

Finan+ — Copyright (C) 2026 Juscelino Be.

Software livre sob a **GNU GPL v3 ou posterior** (`GPL-3.0-or-later`). O texto completo está em `LICENSE` e dentro do app, em *Ajustes › Sobre*. Todos os arquivos de código trazem o aviso de copyright e `SPDX-License-Identifier: GPL-3.0-or-later`.

Ícones: Material Symbols Rounded, © Google, Licença Apache 2.0 (compatível com a GPL v3). Detalhes em `third_party/material-symbols/`. Larguras das fontes padrão do PDF: métricas AFM públicas da Adobe, ver `third_party/adobe-core14-metrics/`.

Finan+ é um projeto independente idealizado e desenvolvido por Juscelino Be, com auxílio de inteligência artificial na implementação, revisão e evolução do código.
