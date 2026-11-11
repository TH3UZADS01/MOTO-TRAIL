# UPDATE 01 — Mecânicas e realismo

## Controles e comportamento

- **Celular:** setas direcionais, freio, acelerador, câmera e controles de marcha ficam na tela com escala responsiva. O botão de abastecimento aparece apenas perto de um posto; pare para usá-lo. Com a moto parada, segurar o freio por um segundo inicia o empurrão para trás; soltar interrompe.
- **Inclinação automática:** opcional nas Configurações. Quando ativada, inclina o piloto para frente progressivamente conforme a velocidade aumenta; a postura manual continua podendo ser combinada.
- **Analógico esquerdo para frente:** reduz gradualmente o arrasto aerodinâmico; não altera o limite de velocidade da moto. O eixo horizontal continua virando a moto. Alternativa de teclado: segurar **I**.
- **Analógico esquerdo para trás:** desloca o corpo para trás; com aceleração e movimento, levanta a frente. Alternativa: segurar **K**. Começa acima de 5,4 km/h e pode alcançar 45° em relação ao terreno. A roda traseira permanece apoiada. A direção tem menos efeito com a frente levantada; o equilíbrio é assistido.
- **Soltar, frear ou empurrar:** baixa a frente suavemente. Batidas, recuperação e troca de moto encerram a empinada. Em pausa a moto fica apoiada. Com tanque vazio não inicia uma empinada motorizada.
- **Câmbio:** escolha automático ou manual nas Configurações. O automático troca por RPM e velocidade, com atraso nas subidas e reduções com histerese. No manual, PageUp/PageDown ou direcional ↑/↓ no controle mudam a marcha; reduções que ultrapassariam o limite de RPM são bloqueadas. A preferência fica salva localmente. A Caloi tem transmissão de uma marcha.
- **Resistência do vento:** o arrasto aumenta com o quadrado da velocidade e varia por moto. Inclinar para frente reduz gradualmente a resistência; a moto pode alcançar seu limite fixo de velocidade com mais facilidade. Ao voltar à posição normal, o arrasto cresce e a velocidade cai gradualmente.
- **Corte de giro:** os limites de cada marcha são derivados da velocidade máxima fixa da moto. Sob aceleração no limite, o motor interrompe brevemente a força e o volume da gravação, com envelope suave a 8 Hz. No automático, a troca ocorre após uma breve espera de 0,22 s. Na última marcha, o corte só continua enquanto houver aceleração no limite. Freio, empurrar e pausa desativam o efeito. A CG mantém os arquivos enviados de aceleração/desaceleração.
- **Dia/noite:** um dia de jogo dura 24 minutos reais. Sol e lua percorrem arcos opostos, com amanhecer e entardecer graduais. A luz, o céu, a névoa e as sombras acompanham o horário. Os faróis acendem progressivamente no crepúsculo e apagam de dia. O relógio avança também com os menus abertos; no online usa a hora dos snapshots do servidor.
- **Combustível:** consumo de distância e de marcha lenta multiplicado por **1,10** em todas as motos. Capacidades, abastecimento, socorro e diferenças entre modelos foram preservados.

A redução anterior de 20% da aceleração continua ativa. A postura altera somente o arrasto, sem aumentar o limite de velocidade. A CG 150 mantém 132 km/h; o limite das outras motos aumentou 15%.

| Moto | Limite fixo |
|---|---:|
| CG 150 | 132 km/h |
| Pop | 115 km/h |
| Cub | 82,8 km/h |
| Shineray Phoenix | 92 km/h |
| Caloi XR | 57,5 km/h |

Valores de jogabilidade em asfalto plano, sujeitos a terreno, combustível e ao corte de giro. RPM é uma aproximação do motor; não há simulação de embreagem, torque por cilindro ou equilíbrio livre de corpo rígido.

## Organização e ajustes

- `src/body-control.ts`: `BODY_TUNING` — resposta, bônus, ângulo máximo, velocidade mínima e assistência de direção.
- `src/bike-pose.ts`: rotação ao redor do eixo traseiro, compartilhada por motos locais e remotas.
- `src/powertrain.ts`: `ENGINE_TUNING` — RPM, relações normalizadas, troca automática, frequência e duração dos pulsos.
- `src/day-cycle.ts`: `DAY_TUNING` — duração do ciclo e intensidades do sol, lua e ambiente.
- `src/headlight.ts`: `HEADLIGHT_TUNING` — intensidade, alcance e abertura do farol.
- `src/fuel.ts`: `CONSUMPTION_MULTIPLIER = 1.10`.

Integração alterada em `src/input.ts`, `src/riding.ts`, `src/rider.ts`, `src/camera.ts`, `src/audio.ts`, `src/vehicle-models.ts`, `src/main.ts`, `src/interface.ts`, `src/network.ts`, `src/remote-riders.ts` e `server/app.mjs`.

O sistema reutiliza o único mapa de sombras direcional para sol/lua. Os faróis são spots sem mapas de sombras extras; há no máximo quatro motos por sala. O céu é atualizado a 5 Hz; a vegetação mantém o instancing e o carregamento por trechos existentes. Os faróis não geram sombras próprias, portanto podem iluminar através de pequenos obstáculos.

## Como testar

1. Selecione cada moto. Compare a aproximação do limite com a postura normal e inclinada para frente; confirme que a postura não ultrapassa o limite individual. Solte I e observe a velocidade cair sem variação brusca.
2. Em uma reta, acelere e puxe o analógico para trás (W + K no teclado). Verifique o apoio traseiro e o limite de 45°. Freie e solte para pousar. Teste também a câmera C e o recuo Q.
3. Teste o câmbio automático em cada moto com marchas: observe as subidas e reduções por RPM/velocidade. Selecione manual, use PageUp/PageDown e direcional ↑/↓, confirme que as mudanças automáticas param e que uma redução insegura é recusada. Reinicie o jogo e confirme que o modo escolhido foi salvo.
4. Observe o relógio, amanhecer, anoitecer e farol. Compare uma moto parada e outra em curva. Na primeira pessoa, o facho deve iluminar a estrada; durante uma empinada ele aponta mais para cima junto com a moto.
5. Em dois clientes, veja a postura e empinada do amigo, compare o horário e confira os faróis. O áudio remoto continua sendo somente a buzina.
6. Verifique abastecimento e recuo; o consumo de uma situação idêntica é 10% maior, mas a capacidade do tanque não muda.

Prévia local, apenas em desenvolvimento:
- `?inspect=wheelie&vehicle=cg150&hour=12`
- `?inspect=tuck&vehicle=cg150&hour=12`
- `?inspect=first&vehicle=cg150&hour=0`
- `?inspect=model&hour=18`

`hour` fixa o horário apenas para inspeção local. O jogo publicado usa sempre o ciclo contínuo. Capturas reais estão em `artifacts/update01/`.

Testes adicionados em `tests/update01.test.ts`, `tests/powertrain-lighting.test.ts` e `tests/persistence.test.ts`. A suíte de áudio antiga ainda exige 22050 Hz para assets que já eram 44100 Hz; os WAVs não foram alterados nesta atualização. Gamepad físico, conforto auditivo e FPS no hardware do jogador ainda precisam de avaliação humana.

## Publicação

Frontend e backend usam **vale-horizonte-v7**. Publique o mesmo commit na Vercel e no Render. Confira `/health`, recarregue os dois clientes e crie uma sala nova. O limite do protocolo é 38 m/s; postura e empinada são validadas e interpoladas. Não houve commit, push ou deploy automático.
