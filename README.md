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

## Como jogar

Use as setas, WASD ou os botões direcionais. Empurre uma caixa de cada vez para um espaço livre; não é possível puxá-la. Use Desfazer ou Ctrl+Z para voltar um movimento, e Reiniciar para recomeçar. Ao preencher todos os objetivos, a fase termina. A seleção permite jogar qualquer fase disponível.

Vitórias e melhores marcas de tempo e movimentos por fase são salvas no armazenamento local do navegador, sem servidor ou ranking online. O cronômetro começa no primeiro movimento válido.

## Estrutura

- `projects/main`: motor independente da interface, regras, eventos, histórico e fases.
- `projects/game`: interface React e build Vite.
- `projects/bot`: busca limitada de uma solução, reutilizando as regras do motor. `solve(state, maxStates)` retorna a sequência de direções ou `null` se não encontrar uma solução dentro do limite.

As 105 fases foram preservadas de `arena.js` (Luiz Paulo, licença MIT). Linhas com comprimentos diferentes são completadas como espaço externo. As fases 52 (menos caixas do que objetivos) e 72 (vazia) estão indisponíveis, sem bloquear as fases posteriores; os dados originais não foram alterados. As outras fases passam pela validação estrutural, mas sua solução não foi verificada individualmente. Os arquivos legados permanecem no repositório como referência.
