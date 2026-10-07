# Finan+ web · Modo remoto (beta, não publicado)

O mesmo Finan+ web (PWA) funciona de dois jeitos:

| | Modo normal (como sempre) | Modo remoto |
|---|---|---|
| Como abre | GitHub Pages, app instalado ou pasta | Pelo endereço do celular (Finan+ Android › Ajustes › Acesso pela rede) |
| Onde ficam os dados | Neste navegador (IndexedDB, AES-256-GCM) | No celular. Nada financeiro é gravado no navegador |
| Service worker / cache | Sim (funciona offline) | Não (tudo vem do celular a cada abertura) |
| Avisos de vencimento | Do navegador | Do celular |
| Apagar tudo | Sim | Só pelo celular |

O modo normal **não mudou**: os dados locais do navegador continuam sendo lidos e gravados como antes.
Os dois modos nem compartilham armazenamento: o endereço do celular (`https://192.168…`) é outra origem
para o navegador, então os dados locais do Finan+ web nunca se misturam com os do celular.

## Como o modo remoto é ativado

O servidor do celular entrega o `index.html` com `<meta name="finanplus-remote" content="1">`.
`js/remote.js` detecta a marca (`isRemote()`) e o `app.js` usa o `RemoteStore` no lugar do `Store`.
Sem a marca, nada do modo remoto roda.

## Como funciona

- **Conectar:** tela “Conectar ao celular” → código de 6 dígitos → “Confirme no celular” → o celular
  permite → token (só em `sessionStorage`; some ao fechar a aba).
- **Ler:** `GET /api/remote/state` → `{rev, palette, data}` (`data` no formato do backup).
- **Gravar:** cada alteração envia o estado inteiro `PUT /api/remote/state {rev, data}`.
  - Versão diferente da do celular → `409` → `ConflictError` → o app mostra a versão do celular e avisa
    *“Alteração não salva”* (o mesmo fluxo de duas abas abertas). Nada se perde por sobrescrita.
  - O celular valida com a mesma rotina do backup e **recusa** a gravação se algum item fosse descartado.
- **Mudanças no celular:** a cada 4 s (aba visível) `GET /api/rev`; mudou → recarrega e redesenha.
  Essa consulta não conta como uso: o servidor do celular continua desligando sozinho.
- **Tema:** vem nos dados (é o mesmo do app). No *Material You*, as cores do papel de parede do celular
  chegam em `palette` e são aplicadas (`applyPalette`). *Sistema* no escuro usa o OLED, como no app.
- **Conexão perdida:** aviso discreto; a próxima gravação mostra o erro. Token expirado (servidor
  reiniciado ou aparelho desconectado no celular) → volta para “Conectar ao celular” e recarrega.
- **Ajustes:** mostra “Conectado ao celular” com **Desconectar**; textos de privacidade adaptados.
  O PIN do Finan+ web, se definido, vale só para este navegador.

## Arquivos

| Arquivo | O quê |
|---|---|
| `js/remote.js` | `isRemote`, `RemoteStore` (mesma interface do `Store`, valida as respostas do celular), tela de conexão, cores do celular |
| `js/app.js` | Escolhe o armazenamento, sem service worker no remoto, consulta de mudanças, reconexão, avisos e “Apagar tudo” adaptados |
| `js/screens.js` | Textos de Ajustes e da barra lateral no modo remoto |
| `style.css` | Estilos da tela de conexão |
| `tests/remote.test.mjs` | 8 testes do modo remoto (inclui resposta fora do formato) |

## Levar para o app Android

```bash
npm install && npm run build          # gera js/app.bundle.js
../finan_plus_android/tools/sync-pwa.sh .
```

O script copia `index.html`, `style.css`, `manifest.webmanifest`, `js/app.bundle.js` e os ícones para
`app/src/beta/assets/lan/pwa` (o `sw.js` fica de fora de propósito).

## Testes

`npm test`: 85 testes (77 existentes + 8 do modo remoto).
