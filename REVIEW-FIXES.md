# Correções e empinada com embreagem

- Partículas usam buffers separados para simulação e desenho: partículas expiradas não deslocam as restantes.
- A roda dianteira apoiada elimina velocidade angular descendente acumulada. Frenagem com motor apagado usa uma única integração de tempo.
- Puxar o corpo para trás com aceleração, em baixa marcha e acima de aproximadamente 8 km/h, inicia uma assistência de embreagem: breve patinação e aumento de RPM, seguidos de torque extra ao acoplar. Não é uma simulação térmica de desgaste da embreagem.
- O impulso exige soltar o comando antes de repetir, tem intervalo mínimo e é cancelado por freio, recuo, motor apagado ou troca de marcha.
- Depois de levantar, solte K / analógico para trás / botão touch de inclinação. Dose o acelerador para sustentar; o freio baixa a frente. Excesso de aceleração ainda pode causar queda. Marcha, torque e corte de giro continuam influenciando a manobra.
- Ajustes ficam em `BODY_TUNING`, no arquivo `src/body-control.ts`: duração, força, RPM, intervalo e amortecimento.
- “Locais” pausa somente o jogador local e restaura o passeio ao fechar. Escape e controle também fecham o painel.
- Volume “Efeitos e buzina” separado e salvo, com ganho compartilhado que também silencia sons já agendados.
- Touch ganhou buzina e inclinação corporal. O retrovisor reutiliza o mapa de sombras da câmera principal no mesmo quadro.

## Verificação manual

1. Escolha uma moto, acelere em primeira e puxe brevemente o corpo para trás. Observe o aumento de RPM seguido pelo levantamento; solte a inclinação e controle com acelerador/freio.
2. Mantenha o botão para trás pressionado: não devem surgir novos impulsos periódicos. Solte e pressione novamente após pousar.
3. Abra “Locais” em movimento: sua moto para e os amigos continuam. Feche com Escape ou o botão.
4. Zere efeitos nas configurações e descubra um local, buzine ou caia. Motor e vento conservam seus controles separados.
5. Percorra terra e grama: partículas devem desaparecer suavemente sem saltar entre posições.
6. No celular, confira os botões acima das setas; compare desempenho com retrovisor ativado/desativado. A economia de sombras foi implementada, mas FPS depende do aparelho.

Testes de regressão adicionais: `tests/review-fixes.test.ts`.
