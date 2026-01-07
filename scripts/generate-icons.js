/**
 * Icon Generation Script for PWA
 * 
 * This script generates all required PWA icons from a source image.
 * 
 * Requirements:
 * - Install sharp: npm install --save-dev sharp
 * - Place your source icon (1024x1024px PNG) at public/icon-source.png
 * 
 * Usage: node scripts/generate-icons.js
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];
const sourceImage = path.join(process.cwd(), 'public/images/taskorilla-mascot.png');
const outputDir = path.join(process.cwd(), 'public/icons');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function generateIcons() {
  try {
    // Check if source image exists
    if (!fs.existsSync(sourceImage)) {
      console.error(`Source image not found: ${sourceImage}`);
      console.log('Please ensure the source image exists or update the sourceImage path in this script.');
      return;
    }

    console.log('Generating PWA icons...');
    
    // Generate each icon size
    for (const size of iconSizes) {
      const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);
      
      await sharp(sourceImage)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .png()
        .toFile(outputPath);
      
      console.log(`✓ Generated icon-${size}x${size}.png`);
    }

    // Generate Apple touch icon (180x180)
    const appleTouchIcon = path.join(outputDir, 'apple-touch-icon.png');
    await sharp(sourceImage)
      .resize(180, 180, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toFile(appleTouchIcon);
    console.log('✓ Generated apple-touch-icon.png');

    // Generate favicon (32x32)
    const favicon = path.join(outputDir, 'favicon-32x32.png');
    await sharp(sourceImage)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toFile(favicon);
    console.log('✓ Generated favicon-32x32.png');

    console.log('\n✅ All icons generated successfully!');
    console.log(`Icons are located in: ${outputDir}`);
  } catch (error) {
    console.error('Error generating icons:', error);
  }
}

generateIcons();






















