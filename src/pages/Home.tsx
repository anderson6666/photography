import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Circle, Image, Eye } from 'lucide-react';
import { useCamera } from '@/hooks/useCamera';
import { useColorProcessor } from '@/hooks/useColorProcessor';
import { useAppStore } from '@/store';
import { generateThumbnail } from '@/lib/export';

export default function Home() {
  const navigate = useNavigate();
  const { videoRef, cameraState, startCamera } = useCamera();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const {
    startRendering,
    stopRendering,
    isRendering,
    capturePhoto,
    enableSoftLight,
    toggleSoftLight,
  } = useColorProcessor({ canvasRef, videoRef });

  const { addMedia } = useAppStore();

  const [showFlash, setShowFlash] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // 全屏切换
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
  };

  // 监听全屏变化
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // 组件挂载时自动进入全屏
  useEffect(() => {
    const enterFullscreen = async () => {
      try {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } catch (error) {
        console.log('Auto fullscreen failed (user may need to interact first):', error);
      }
    };

    // 延迟 500ms 后尝试自动全屏
    const timer = setTimeout(enterFullscreen, 500);
    return () => clearTimeout(timer);
  }, []);

  // 更新当前时间
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 当相机准备好后开始渲染
  useEffect(() => {
    if (cameraState.isReady && !isRendering) {
      startRendering();
    }
  }, [cameraState.isReady, isRendering, startRendering]);

  // 组件卸载时停止渲染
  useEffect(() => {
    return () => {
      stopRendering();
    };
  }, [stopRendering]);

  // 处理拍照
  const handleCapture = async () => {
    try {
      const blob = await capturePhoto();
      if (!blob) return;

      // 显示闪光动画
      setShowFlash(true);
      setTimeout(() => setShowFlash(false), 150);

      const canvas = canvasRef.current;
      let thumbnail: Blob | undefined;

      try {
        if (canvas && canvas.width > 0 && canvas.height > 0) {
          thumbnail = await generateThumbnail(canvas, 200);
          console.log('Thumbnail generated successfully:', thumbnail.size, 'bytes');
        }
      } catch (error) {
        console.error('Failed to generate thumbnail:', error);
      }

      // 保存到 IndexedDB
      await addMedia({
        type: 'photo',
        data: blob,
        thumbnail,
        metadata: {
          width: canvas?.width || 0,
          height: canvas?.height || 0,
          createdAt: Date.now(),
        },
      });

      // 显示成功反馈
      setSuccessMessage('照片已保存');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      console.error('Failed to capture photo:', error);
    }
  };

  return (
    <div className="relative h-screen w-full bg-black overflow-hidden">
      {/* 隐藏的视频元素 */}
      <video ref={videoRef} className="hidden" playsInline muted autoPlay />

      {/* Canvas 预览 - 已应用柔光效果 */}
      <canvas
        ref={canvasRef}
        className="w-full h-full object-cover"
        style={{ transform: cameraState.facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
      />

      {/* 闪光动画 */}
      {showFlash && (
        <div className="absolute inset-0 bg-white animate-pulse-fast z-50" />
      )}

      {/* 成功反馈提示 */}
      {showSuccess && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in-down">
          <div className="bg-green-500 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 font-medium">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>{successMessage}</span>
          </div>
        </div>
      )}

      {/* 错误提示 */}
      {cameraState.error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-40">
          <div className="text-center px-8">
            <p className="text-white text-lg mb-4">{cameraState.error}</p>
            <button
              onClick={startCamera}
              className="px-6 py-3 bg-orange-500 text-white rounded-lg font-medium"
            >
              重新请求权限
            </button>
          </div>
        </div>
      )}

      {/* 顶部状态栏 */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-center px-4 py-3 bg-gradient-to-b from-black/60 to-transparent z-30">
        <div className="text-white font-medium text-sm">
          {currentTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {/* 底部控制面板 */}
      <div className="absolute bottom-0 left-0 right-0 z-30">
        <div className="bg-black/20 backdrop-blur-md rounded-t-3xl px-6 py-6">
          {/* 三个圆形按钮 */}
          <div className="flex items-center justify-around">
            {/* 相册按钮 */}
            <button
              onClick={() => navigate('/gallery')}
              className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center transition-transform active:scale-90"
              title="相册"
            >
              <Image size={24} className="text-white" />
            </button>

            {/* 拍照按钮 */}
            <button
              onClick={handleCapture}
              className="w-20 h-20 rounded-full bg-white border-4 border-white/30 flex items-center justify-center transition-transform active:scale-90"
              title="拍照"
            >
              <Circle size={40} className="text-orange-500" fill="currentColor" />
            </button>

            {/* 对比按钮 */}
            <button
              onMouseDown={() => toggleSoftLight(false)}
              onMouseUp={() => toggleSoftLight(true)}
              onMouseLeave={() => toggleSoftLight(true)}
              onTouchStart={() => toggleSoftLight(false)}
              onTouchEnd={() => toggleSoftLight(true)}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-transform active:scale-90 ${
                enableSoftLight ? 'bg-white/10' : 'bg-orange-500'
              }`}
              title="对比原图"
            >
              <Eye size={24} className="text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}