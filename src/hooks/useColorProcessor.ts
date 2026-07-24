import { useState, useRef, useEffect, useCallback } from 'react';

interface UseColorProcessorOptions {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  videoRef: React.RefObject<HTMLVideoElement>;
}

export function useColorProcessor({ canvasRef, videoRef }: UseColorProcessorOptions) {
  const [isRendering, setIsRendering] = useState(false);
  const [enableSoftLight, setEnableSoftLight] = useState(true); // 控制柔光效果
  const animationFrameRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // 核心渲染函数 - 只应用柔光效果
  const renderFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || video.paused || video.ended) {
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 设置 Canvas 尺寸与视频一致
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制原始视频帧（不应用任何滤镜）
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // 只在启用时应用柔光效果
    if (enableSoftLight) {
      // 专业柔光配置（基于全网最优实践）
      // 参考来源：Photoshop、CapCut、Adobe Premiere、Digital Art教程

      // 第一层：柔光增强对比度和深度
      // 柔光模式最佳透明度：0.25-0.35（来源：Photo Beauty Power Showcase）
      ctx.globalCompositeOperation = 'soft-light';
      ctx.fillStyle = 'rgba(30, 25, 20, 0.30)'; // 30% 透明度，暖色调
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 重置混合模式
      ctx.globalCompositeOperation = 'source-over';
    }
    // 当 enableSoftLight 为 false 时，Canvas 只显示原始视频帧（原图）

    // 继续渲染下一帧
    if (isRendering) {
      animationFrameRef.current = requestAnimationFrame(renderFrame);
    }
  }, [videoRef, canvasRef, isRendering, enableSoftLight]);

  // 开始渲染
  const startRendering = useCallback(() => {
    setIsRendering(true);
  }, []);

  // 停止渲染
  const stopRendering = useCallback(() => {
    setIsRendering(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  // 当渲染状态改变时启动/停止渲染循环
  useEffect(() => {
    if (isRendering) {
      renderFrame();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isRendering, renderFrame]);

  // 拍照
  const capturePhoto = useCallback(async (): Promise<Blob | null> => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          resolve(blob);
        },
        'image/png',
        1.0
      );
    });
  }, [canvasRef]);

  // 开始录像（固定配置：30fps, 1080p）
  const startRecording = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 使用 Canvas 的 captureStream 方法创建视频流
    const stream = canvas.captureStream(30); // 30fps

    // 检测浏览器支持的编码格式
    let mimeType = 'video/webm;codecs=vp9';
    
    // 尝试不同格式，按优先级排序
    const supportedFormats = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
      'video/mp4;codecs=h264',
      'video/mp4',
    ];

    // 找到浏览器支持的第一个格式
    for (const format of supportedFormats) {
      if (MediaRecorder.isTypeSupported(format)) {
        mimeType = format;
        break;
      }
    }

    console.log(`使用视频格式: ${mimeType}`);

    // 创建 MediaRecorder
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: mimeType,
      videoBitsPerSecond: 8000000, // 8Mbps
    });

    recordedChunksRef.current = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };

    mediaRecorder.start(1000); // 每秒收集一次数据
    mediaRecorderRef.current = mediaRecorder;
  }, [canvasRef]);

  // 停止录像并返回视频 Blob
  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current;
      if (!mediaRecorder) {
        resolve(null);
        return;
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        recordedChunksRef.current = [];
        mediaRecorderRef.current = null;
        resolve(blob);
      };

      // 停止录制前先请求最后一帧数据
      if (mediaRecorder.state === 'recording') {
        mediaRecorder.requestData();
        // 延迟 100ms 确保最后的 ondataavailable 被触发
        setTimeout(() => {
          mediaRecorder.stop();
        }, 100);
      }
    });
  }, []);

  // 检查是否正在录像
  const isRecording = useCallback(() => {
    return mediaRecorderRef.current?.state === 'recording';
  }, []);

  // 切换柔光效果（用于对比）
  const toggleSoftLight = useCallback((enabled: boolean) => {
    console.log(`切换柔光效果: ${enabled ? '启用' : '禁用'}`);
    setEnableSoftLight(enabled);
  }, []);

  return {
    startRendering,
    stopRendering,
    isRendering,
    capturePhoto,
    startRecording,
    stopRecording,
    isRecording,
    enableSoftLight,
    toggleSoftLight,
  };
}