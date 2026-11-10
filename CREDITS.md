# Créditos, fontes e licenças

Consulta: 08/11/2026.

| Recurso | Autor / origem | Licença / uso | Alterações |
| --- | --- | --- | --- |
| Terreno, vila, vegetação, moto e piloto | Código original deste projeto | Recursos originais entregues com o projeto | Geometria procedural, sem modelos externos |
| Áudio atual | Gravações externas abaixo | CC0 | O áudio sintetizado anterior foi substituído |
| Three.js | three.js contributors — https://github.com/mrdoob/three.js | MIT | Sem alterações |
| Vite | Vite contributors — https://github.com/vitejs/vite | MIT | Sem alterações |
| DM Sans | Colophon Foundry — https://fonts.google.com/specimen/DM+Sans | SIL OFL 1.1, servido via Google Fonts | Sem alterações; fallback sans-serif |
| Libre Caslon Display | Impallari Type — https://fonts.google.com/specimen/Libre+Caslon+Display | SIL OFL 1.1, servido via Google Fonts | Sem alterações; fallback Georgia |

## Referências consultadas, não incorporadas

- Honda oficial: https://www.honda.com.br/motos/street/city/pop110i-es
- Release oficial do modelo 2027, 27/04/2026: https://prodsalaimp.honda.com.br/releases/honda-pop110i-es-2027-ainda-mais-pratica-e-facil-de-pilotar-renovada-no-visual-preserva
- Galeria oficial: vistas laterais e fotos de detalhe vinculadas na página do produto. URLs consultadas: HOME_Lateral_860x550_Pop%20VERMELHA.webp, 1_HONDA_POP_20268385.webp, 2_HONDA_POP_20268313.webp sob https://www.honda.com.br/motos/sites/hda/files/2026-04/ . A ferramenta de pesquisa não forneceu inspeção visual detalhada dessas imagens: modelo entregue é explicitamente aproximado, ainda não validado contra vistas múltiplas.
- Atmosfera de viagem tranquila: https://hypercentgames.com/games/cozy-motorbike . Sem reaproveitamento de cenário, código ou assets.
- Instagram solicitado: https://www.instagram.com/reel/DfNyXnsIBtJ/ — ferramenta não conseguiu carregar.

Especificações oficiais usadas como referência: 109,5 cm³; semiautomático rotativo de 4 marchas; partida elétrica; rodas de liga leve; freios nas mãos; entre-eixos 1.238 mm; banco 747 mm. Física e áudio são aproximações de jogo, não medições do veículo real. Não é um jogo oficial Honda e não se afirma licenciamento da marca.

As gravações incorporadas na revisão atual estão discriminadas abaixo.


## Gravações incorporadas nesta revisão

Licença de todos os sons abaixo: CC0 / domínio público, conforme páginas de origem. Sem compra e sem áudio extraído de vídeos. Acesso em 08/11/2026.

| Recurso | Autor | Origem | Arquivos resultantes / alterações |
| --- | --- | --- | --- |
| Motorcycle, nº 0281 | DenisChardonnet | https://bigsoundbank.com/motorcycle-s0281.html | engine-idle.wav (3,3–5,2 s), engine-load.wav (8,6–10,2 s): corte, mono, 22.050 Hz, filtro, retirada de DC, normalização e crossfade da emenda |
| 75 cm3 Motorcycle Acceleration, nº 0603 | Joseph SARDIN | https://bigsoundbank.com/acceleration-moto-75-cm3-s0603.html | moped-idle.wav (0,9–2,2 s), moped-load.wav (2,8–4,1 s), mesmo processamento; a marcha lenta é uma adaptação de gravação de aceleração |
| Wind in a Tree, nº 0659 | Joseph SARDIN | https://bigsoundbank.com/wind-in-a-tree-s0659.html | wind.wav, trecho 5–17 s, mono, 22.050 Hz, filtro, normalização, crossfade |
| Central locking horn, nº 0970 | Joseph SARDIN | https://bigsoundbank.com/central-locking-horn-s0970.html | horn.wav, primeiro toque detectado, corte e fades; aproximação de buzina a partir de uma gravação automotiva |

Política do acervo: https://bigsoundbank.com/licenses.html . Os downloads originais WAV estão em tools/audio-originals e as cópias processadas, distribuídas com o jogo, em public/audio. O roteiro Python registra o processamento reprodutível. Os sons são aproximações; não há afirmação de gravação autêntica de Pop, Cub, motoneta vermelha ou Caloi XR.

## Novos modelos visuais

Referências principais: três imagens fornecidas pelo usuário nesta conversa. Imagens não foram redistribuídas no build; a geometria foi construída no projeto.

- Cub amarela: referência visual da foto; família Super Cub consultada em https://www.honda.co.jp/SUPERCUB/ . O ano e a cilindrada específicos da foto não foram certificados. Nenhuma ficha técnica moderna é apresentada como pertencente à foto.
- Motoneta vermelha: marca/modelo/ano não confirmados; nome genérico explícito no jogo.
- Caloi XR: identificação visual pela inscrição da imagem. Catálogo de referência consultado: https://reginaldodecampinas.com.br/produto/mobylette-caloi-xr-50/ . Não foi obtido manual oficial do ano fotografado; comportamento é aproximação de jogo.

O efeito vocal de motor da OpenGameArt foi consultado e descartado: https://opengameart.org/content/motor-sound-effect . Não integra o jogo.


## Áudio da CG 150

Arquivos fornecidos pelo usuário, copiados sem edição de `D:/mods/bikes/titan150luquine/`:

- `minigp_on_high.wav` → `public/audio/cg150-on-high.wav`: aceleração.
- `minigp_off_high.wav` → `public/audio/cg150-off-high.wav`: desaceleração; também usado mais baixo e grave em marcha lenta, pois não foi fornecida uma gravação dedicada de lenta.

Origem indicada: mod local `titan150luquine`. Autoria e licença não foram informadas; estes dois arquivos não estão incluídos na atribuição CC0 dos sons acima. Ambos são PCM mono de 44.100 Hz, preservados como recebidos. A alternância é feita por crossfade no jogo; ajustes em `CG_AUDIO_TUNING`, no topo de `src/audio.ts`. As outras motos mantêm seus bancos e o online continua reproduzindo apenas buzinas remotas.
