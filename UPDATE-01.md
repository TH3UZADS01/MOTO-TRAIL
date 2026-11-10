# UPDATE 01 — Mecânicas e realismo

## Controles e comportamento

- **Analógico esquerdo para frente:** postura aerodinâmica gradual, até +15% no limite de velocidade. O eixo horizontal continua virando a moto. Alternativa de teclado: segurar **I**.
- **Analógico esquerdo para trás:** desloca o corpo para trás; com aceleração e movimento, levanta a frente. Alternativa: segurar **K**. Começa acima de 5,4 km/h e pode alcançar 45° em relação ao terreno. A roda traseira permanece apoiada. A direção tem menos efeito com a frente levantada; o equilíbrio é assistido.
- **Soltar, frear ou empurrar:** baixa a frente suavemente. Batidas, recuperação e troca de moto encerram a empinada. Em pausa a moto fica apoiada. Com tanque vazio não inicia uma empinada motorizada.
- **Corte de giro:** os limites de cada marcha são derivados da velocidade máxima da moto e da postura. Sob aceleração no limite, o motor interrompe brevemente a força e o volume da gravação, com envelope suave a 8 Hz. A troca automática ocorre após uma breve espera de 0,22 s. Na última marcha, o corte só continua enquanto houver aceleração no limite. Não é um efeito aleatório nem cria novas fontes de áudio repetidamente. Freio, empurrar e pausa desativam o efeito. A CG mantém os arquivos enviados de aceleração/desaceleração.
- **Dia/noite:** um dia de jogo dura 24 minutos reais. Sol e lua percorrem arcos opostos, com amanhecer e entardecer graduais. A luz, o céu, a névoa e as sombras acompanham o horário. Os faróis acendem progressivamente no crepúsculo e apagam de dia. O relógio avança também com os menus abertos; no online usa a hora dos snapshots do servidor.
- **Combustível:** consumo de distância e de marcha lenta multiplicado por **1,10** em todas as motos. Capacidades, abastecimento, socorro e diferenças entre modelos foram preservados.

A redução anterior de 20% da aceleração continua ativa. As velocidades-base permanecem iguais; só a postura para frente eleva o limite. Ao desfazer essa postura, o retorno à velocidade-base é gradual.

| Moto | Limite normal | Limite com postura totalmente para frente |
|---|---:|---:|
| CG 150 | 115 km/h | 132,25 km/h |
| Pop | 100 km/h | 115 km/h |
| Cub | 72 km/h | 82,8 km/h |
| Shineray Phoenix | 80 km/h | 92 km/h |
| Caloi XR | 50 km/h | 57,5 km/h |

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

1. Selecione qualquer moto. Acelere com RT; mantenha o analógico esquerdo para frente e observe o corpo. Solte e confira o retorno suave. Repita com W + I.
2. Em uma reta, acelere e puxe o analógico para trás (W + K no teclado). Verifique o apoio traseiro e o limite de 45°. Freie e solte para pousar. Teste também a câmera C e o recuo Q.
3. Acelere até cada troca automática: o corte é breve antes da marcha seguinte. Na última marcha, ele só ocorre perto do limite com o acelerador acionado. Soltar o acelerador, frear ou pausar deve interrompê-lo.
4. Observe o relógio, amanhecer, anoitecer e farol. Compare uma moto parada e outra em curva. Na primeira pessoa, o facho deve iluminar a estrada; durante uma empinada ele aponta mais para cima junto com a moto.
5. Em dois clientes, veja a postura e empinada do amigo, compare o horário e confira os faróis. O áudio remoto continua sendo somente a buzina.
6. Verifique abastecimento e recuo; o consumo de uma situação idêntica é 10% maior, mas a capacidade do tanque não muda.

Prévia local, apenas em desenvolvimento:
- `?inspect=wheelie&vehicle=cg150&hour=12`
- `?inspect=tuck&vehicle=cg150&hour=12`
- `?inspect=first&vehicle=cg150&hour=0`
- `?inspect=model&hour=18`

`hour` fixa o horário apenas para inspeção local. O jogo publicado usa sempre o ciclo contínuo. Capturas reais estão em `artifacts/update01/`.

Testes adicionados em `tests/update01.test.ts` e `tests/powertrain-lighting.test.ts`; `tests/online.test.mjs` cobre postura, velocidade ampliada e rejeição de ângulos fora do limite. A suíte de áudio antiga ainda exige 22050 Hz para assets que já eram 44100 Hz; os WAVs não foram alterados nesta atualização. Gamepad físico, conforto auditivo e FPS no hardware do jogador ainda precisam de avaliação humana.

## Publicação

Frontend e backend agora usam **vale-horizonte-v7**. Publique o mesmo commit na Vercel e no Render. Confira `/health`, recarregue os dois clientes e crie uma sala nova. O limite do protocolo passa a 38 m/s para aceitar a CG inclinada para frente; postura e empinada são validadas e interpoladas. Não houve commit, push ou deploy automático.
