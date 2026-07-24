import { create } from 'zustand';
import { Media } from '@/types';
import { saveMedia, getAllMedia, deleteMedia, generateId } from '@/lib/db';

interface AppState {
  // 媒体列表
  mediaList: Media[];
  loading: boolean;

  // 录制状态
  isRecording: boolean;
  recordingDuration: number;

  // 操作方法
  loadMediaList: () => Promise<void>;
  addMedia: (media: Omit<Media, 'id' | 'createdAt'>) => Promise<void>;
  removeMedia: (id: string) => Promise<void>;
  setRecordingState: (isRecording: boolean, duration?: number) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // 初始状态
  mediaList: [],
  loading: false,
  isRecording: false,
  recordingDuration: 0,

  // 加载媒体列表
  loadMediaList: async () => {
    set({ loading: true });
    try {
      const mediaList = await getAllMedia();
      set({ mediaList, loading: false });
    } catch (error) {
      console.error('Failed to load media list:', error);
      set({ loading: false });
    }
  },

  // 添加媒体
  addMedia: async (mediaData) => {
    try {
      const media: Media = {
        ...mediaData,
        id: generateId(),
        createdAt: Date.now(),
      };

      await saveMedia(media);
      set((state) => ({
        mediaList: [media, ...state.mediaList],
      }));
    } catch (error) {
      console.error('Failed to add media:', error);
    }
  },

  // 删除媒体
  removeMedia: async (id) => {
    try {
      await deleteMedia(id);
      set((state) => ({
        mediaList: state.mediaList.filter((media) => media.id !== id),
      }));
    } catch (error) {
      console.error('Failed to remove media:', error);
    }
  },

  // 设置录制状态
  setRecordingState: (isRecording, duration = 0) => {
    set({ isRecording, recordingDuration: duration });
  },
}));