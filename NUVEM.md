# Finan+ · Conta e nuvem

O Finan+ pode funcionar como sempre (tudo só neste aparelho, offline e cifrado) **ou** conectar-se à
**sua própria nuvem no Google**: uma planilha na sua conta, com os dados **cifrados no aparelho**, login
com Google e sincronização entre Windows, Android, iPhone e Linux — com **duas pessoas usando ao mesmo
tempo**.

| | Sem nuvem (como sempre) | Com nuvem |
|---|---|---|
| Onde ficam os dados | Neste aparelho (IndexedDB, AES-256-GCM) | Neste aparelho **e** na sua planilha Google (blocos cifrados) |
| Login | PIN local (opcional) | PIN local + conta Google |
| Vários aparelhos/pessoas | backup JSON manual | sincronização automática a cada ~15 s |
| Funciona offline | sim | sim (as alterações sobem quando a conexão voltar) |
| Quem consegue ler os valores | só este aparelho | só quem tem o **código da casa** e um login autorizado — nem o Google lê |

A nuvem é **opcional e não muda nada** para quem não ativá-la.

## Como funciona (sem sustos)

```
Finan+ (Windows / Android / navegador)          Sua conta Google
┌──────────────────────────────┐               ┌─────────────────────────────────┐
│ dados locais cifrados        │    HTTPS      │ Apps Script (API pequena)       │
│ + registro das alterações    │ ────────────► │   • confere o login Google      │
│                              │               │   • guarda blocos CIFRADOS      │
│ cifra tudo com a             │ ◄──────────── │   • diário de alterações        │
│ "chave da casa" antes de     │  só o que     │                                 │
│ enviar                       │  mudou        │ Planilha Google (no seu Drive)  │
└──────────────────────────────┘               └─────────────────────────────────┘
```

- **Cada lançamento é um registro.** As alterações sobem e descem separadamente; duas pessoas podem
  mexer em coisas diferentes ao mesmo tempo sem uma apagar a outra.
- **Mesmo registro ao mesmo tempo:** a versão mais nova prevalece e o Finan+ avisa
  ("alterações de outra pessoa"); nada é apagado em silêncio.
- **Apagar um lançamento** vira uma "lápide": some em todos os aparelhos e não ressuscita.
- **A chave da casa** (código de 24 caracteres) existe só nos seus aparelhos. O que sobe para o Google
  são blocos ilegíveis. Sem o código, ninguém lê — nem você, se perder todos os aparelhos.

## Instalar como aplicativo (Windows, Android e afins)

O Finan+ é um PWA: o mesmo site vira app instalável, com ícone e janela própria.

| Onde | Como instalar |
|---|---|
| **Windows 10/11** | Abra `https://finanplus-web.github.io/finan_plus/` no **Chrome ou Edge** → ícone de instalação na barra de endereço (ou menu ⋮ → "Instalar Finan+"). Depois, procure "Finan+" no menu Iniciar. |
| **Android** | Abra no Chrome → menu ⋮ → **"Adicionar à tela inicial"** → "Instalar". (Também funciona no Firefox e no Samsung Internet.) |
| **iPhone/iPad** | Safari → Compartilhar → **"Adicionar à Tela de Início"**. |
| **Linux** | Chrome/Edge → "Instalar app". (A versão nativa GTK continua disponível.) |

Dica: instale em cada aparelho onde quiser usar; faça login e digite o código da casa **uma vez** em cada
um — depois é só abrir e usar.

## Configurar a nuvem (uma vez, por quem "administra a casa")

Você vai criar duas coisas na sua conta Google: o **serviço** (Apps Script + planilha) e o **login**
(cliente OAuth). Leva ~10 minutos, é de graça, e não precisa de servidor nem cartão de crédito.

### 1. Criar o serviço (Apps Script)

1. Abra **[script.google.com](https://script.google.com)** e clique em **Novo projeto**.
2. Apague o conteúdo do arquivo `Código.gs` e cole o conteúdo de
   [`backend/appsscript/Code.gs`](https://github.com/finanplus-web/finan_plus/blob/main/backend/appsscript/Code.gs) deste repositório.
3. No ícone de engrenagem (**Configurações do projeto**), marque **"Mostrar o arquivo de manifesto
   `appsscript.json`"**. Abra o `appsscript.json` que aparecer e cole o conteúdo de
   [`backend/appsscript/appsscript.json`](https://github.com/finanplus-web/finan_plus/blob/main/backend/appsscript/appsscript.json) (pode ficar assim; o
   script cria a planilha sozinho na primeira vez).
4. Salve (💾). Dê um nome ao projeto, ex.: `Finan+ nuvem`.

### 2. Definir quem administra a casa

**Atalho recomendado:** na barra superior do editor, escolha a função **`bootstrap`** na lista e clique em **▶ Executar**. Na primeira vez o Google pede as permissões — clique em *Revisar permissões* → sua conta → *Avançado* → *Acessar "Finan+ nuvem" (não seguro)* → **Permitir**. Pronto: sua conta vira administradora e a planilha de dados é criada. (Rodar de novo não muda nada.)

**Alternativa com código temporário:** em *Configurações do projeto › Propriedades do script*, crie `SETUP_CODE` com um código só seu (8+ caracteres). Nesse caminho, o app pede esse código na primeira entrada, em vez de usar o atalho acima.

### 3. Publicar o serviço

1. Clique em **Implantar › Nova implantação** → engrenagem → **App da Web**.
2. Descrição: `Finan+ nuvem 1` · **Executar como: Eu** · **Quem pode acessar: Qualquer pessoa**
   (a segurança é feita pelo login Google dentro do script; sem login válido, ele não responde nada).
3. **Implantar** e autorizar as permissões (é a sua própria conta criando uma planilha no seu Drive).
4. Copie a **URL do app da Web** — termina em `/exec`. É ela que vai no `nuvem.json`.

### 4. Criar o login Google (cliente OAuth)

1. Abra **[console.cloud.google.com](https://console.cloud.google.com)** e crie um projeto (ex.:
   `Finan+ nuvem`).
2. **APIs e serviços › Tela de permissão OAuth** ("Google Auth Platform"): tipo **Externo** → Criar.
   Preencha só o obrigatório (nome "Finan+", e-mail). Em **Público-alvo/Testes**, adicione **os e-mails
   Google das pessoas da casa** em *Usuários de teste*. (Não precisa publicar.)
3. **APIs e serviços › Credenciais › Criar credenciais › ID do cliente OAuth**:
   - Tipo: **Aplicativo da Web** · Nome: `Finan+ web`.
   - **Origens JavaScript autorizadas** — adicione exatamente:
     - `https://finanplus-web.github.io` (ou o endereço onde o site estiver)
     - `http://localhost:8000` (para testes no computador)
   - Criar e copie o **ID do cliente** (termina em `.apps.googleusercontent.com`).

### 5. Dizer ao app onde está a nuvem (`nuvem.json`)

Edite o arquivo [`nuvem.json`](nuvem.json) na raiz do repositório:

```json
{ "url": "https://script.google.com/macros/s/SEU-ID/exec", "clientId": "SEU-ID.apps.googleusercontent.com" }
```

Envie para o GitHub (`git commit` e `git push`). O Pages republica sozinho. **Os dois valores não são
segredos** (a segurança está no login + chave da casa). Para testar sem publicar, use
**Ajustes › Conta e nuvem › Configurar serviço** e preencha ali — vale só para aquele navegador.

### 6. Primeiro aparelho (quem administra)

1. Abra o Finan+ → **Ajustes › Conta e nuvem › Entrar com o Google** → escolha sua conta.
   (Se você usou o caminho do `SETUP_CODE`, o app vai pedir o **código de instalação** aqui.
   Com o atalho `bootstrap`, não pede nada.)
2. **Ativar a sincronização › Este é o primeiro aparelho** → um **código da casa** é criado.
   **Copie e guarde** (gerenciador de senhas!). Marque a confirmação e toque em
   **"Ativar e enviar deste aparelho"**.
3. Pronto: a barra lateral mostra **"Nuvem em dia"** e os dados começam a subir cifrados.

### 7. Segunda pessoa (ou outro aparelho seu)

1. No aparelho de quem administra: **Ajustes › Conta e nuvem › Membros** → adicione o **e-mail Google**
   da outra pessoa.
2. No aparelho da outra pessoa: abra o Finan+, **Entre com o Google**, e em
   **Ativar a sincronização** escolha **"Já tenho a nuvem em outro aparelho"** → digite o **código da
   casa** → **"Ativar e baixar da nuvem"**.
3. Daí em diante os dois usam ao mesmo tempo: cada alteração aparece no outro em segundos.

## Usar no dia a dia

- **Nuvem em dia:** nada pendente. Toque para sincronizar agora.
- **Nuvem: entrar / ativar:** falta um passo (login ou código da casa).
- **Sem conexão:** as alterações ficam salvas aqui e sobem sozinhas quando voltar.
- **"Alterações de outra pessoa":** o mesmo registro foi mexido nos dois lados; a versão mais nova
  ficou valendo. Se era a sua, refaça a alteração.
- **Código da casa:** veja/copie em Ajustes › Conta e nuvem (com `Ctrl+H`, os valores ficam ocultos,
  mas o código aparece — ele não é um valor financeiro).
- **Enviar tudo daqui:** quando a nuvem ficou vazia ou fora de sincronia e você quer que a versão
  deste aparelho valha para todos (não apaga nada da nuvem antes; sobrescreve registro a registro).
- **Desconectar este aparelho:** para de sincronizar e esquece login/código aqui; os dados locais ficam.
- **Apagar na nuvem** (só o administrador): apaga a planilha de dados de vez. Na próxima sincronização,
  os outros aparelhos ficam vazios também; em seguida o app pergunta se quer reenviar os dados do
  aparelho atual.

## Segurança e privacidade

- **Cifrado no aparelho (ponta a ponta):** AES-256-GCM com a chave derivada do código da casa; o
  Google guarda apenas blocos ilegíveis, o carimbo de tempo e quem alterou (um apelido aleatório).
- **Login Google:** cada chamada exige um token válido do Google, conferido contra a lista de membros.
  Um token de outro site/aplicativo é recusado.
- **A planilha fica na sua conta.** O Apps Script roda como você ("Executar como: eu") e só serve quem
  estiver com login válido. Se quiser, você pode ver a planilha em `drive.google.com` (procure
  "Finan+ · dados da nuvem") — vai ver blocos sem sentido; **não edite à mão**.
- **Remover alguém** de Membros tira o acesso imediatamente (a pessoa para de receber dados novos), mas
  quem já baixou dados antes ficou com eles — como em qualquer sincronização.
- **Limites de proteção:** o código da casa vale como uma senha longa (120 bits). Não há como recuperá-lo
  se for perdido junto com todos os aparelhos — é o preço de nem o provedor conseguir ler.
- **PIN do app:** continua valendo para o aparelho; nunca vai para a nuvem.

## Limites do Google Apps Script (o que esperar)

- A sincronização é por consulta: mudanças de outras pessoas aparecem em **~15 s** (não é tempo real
  instantâneo). Cada aparelho faz uma consulta leve; dois aparelhos ficam **muito** longe das cotas
  diárias do Google.
- Cada chamada demora ~0,5–2 s (o app não espera por ela: você edita na hora; o envio acontece em segundo
  plano).
- O Google pode mudar cotas/limites a qualquer momento; para este tamanho de uso (duas pessoas), é
  tranquilo.
- A primeira publicação/edição do script exige reautorização; o script cria a planilha na primeira
  chamada.

## Perguntas frequentes

**Preciso manter o computador ligado?** Não. O Apps Script roda no Google; a planilha vive no seu Drive.

**Perdi o código da casa.** Procure em Ajustes › Conta e nuvem em qualquer aparelho que já esteja
conectado (mostrar/copiar), ou no gerenciador de senhas. Se **todos** os aparelhos e o código forem
perdidos, os dados da nuvem não têm como ser abertos — resta restaurar um backup JSON.

**Quero trocar a chave** (ex.: alguém saiu da casa e conhecia o código). Hoje: crie uma chave nova com
um aparelho de confiança (**Apagar na nuvem** seguido de **Enviar tudo daqui**, usando "Já tenho um
código" para digitar a chave nova em cada aparelho). A troca com re-cifragem automática está nos planos.

**Funciona com mais de duas pessoas?** Sim — o desenho é o mesmo; adicione cada e-mail em Membros.

**Dá para ver meus valores na planilha?** Não — só blocos cifrados. Se quiser, faça o backup JSON
(Ajustes › Dados), que continua existindo e igual ao das versões Android/Linux.

**A nuvem funciona aberta direto da pasta (`file://`)?** Não. Use o site (https://) ou
`http://localhost:8000` em testes.

**Estou usando o "Acesso pela rede" do app Android (modo remoto).** Os dois podem conviver: no modo
remoto os dados são do celular; a nuvem é uma opção separada do Finan+ web.

## Testar sem o Google (desenvolvimento)

```bash
npm install && npm run build && npm run site
npm run mock-cloud      # nuvem de mentira em http://localhost:8787 (login simulado)
npm run preview         # serve o site em http://localhost:8000
```

No app: Ajustes › Conta e nuvem › Configurar serviço → URL `http://localhost:8787` · cliente `dev-mock`.

## Problemas comuns

| Sintoma | Causa provável | Solução |
|---|---|---|
| "O serviço ainda não foi ativado" ao entrar | ninguém configurou o administrador | No editor do script, rode a função `bootstrap` (passo 2) — ou defina o `SETUP_CODE` e digite-o no app. |
| "Código de instalação incorreto" | digitou outro valor | Confira o `SETUP_CODE` (ele é apagado depois da primeira entrada; com o `bootstrap`, não é necessário). |
| "Esta conta ainda não foi autorizada" | e-mail fora de Membros | Adicione o e-mail (passo 7) e entre de novo. |
| "Esta sessão do Google é de outro aplicativo" | o `clientId` do `nuvem.json` não é o mesmo da criação | Use o mesmo ID de cliente OAuth em todos os aparelhos. |
| "Sessão do Google expirada" | passou ~1 h | Toque em "Entrar com o Google" de novo (normalmente entra direto). |
| "O código não abre um registro…" (`code_mismatch`) | código da casa diferente do que criou a nuvem | Use o código original (veja "Perdi o código"). |
| Sincroniza mas não aparece no outro | sem conexão no outro aparelho | Veja o status na barra lateral e toque em "Sincronizar agora". |

---

*Finan+ — Copyright (C) 2026 Juscelino Be · GPL-3.0-or-later.*
