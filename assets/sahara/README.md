# Honda NX 350 Sahara clássica

Referência visual enviada pelo usuário. Modelo no Blender sem textos/logotipos: carenagem branca/vermelha/azul, banco azul, bolha, farol retangular, escapamento alto, motor com aletas e rodas de tamanhos distintos.

`sahara.blend` é editável; PreviewStudio contém apenas o cenário de renderização. `../../public/models/sahara.glb` contém somente a moto. `../../src/assets/sahara-model.json` contém as mesmas malhas e pivôs, carregados sincronamente pelo jogo. 9.588 triângulos, 34 malhas agrupadas por material. Body, Steering, FrontSuspension, RearSuspension, FrontWheel e RearWheel são separados. A carenagem/farol são fixos no chassi. As rodas/guidão viram independentemente. Descanso recolhido; retrovisores sem reflexo. A bolha é opaca na prévia Blender, mas recebe transparência no jogo para preservar a visão em primeira pessoa. As partes vermelhas usam o material personalizável Paint.

## Dados e calibração

Fonte primária: [manual Honda NX350 Sahara 1993, páginas impressas 86–88](https://www.honda.com.br/pos-venda/sites/customer_service_motos/files/manuais/NX%20350%20Sahara%201993.pdf).

- 339 cm³, 31,5 PS a 7.500 rpm, 3,13 kgf.m (30,6948 Nm) a 6.500 rpm; lenta 1.300 rpm.
- Seis marchas: 38/13, 34/17, 31/20, 28/22, 27/25, 25/27.
- Primária 65/24, coroa/pinhão 38/14. O texto extraído do PDF troca os algarismos da primária; calculamos a partir dos dentes. A relação final no jogo inclui ambas as reduções.
- Entre-eixos 1,396 m; peso seco 144,5 kg; tanque 14 L. Massa de simulação 156 kg inclui estimativa de combustível/fluidos; piloto 75 kg é somado pelo sistema.
- Pneus dianteiro 3.00-21 e traseiro 4.60-17. Raios aproximados .343/.33 m; roda traseira usada na transmissão.

Valores estimados para gameplay, não dados de fabricante: pontos intermediários da curva de torque, corte a 8.500 rpm, limite nominal 150 km/h, arrasto, frenagem, centro de massa, estabilidade e assistência de wheelie .65. O torque nos dois pontos publicados reproduz os valores do manual. A suspensão é visual e usa o contato de terreno existente, sem simulação independente de curso/amortecimento. Consumo mantém a regra confortável do jogo.

## Áudio fornecido

Originais (não alterados): `D:/mods/bikes/TODAY 300 PREPARADA JOTA/on_high.wav` e `off_high.wav`. O usuário escolheu essas gravações para a Sahara; não são apresentadas como gravações de uma NX350 original. Aceleração/desaceleração são loops próprios com crossfade de ganho e variação por RPM; lenta aproxima o som a partir do loop fornecido. Arquivos processados: `public/audio/sahara-on-high.wav` e `sahara-off-high.wav`; PCM mono 44,1 kHz, DC removido, emenda de loop suavizada e pico limitado a 24000. Direitos/licença não verificados; arquivos fornecidos pelo usuário, não classificados como CC0.

## Reconstruir

```powershell
& 'D:\BLENDER\blender.exe' --background --factory-startup --threads 4 --python tools/build_sahara_blender.py
python tools/prepare_sahara_audio.py
```

O gerador reutiliza primitivas/exportação de `build_pop_blender.py` e sobrescreve alterações manuais no .blend. Para publicar, atualizar **Render e Vercel**: o servidor precisa aceitar `sahara` e sua velocidade; clientes precisam recarregar para receber o modelo/áudio novos.
