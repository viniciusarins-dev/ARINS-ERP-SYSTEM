# Bob no iPhone: "Olá, Bob"

O Bob é um Atalho do iPhone. Você fala **"Olá, Bob"**, ele pergunta quantos leads você quer, cria os leads no painel ARMAG e abre a lista do dia com as mensagens prontas.

**Precisa de:** iPhone com iOS 18 ou mais novo (o seu: iPhone 16, iOS 26.5.2) e o app **Atalhos**.

## 1. Montar o Atalho (cerca de 5 minutos)
Abra **Atalhos** → **+** (novo atalho) → renomeie para **Bob**. Adicione estas ações, nesta ordem:

1. **Falar Texto**
   - Texto: `Fala, Vinicius! Quantos leads você quer hoje?`
   - Toque na seta e escolha a voz em português. Deixe "Esperar até terminar" ligado.
2. **Ditar Texto**
   - Idioma: Português (Brasil).
   - Parar de ouvir: "Após Pausa".
3. **Obter Conteúdo do URL**
   - URL: `https://gxrvtdlcdqpirojyibbm.supabase.co/functions/v1/bob`
   - Toque em "Mostrar Mais":
     - Método: **POST**.
     - Cabeçalhos: adicione `X-Bob-Token` com o valor do **token do Bob** (o Claude te passa uma vez; não compartilhe).
     - Corpo da Solicitação: **JSON**, com dois campos:
       - `acao` (Texto) = `pedido`;
       - `texto` (Texto) = a variável **Texto Ditado** (toque e escolha da ação 2).
4. **Obter Valor do Dicionário**
   - Obter **Valor** da chave `falar` em **Conteúdo do URL**.
   - Logo depois, adicione **Falar Texto** com o **Valor do Dicionário**.
5. **Obter Valor do Dicionário**
   - Chave `url` em **Conteúdo do URL**.
   - Logo depois, adicione **Abrir URLs** com esse valor.

Teste tocando no ▶︎. Responda "um" e veja se ele fala o resultado e abre o painel.

Até a chave do Google ser configurada, ele responde "Desculpa, não consegui buscar agora…". Isso é esperado.

## 2. Ligar ao "Olá, Bob" (sem dizer "E aí, Siri")
**Ajustes** → **Acessibilidade** → **Atalhos Vocais** → **Configurar Atalhos Vocais**

1. Ação: escolha **Atalho** → **Bob**.
2. Frase: diga **"Olá, Bob"** 3 vezes, quando o iPhone pedir.
3. Pronto. Fale "Olá, Bob" com o iPhone por perto.

Com o iPhone bloqueado, o Face ID pode ser pedido para abrir o painel. A parte falada funciona.

## Exemplos do que dizer
- "cinco": 5 leads de barbearias e salões em Joinville.
- "três barbearias"
- "quatro salões no Saguaçu"
- "dois em Araquari"

No máximo 10 por pedido. Sem número, ele cria 5.

## Se algo der errado
- **"não consegui buscar":** a chave do Google não está configurada ou a cota acabou.
- **Erro 401 no Atalho:** o token do Bob no cabeçalho está errado. Peça um novo ao Claude, que troca o segredo `BOB_TOKEN` no Supabase.
- **Perdeu o iPhone:** peça ao Claude para trocar o token do Bob. O antigo para de funcionar na hora.
