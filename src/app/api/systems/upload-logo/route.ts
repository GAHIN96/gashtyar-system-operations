import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { logAudit } from '@/lib/auth';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Max file size: 2MB
const MAX_FILE_SIZE = 2 * 1024 * 1024;

// Allowed MIME types
const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/svg+xml',
  'image/webp',
]);

// Allowed extensions
const EXT_MAP: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/svg+xml': '.svg',
  'image/webp': '.webp',
};

/**
 * Validates file magic bytes to prevent MIME spoofing
 */
function validateMagicBytes(buffer: Buffer, mimeType: string): boolean {
  if (buffer.length < 4) return false;

  // PNG: 89 50 4E 47
  if (mimeType === 'image/png') {
    return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  }

  // JPEG: FF D8 FF
  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  // WebP: RIFF ... WEBP
  if (mimeType === 'image/webp') {
    const isRiff = buffer.toString('ascii', 0, 4) === 'RIFF';
    const isWebp = buffer.toString('ascii', 8, 12) === 'WEBP';
    return isRiff && isWebp;
  }

  // SVG: starts with XML or <svg
  if (mimeType === 'image/svg+xml') {
    const text = buffer.toString('utf-8', 0, Math.min(buffer.length, 1000)).trim();
    return text.includes('<svg') || text.startsWith('<?xml');
  }

  return false;
}

/**
 * Securely sanitizes SVG content by removing executable scripts, external entities, and event handlers
 */
function sanitizeSvg(svgContent: string): string {
  let cleaned = svgContent;

  // 1. Remove dangerous tags and their content
  cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  cleaned = cleaned.replace(/<foreignObject\b[^<]*(?:(?!<\/foreignObject>)<[^<]*)*<\/foreignObject>/gi, '');
  cleaned = cleaned.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  cleaned = cleaned.replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '');
  cleaned = cleaned.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '');

  // 2. Remove XML Entity declarations to prevent XXE
  cleaned = cleaned.replace(/<!ENTITY\b[^>]*>/gi, '');
  cleaned = cleaned.replace(/<!DOCTYPE\b[^>]*>/gi, '');

  // 3. Remove javascript: pseudo-protocols
  cleaned = cleaned.replace(/href\s*=\s*["']\s*javascript:[^"']*["']/gi, 'href="#"');
  cleaned = cleaned.replace(/xlink:href\s*=\s*["']\s*javascript:[^"']*["']/gi, 'xlink:href="#"');

  // 4. Remove all inline event handlers (onload, onerror, onclick, etc.)
  cleaned = cleaned.replace(/\s+on[a-z]+\s*=\s*(["'][^"']*["']|[^\s>]+)/gi, '');

  return cleaned;
}

export async function POST(req: NextRequest) {
  // Super Admin / IT Manager and Company Managers can upload or replace logos
  const auth = await getAuthenticatedUser(req, 'MANAGER');
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const formData = await req.formData();
    const file = formData.get('logo') as File | null;
    const systemSlug = (formData.get('systemSlug') as string) || 'system';

    if (!file) {
      return NextResponse.json({ error: 'No logo file provided.' }, { status: 400 });
    }

    // Size validation (Max 2MB)
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds maximum permitted limit of 2 MB.' },
        { status: 400 }
      );
    }

    // MIME type validation
    const mimeType = file.type.toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return NextResponse.json(
        { error: 'Invalid file type. Supported formats: PNG, JPG, JPEG, SVG, WebP.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Magic bytes verification
    if (!validateMagicBytes(buffer, mimeType)) {
      return NextResponse.json(
        { error: 'File content verification failed. File does not match its claimed image format.' },
        { status: 400 }
      );
    }

    // Destination directory: public/uploads/logos
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'logos');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const sanitizedSlug = systemSlug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const uniqueSuffix = crypto.randomBytes(6).toString('hex');
    const ext = EXT_MAP[mimeType] || '.png';
    const filename = `logo_${sanitizedSlug}_${uniqueSuffix}${ext}`;
    const filePath = path.join(uploadsDir, filename);

    if (mimeType === 'image/svg+xml') {
      const rawSvg = buffer.toString('utf-8');
      const sanitizedSvgContent = sanitizeSvg(rawSvg);
      fs.writeFileSync(filePath, sanitizedSvgContent, 'utf-8');
    } else {
      fs.writeFileSync(filePath, buffer);
    }

    const publicUrl = `/uploads/logos/${filename}`;

    await logAudit(
      auth.user!.id,
      auth.user!.email,
      'UPLOAD_SYSTEM_LOGO',
      'SYSTEM',
      systemSlug,
      `Uploaded system logo ${filename} (${(file.size / 1024).toFixed(1)} KB)`
    );

    return NextResponse.json({
      success: true,
      logo_url: publicUrl,
      filename,
      sizeBytes: file.size,
      mimeType,
    });
  } catch (err: unknown) {
    console.error('Logo upload error:', err);
    return NextResponse.json(
      { error: 'Failed to process logo upload. Please try again.' },
      { status: 500 }
    );
  }
}
