# Pop 110 — modelo do usuário texturizado

A geometria fornecida foi preservada e ajustada à escala do piloto e aos pivôs do jogo. Originais intactos em `source-user/pop110.blend` e `source-user/pop110.glb`.

- `pop110.blend`: modelo editável com UVs e imagens de textura empacotadas. PreviewStudio contém apenas o cenário de renderização.
- `../../public/models/pop110.glb`: moto exportada com materiais e texturas.
- `../../src/assets/pop110-model.json`: mesmas malhas, materiais, UVs e pivôs usados pelo jogo.
- `../../public/models/pop110-textures/`: texturas repetíveis de pintura, banco, borracha, plástico e metal; cor e rugosidade.
- `pop110-textured-preview.png`: prévia do Blender.

66.545 triângulos e 20 grupos de material. Body, Steering, FrontSuspension, RearSuspension, FrontWheel e RearWheel mantêm peças separadas. Rodas giram em seus eixos; suspensão dianteira acompanha Steering. Paint identifica as carenagens personalizáveis. Piloto e luzes são adicionados pelo jogo.

Para reconstruir esta versão a partir dos originais preservados:

```powershell
& 'D:\BLENDER\blender.exe' --background --factory-startup --threads 4 --python tools/texture_pop_source.py
```

O script sobrescreve os resultados, não os arquivos em source-user. Alterações posteriores no blend final devem ser preservadas antes de reconstruir. O antigo build_pop_blender.py cria outra geometria; não o execute para atualizar este modelo.
