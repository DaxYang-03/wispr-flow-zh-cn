# 开发与构建

## 源码结构

- `src/wispr-companion.mjs`：启动生命周期、官方签名验证、私有 CDP 管道、页面识别和一次加载后断开。
- `src/runtime-i18n-injector.js`：动态识别 Webpack/i18next，并叠加已知译文。
- `src/wispr-launch.c`：仅启动固定路径的官方应用，用 macOS responsibility 属性保持权限归属。它不会授予权限。
- `src/manager.mjs`：安装、检查、启动、状态及停用工具。
- `catalogs/en/` / `catalogs/zh-CN/`：英文匹配基线及中文译文。
- `scripts/build-release.mjs`：构建通用小程序，下载并验证官方 Node.js，生成完整 ZIP 和校验文件。

## 本地验证

需要 Node.js 24 或更新版本，没有第三方 npm 依赖：

```bash
npm test
npm run validate
```

测试覆盖匹配和占位符、未知词条保留、词条改名、一次加载不注册观察器、中文用户名、安装中拒绝中断应用、签名失败前不修改服务，以及 Interactive 调度策略。具体证据边界见 [TESTING.md](TESTING.md)。

## 构建安装包

需要 macOS 13.5+、Node.js 24+、Apple Xcode Command Line Tools，以及到 `nodejs.org` 的网络访问。普通安装用户不需要这些开发工具。

```bash
npm run build
```

输出在 `dist/`：

- `Wispr-Flow-Chinese-v0.1.0-macOS.zip`
- `SHA256SUMS.txt`
- `install.sh`

ZIP 包含 Apple Silicon 和 Intel 两个官方 Node.js 可执行文件，以及一个通用 `wispr-launch`。构建时校验固定在 `scripts/node-runtime.json` 的 SHA-256。Node.js 最低 macOS 要求来自 [对应版本的官方 BUILDING.md](https://github.com/nodejs/node/blob/v24.22.2/BUILDING.md)。下载缓存放在 `build/cache/`，不提交到 Git。

公开安装包的小程序仅为本地 ad-hoc 签名，未做 Developer ID 签名或公证；Node.js 本身保持官方分发的签名和许可。这与“重新签名 Wispr Flow”是两回事，构建器从不修改官方应用。

## 发行流程

1. 更新 `package.json` 版本、`scripts/install-release.sh` 的固定版本，以及 README 的对应链接和文件名。
2. 运行测试、词库校验和构建；从 ZIP 解压后做一次安装入口检查。
3. 提交并推送代码。确认检查通过。
4. 给已通过检查的提交创建 `vX.Y.Z` 标签并推送。仓库发布工作流会构建并发布完整 ZIP、SHA256SUMS 和安装脚本。

持续集成不会安装或运行真实 Wispr Flow，也不访问用户权限数据库。真实 UI、权限和未来应用版本兼容性必须单独实测，不能从 CI 通过推断。

## 重要实现约束

- 保留官方签名，只连接规定路径下的 `file:` 页面。
- 不启用网络调试端口，不修改权限布尔值。
- 启动服务必须保持 Interactive。原来的 Background 配置在真实设备上导致掉帧。
- 注入后断开页面会话；默认不启用词库观察器，不重复全局刷新 React。
- 普通启动接管仅发生在启动早期；已有长期运行的实例保持不动。
- 用户正常退出后不能自行重新打开。
- 管道连接的父进程退出可能导致 Chromium 应用退出，因此安装与停用前必须要求用户完全退出。
