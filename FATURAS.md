# Ler fatura ou boleto

O Finan+ lê o **valor** e o **vencimento** de uma fatura em PDF, de uma **linha digitável de boleto** ou de um **Pix copia e cola**, e preenche o lançamento para você conferir. Funciona igual no Android, na versão web (PWA) e no Linux.

Tudo acontece no aparelho, sem internet: o arquivo é lido só na memória, não fica guardado e nada é enviado para lugar nenhum. Nada é lançado sem você confirmar.

## Onde fica

- **Novo lançamento** (despesa) › **Ler fatura ou boleto**.
- **Ajustes › Contas e cartões ›** um cartão › **Ler a fatura deste cartão (PDF)**.
- **Android:** também em **Compartilhar › Finan+** a partir do app do banco ou do e-mail (só PDF). O app abre a leitura depois do desbloqueio.

## Como funciona

1. Escolha se é a fatura de um cartão cadastrado (ou deixe "Não" para boleto e contas).
2. Escolha o PDF, ou cole a linha digitável do boleto ou o Pix copia e cola.
3. Se o PDF tiver senha, digite a senha (ver abaixo).
4. Confira o que foi encontrado. Embaixo de cada valor aparece **de onde ele saiu** (o trecho do código ou do texto), para você conferir.
5. Salve:
   - **Boleto ou conta:** vira uma **despesa pendente** na data de vencimento (ou já paga, se você marcar). Entra nos avisos de vencimento.
   - **Fatura de cartão:** o Finan+ compara com a fatura que ele mesmo calcula pelas compras lançadas naquele cartão. Se faltar valor, o botão **Lançar a diferença no cartão** cria uma compra com a diferença na mesma fatura (ou **Lançar a fatura no cartão**, quando nenhuma compra foi lançada). Se o Finan+ tiver mais do que o banco, ele avisa para você conferir.

## De onde vêm o valor e o vencimento

Em ordem de confiança:

1. **Linha digitável do boleto** (impressa na fatura ou colada). É exata: o valor e o vencimento estão dentro do código, e todos os dígitos verificadores são conferidos. Um número digitado errado não vira um valor errado.
   - Boleto bancário: 47 números (ou o código de barras de 44). O vencimento vem do "fator de vencimento", que recomeçou em 1000 no dia 22/02/2025; das duas datas possíveis, vale a mais próxima de hoje.
   - Boleto de arrecadação (água, luz, telefone, tributos): 48 números, começando com 8. Esse tipo não tem vencimento padronizado no código: confira a data.
2. **Pix copia e cola** (BR Code). O código é conferido pelo CRC. O Pix **dinâmico** não traz o valor (ele fica no banco de quem cobra): nesse caso o app pede para digitar.
3. **Texto da fatura.** Rótulos como "Total desta fatura", "Total a pagar", "Valor do documento" e "Vencimento". Linhas de outros valores são ignoradas: pagamento mínimo, limite, fatura anterior, parcelamento, juros, próximo vencimento.

Cada banco escreve a fatura de um jeito, então o texto é só uma sugestão. Por isso a tela sempre mostra de onde veio e deixa você corrigir.

## PDF com senha

Muitos bancos protegem a fatura com uma senha (geralmente os primeiros dígitos do CPF).

- O app **pede a senha** e abre o PDF só na memória. Nenhuma cópia sem senha é gravada no aparelho.
- Senha errada: o app avisa e pede de novo, sem bloquear nada.
- O app **nunca tenta adivinhar** a senha (testando CPF, datas ou outras combinações).
- PDF com proteção **só contra cópia ou impressão** abre sem senha: o texto é lido normalmente, porque é um documento seu lido no seu aparelho.
- Quem não quiser digitar a senha pode copiar a linha digitável ou o Pix no app do banco e colar no Finan+.

### Lembrar a senha (opcional, desligado por padrão)

Ao digitar a senha da fatura de um cartão, dá para marcar **Lembrar a senha para <cartão>**. No mês seguinte, a fatura do mesmo cartão abre direto.

- A senha fica **cifrada** e **só neste aparelho**: não vai para o backup JSON, nem para o acesso pela rede, nem para outro aparelho.
- Se a senha lembrada não abrir uma fatura nova, o app pede a senha atual.
- Para esquecer: desmarque a opção ao digitar a senha, ou use **Esquecer senha** no cartão. Excluir o cartão e **Apagar todos os dados** também apagam a senha.

| Versão | Onde a senha lembrada fica |
|---|---|
| Android | Cifrada com AES-256-GCM por uma chave própria do Android Keystore (`BillPasswords`) |
| Web (PWA) | Cifrada com AES-256-GCM pela mesma chave não extraível dos dados, num registro à parte do IndexedDB (`billpw`). Sem criptografia disponível no navegador, a opção não aparece |
| Linux | Cifrada com XChaCha20-Poly1305 (libsodium) pela mesma chave do arquivo de dados (que fica no chaveiro do sistema), num arquivo à parte (`faturas.fin`) |

## O que ainda não faz

- **Print ou foto da fatura (imagem):** precisa de OCR, que fica para uma próxima etapa (com o Tesseract, open source). Por enquanto, um PDF que é só imagem mostra o aviso "PDF sem texto" e você digita os valores ou cola o código.
- Lançar cada compra da fatura do cartão separadamente: só o total (ou a diferença) é lançado.

## Bibliotecas

Todas open source e rodando no aparelho:

| Versão | Leitura do PDF | Licença |
|---|---|---|
| Android | [PdfBox-Android](https://github.com/TomRoush/PdfBox-Android) | Apache 2.0 |
| Web (PWA) | [PDF.js](https://github.com/mozilla/pdf.js) da Mozilla, embutido em `js/vendor/pdfjs.js` e carregado só quando usado | Apache 2.0 |
| Linux | [Poppler](https://poppler.freedesktop.org/) (poppler-glib) | GPL-2.0 ou posterior |

A leitura do boleto, do Pix e do texto é código do próprio Finan+, igual nas três versões e coberta por testes.

## Arquivos (versão web)

| Arquivo | O que faz |
|---|---|
| `js/bill.js` | Boleto (bancário e arrecadação), Pix, leitura do texto e comparação com a fatura do cartão |
| `js/billpdf.js` | Carrega o PDF.js sob demanda, abre o PDF (com senha) e junta o texto em linhas |
| `js/billsheet.js` | A tela: escolher, senha, conferir e salvar |
| `js/store.js` | Senhas lembradas (`billPassword`, `setBillPassword`) |
| `js/vendor/pdfjs.js` | PDF.js gerado por `npm run vendor:pdfjs` (`tools/vendor-pdfjs.mjs`) |
| `tests/bill.test.mjs` | Testes, incluindo PDFs de exemplo em `tests/fixtures/faturas/` (fatura fictícia, sem senha, com senha AES-256 e RC4, só com restrição e só imagem) |

O PDF.js roda na própria página (sem abrir outro processo), então também funciona abrindo o Finan+ direto da pasta. Ele é guardado pelo service worker para funcionar sem internet. A página continua proibindo `eval` (o PDF.js é aberto com `isEvalSupported: false`).
