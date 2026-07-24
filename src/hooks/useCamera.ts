import { useState, useEffect, useRef, useCallback } from 'react';
import { CameraState } from '@/types';

export function useCamera() {
  const [cameraState, setCameraState] = useState<CameraState>({
    isReady: false,
    isRecording: false,
    facingMode: 'environment',
  });
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // 启动相机
  const startCamera = useCallback(async () => {
    try {
      // 检查浏览器是否支持 getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('您的浏览器不支持相机功能');
      }

      // 请求相机权限
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: cameraState.facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraState((prev) => ({ ...prev, isReady: true, error: undefined }));
      }
    } catch (error) {
      console.error('Camera error:', error);
      let errorMessage = '无法访问相机';

      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = '相机权限被拒绝，请在浏览器设置中允许访问相机';
        } else if (error.name === 'NotFoundError') {
          errorMessage = '未找到相机设备';
        } else if (error.name === 'NotReadableError') {
          errorMessage = '相机可能正被其他应用占用';
        }
      }

      setCameraState((prev) => ({ ...prev, error: errorMessage }));
    }
  }, [cameraState.facingMode]);

  // 停止相机
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraState((prev) => ({ ...prev, isReady: false }));
  }, []);

  // 切换前后摄像头
  const switchCamera = useCallback(async () => {
    stopCamera();
    // 先重置状态，确保可以重新启动
    setCameraState((prev) => ({
      ...prev,
      isReady: false,
      error: undefined,
      facingMode: prev.facingMode === 'user' ? 'environment' : 'user',
    }));
    // 延迟启动新相机，确保状态已更新
    setTimeout(() => {
      startCamera();
    }, 100);
  }, [stopCamera, startCamera]);

  // 当组件挂载时自动启动相机
  useEffect(() => {
    if (!cameraState.isReady && !cameraState.error) {
      startCamera();
    }
  }, [startCamera, cameraState.isReady, cameraState.error]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return {
    videoRef,
    cameraState,
    startCamera,
    stopCamera,
    switchCamera,
  };
}