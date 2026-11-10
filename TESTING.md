# Verificação — revisão de 08/11/2026

## Automatizado

`npm test`: 10 testes aprovados.

- Circuito fechado e inclinações plausíveis.
- Raycasts contra terreno renderizado coincidem com a altura da física.
- Frenagem, colisão e recuperação.
- Percurso com direção de teste.
- Aceleração chega a 80 km/h em piso plano e frenagem para a moto.
- Raio de curva aumenta progressivamente com a velocidade.
- Ponte fica acima do leito e se conecta às duas aproximações sem degrau.
- Triângulos do mirante acompanham exatamente o terreno.
- Loop de vento começa e termina em zero, sem salto na emenda.
- Volta completa pelo circuito ampliado usando os obstáculos reais do cenário, com geração determinística. Canvas das placas substituído por stub nesse teste de geometria.

`npm run build`: TypeScript e Vite aprovados; artefatos em dist. Aviso de bundle acima de 500 kB permanece (principalmente Three.js), sem erro de compilação.

## Navegador integrado

- Ponte inspecionada e atravessada com W/S em duas arrancadas; HUD registrou 60 m e parada após a saída.
- Mirante inspecionado: piso conformado ao relevo, banco apoiado, cerca acompanhando inclinação.
- Entrada abrupta do vento e oscilador de 2,4 kHz eliminados no código; reprodução iniciada ao clicar para jogar. Não foi feita avaliação auditiva humana.
- Console da sessão de verificação final: nenhuma entrada de erro.
- Capturas: preview-ponte.png e preview-mirante.png.

## Limitações

Não houve volta manual completa nesta revisão, benchmark no Vivobook, medição de FPS ou verificação auditiva humana dos sons. Os 80 km/h foram validados por teste do modelo em piso plano; subidas e terra ainda reduzem a velocidade. Colisões continuam aproximadas por círculos. O teste de direção automático não substitui avaliação humana do conforto das curvas.

Para revisão visual reproduzível no servidor de desenvolvimento: `/?inspect=ponte` e `/?inspect=mirante`. Nenhuma interface de teste é incluída na produção.

A primeira versão já havia sido verificada quanto a início do passeio, recuperação e persistência do preset de qualidade. Garagem e multiplayer continuam fora desta etapa.

## Revisão: primeira pessoa, controle, recuo e quatro motos

- 14 testes automatizados aprovados, incluindo leitura analógica e zona morta do gamepad, eventos de botão sem repetição, desconexão, recuo para escapar de obstáculo, frenagem antes de recuar, quatro geometrias distintas e descarte de recursos.
- WAVs processados validados: mono 22.050 Hz, amplitude sem clipping, tamanho compacto e emendas sem salto grande.
- Navegador: troca de moto no menu inicial e pausa; Caloi restaurada após recarregar; C alterna primeira pessoa; Q apresentou recuo e indicador EMPURRANDO; inspeção visual lateral da Cub e Caloi e primeira pessoa da motoneta.
- Status visual Áudio pronto confirmou download e decodificação das seis gravações depois de iniciar. Console final sem erros capturados.
- Controle físico não conectado: o teste de Gamepad API usa entradas simuladas no módulo, não representa teste com hardware.
- Não foi realizada avaliação auditiva humana. Os arquivos reais foram inspecionados quanto a formato, amplitude e recortes; qualidade subjetiva e adequação a cada moto ainda dependem de ouvir e ajustar.
- Capturas atuais: preview-primeira-pessoa.png, preview-caloi.png, preview-cub.png.

## Multiplayer — 08/11/2026

Suíte `npm run test:online`: 3 testes aprovados. Duas conexões WebSocket independentes trocaram posição e veículo; validação de isolamento de salas, capacidade de quatro jogadores, saída, estado inválido, limite de mensagens e reconexão à mesma identidade após reinício com dados persistidos.

Navegador: duas abas independentes entraram na mesma sala por código/convite (Ana e Bruno). A verificação visual final foi interrompida porque o uso do navegador local foi desabilitado nas configurações Work. A troca de estados foi validada pela suíte de rede, mas a movimentação conjunta visual não foi declarada validada.

Hospedagem pública Vercel/backend ainda não configurada nem testada. Instruções completas em ONLINE.md. Não há credenciais de hospedagem configuradas nesta entrega.

Verificação final desta revisão: npm test teve 13 aprovados e 1 falha no teste de áudio (arquivo em 44.100 Hz versus expectativa de 22.050 Hz). O arquivo foi preservado. Suíte online: 3 aprovados. Build de produção aprovado; ausência de falhas na suíte de rede não significa validação pública da hospedagem.

## Estrada de 20 km, gasolina e buzina online — 09/11/2026

- Estrada medida: aproximadamente 20.008 m; teste de declives e colisão/triangulação aprovado.
- Simulação de uma volta completa com cenário e obstáculos carregados por trecho. Corrigido o posicionamento das vilas que obstruía a pista.
- Postos orientados para o acesso rodoviário, bombas fora da entrada central. Teste de acesso sem colisão até o alcance de abastecimento.
- Consumo de 20 km em todas as motos, tanque vazio, limite de abastecimento, socorro e economia ao empurrar cobertos por testes.
- Pop até 100 km/h em piso plano; demais motos mantêm seus limites.
- Quatro testes online aprovados, incluindo coordenadas do mapa maior, 100 km/h, buzina somente na mesma sala, cooldown e reconexão após reinício. Motores remotos removidos.
- A suíte geral continua com a falha anterior de áudio: arquivos locais em 44.100 Hz, enquanto o teste espera 22.050 Hz; alguns arquivos também têm picos no limite PCM. Arquivos preservados nesta revisão, sem mascarar a falha.
- Build aprovado. Não houve inspeção visual final: navegador integrado desativado e Computer Use interrompido por não conseguir determinar a URL da janela. Não foi medido FPS nem validada a nova versão no Render/Vercel. Publicar ambos os serviços e criar salas novas (protocolo v4).

## Mapa aprovado: serra, pontes, interior e terra — 09/11/2026

- Circuito principal medido em aproximadamente 20,1 km; cinco rotas de terra totalizam 8,6 km, além das quatro ligações internas asfaltadas.
- Simulação completa do circuito principal e de cada ramal com física e obstáculos reais. Verificados os acessos aos cinco postos, conexão dos ramais, finais intencionais nos destinos, recuperação nas trilhas e frenagem na terra.
- Três pontes: terreno/água abaixo do piso, transição contínua das rampas e bloqueio de água fora das pontes.
- Corrigido acesso de comprimento zero em destinos já sobre uma trilha. Teste adicional confirma que todas as malhas estáticas têm vértices finitos.
- Inspeção visual real no Chrome headless com perfis temporários separados. Capturas em artifacts/map-v5: ponte, terra, centro, mirante, camping e cachoeira. Sem controle das abas pessoais. Os testes não medem FPS nem substituem avaliação humana da pilotagem.
- Protocolo do mundo elevado para v5, sem reintroduzir áudio de motores remotos. Ambos os deploys precisam atualizar; não foi feita publicação nesta revisão.
- A falha preexistente no teste dos arquivos de áudio permanece independente do mapa; as gravações locais foram preservadas.

Resultado final desta revisão: build de produção aprovado; 22 testes de jogo/mapa aprovados e 4 testes online aprovados. A única falha da suíte geral continua no teste preexistente dos WAVs (44.100 Hz versus 22.050 Hz).

## Sombras e materiais — 09/11/2026

Causa corrigida: terreno e ribbons recriados no mapa por trechos não tinham receiveShadow. O teste de regressão lança raios sobre estrada e terreno em duas regiões após carregar novos trechos e verifica que as superfícies atingidas recebem sombras.

Onze testes de sombras, terreno, pilotagem, volta completa e postos aprovados. Capturas reais no Chrome headless em artifacts/graphics confirmam sombra da moto, árvores, placas e guardas da ponte, inclusive nos presets Baixo e Alto. Texturas procedurais dispensam fontes externas. FPS em hardware real não foi medido; nenhum deploy foi executado. Protocolo online continua v5.

## Revisão v6

O roteiro por item e as constantes ajustáveis estão em [REVISAO-V6.md](REVISAO-V6.md). Prévia local: `npm run dev`. Somente em desenvolvimento, `?inspect=model&vehicle=cg150`, `?inspect=first`, `?inspect=firstdown&vehicle=cg150`, `?inspect=lean`, `?inspect=dry` e `?inspect=coast` posicionam a câmera para inspeção. Esses atalhos não fazem parte do build de produção.

Execute `npm run build`, `npm test` e `npm run test:online`. O teste de áudio preexistente exige 22050 Hz, mas os WAVs atuais são 44100 Hz; esta revisão não modifica esses assets. Para validar a hospedagem, use dois dispositivos após publicar cliente e servidor v6.
