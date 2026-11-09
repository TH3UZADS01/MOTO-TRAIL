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
