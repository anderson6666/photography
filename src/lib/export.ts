import { Media } from '@/types';

// 下载媒体文件
export async function downloadMedia(media: Media): Promise<void> {
  const url = URL.createObjectURL(media.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = generateFileName(media);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// 生成文件名
function generateFileName(media: Media): string {
  const date = new Date(media.metadata.createdAt);
  const timestamp = date.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const extension = media.type === 'photo' ? 'png' : 'webm';
  return `color-camera-${timestamp}.${extension}`;
}

// 将 Canvas 转换为 Blob
export async function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string = 'image/png',
  quality: number = 1.0
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Canvas toBlob failed'));
        }
      },
      type,
      quality
    );
  });
}

// 生成缩略图
export async function generateThumbnail(
  canvas: HTMLCanvasElement,
  maxSize: number = 200
): Promise<Blob> {
  const thumbnailCanvas = document.createElement('canvas');
  const ctx = thumbnailCanvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // 计算缩略图尺寸，保持宽高比
  const aspectRatio = canvas.width / canvas.height;
  let thumbnailWidth: number;
  let thumbnailHeight: number;

  if (aspectRatio > 1) {
    thumbnailWidth = maxSize;
    thumbnailHeight = maxSize / aspectRatio;
  } else {
    thumbnailHeight = maxSize;
    thumbnailWidth = maxSize * aspectRatio;
  }

  thumbnailCanvas.width = thumbnailWidth;
  thumbnailCanvas.height = thumbnailHeight;

  // 绘制缩略图
  ctx.drawImage(canvas, 0, 0, thumbnailWidth, thumbnailHeight);

  // 转换为 Blob
  return canvasToBlob(thumbnailCanvas, 'image/jpeg', 0.8);
}

// 检查浏览器是否支持下载
export function isDownloadSupported(): boolean {
  return 'download' in document.createElement('a');
}