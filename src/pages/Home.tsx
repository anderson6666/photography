import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Circle, Image, Video, Eye } from 'lucide-react';
import { useCamera } from '@/hooks/useCamera';
import { useColorProcessor } from '@/hooks/useColorProcessor';
import { useAppStore } from '@/store';
import { generateThumbnail } from '@/lib/export';

type CaptureMode = 'photo' | 'video';

export default function Home() {
  const navigate = useNavigate();
  const { videoRef, cameraState, switchCamera, startCamera } = useCamera();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const {
    startRendering,
    stopRendering,
    isRendering,
    capturePhoto,
    startRecording,
    stopRecording,
    isRecording,
    enableSoftLight,
    toggleSoftLight,
  } = useColorProcessor({ canvasRef, videoRef });

  const { addMedia, isRecording: storeIsRecording, setRecordingState } = useAppStore();

  const [showFlash, setShowFlash] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [captureMode, setCaptureMode] = useState<CaptureMode>('photo');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
    if (captureMode === 'video') {
      // 录像模式
      handleRecordToggle();
    } else {
      // 拍照模式
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
    }
  };

  // 处理录像开始/停止
  const handleRecordToggle = async () => {
    if (isRecording()) {
      // 停止录像
      const blob = await stopRecording();
      if (!blob) return;

      // 停止计时器
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }

      const canvas = canvasRef.current;
      let thumbnail: Blob | undefined;

      try {
        if (canvas && canvas.width > 0 && canvas.height > 0) {
          thumbnail = await generateThumbnail(canvas, 200);
          console.log('Video thumbnail generated successfully:', thumbnail.size, 'bytes');
        }
      } catch (error) {
        console.error('Failed to generate video thumbnail:', error);
      }

      // 保存到 IndexedDB
      await addMedia({
        type: 'video',
        data: blob,
        thumbnail,
        metadata: {
          width: canvas?.width || 0,
          height: canvas?.height || 0,
          duration: recordingDuration,
          createdAt: Date.now(),
        },
      });

      setRecordingState(false);
      setRecordingDuration(0);

      // 显示成功反馈
      setSuccessMessage('视频已保存');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } else {
      // 开始录像
      startRecording();
      setRecordingState(true);

      // 开始计时
      setRecordingDuration(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    }
  };

  // 格式化录制时长
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/60 to-transparent z-30">
        <div className="text-white font-medium text-sm">
          {currentTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
        </div>
        {storeIsRecording && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-red-500 font-mono text-sm">{formatDuration(recordingDuration)}</span>
          </div>
        )}
      </div>

      {/* 底部控制面板 */}
      <div className="absolute bottom-0 left-0 right-0 z-30">
        <div className="bg-black/20 backdrop-blur-md rounded-t-3xl px-6 py-4">
          {/* 模式切换器 */}
          <div className="flex justify-center gap-4 mb-4">
            <button
              onClick={() => setCaptureMode('photo')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                captureMode === 'photo'
                  ? 'bg-orange-500 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              <Circle size={16} className={captureMode === 'photo' ? 'fill-current' : ''} />
              <span className="text-sm font-medium">拍照</span>
            </button>
            <button
              onClick={() => setCaptureMode('video')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                captureMode === 'video'
                  ? 'bg-red-500 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              <Video size={16} className={captureMode === 'video' ? 'fill-current' : ''} />
              <span className="text-sm font-medium">录像</span>
            </button>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center justify-center gap-12">
            {/* 相册按钮 */}
            <button
              onClick={() => navigate('/gallery')}
              className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center transition-transform active:scale-90"
            >
              <Image size={24} className="text-white" />
            </button>

            {/* 拍照/录像按钮 */}
            <button
              onClick={handleCapture}
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-transform active:scale-90 ${
                storeIsRecording
                  ? 'bg-red-500'
                  : captureMode === 'photo'
                  ? 'bg-white border-4 border-white/30'
                  : 'bg-red-500/80 border-4 border-red-500'
              }`}
            >
              {storeIsRecording ? (
                <div className="w-8 h-8 bg-white rounded-sm" />
              ) : captureMode === 'photo' ? (
                <Circle size={40} className="text-orange-500" fill="currentColor" />
              ) : (
                <Circle size={40} className="text-white" fill="currentColor" />
              )}
            </button>
          </div>

          {/* 对比按钮 */}
          <div className="flex justify-center mt-4">
            <button
              onMouseDown={() => toggleSoftLight(false)}
              onMouseUp={() => toggleSoftLight(true)}
              onMouseLeave={() => toggleSoftLight(true)}
              onTouchStart={() => toggleSoftLight(false)}
              onTouchEnd={() => toggleSoftLight(true)}
              className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                enableSoftLight
                  ? 'bg-white/10 text-white/90 hover:bg-white/20'
                  : 'bg-red-500 text-white'
              }`}
            >
              <Eye size={18} />
              <span>{enableSoftLight ? '按住对比原图' : '查看原图'}</span>
            </button>
          </div>
          
          {/* 柔光状态提示 */}
          <div className="text-center mt-2">
            <span className={`text-xs font-medium ${enableSoftLight ? 'text-orange-400' : 'text-yellow-300'}`}>
              {enableSoftLight ? '✨ 柔光效果已启用' : '📷 原始画面（无柔光）'}
            </span>
          </div>
          
          {/* 调试信息 */}
          <div className="text-center mt-1">
            <span className="text-xs text-white/50">
              柔光状态: {enableSoftLight ? 'ON' : 'OFF'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}