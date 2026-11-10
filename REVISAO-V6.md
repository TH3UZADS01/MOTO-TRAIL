# Revisão v6 — piloto, motos, cores e litoral

Implementação incremental sobre o jogo existente. Não foram alterados os comandos, as salas de quatro jogadores, o circuito principal, as cinco trilhas de terra nem as três pontes. A vegetação e a nova ligação costeira mudam o mundo compartilhado: cliente e servidor agora usam `vale-horizonte-v6`.

## Mudanças e teste manual, item por item

1. **Contrapeso:** quadril, tronco e cabeça inclinam suavemente para dentro da curva; o joelho interno abre. Mãos permanecem nos pontos do guidão. Teste A/D em baixa e alta velocidade, solte e confira o retorno; repita em um jogador remoto. Ajustes em `RIDER_TUNING`, no topo de `src/rider.ts`: intensidade, resposta, limite, abertura do joelho e influência do esterço/velocidade.
2. **Primeira pessoa:** C alterna a câmera; FOV passa suavemente de 70° a 95° conforme a velocidade. S/LT avança e inclina a visão, reduzindo o FOV. Uma batida provoca recuo e tremor curto proporcional à velocidade perdida. A cabeça fica oculta apenas para o próprio jogador; braços e pernas permanecem no modelo, inclusive ao virar. Arraste a visão para baixo ou use o analógico direito para ver as pernas. Ajustes em `CAMERA_TUNING`, no topo de `src/camera.ts`; `shakeIntensity=0` desliga o tremor.
3. **CG 150 2008:** quinta opção nos dois menus, modelo procedural substituível, farol redondo, tanque, banco, escapamento e rodas com raios. Limite de jogo 115 km/h, massa de referência 118, potência relativa 1,75, frenagem 1,15 e estabilidade 1,12. São parâmetros de jogabilidade, não uma ficha técnica homologada. Teste selecionar, acelerar, frear, abastecer e trocar em uma sala online. Ajustes em `src/vehicles.ts`; fábrica em `src/cg150.ts`.
4. **Cores:** paleta de oito cores e seletor livre no início e na pausa. Só os materiais de pintura são alterados. Escolha cores diferentes para duas motos, alterne entre elas e recarregue: as escolhas ficam salvas por moto no navegador. Em uma sala, a cor também deve aparecer para o amigo. Pneus, motor, banco, faróis e piloto mantêm seus materiais.
5. **Biomas:** floresta ao norte, campo/pasto a oeste e ao sul, sertão na região leste e vegetação mais aberta perto das vilas. Transições contínuas de cor e probabilidade de espécies. Copas largas, coníferas, arbustos, grama, cactos e palmeiras usam instancing; os trechos são carregados perto do jogador e a vegetação baixa é ocultada além de 420 m. Variações têm semente fixa, iguais em todos os clientes. Ajustes em `BIOME_TUNING` e geometrias em `src/vegetation.ts`.
6. **Litoral:** Estrada da Brisa conecta dois pontos da estrada principal a leste, passando pela Praia da Brisa. A descida do relevo é gradual, com areia, coqueiros, mar com ondas no shader, espuma e luz/névoa levemente mais claras. O mar profundo bloqueia a moto como os rios existentes. Teste as duas entradas, o acesso ao mirante e o retorno. `COAST_TUNING` controla posição, largura da transição e ondas em `src/coast.ts`.
7. **Pop:** carenagem angular, farol recortado, banco texturizado, rabeta, piscas, suspensão, escapamento e rodas refinados a partir das fotos. Manteve 100 km/h, pintura e os mesmos encaixes de animação. Teste cores, guidão, primeira pessoa, curvas e visual de outro jogador.

## Placeholders e limites

- A CG é um placeholder procedural low-poly, não um modelo 3D oficial. Para trocar por GLB, preserve os retornos `root`, `body`, `steering`, `wheels`, `rider`, `riderRig` e `paintMaterials` de sua fábrica.
- A Pop também é uma aproximação procedural das referências; não há decalques oficiais nem reprodução exata de cada peça.
- Vegetação, textura do banco, espuma e mar são procedurais. Ondas são apenas visuais: não há física de água, natação, tráfego ou NPCs novos.
- As vilas existentes formam as áreas urbanas; não foi criada uma cidade nova.
- O contrapeso é uma animação visual, sem nova simulação física do peso do piloto.
- As cores ficam no navegador, sem contas ou sincronização entre dispositivos.

## Verificação

- Build de produção validado; o Vite avisa sobre o bundle acima de 500 kB.
- Suíte geral: 34 testes aprovados de 35; inclui física, materiais, cores, animação, câmera, biomas, litoral, sombras e travessia do circuito/ramais. A única falha é a de áudio descrita abaixo.
- Quatro testes aprovados com sessões WebSocket reais locais: salas, reconexão, CG, cor, buzina e limites do protocolo.
- Inspeção visual por Chrome em vistas de Pop, CG, primeira pessoa, menus, região seca e litoral. Capturas em `artifacts/revision-v6/`.
- A suíte geral ainda acusa uma falha anterior em `tests/audio.test.ts`: os WAVs são 44100 Hz e o teste exige 22050 Hz. Os arquivos de áudio não foram modificados nesta revisão.
- Não foi feito deploy nem teste entre dois dispositivos na hospedagem pública nesta revisão.

## Publicação e próximos passos

Publique o mesmo commit na Vercel e no Render. `/health` do servidor deve informar `world: vale-horizonte-v6`. Recarregue os navegadores e crie uma sala nova; salas de versões antigas não são reaproveitadas.

Depois, faça um passeio com dois dispositivos para ajustar o conforto da câmera e confirmar cores/CG no host real. Próximos refinamentos sugeridos: modelo GLB da CG, detalhes próprios de cada piloto, normalização dos WAVs e medição de FPS em um computador mais fraco antes de aumentar a vegetação.

## Arquivos

Criados:
- `src/rider.ts`, `src/cg150.ts`, `src/paint.ts`, `src/biomes.ts`, `src/vegetation.ts`, `src/coast.ts`.
- `tests/rider.test.ts`, `tests/camera.test.ts`, `tests/cg150.test.ts`, `tests/paint.test.ts`, `tests/biomes.test.ts`, `tests/coast.test.ts`.
- `REVISAO-V6.md` e capturas locais em `artifacts/revision-v6/`.

Alterados:
- Integração e menus: `src/main.ts`, `src/interface.ts`, `src/style.css`, `src/persistence.ts`.
- Pilotagem/modelos: `src/camera.ts`, `src/riding.ts`, `src/vehicles.ts`, `src/vehicle.ts`, `src/vehicle-models.ts`, `src/fuel.ts`.
- Mapa: `src/map-layout.ts`, `src/terrain.ts`, `src/world.ts`.
- Online: `src/network.ts`, `src/remote-riders.ts`, `server/app.mjs`.
- Testes existentes: `tests/features.test.ts`, `tests/fuel.test.ts`, `tests/online.test.mjs`.
- Documentação: `README.md`, `ONLINE.md`, `TESTING.md`.
