# Super Cub importada

Fonte: `D:/Downloads/honda_super_cub.glb`, fornecido pelo usuário. Modelo **Honda Super cub**, de **Aleksandr Sagidullin**, sob **CC BY 4.0**. Links completos e descrição das adaptações em `CREDITS.md` e no painel Sobre do jogo.

333.676 triângulos originais → 52.276 triângulos para o jogo (redução de 84%). Acabamento facetado, atlas de cor 1K preservado, 12 combinações de peça/material. Materiais complexos de transmissão/emissão do original foram substituídos por materiais opacos para combinar com o estilo e iluminação do jogo. O cavalete central foi removido da versão de pilotagem.

Rodas, guidão e suspensões têm grupos separados. A escala foi ajustada ao entre-eixos de 1,22 m. Pintura usa um atlas neutro somente nas regiões originalmente verdes; as demais superfícies preservam suas cores. Farol e lanterna estão ligados aos sistemas existentes. O desempenho e áudio da Cub não foram alterados.

- `cub.blend`: modelo final editável, com imagens empacotadas.
- `../../public/models/cub.glb`: modelo para distribuição, com texturas incorporadas.
- `../../src/assets/cub-model.json`: malha equivalente usada pela fábrica síncrona do jogo.
- `../../public/models/cub-textures/`: atlas original e atlas neutro para pintura.
- `imported/source.blend`: modelo antes da simplificação.
- `previous-model/`: cópia local da Cub anterior, preservada na primeira execução.

Para reproduzir, na raiz do projeto:

```powershell
& 'D:/BLENDER/blender.exe' --background --factory-startup --threads 4 --python tools/inspect_super_cub.py
& 'D:/BLENDER/blender.exe' --background --factory-startup --threads 4 --python tools/export_super_cub.py
```

O primeiro script importa o GLB e prepara os componentes conectados. O segundo reduz polígonos, aplica materiais e exporta. Esses scripts substituem `build_cub_blender.py` para este modelo. Os grupos de componentes foram definidos para este GLB específico; outro modelo exige nova inspeção.
