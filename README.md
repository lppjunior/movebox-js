# Movebox

Jogo de lógica Sokoban, executado inteiramente no navegador. Empurre todas as caixas necessárias até os objetivos sem prendê-las nas paredes.

## Desenvolvimento

Requisitos: Node.js 26 e npm. Os pacotes usam npm workspaces.

```sh
npm ci
npm start
npm test
npm run lint
npm run build
```

O servidor de desenvolvimento abre em `http://localhost:9002`. O build estático é gerado em `dist/`; `vercel.json` configura essa saída para publicação na Vercel.

## Google Tag Manager

Copie `projects/game/.env.example` para `projects/game/.env` para ativar o GTM localmente. No provedor de deploy, configure `VITE_GTM_ID=GTM-KMTQTFL` antes do build para cada ambiente desejado. O identificador é público e é incluído no HTML. Sem a variável, o jogo funciona, mas o GTM fica desativado e o build exibe um aviso.

## Como jogar

Use as setas, WASD ou os botões direcionais. Empurre uma caixa de cada vez para um espaço livre; não é possível puxá-la. Use Desfazer ou Ctrl+Z para voltar um movimento, e Reiniciar para recomeçar. Ao preencher todos os objetivos, a fase termina. A seleção permite jogar qualquer fase disponível.

Vitórias e melhores marcas de tempo e movimentos por fase são salvas no armazenamento local do navegador, sem servidor ou ranking online. O cronômetro começa no primeiro movimento válido.

## Estrutura

- `projects/main`: motor independente da interface, regras, eventos, histórico e fases.
- `projects/game`: interface React e build Vite.
- `projects/bot`: busca limitada de uma solução, reutilizando as regras do motor. `solve(state, maxStates)` retorna a sequência de direções ou `null` se não encontrar uma solução dentro do limite.

As fases derivam dos dados da versão legada, originalmente no arquivo `arena.js`. A comparação com [PicoSystem Boxworld](https://github.com/AndrewFromMelbourne/picosys-boxworld), que identifica as 100 fases da versão Windows de 1992, e com as [soluções de Pratanna Box](https://github.com/gabsprates/pratanna-box/blob/master/src/db.ts) revelou erros de transcrição nas fases 28, 52 e antiga 101. Eles foram corrigidos e as respectivas soluções verificadas no motor. O tabuleiro original 72 já estava na antiga posição 73: a posição vazia foi removida e as fases seguintes renumeradas, totalizando 104. A antiga fase 54 e as quatro últimas são diferentes da coleção de referência e foram preservadas. Linhas com comprimentos diferentes são completadas como espaço externo.

Os recordes locais da versão anterior são migrados para a nova numeração; a cópia original é mantida no navegador.

As soluções de referência foram reproduzidas no motor para 99 das primeiras 100 fases; a fase 54, diferente da referência, também foi resolvida separadamente. Das quatro fases extras, as duas primeiras foram resolvidas; a busca nas duas últimas foi inconclusiva. Validação estrutural, por si só, não garante que uma fase seja solucionável.
