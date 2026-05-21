import { NextResponse } from 'next/server';
import { createReadStream, existsSync, statSync } from 'fs';
import path from 'path';

export async function GET() {
  const apkPath = path.join(process.cwd(), 'public', 'downloads', 'schoolfinder.apk');

  if (!existsSync(apkPath)) {
    return NextResponse.json(
      { error: 'App not yet available for download. Check back soon.' },
      { status: 503 }
    );
  }

  const { size } = statSync(apkPath);
  const stream = createReadStream(apkPath);

  return new Response(stream as unknown as ReadableStream, {
    headers: {
      'Content-Type': 'application/vnd.android.package-archive',
      'Content-Disposition': 'attachment; filename="schoolfinder.apk"',
      'Content-Length': String(size),
    },
  });
}
