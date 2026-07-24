import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Circle, RotateCcw, Image, Video, Eye } from 'lucide-react';
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
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
        const thumbnail = canvas ? await generateThumbnail(canvas, 200) : undefined;

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
      const thumbnail = canvas ? await generateThumbnail(canvas, 200) : undefined;

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
        style={{ transform: 'scaleX(-1)' }}
      />

      {/* 闪光动画 */}
      {showFlash && (
        <div className="absolute inset-0 bg-white animate-pulse-fast z-50" />
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
          <div className="flex items-center justify-around">
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

            {/* 切换摄像头按钮 */}
            <button
              onClick={switchCamera}
              className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center transition-transform active:scale-90"
            >
              <RotateCcw size={24} className="text-white" />
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