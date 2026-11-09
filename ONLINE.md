# Publicar multiplayer: GitHub + Vercel + servidor

O online está implementado, mas não é publicado automaticamente ao enviar somente o frontend à Vercel. São dois serviços do mesmo repositório.

## Testar no computador

1. `npm install`
2. Terminal 1: `npm run server` (porta 8787).
3. Terminal 2: `npm run dev`.
4. Abra duas abas independentes. Na primeira, Passear com amigos → apelido → Criar sala. Na outra, use o código e outro apelido. Cada aba tem sua própria sessão.
5. Para executar a suíte de rede: `npm run test:online`.

## 1. GitHub

Envie o projeto inteiro, incluindo package-lock.json, public/audio, server, src, vercel.json e Dockerfile. Não envie node_modules, dist, server-data ou arquivos .env. .gitignore já contém essas exclusões. server-data guarda credenciais de reconexão e nunca deve ser publicado.

## 2. Frontend na Vercel

Importe o repositório, raiz do projeto, framework Vite. Instalação `npm ci`, build `npm run build`, saída `dist`. vercel.json já define isso. Guarde a URL HTTPS final, por exemplo https://pe-na-estrada.vercel.app.

## 3. Servidor no Render (ou servidor Node equivalente)

Crie um Web Service a partir do mesmo repositório. Runtime Node, build `npm ci --omit=dev`, start `npm run server`. Uma única instância: não habilite escalonamento horizontal, pois esta implementação usa um arquivo local de sessões.

Variáveis do servidor:

```
NODE_ENV=production
HOST=0.0.0.0
DATA_DIR=/var/data/pe-na-estrada
ALLOWED_ORIGINS=https://SEU-PROJETO.vercel.app
```

O Render fornece PORT automaticamente. Configure um disco persistente montado em `/var/data`. Discos persistentes no Render exigem serviço pago; nenhum serviço ou assinatura foi contratado por este projeto. Como alternativa, use uma máquina Node com diretório durável e proxy HTTPS/WebSocket, ou o Dockerfile com volume montado em `/data`.

Health check: `/health`. A resposta deve conter `ok: true`. Endpoint WebSocket: `/ws`. No Render, por exemplo: `wss://SEU-SERVIDOR.onrender.com/ws`.

ALLOWED_ORIGINS aceita origens exatas separadas por vírgula, sem barra final. Adicione domínios de preview explicitamente se precisar testá-los. Não use a URL do backend nesse campo: ele contém as URLs do frontend autorizado.

## 4. Conectar os dois serviços

Na Vercel → Settings → Environment Variables:

```
VITE_MULTIPLAYER_URL=wss://SEU-SERVIDOR.onrender.com/ws
```

Marque os ambientes desejados e faça novo deploy. Variáveis VITE são incorporadas no build; só salvar a variável não altera uma versão já publicada. O endpoint é público, não uma senha. Site HTTPS exige wss://.

## 5. Validação na internet

Abra a URL da Vercel em dois dispositivos. Crie uma sala, envie o convite e entre pelo segundo dispositivo. Confira apelidos, movimento, troca de moto e saída. Desconecte temporariamente a rede e restaure em menos de dois minutos. Só considere a hospedagem validada após esse teste externo; os testes executados neste projeto foram locais.

## Comportamento e limites

Até 4 jogadores por sala. Estado enviado a 10 Hz e interpolado no cliente. Motos remotas mostram o modelo escolhido e apelido; sem colisão entre jogadores. Todos usam o mesmo mundo e fim de tarde, identificados pela versão do protocolo. Menu/aba fora de foco para apenas o próprio jogador.

Sessões são gravadas antes da confirmação de entrada, com checkpoints de posição a cada segundo. Um crash pode perder até aproximadamente um segundo de posição. Reconexão automática com espera progressiva; vaga reservada por 120 segundos após desconexão detectada. Depois disso, entre novamente. Reiniciar o servidor exige o mesmo DATA_DIR durável; não se deve usar disco efêmero para prometer continuidade.

Servidor valida tipos, limites, versão, origem e frequência. Payload máximo de 4 KB, limite de mensagens por conexão, limite global de conexões/salas e heartbeat. Posições são informadas pelos clientes: não há simulação autoritativa ou anticheat completo. Salas são acessíveis a quem tem o código; não há contas nem lista de amigos. Acessórios ainda não existem no jogo e portanto não são sincronizados.

A Vercel atualmente suporta WebSockets, mas funções com múltiplas instâncias precisam de armazenamento/coordenação externos para salas compartilhadas. Este backend foi deliberadamente implementado como serviço Node de instância única com disco persistente; não coloque server/index.mjs em uma Function esperando compartilhar o Map de salas.

Fontes consultadas:
- https://vercel.com/docs/functions/websockets
- https://render.com/docs/websocket
- https://render.com/docs/disks

## Som dos outros jogadores

Somente a buzina dos outros jogadores é reproduzida, com volume por distância (até 90 metros) e direção estéreo relativa à câmera. H ou LB envia um evento somente à sala atual, limitado a um disparo a cada 400 ms. Motores são exclusivamente locais. Nenhuma camada de motor remoto é criada e dados de aceleração/marcha não são mais enviados pela rede.

## Mapa de 20 km — protocolo v5

Esta atualização exige publicar tanto o servidor no Render quanto o frontend na Vercel. Ambos usam `vale-horizonte-v5`; salas antigas v3/v4 são descartadas e os jogadores precisam criar/entrar em uma sala nova. Os limites de posição abrangem o vale ampliado e a velocidade aceita a Pop a 100 km/h. O tempo de conexão inicial foi ampliado para 60 segundos para tolerar a inicialização de servidores gratuitos. Isso não substitui a necessidade de verificar os logs se o host continuar encerrando conexões.

Gasolina é local, salva por moto no navegador, e não sincronizada entre jogadores. Cada pessoa abastece sua própria moto.

A revisão de serras, bifurcações e terra usa v5 porque o relevo e as posições das vias mudaram. Depois do push, confira ambos os deploys; se o Render não atualizar automaticamente, use Manual Deploy → Deploy latest commit. `/health` deve retornar `world: vale-horizonte-v5`. Recarregue todos os clientes e crie uma sala nova. O erro de incompatibilidade agora informa a versão do servidor e a necessidade de atualizar Render/Vercel.
