# Titan 150 — conversão do EDF

Fonte: `titan150luquine.zip`, fornecido pelo usuário. Malha extraída de `model.edf`, sem usar o antigo gerador procedural. As rodas referenciadas pelo mod foram encontradas em `D:/mods/tyres/rodatitan15008luq/f_tyre.edf` e `r_tyre.edf`.

O leitor implementa a estrutura binária observada nesses arquivos: materiais, buffers de vértices/UVs, índices de triângulos, hierarquia de objetos e imagens RGBA comprimidas com DEFLATE. Não é um importador universal de EDF. Verifica contagens, índices e valores finitos antes de construir as malhas.

## Resultados

- `cg150.blend`: modelo otimizado editável, com texturas empacotadas e seis grupos de peças.
- `../../public/models/cg150.glb`: modelo GLB com texturas incorporadas.
- `../../src/assets/cg150-model.json`: malha indexada da fábrica síncrona. Os buffers binários em Base64 são decodificados ao criar a moto. Posições usam 16 bits (1/16.384 m por unidade), normais usam inteiros normalizados de 16 bits e apenas os materiais texturizados recebem UVs.
- `../../public/models/cg150-textures/`: texturas WebP sem perdas, até 512 pixels no maior lado. Vidros de cor uniforme usam um único pixel RGBA. O GLB incorpora os mesmos pixels em PNG.
- `titan-conversion/titan-decoded.blend`: extração anterior à otimização.
- `previous-model/`: cópia local do modelo anterior, preservada na primeira exportação.

A extração completa contém 840.250 triângulos, incluindo as rodas. A versão para o jogo contém 73.477 triângulos e 42 grupos de material. A simplificação remove detalhes pequenos, preservando a silhueta. Os pivôs foram adaptados ao entre-eixos de 1,32 m usado no jogo; rodas e direção continuam animadas. A pintura afeta tanque, tampas laterais e paralama dianteiro. Banco, pneus, motor e lentes mantêm seus materiais.

As características de desempenho e os áudios da CG 150 não foram alterados. A conversão usa as cores/malhas e imagens do EDF; a pintura alternativa STOCK19.pnt não foi aplicada.

## Reproduzir

Na raiz do projeto, com Blender e Python 3 com Pillow (suporte a WebP) no PATH:

```powershell
& 'D:/BLENDER/blender.exe' --background --factory-startup --threads 4 --python tools/import_titan_edf.py -- --zip 'C:/Users/olive/OneDrive/Desktop/titan150luquine.zip' --wheels 'D:/mods/tyres/rodatitan15008luq'
& 'D:/BLENDER/blender.exe' --background --factory-startup --threads 4 --python tools/export_titan_game.py
```

O segundo script chama `tools/pack_titan_game.py` com o comando `python` e sobrescreve o Blender, GLB, JSON e texturas finais. Não execute `build_cg150_blender.py` para atualizar esta conversão: ele gera o modelo antigo.

Validação: testes em `tests/cg-blender.test.ts`, testes de pintura e animação dos braços, build TypeScript/Vite e inspeção visual no navegador. Para inspecionar localmente: `?inspect=model&vehicle=cg150&hour=12` ou `?inspect=firstdown&vehicle=cg150&hour=12`.
