import { access, readdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const resources = 'android/app/src/main/res';
const fullIcon = 'public/icon-512.png';
const foreground = 'assets/icon-foreground.png';
const densitySizes = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };

await access(resources);

for (const [density, size] of Object.entries(densitySizes)) {
  const directory = path.join(resources, `mipmap-${density}`);
  await sharp(fullIcon).resize(size, size).png().toFile(path.join(directory, 'ic_launcher.png'));
  await sharp(fullIcon).resize(size, size).png().toFile(path.join(directory, 'ic_launcher_round.png'));
  await sharp(foreground).resize(Math.round(size * 2.25), Math.round(size * 2.25)).png().toFile(path.join(directory, 'ic_launcher_foreground.png'));
}

await writeFile(
  path.join(resources, 'values', 'ic_launcher_background.xml'),
  '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#164B38</color>\n</resources>\n'
);

const resourceDirectories = await readdir(resources, { withFileTypes: true });
for (const entry of resourceDirectories.filter((item) => item.isDirectory() && item.name.startsWith('drawable'))) {
  const splashPath = path.join(resources, entry.name, 'splash.png');
  try { await access(splashPath); } catch { continue; }
  try {
    const metadata = await sharp(splashPath).metadata();
    const iconSize = Math.round(Math.min(metadata.width, metadata.height) * .27);
    const icon = await sharp(fullIcon).resize(iconSize, iconSize).png().toBuffer();
    await sharp({ create: { width: metadata.width, height: metadata.height, channels: 4, background: '#F8F7F1' } })
      .composite([{ input: icon, gravity: 'center' }])
      .png()
      .toFile(`${splashPath}.new`);
    await rename(`${splashPath}.new`, splashPath);
  } catch (error) { throw error; }
}

console.log('Iconos y pantallas de inicio Android generados.');
