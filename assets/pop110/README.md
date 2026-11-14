# Pop 110 — modelo Blender

Modelo low-poly baseado na referência fornecida pelo usuário, sem textos, logotipos ou piloto incorporado.

- `pop110.blend`: fonte editável. A coleção PreviewStudio contém somente cenário de renderização.
- `../../public/models/pop110.glb`: exportação somente da moto.
- `../../src/assets/pop110-model.json`: as mesmas malhas e pivôs, carregados sincronamente pelo jogo para preservar a criação de motos local e online.
- `pop110-preview.png`: renderização do Blender.

Grupos: Body, Steering, FrontSuspension, RearSuspension, FrontWheel e RearWheel. A roda e suspensão dianteiras são filhas de Steering; as rodas têm origem no eixo. Paint identifica as partes personalizáveis. O piloto é adicionado pelo sistema existente.

12.112 triângulos, 31 malhas agrupadas por material. Coordenadas do jogo: X transversal, Y vertical, Z para frente; no Blender, X transversal, Z vertical, -Y para frente.

Para reconstruir a partir da raiz do projeto:

```powershell
& 'D:\BLENDER\blender.exe' --background --factory-startup --python tools/build_pop_blender.py
```

O script regenera o .blend, GLB, JSON e a prévia. Alterações manuais no .blend não são preservadas por essa reconstrução.
