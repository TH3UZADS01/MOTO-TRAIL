# Honda XRE 300 Sahara

Modelo convertido do mod SAHARA 300 JOTA de MX Bikes, com as rodas de rodasahara300j. O arquivo editável é sahara.blend. O jogo usa as mesmas peças e pivôs do GLB em src/assets/sahara-model.json.

A calibração a gasolina usa 26,5 Nm a 5.750 rpm, 24,8 cv a 7.500 rpm, seis marchas, 1.425 mm entre eixos e tanque de 13,8 L. Relações de marcha, massa abastecida e pontos intermediários da curva são estimativas para o jogo. O limite de 150 km/h é uma escolha de gameplay. [Ficha técnica Honda](https://www.honda.com.br/motos/adventure/trail/sahara-300).

A importação usa tools/import_titan_edf.py com --sahara e --wheels, seguida de tools/export_sahara_edf.py no Blender. Os dois loops de motor são as gravações estéreo do commit 0d7274b.
