# MindEcho React

数字人生微信web应用

## 项目介绍

基于React和TypeScript开发

## 技术栈

- **前端框架**: React 19.x
- **开发语言**: TypeScript 5.8.x
- **构建工具**: Vite 4.x
- **状态管理**: Zustand 5.0.x
- **UI组件**: Material UI 7.0.x
- **网络请求**: Axios 1.8.x
- **WebSocket**: 原生WebSocket API
- **路由管理**: React Router 7.5.x
- **样式处理**: Less 4.x

## 开发规范

### 代码风格

- 使用TypeScript强类型，避免any类型
- 组件采用函数式组件和React Hooks
- 使用ESLint进行代码质量检查
- 遵循React最佳实践和设计模式

### 目录结构

```
src/
├── api/        # API接口封装
├── assets/     # 静态资源
├── components/ # 可复用组件
├── hooks/      # 自定义Hooks
├── layouts/    # 页面布局组件
├── pages/      # 页面组件
├── store/      # 状态管理
├── styles/     # 全局样式
└── utils/      # 工具函数
```

### 环境配置

项目支持多环境配置：

- 开发环境：使用安全的HTTPS和WSS协议
- 测试环境：使用安全的HTTPS和WSS协议
- 生产环境：使用安全的HTTPS和WSS协议

## 使用方法

### 安装依赖

```bash
npm install
```

### 开发环境运行

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

### 代码检查

```bash
npm run lint
```

## 部署说明

构建完成后，将`dist`目录下的文件部署到HTTPS服务器上即可。确保服务器配置了正确的HTTPS证书，以支持安全的WebSocket(WSS)连接。

## 许可证

[MIT](LICENSE)

---

卜尧楠
