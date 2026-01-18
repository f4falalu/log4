#!/usr/bin/env tsx
/**
 * generate-map-sprites.ts
 *
 * Auto-generates MapLibre GL sprite sheets from Phosphor React icons
 * defined in src/map/icons/phosphorIconMap.ts
 *
 * Output:
 * - public/map/sprites/operational.json (sprite metadata)
 * - public/map/sprites/operational.png (sprite sheet)
 * - public/map/sprites/operational@2x.png (high-DPI sprite sheet)
 *
 * Grid Spec:
 * - Artboard: 256×256 per icon
 * - Inner icon: 160×160 (48px padding each side)
 * - Safe rotation radius: 128px
 * - Circular backgrounds for moving entities only
 *
 * Usage:
 * npm run generate:sprites
 */

import { createWriteStream, mkdirSync } from 'fs';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { createCanvas } from 'canvas';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import {
  PHOSPHOR_ICON_MAP,
  hasCircularBackground,
  getAllSpriteNames,
  type PhosphorSpriteName,
} from '../src/map/icons/phosphorIconMap';

/**
 * Configuration matching Phosphor PRD specs
 */
const CONFIG = {
  artboardSize: 256,       // Artboard size (256×256)
  iconSize: 160,          // Inner icon size (160×160)
  padding: 48,            // Padding each side (256-160)/2 = 48px
  strokeWidth: 2,         // Phosphor default stroke width
  circleRadius: 120,      // Circle radius for moving entities
  outputDir: join(process.cwd(), 'public', 'map', 'sprites'),
  outputName: 'operational', // Output filename
};

/**
 * Sprite metadata structure (MapLibre format)
 */
interface SpriteMetadata {
  [key: string]: {
    width: number;
    height: number;
    x: number;
    y: number;
    pixelRatio: number;
  };
}

/**
 * Render Phosphor icon to SVG string
 */
function renderPhosphorIcon(IconComponent: any, size: number, hasCircle: boolean): string {
  const iconSvg = renderToStaticMarkup(
    React.createElement(IconComponent, {
      size,
      weight: 'regular',
      color: '#ffffff', // White icons (currentColor in MapLibre)
    })
  );

  // Extract the path from the SVG
  const pathMatch = iconSvg.match(/<path[^>]*d="([^"]+)"/);
  const iconPath = pathMatch ? pathMatch[1] : '';

  const artboard = CONFIG.artboardSize;
  const offset = (artboard - 24) / 2; // Center 24×24 icon in artboard

  // Build SVG with optional circular background
  let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${artboard}" height="${artboard}" viewBox="0 0 ${artboard} ${artboard}">`;

  // Add circular background for moving entities
  if (hasCircle) {
    const centerX = artboard / 2;
    const centerY = artboard / 2;
    svgContent += `<circle cx="${centerX}" cy="${centerY}" r="${CONFIG.circleRadius}" fill="#fe7f2d" opacity="0.2"/>`;
    svgContent += `<circle cx="${centerX}" cy="${centerY}" r="${CONFIG.circleRadius}" fill="none" stroke="#fe7f2d" stroke-width="3"/>`;
  }

  // Add icon (centered)
  svgContent += `<g transform="translate(${offset}, ${offset})">`;
  svgContent += `<path d="${iconPath}" fill="none" stroke="#ffffff" stroke-width="${CONFIG.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`;
  svgContent += `</g>`;
  svgContent += `</svg>`;

  return svgContent;
}

/**
 * Convert SVG string to PNG using canvas
 */
async function svgToPng(svgString: string, size: number): Promise<Buffer> {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // For now, render a placeholder circle
  // In production, you'd use a proper SVG-to-PNG converter
  ctx.fillStyle = hasCircularBackground(svgString as any) ? '#fe7f2d' : '#14b8a6';
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 3, 0, Math.PI * 2);
  ctx.fill();

  // Draw white icon shape (simplified)
  ctx.fillStyle = '#ffffff';
  ctx.font = `${size / 2}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('�', size / 2, size / 2);

  return canvas.toBuffer('image/png');
}

/**
 * Generate sprite sheet and metadata
 */
async function generateSprites() {
  console.log('🎨 Generating Phosphor icon sprites for BIKO Operational Map...\n');

  // Ensure output directory exists
  mkdirSync(CONFIG.outputDir, { recursive: true });

  // Get all sprite names
  const spriteNames = getAllSpriteNames();
  console.log(`Found ${spriteNames.length} Phosphor icons to process\n`);

  // Generate 1x and 2x sprite sheets
  await generateSpriteSheet(spriteNames, 1);
  await generateSpriteSheet(spriteNames, 2);

  console.log('\n✅ Sprite generation complete!');
  console.log(`   Output: ${CONFIG.outputDir}`);
  console.log(`   - ${CONFIG.outputName}.json`);
  console.log(`   - ${CONFIG.outputName}.png`);
  console.log(`   - ${CONFIG.outputName}@2x.png\n`);
}

/**
 * Generate sprite sheet for specific pixel ratio
 */
async function generateSpriteSheet(
  spriteNames: PhosphorSpriteName[],
  pixelRatio: 1 | 2
) {
  const iconSize = CONFIG.artboardSize * pixelRatio; // 256 for 1x, 512 for 2x
  const padding = 4 * pixelRatio; // Small padding between sprites

  // Calculate sprite sheet dimensions (horizontal layout for simplicity)
  const iconsPerRow = Math.ceil(Math.sqrt(spriteNames.length));
  const sheetWidth = iconsPerRow * (iconSize + padding);
  const sheetHeight = Math.ceil(spriteNames.length / iconsPerRow) * (iconSize + padding);

  // Create canvas
  const canvas = createCanvas(sheetWidth, sheetHeight);
  const ctx = canvas.getContext('2d');

  // Fill with transparent background
  ctx.clearRect(0, 0, sheetWidth, sheetHeight);

  // Metadata
  const metadata: SpriteMetadata = {};

  // Render each icon
  let x = 0;
  let y = 0;
  let col = 0;

  for (const spriteName of spriteNames) {
    const iconId = PHOSPHOR_ICON_MAP[spriteName];
    const hasCircle = hasCircularBackground(spriteName);

    const centerX = x + iconSize / 2;
    const centerY = y + iconSize / 2;

    // Draw circular background if needed
    if (hasCircle) {
      const radius = (CONFIG.circleRadius * pixelRatio);

      // Fill
      ctx.fillStyle = 'rgba(254, 127, 45, 0.2)'; // Pumpkin with transparency
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fill();

      // Stroke
      ctx.strokeStyle = '#fe7f2d'; // Pumpkin
      ctx.lineWidth = 3 * pixelRatio;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw icon (colored circle with label as placeholder)
    const iconRadius = (CONFIG.iconSize / 2) * pixelRatio * 0.4;

    // Icon circle
    ctx.fillStyle = hasCircle ? '#ffffff' : '#14b8a6'; // White for vehicles, teal for static
    ctx.beginPath();
    ctx.arc(centerX, centerY, iconRadius, 0, Math.PI * 2);
    ctx.fill();

    // Add icon label for identification
    ctx.fillStyle = hasCircle ? '#000000' : '#ffffff';
    ctx.font = `bold ${8 * pixelRatio}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = spriteName.split('.').pop() || '';
    ctx.fillText(label.substring(0, 4).toUpperCase(), centerX, centerY);

    // Add metadata
    metadata[spriteName] = {
      width: iconSize,
      height: iconSize,
      x,
      y,
      pixelRatio,
    };

    // Move to next position
    col++;
    if (col >= iconsPerRow) {
      col = 0;
      x = 0;
      y += iconSize + padding;
    } else {
      x += iconSize + padding;
    }

    console.log(`  ✓ ${spriteName}${hasCircle ? ' (with circle)' : ''}`);
  }

  // Save PNG
  const pngFilename = pixelRatio === 1
    ? `${CONFIG.outputName}.png`
    : `${CONFIG.outputName}@${pixelRatio}x.png`;

  const pngPath = join(CONFIG.outputDir, pngFilename);
  const out = createWriteStream(pngPath);
  const stream = canvas.createPNGStream();
  stream.pipe(out);

  await new Promise((resolve, reject) => {
    out.on('finish', resolve);
    out.on('error', reject);
  });

  console.log(`\n✓ Generated ${pngFilename} (${sheetWidth}x${sheetHeight})`);

  // Save JSON metadata (only for 1x)
  if (pixelRatio === 1) {
    const jsonPath = join(CONFIG.outputDir, `${CONFIG.outputName}.json`);
    await writeFile(jsonPath, JSON.stringify(metadata, null, 2));
    console.log(`✓ Generated ${CONFIG.outputName}.json`);
  }
}

/**
 * Run the script
 */
generateSprites().catch((error) => {
  console.error('❌ Error generating sprites:', error);
  process.exit(1);
});
