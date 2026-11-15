# Cub clássica — Blender

Modelo low-poly baseado na referência vermelha e creme fornecida pelo usuário, sem textos ou logotipos.

- `cub.blend`: fonte editável, com cenário de renderização separado em PreviewStudio.
- `../../public/models/cub.glb`: somente a moto.
- `../../src/assets/cub-model.json`: mesmas malhas e pivôs usados pelo jogo.
- `cub-preview.png`: renderização do Blender.

Grupos independentes: Body, Steering, FrontSuspension, RearSuspension, RearWheel e FrontWheel. Rodas com pivôs nos eixos. Paint controla a carroceria e paralamas; Cream e SeatSide permanecem independentes. Descanso recolhido para pilotagem; retrovisores sem reflexos.

Reconstrução na raiz do projeto:

```powershell
& 'D:\BLENDER\blender.exe' --background --factory-startup --threads 4 --python tools/build_cub_blender.py
```

O gerador reutiliza primitivas e exportação de `build_pop_blender.py`. Reconstruir sobrescreve alterações manuais no .blend. A integração mantém física e áudio da Cub existente; a cor padrão passa a vermelho sem substituir cores personalizadas salvas.
