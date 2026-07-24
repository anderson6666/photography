// 媒体对象
export interface Media {
  id: string;
  type: 'photo' | 'video';
  data: Blob;
  thumbnail?: Blob; // 缩略图
  metadata: {
    width: number;
    height: number;
    duration?: number; // 仅视频，单位：秒
    createdAt: number;
  };
  createdAt: number;
}

// 相机状态
export interface CameraState {
  isReady: boolean;
  isRecording: boolean;
  error?: string;
  facingMode: 'user' | 'environment';
}

// 录制状态
export interface RecordingState {
  isRecording: boolean;
  duration: number; // 录制时长（秒）
  startTime?: number;
}