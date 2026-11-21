# Pop 110 — visual 2027

O modelo fornecido foi adaptado às duas fotos da Pop 2027. Originais intactos em `source-user/pop110.blend` e `source-user/pop110.glb`.

- `pop110.blend`: modelo editável com UVs e imagens de textura empacotadas. PreviewStudio contém apenas o cenário de renderização.
- `../../public/models/pop110.glb`: moto exportada com materiais e texturas.
- `../../src/assets/pop110-model.json`: mesmas malhas, materiais, UVs e pivôs usados pelo jogo.
- `../../public/models/pop110-textures/`: texturas repetíveis de pintura, banco, borracha, plástico e metal; cor e rugosidade.
- `pop110-textured-preview.png`: prévia do Blender.

Body, Steering, FrontSuspension, RearSuspension, FrontWheel e RearWheel mantêm peças separadas. Rodas giram em seus eixos; suspensão dianteira acompanha Steering. Paint identifica as carenagens personalizáveis. Piloto e luzes são adicionados pelo jogo.

Para reconstruir esta versão a partir dos originais preservados:

```powershell
& 'D:\BLENDER\blender.exe' --background --factory-startup --threads 4 --python tools/texture_pop_source.py
```

O script sobrescreve os resultados, não os arquivos em source-user. Alterações posteriores no blend final devem ser preservadas antes de reconstruir. O antigo build_pop_blender.py cria outra geometria; não o execute para atualizar este modelo.

## Voltar à versão anterior

O arquivo `backup-antes-2027.zip` guarda a versão jogável imediatamente anterior à mudança. Com o jogo fechado, extraia as pastas `assets/`, `public/` e `src/assets/` do ZIP na raiz do projeto, preservando os caminhos. Para restaurar também o azul original como padrão, troque apenas a entrada `pop` de `DEFAULT_COLORS` em `src/paint.ts` por `#234c91`. O ZIP inclui o exportador anterior para quem quiser voltar a editar aquela versão.
