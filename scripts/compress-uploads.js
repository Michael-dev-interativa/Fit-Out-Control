#!/usr/bin/env node
/*
 Compress images in the uploads/ folder using sharp.
 Usage:
 1. npm i sharp --save-dev
 2. node scripts/compress-uploads.js

 This script will overwrite files in-place after creating a small backup (.bak).
 Use with caution; prefer to backup uploads/ before running in production.
*/
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  console.error('uploads/ directory not found.');
  process.exit(1);
}

const exts = ['.jpg', '.jpeg', '.png', '.webp', '.jfif'];

const files = fs.readdirSync(uploadsDir).filter(f => exts.includes(path.extname(f).toLowerCase()));
if (files.length === 0) {
  console.log('No image files found in uploads/');
  process.exit(0);
}

console.log(`Found ${files.length} image(s) in uploads/ — starting compression...`);

(async () => {
  for (const file of files) {
    const full = path.join(uploadsDir, file);
    try {
      const stat = fs.statSync(full);
      const sizeBefore = stat.size;
      const bak = full + '.bak';
      if (!fs.existsSync(bak)) fs.copyFileSync(full, bak);

      // compress to JPEG at 78 quality, resize down if large
      const img = sharp(full);
      const metadata = await img.metadata();
      let pipeline = img;
      if (metadata.width && metadata.width > 1600) {
        pipeline = pipeline.resize({ width: 1600 });
      }
      pipeline = pipeline.jpeg({ quality: 78, mozjpeg: true });
      await pipeline.toFile(full + '.tmp');
      const statAfter = fs.statSync(full + '.tmp');
      fs.renameSync(full + '.tmp', full);
      console.log(`${file}: ${(sizeBefore / 1024).toFixed(1)}KB -> ${(statAfter.size / 1024).toFixed(1)}KB`);
    } catch (err) {
      console.error('Failed compressing', file, err.message || err);
    }
  }
  console.log('Compression complete. Backups saved with .bak extensions.');
})();
