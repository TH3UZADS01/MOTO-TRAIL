# Pé na Estrada

Jogo de exploração solo e multiplayer em navegador, TypeScript + Three.js + Vite. Projeto independente, sem vínculo com os fabricantes das referências.

## Executar

Node.js 22.12+ e npm:

```sh
npm install
npm run dev
```

Abra o endereço indicado pelo Vite. `npm run build` gera `dist/` para servir por HTTP. `npm test` executa os testes. Sons são locais e acompanham o build; o jogo não depende de hotlinks de áudio.

## Pilotagem e câmeras

| Ação | Teclado / mouse | Controle padrão Xbox / equivalente |
| --- | --- | --- |
| Acelerar | W / ↑ | RT / R2 |
| Frear | S / ↓ | LT / L2 |
| Virar | A/D ou ←/→ | Analógico esquerdo |
| Empurrar para trás | Segurar Q | Segurar B / círculo |
| Alternar primeira/terceira pessoa | C | Y / triângulo |
| Olhar | Arrastar cenário | Analógico direito |
| Buzina | H | LB / L1 |
| Subir / reduzir marcha (câmbio manual) | PageUp / PageDown | Direcional ↑ / ↓ |
| Pausa | Esc ou botão da tela | Start / Options |
| Continuar | Botão do menu | A / cruz |
| Escolher moto na pausa | Seletor | Direcional ←/→ |
| Recuperar na estrada | R | Botão do menu pela interface |
| Celular | Toque nas setas, freio e acelerador na tela | — |

Empurrar primeiro freia se estiver em movimento e depois recua a cerca de 4 km/h. Soltar interrompe o recuo suavemente. Não é marcha à ré motorizada. É possível sair de uma colisão recuando, inclusive de uma pequena sobreposição com um obstáculo.

No celular, segure o freio por um segundo com a moto parada para começar a empurrar para trás; solte para interromper. O botão de abastecimento aparece apenas próximo a um posto e exige que a moto esteja parada. A interface touch reduz os controles e indicadores conforme o tamanho da tela.

O retrovisor virtual mostra a estrada atrás da moto durante o passeio. Ative ou desative em Configurações; a atualização inicial é de 20 FPS em 512 × 256, com opções de 10–30 FPS e 256 × 128 a 768 × 384. A captura usa uma câmera traseira e `WebGLRenderTarget`, composta no canvas principal para evitar outro contexto WebGL.

Controle usa Gamepad API com `mapping=standard`, gatilhos analógicos, zona morta e sensibilidade ajustáveis em Configurações → Controle e comandos. Pressione um botão para o navegador reconhecer o controle. Na primeira abertura, clique em Pegar a estrada para autorizar áudio; alguns navegadores não tratam um botão do gamepad como autorização de áudio. Desconexão durante o passeio pausa o jogo. Controles sem mapeamento padrão ainda não têm remapeamento manual.

Em Configurações, escolha câmbio automático ou manual e ative opcionalmente a inclinação automática para frente; as preferências são salvas localmente. Com a inclinação automática, a postura avança progressivamente conforme a velocidade aumenta. No automático, as marchas são controladas pelo RPM e pela velocidade. No manual, use PageUp/PageDown ou direcional ↑/↓ no controle; reduções que excederiam o limite de RPM são recusadas. Inclinar o corpo para frente reduz progressivamente o arrasto do ar, sem aumentar o limite individual de velocidade da moto.

## Cinco opções de moto

Seletores no menu inicial e na pausa; escolha salva localmente. Trocar de moto preserva o local e zera a velocidade.

- Honda CG 150 2008: placeholder de rua com tanque, farol redondo e rodas raiadas; ajuste de jogo até 132 km/h.
- Pop 110i ES: aproximação estilizada, ajuste de jogo até 115 km/h.
- Cub clássica: amarela, escudo creme, banco curto marrom, bagageiro, rodas raiadas e farol redondo; até 82,8 km/h.
- Shineray Phoenix: carenagem integral, banco longo, rodas de liga e farol largo; até 92 km/h. Nome informado pelo usuário; modelo estilizado.
- Caloi XR: quadro aberto branco/vermelho, pedais, motor exposto, guidão alto, farol retangular e rodas raiadas; até 57,5 km/h.

Todos são modelos procedurais estilizados, não réplicas dimensionais certificadas. Valores de desempenho e transmissão são ajustes de jogo, não fichas técnicas dos veículos fotografados. Não foi inferido um ano específico para as três referências novas. Os modelos possuem geometria distinta e recursos GPU são descartados ao trocar.

## Mundo e áudio

Circuito contínuo de aproximadamente 20,1 km, medido em metros no terreno, em um vale de 16 × 16 km. Curvas em S, serra com subidas e descidas, quatro vilas e cinco postos. Quatro ligações asfaltadas atravessam o interior; cinco trilhas de terra somam aproximadamente 8,6 km. Fazenda, camping, cachoeira cenográfica, lago e três pontes sobre um rio contínuo. O traçado parte do conceito aprovado em artifacts/map-v5/conceito-aprovado.png. Terreno em trechos de 256 m carregados ao redor da moto; vegetação instanciada, estrada dividida para descarte de trechos fora da câmera. Edificações com fundações, áreas niveladas e acessos; sinalização legível dos dois lados. Minimapa com asfalto, terra tracejada, rio, postos e posição. O HUD identifica a estrada atual; a distância ao posto mais próximo é em linha reta. Terra tem menos aderência, frenagem mais longa e resistência maior. A recuperação procura a estrada mais próxima de toda a rede. Água profunda bloqueia a moto, mas os tabuleiros das pontes permitem atravessar.

Exploração: o botão **Locais** no topo lista todos os pontos de interesse, marcando os descobertos e os que faltam. A primeira descoberta é salva localmente e toca um breve sinal musical apenas no próprio jogo; revisitar locais ou conectar-se a outros jogadores não retransmite o áudio.

Gasolina: tanques separados por moto, salvos a cada cinco segundos e ao pausar/sair. Um circuito consome aproximadamente metade do tanque em ritmo normal. Velocidade, aceleração e subida aumentam o consumo; empurrar não gasta. Pare próximo às bombas, solte o acelerador e segure E ou X/quadrado para abastecer gratuitamente (0,25 L/s). Postos separados por cerca de 4 km. Se esvaziar, o menu de pausa oferece 0,7 L de emergência; não é necessário resetar a posição. Recuperar ou trocar de moto não enche o tanque.

Partículas leves saem do pneu traseiro em movimento: poeira marrom na terra e fragmentos verdes na grama. A emissão acompanha a velocidade, cessa ao parar e é limitada a um pool reutilizável de 96 partículas; ao trocar de superfície, o efeito anterior é limpo.

Áudio gravado CC0 da BigSoundBank: motor, aceleração, vento e buzina. Loops editados localmente em mono 22.050 Hz, com remoção de DC, filtragem, normalização e emendas suavizadas. Duas camadas por motor; crossfade por carga, reprodução suavizada por rotação/marcha e perfis de timbre por moto. Caloi usa gravação-base diferente. Não há oscilador sintetizando motor, vento ou buzina. Os sons não são gravações autênticas de cada modelo. Veja CREDITS.md.

## Organização

- `terrain.ts`, `world.ts`: superfície e cenário.
- `vehicles.ts`: cadastro e ajustes; `vehicle.ts`: Pop; `vehicle-models.ts`: demais modelos e descarte.
- `riding.ts`: movimento, recuo e colisão; `input.ts`: gamepad.
- `camera.ts`: primeira/terceira pessoa; `audio.ts`: reprodução e mixagem.
- `main.ts`, `interface.ts`, `style.css`: integração e menus; `exploration.ts`: progresso e lista de locais; `audio.ts`: efeitos locais e mixagem; `rear-view-mirror.ts`: câmera e captura traseira; `tire-particles.ts`: partículas reutilizáveis por superfície; `persistence.ts`: preferências locais.
- `network.ts`, `remote-riders.ts` e `server/`: salas e sincronização multiplayer.
- `tools/prepare_audio.py`: reproduz o processamento a partir de `tools/audio-originals/`. Originais não entram no build público.

## Limitações

Sem suspensão independente rígida, quedas, garagem de acessórios ou diário persistente. Faróis automáticos e ciclo dia/noite estão disponíveis no UPDATE 01. O retrovisor virtual reflete a cena; o painel 3D é ilustrativo e a velocidade real do jogo está no HUD. Na primeira pessoa, apenas a cabeça e o pescoço do próprio piloto ficam ocultos; braços e pernas permanecem visíveis. Sons e ergonomia ainda precisam de avaliação humana. Gamepad físico e FPS no Vivobook de referência não foram medidos.

TESTING.md registra o que efetivamente foi validado. Para vistoria local, `?inspect=posto`, `?inspect=mirante`, `?inspect=ponte`, `?inspect=terra`, `?inspect=centro`, `?inspect=camping` e `?inspect=cachoeira` no servidor de desenvolvimento; pontos de início de teste são eliminados do build de produção.

## Multiplayer

Salas reais para quatro pessoas, convite, apelidos, modelos remotos interpolados, reconexão e servidor persistente. Execute `npm run server` junto com `npm run dev`. Para compartilhar pela internet, siga **ONLINE.md**: frontend Vercel + backend Node com armazenamento persistente. Enviar somente o frontend à Vercel não publica o servidor. `npm run test:online` testa sessões WebSocket independentes e reinício do servidor.


## Revisão gráfica

Terreno carregado por trechos, estradas, motos e construções recebem sombras. Sol quente com luz ambiente mais equilibrada e céu em degradê. Texturas procedurais locais de grama, asfalto, terra e água, com relevo de material e UVs em metros para não esticar ao longo das estradas. Nenhum download de textura nem dependência de hotlink.

Todos os presets mantêm sombras próximas: Baixo 1024/32 m, Médio 2048/55 m, Alto 4096/80 m (resolução limitada à capacidade da GPU). O volume das sombras acompanha a moto. A revisão atual usa protocolo v7; publique frontend e servidor juntos.

## Revisão v6: piloto, motos e litoral

Veja [REVISAO-V6.md](REVISAO-V6.md) para as sete melhorias, parâmetros ajustáveis, testes manuais, arquivos e placeholders. Agora são cinco motos (incluindo a CG 150 2008), pintura por moto, piloto animado, primeira pessoa com reações, biomas e a Estrada da Brisa até a praia. Essa revisão anterior usava `vale-horizonte-v6`; o UPDATE 01 abaixo usa v7.

## UPDATE 01 — postura, giro e dia/noite

Veja [UPDATE-01.md](UPDATE-01.md) para comandos, limites, ajustes e roteiro de testes. Analógico esquerdo vertical (ou I/K) controla a postura: inclinar para frente reduz o arrasto aerodinâmico; para trás, com aceleração, permite empinar até 45°. O limite de velocidade é fixo por moto. Há câmbio manual ou automático, corte de giro integrado às marchas, ciclo de 24 minutos com faróis automáticos e consumo 10% maior. Cliente e servidor usam `vale-horizonte-v7`.

### Drift de freio

Em movimento, segure o freio por 1 segundo (S/seta para baixo, LT/L2 ou FREIO no touch). Com velocidade suficiente, a roda traseira trava e emite fumaça branca; esterçar aumenta a rotação da moto e a traseira desliza. Soltar o freio recupera a aderência suavemente. Ao parar, permanece o comando de empurrar para trás. Empinada, queda, recuo, colisão e recuperação cancelam o drift. Ajustes: `src/drift.ts`. O estado de drift e a fumaça dos amigos precisam da atualização do cliente na Vercel e do servidor no Render; o campo é opcional e não muda a versão do protocolo.
