const { Jimp } = require('jimp');
const path = require('path');

async function convert() {
  try {
    const inputPath = path.join(__dirname, 'public', 'FotoIcono.jpeg');
    const image = await Jimp.read(inputPath);
    
    // iOS and Android recommended sizes
    const sizes = [
      { name: 'apple-touch-icon.png', size: 180 },
      { name: 'icon-192.png', size: 192 },
      { name: 'icon-512.png', size: 512 }
    ];

    for (const s of sizes) {
      const outputPath = path.join(__dirname, 'public', s.name);
      // We must clone it so we don't resize the same object sequentially
      const clone = image.clone();
      // 'cover' crops the image to a square if it's not square
      clone.resize({ w: s.size, h: s.size })
           .write(outputPath);
      console.log(`Created ${s.name} at ${s.size}x${s.size}`);
    }
  } catch (error) {
    console.error('Conversion error:', error);
  }
}

convert();
