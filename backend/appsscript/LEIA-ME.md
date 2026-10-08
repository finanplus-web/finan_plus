# Finan+ · serviço da nuvem (Apps Script)

Este é o "servidor" da nuvem do Finan+: um único arquivo (`Code.gs`) publicado como App da Web em
`script.google.com`, guardando os registros **cifrados** numa Planilha Google criada automaticamente.

- **Guia completo de instalação (passo a passo):** [`../../NUVEM.md`](../../NUVEM.md)
- **Contrato da API:** abaixo (o `tools/mock-cloud.mjs` implementa o mesmo contrato para testes locais).

## Arquivos

| Arquivo | O quê |
|---|---|
| `Code.gs` | O serviço inteiro: login Google, leitura/gravação com versões, lápides, membros e compactação |
| `appsscript.json` | Manifesto (App da Web: executar como eu, acesso de qualquer pessoa; a segurança é o login) |

## Ações da API

Todas as chamadas são `POST` com `Content-Type: text/plain` (requisição "simples", que o navegador não
bloqueia por CORS) e corpo JSON `{ "v": 1, "action": "...", "token": "<ID token do Google>", ... }`.
A resposta é `{ "ok": true, ... }` ou `{ "ok": false, "error": "codigo", "message": "texto" }`.
Erros: `setup_pending`, `setup_bad_code`, `auth_invalid`, `not_member`, `admin_only`, `bad_request`,
`busy`, `internal`.

| Ação | Parâmetros | Devolve |
|---|---|---|
| `hello` | `clientId`, `setupCode?`, `name?`, `stats?` | Identidade (`email`, `name`, `isAdmin`); na 1ª chamada com o `SETUP_CODE`, consagra o administrador e guarda o `clientId` |
| `pull` | `since`, `exclude?`, `full?` | Eventos do diário com `seq > since` (sem os do próprio `exclude`); `full: true` ou `since` antigo demais devolve o retrato completo (`records`) |
| `push` | `changes: [{col,id,baseTs,deleted,blob}]`, `updater` | `applied` (com nova versão e `seq`) e `conflicts` (registro atual, quando alguém mudou desde `baseTs`) |
| `members` / `member-add` / `member-remove` | `email` (nas duas últimas; só admin) | Lista de membros |
| `wipe` | `confirm: "APAGAR"` (só admin) | Apaga registros e diário; sobe a versão para os aparelhos perceberem |

## Atalho de configuração: `bootstrap()`

No editor, rodar a função `bootstrap` **uma vez** (▶ Executar) define `ADMIN_EMAIL` como o e-mail da
conta que executou (via `Session`) e cria a planilha — sem precisar do `SETUP_CODE`. O `hello` do app
também guarda o `clientId` no primeiro login do administrador, para conferir a origem dos tokens.
O caminho por `SETUP_CODE` continua valendo (é o que o guia mostra como alternativa).

## Como funciona por dentro

- **Abas da planilha:** `registros` (estado atual: `col, id, ts, updater, del, blob` — um registro por
  linha, `blob` é o conteúdo cifrado em base64) e `diario` (eventos em ordem, para os aparelhos lerem
  só o que mudou). Quando o diário passa de 4.000 eventos, é compactado (`registros` já tem o retrato).
- **Versões:** `ts` é o horário do serviço no momento da gravação. Cada envio leva o `baseTs` que o
  aparelho conhecia; se a linha mudou depois disso, o serviço **recusa** e devolve a versão atual —
  o aparelho decide (por horário de edição) quem fica com o registro. Nada é apagado em silêncio.
- **Lápides:** apagar um registro grava `del: true` (blob vazio) em vez de remover a linha pela API.
- **Concorrência:** todas as leituras/gravações usam `LockService`; dois aparelhos nunca se sobrepõem.
- **Privacidade:** o script não tem a chave da casa; só vê blocos cifrados, ids aleatórios, horários e
  um apelido de aparelho (`updater`).
- **Cotas:** uso folgado para duas pessoas (algumas chamadas por minuto por aparelho). Limite por
  execução: 6 min; envio por chamada: 100 registros; leitura: 3.000 eventos.

## Atualizar o serviço

1. Abra o projeto em `script.google.com` e cole a versão nova de `Code.gs`.
2. **Implantar › Gerenciar implantações › ✏️ › Versão: Nova versão › Implantar.**
   A URL `/exec` continua a mesma.

O aplicativo se adapta: novos campos são ignorados por versões antigas do app, e um `appsscript.json`
novo deve manter `webapp.executeAs = USER_DEPLOYING` e `webapp.access = ANYONE_ANONYMOUS`.

## Testar sem o Google

`node tools/mock-cloud.mjs` sobe uma versão em memória com o mesmo contrato (login simulado
`dev:email`). O app aponta para `http://localhost:8787` com o cliente `dev-mock`
(veja `NUVEM.md › Testar sem o Google`). Os testes automatizados do motor de sincronização
(`tests/sync.test.mjs`) usam um serviço de mentira com as mesmas regras.
