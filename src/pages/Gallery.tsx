import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Trash2, Play, X } from 'lucide-react';
import { useAppStore } from '@/store';
import { downloadMedia } from '@/lib/export';
import { Media } from '@/types';

export default function Gallery() {
  const navigate = useNavigate();
  const { mediaList, loadMediaList, removeMedia, loading } = useAppStore();
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);

  // 加载媒体列表
  useEffect(() => {
    loadMediaList();
  }, [loadMediaList]);

  // 下载媒体
  const handleDownload = async (media: Media) => {
    try {
      await downloadMedia(media);
    } catch (error) {
      console.error('Failed to download media:', error);
    }
  };

  // 删除媒体
  const handleDelete = async (id: string) => {
    try {
      await removeMedia(id);
      setSelectedMedia(null);
    } catch (error) {
      console.error('Failed to delete media:', error);
    }
  };

  // 格式化时间
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="h-screen w-full bg-[#1a1a1a] overflow-hidden flex flex-col">
      {/* 顶部导航栏 */}
      <div className="flex items-center justify-between px-4 py-4 bg-[#1a1a1a] border-b border-white/10">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-white transition-colors hover:text-orange-500"
        >
          <ArrowLeft size={24} />
          <span className="font-medium">返回</span>
        </button>
        <h1 className="text-white font-medium text-lg">电影相机</h1>
        <div className="w-16" />
      </div>

      {/* 媒体网格 */}
      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-white/60">加载中...</div>
          </div>
        ) : mediaList.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-white/60">
            <div className="text-6xl mb-4">📷</div>
            <p className="text-lg">暂无照片或视频</p>
            <p className="text-sm mt-2">拍摄后将会保存在这里</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {mediaList.map((media) => (
              <div
                key={media.id}
                className="aspect-square relative overflow-hidden bg-white/5 rounded-lg cursor-pointer group"
                onClick={() => setSelectedMedia(media)}
              >
                {/* 缩略图 */}
                {media.thumbnail ? (
                  <img
                    src={URL.createObjectURL(media.thumbnail)}
                    alt={media.type === 'photo' ? '照片' : '视频'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-white/10">
                    <span className="text-white/40 text-4xl">
                      {media.type === 'photo' ? '🖼️' : '🎬'}
                    </span>
                  </div>
                )}

                {/* 视频标识 */}
                {media.type === 'video' && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Play size={32} className="text-white drop-shadow-lg" fill="white" />
                  </div>
                )}

                {/* 时间戳 */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1">
                  <span className="text-white text-xs font-mono">
                    {formatTime(media.createdAt)}
                  </span>
                </div>

                {/* Hover 效果 */}
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 媒体查看器 */}
      {selectedMedia && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
          {/* 顶部操作栏 */}
          <div className="flex items-center justify-between px-4 py-4 bg-gradient-to-b from-black/60 to-transparent">
            <button
              onClick={() => setSelectedMedia(null)}
              className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
            >
              <X size={24} className="text-white" />
            </button>

            <div className="flex gap-2">
              <button
                onClick={() => handleDownload(selectedMedia)}
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
              >
                <Download size={20} className="text-white" />
              </button>
              <button
                onClick={() => handleDelete(selectedMedia.id)}
                className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center"
              >
                <Trash2 size={20} className="text-red-500" />
              </button>
            </div>
          </div>

          {/* 媒体内容 */}
          <div className="flex-1 flex items-center justify-center p-4">
            {selectedMedia.type === 'photo' ? (
              <img
                src={URL.createObjectURL(selectedMedia.data)}
                alt="照片"
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <video
                src={URL.createObjectURL(selectedMedia.data)}
                controls
                autoPlay
                className="max-w-full max-h-full"
              />
            )}
          </div>

          {/* 底部信息 */}
          <div className="px-4 py-4 bg-gradient-to-t from-black/60 to-transparent">
            <div className="text-white/80 text-sm">
              <span className="mr-4">
                {selectedMedia.type === 'photo' ? '照片' : '视频'}
              </span>
              <span>{formatTime(selectedMedia.createdAt)}</span>
              {selectedMedia.metadata.duration && (
                <span className="ml-4">
                  时长: {Math.floor(selectedMedia.metadata.duration / 60)}:
                  {(selectedMedia.metadata.duration % 60).toString().padStart(2, '0')}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}