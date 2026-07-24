# 🎬 电影相机

一个基于 Canvas 柔光混合模式的纯前端网页相机应用，支持实时柔光效果和拍照功能。

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![React](https://img.shields.io/badge/React-18.2.0-61dafb?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0.2-3178c6?logo=typescript)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ 核心特性

### 🎨 专业柔光效果
- **Canvas 柔光混合模式**：使用 `globalCompositeOperation = 'soft-light'` 实现
- **最优参数配置**：基于 Photoshop、CapCut、Adobe Premiere 等专业工具的最佳实践
- **实时对比功能**：按住按钮即可查看原图与柔光效果的对比
- **参数透明**：30% 透明度，暖色调 RGB(30, 25, 20)

### 📷 相机功能
- **实时预览**：相机画面实时显示在 Canvas 上
- **前后摄像头切换**：支持切换前后摄像头
- **拍照功能**：一键拍照，自动保存到本地
- **录像功能**：实时录制视频（30fps, 1080p）

### 💾 本地存储
- **IndexedDB 存储**：所有照片和视频自动保存到本地
- **缩略图生成**：自动生成缩略图，加速相册加载
- **媒体管理**：支持查看、下载、删除已保存的媒体

### 📱 移动端优化
- **响应式设计**：完美适配移动端和桌面端
- **全屏相机预览**：沉浸式拍摄体验
- **触摸优化**：支持触摸操作，长按对比原图

## 🚀 快速开始

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

应用将在 `http://localhost:5173` 启动。

### 构建生产版本

```bash
npm run build
```

## 🛠️ 技术栈

- **前端框架**：React 18.2.0
- **开发语言**：TypeScript 5.0.2
- **构建工具**：Vite 5.0.0
- **状态管理**：Zustand 4.4.0
- **路由**：React Router DOM 6.20.0
- **UI 图标**：Lucide React 0.294.0
- **本地存储**：IndexedDB

## 📖 核心原理

### 柔光混合模式

柔光效果通过 Canvas 的 `globalCompositeOperation = 'soft-light'` 实现：

```javascript
// 绘制原始视频帧
ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

// 应用柔光效果
ctx.globalCompositeOperation = 'soft-light';
ctx.fillStyle = 'rgba(30, 25, 20, 0.30)'; // 30% 透明度，暖色调
ctx.fillRect(0, 0, canvas.width, canvas.height);

// 重置混合模式
ctx.globalCompositeOperation = 'source-over';
```

### 参数说明

- **透明度 30%**：基于全网专业教程的最佳实践（25%-35% 范围）
- **暖色调 RGB(30, 25, 20)**：比纯黑更自然，增强电影质感
- **柔光模式特点**：比 overlay 更柔和，不会产生纯黑或纯白

### 参考来源

- [Photo Beauty Power Showcase](https://onlinephototools.com/image-tools/photo-beauty-power-showcase/)
- [Canvas混合模式全解析](https://blog.csdn.net/master_chenchen/article/details/156238868)
- [How to Use Blend Modes](https://www.capcut.com/create/blend-modes-creative-video-photo-effects)
- [Mastering Blend Modes](https://photoshoptutorial.com/posts/mastering-blend-modes-a-practical-guide-to-transform-your-edits/)

## 📱 使用方法

1. **打开应用**：在手机浏览器访问应用地址
2. **授予权限**：允许浏览器访问摄像头
3. **查看柔光效果**：默认已启用柔光效果
4. **对比原图**：按住"按住对比原图"按钮查看原图
5. **拍照/录像**：
   - 点击底部中央按钮拍照
   - 切换到录像模式进行录制
6. **查看相册**：点击左下角相册按钮查看已保存的媒体
7. **管理媒体**：在相册中点击媒体，选择下载或删除

## 🎯 项目结构

```
相机/
├── src/
│   ├── components/          # UI 组件
│   ├── hooks/               # 自定义 Hooks
│   │   ├── useCamera.ts     # 相机控制
│   │   └── useColorProcessor.ts  # 柔光处理
│   ├── lib/                 # 工具库
│   │   ├── db.ts            # IndexedDB 操作
│   │   └── export.ts        # 导出功能
│   ├── pages/               # 页面组件
│   │   ├── Home.tsx         # 相机页面
│   │   └── Gallery.tsx      # 相册页面
│   ├── store/               # 状态管理
│   │   └── index.ts         # Zustand store
│   ├── types/               # TypeScript 类型定义
│   └── App.tsx              # 应用入口
├── public/                  # 静态资源
├── package.json             # 项目配置
├── tsconfig.json            # TypeScript 配置
└── vite.config.ts           # Vite 配置
```

## 🔧 核心功能实现

### 相机访问

使用 `getUserMedia` API 访问摄像头：

```typescript
const stream = await navigator.mediaDevices.getUserMedia({
  video: {
    facingMode: facingMode, // 'user' 或 'environment'
    width: { ideal: 1920 },
    height: { ideal: 1080 }
  }
});
```

### 视频录制

使用 Canvas 的 `captureStream` 方法和 MediaRecorder API：

```typescript
const stream = canvas.captureStream(30); // 30fps
const mediaRecorder = new MediaRecorder(stream, {
  mimeType: 'video/webm;codecs=vp9',
  videoBitsPerSecond: 8000000 // 8Mbps
});
```

### IndexedDB 存储

使用原生 IndexedDB API 保存媒体文件：

```typescript
const request = indexedDB.open('CameraApp', 1);
request.createObjectStore('media', { keyPath: 'id' });
```

## 📝 开发日志

### v1.0.0 (2026-07-24)
- ✅ 实现基于 Canvas 柔光混合模式的实时调色
- ✅ 添加拍照和录像功能
- ✅ 集成 IndexedDB 本地存储
- ✅ 优化移动端体验
- ✅ 添加实时对比功能

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🙏 致谢

- 感谢所有提供柔光模式最佳实践的教程和文档
- 感谢开源社区提供的优秀工具和库

---

**Made with ❤️ by anderson6666**