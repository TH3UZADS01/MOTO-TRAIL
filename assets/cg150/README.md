# CG 150 — referência low-poly

Modelo criado no Blender a partir da imagem do usuário, sem textos ou logotipos.

- `cg150.blend`: fonte editável, com cenário de renderização na coleção PreviewStudio.
- `../../public/models/cg150.glb`: somente a moto, sem cenário ou piloto.
- `../../src/assets/cg150-model.json`: mesmas malhas, usadas sincronamente pelo jogo.
- `cg150-preview.png`: renderização do Blender.

Peças separadas: Body, Steering, FrontSuspension, RearSuspension, RearWheel e FrontWheel. O material Paint permite personalizar tanque, tampas, rabeta e paralama. As rodas têm pivôs nos eixos e a suspensão dianteira acompanha Steering.

13.542 triângulos em 30 malhas. A integração mantém a configuração de desempenho e áudio da CG existente. Build e 28 testes de regressão aprovados; vistas localmente verificadas em terceira e primeira pessoa.

Reconstrução, a partir da raiz do projeto:

```powershell
& 'D:\BLENDER\blender.exe' --background --factory-startup --python tools/build_cg150_blender.py
```

O gerador reutiliza as primitivas e a exportação de `build_pop_blender.py`; alterações manuais no .blend são sobrescritas quando o gerador é executado novamente. O modelo é uma aproximação artística da imagem, com retrovisores sem reflexo e descanso recolhido para rodar no jogo.
