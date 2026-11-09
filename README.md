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
| Pausa | Esc ou botão da tela | Start / Options |
| Continuar | Botão do menu | A / cruz |
| Escolher moto na pausa | Seletor | Direcional ←/→ |
| Recuperar na estrada | R | Botão do menu pela interface |

Empurrar primeiro freia se estiver em movimento e depois recua a cerca de 4 km/h. Soltar interrompe o recuo suavemente. Não é marcha à ré motorizada. É possível sair de uma colisão recuando, inclusive de uma pequena sobreposição com um obstáculo.

Controle usa Gamepad API com `mapping=standard`, gatilhos analógicos, zona morta e sensibilidade ajustáveis em Configurações → Controle e comandos. Pressione um botão para o navegador reconhecer o controle. Na primeira abertura, clique em Pegar a estrada para autorizar áudio; alguns navegadores não tratam um botão do gamepad como autorização de áudio. Desconexão durante o passeio pausa o jogo. Controles sem mapeamento padrão ainda não têm remapeamento manual.

## Quatro opções de moto

Seletores no menu inicial e na pausa; escolha salva localmente. Trocar de moto preserva o local e zera a velocidade.

- Pop 110i ES: aproximação estilizada, ajuste de jogo até 100 km/h.
- Cub clássica: amarela, escudo creme, banco curto marrom, bagageiro, rodas raiadas e farol redondo; até 72 km/h.
- Shineray Phoenix: carenagem integral, banco longo, rodas de liga e farol largo; até 80 km/h. Nome informado pelo usuário; modelo estilizado.
- Caloi XR: quadro aberto branco/vermelho, pedais, motor exposto, guidão alto, farol retangular e rodas raiadas; até 50 km/h.

Todos são modelos procedurais estilizados, não réplicas dimensionais certificadas. Valores de desempenho e transmissão são ajustes de jogo, não fichas técnicas dos veículos fotografados. Não foi inferido um ano específico para as três referências novas. Os modelos possuem geometria distinta e recursos GPU são descartados ao trocar.

## Mundo e áudio

Circuito contínuo de aproximadamente 20,1 km, medido em metros no terreno, em um vale de 16 × 16 km. Curvas em S, serra com subidas e descidas, quatro vilas e cinco postos. Quatro ligações asfaltadas atravessam o interior; cinco trilhas de terra somam aproximadamente 8,6 km. Fazenda, camping, cachoeira cenográfica, lago e três pontes sobre um rio contínuo. O traçado parte do conceito aprovado em artifacts/map-v5/conceito-aprovado.png. Terreno em trechos de 256 m carregados ao redor da moto; vegetação instanciada, estrada dividida para descarte de trechos fora da câmera. Edificações com fundações, áreas niveladas e acessos; sinalização legível dos dois lados. Minimapa com asfalto, terra tracejada, rio, postos e posição. O HUD identifica a estrada atual; a distância ao posto mais próximo é em linha reta. Terra tem menos aderência, frenagem mais longa e resistência maior. A recuperação procura a estrada mais próxima de toda a rede. Água profunda bloqueia a moto, mas os tabuleiros das pontes permitem atravessar.

Gasolina: tanques separados por moto, salvos a cada cinco segundos e ao pausar/sair. Um circuito consome aproximadamente metade do tanque em ritmo normal. Velocidade, aceleração e subida aumentam o consumo; empurrar não gasta. Pare próximo às bombas, solte o acelerador e segure E ou X/quadrado para abastecer gratuitamente (0,25 L/s). Postos separados por cerca de 4 km. Se esvaziar, o menu de pausa oferece 0,7 L de emergência; não é necessário resetar a posição. Recuperar ou trocar de moto não enche o tanque.

Áudio gravado CC0 da BigSoundBank: motor, aceleração, vento e buzina. Loops editados localmente em mono 22.050 Hz, com remoção de DC, filtragem, normalização e emendas suavizadas. Duas camadas por motor; crossfade por carga, reprodução suavizada por rotação/marcha e perfis de timbre por moto. Caloi usa gravação-base diferente. Não há oscilador sintetizando motor, vento ou buzina. Os sons não são gravações autênticas de cada modelo. Veja CREDITS.md.

## Organização

- `terrain.ts`, `world.ts`: superfície e cenário.
- `vehicles.ts`: cadastro e ajustes; `vehicle.ts`: Pop; `vehicle-models.ts`: demais modelos e descarte.
- `riding.ts`: movimento, recuo e colisão; `input.ts`: gamepad.
- `camera.ts`: primeira/terceira pessoa; `audio.ts`: reprodução e mixagem.
- `main.ts`, `interface.ts`, `style.css`: integração e menus; `persistence.ts`: preferências locais.
- `network.ts`, `remote-riders.ts` e `server/`: salas e sincronização multiplayer.
- `tools/prepare_audio.py`: reproduz o processamento a partir de `tools/audio-originals/`. Originais não entram no build público.

## Limitações

Sem suspensão independente rígida, quedas, farol funcional, garagem de acessórios, diário persistente, ciclo dia/noite. Retrovisores não refletem a cena e o painel 3D é ilustrativo; velocidade real do jogo está no HUD. Na primeira pessoa o corpo do piloto é ocultado para evitar atravessamento da câmera. Sons e ergonomia ainda precisam de avaliação humana. Gamepad físico e FPS no Vivobook de referência não foram medidos.

TESTING.md registra o que efetivamente foi validado. Para vistoria local, `?inspect=posto`, `?inspect=mirante`, `?inspect=ponte`, `?inspect=terra`, `?inspect=centro`, `?inspect=camping` e `?inspect=cachoeira` no servidor de desenvolvimento; pontos de início de teste são eliminados do build de produção.

## Multiplayer

Salas reais para quatro pessoas, convite, apelidos, modelos remotos interpolados, reconexão e servidor persistente. Execute `npm run server` junto com `npm run dev`. Para compartilhar pela internet, siga **ONLINE.md**: frontend Vercel + backend Node com armazenamento persistente. Enviar somente o frontend à Vercel não publica o servidor. `npm run test:online` testa sessões WebSocket independentes e reinício do servidor.

