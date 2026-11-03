# 开发与构建

## 源码结构

- `src/wispr-companion.mjs`：启动生命周期、官方签名验证、私有 CDP 管道、页面识别和一次加载后断开。
- `src/runtime-i18n-injector.js`：动态识别 Webpack/i18next，并叠加已知译文。
- `src/wispr-launch.c`：仅启动固定路径的官方应用，用 macOS responsibility 属性保持权限归属。它不会授予权限。
- `src/manager.mjs`：内部安装与切换控制、正常退出官方应用、状态持久化和登录项。
- `src/macos/App.swift`：原生 AppKit 首次窗口和共用单按钮。
- `src/macos/MenuApp.swift`：系统原生 SwiftUI MenuBarExtra 菜单栏入口。
- `src/macos/IconMaker.swift`：原创应用图标。
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

- `Wispr-Flow-Chinese-v0.2.0-macOS.zip`
- `SHA256SUMS.txt`
- `Wispr-Flow-Chinese-v0.2.0.dmg`

ZIP 与 DMG 包含一个完整原生 `.app`，内部自带 Apple Silicon / Intel 运行环境、通用 Swift GUI 与通用 `wispr-launch`。用户无需操作内部脚本。构建时校验固定在 `scripts/node-runtime.json` 的 SHA-256。Node.js 最低 macOS 要求来自 [对应版本的官方 BUILDING.md](https://github.com/nodejs/node/blob/v24.22.2/BUILDING.md)。下载缓存放在 `build/cache/`，不提交到 Git。

公开安装包的小程序仅为本地 ad-hoc 签名，未做 Developer ID 签名或公证；Node.js 本身保持官方分发的签名和许可。这与“重新签名 Wispr Flow”是两回事，构建器从不修改官方应用。

## 发行流程

1. 更新 `package.json` 版本及文档中的对应下载链接和文件名。
2. 运行测试、词库校验和构建；从 ZIP 解压后做一次安装入口检查。
3. 提交并推送代码。确认检查通过。
4. 给已通过检查的提交创建 `vX.Y.Z` 标签并推送。仓库发布工作流会构建并发布应用 ZIP、DMG 和 SHA256SUMS。

持续集成不会安装或运行真实 Wispr Flow，也不访问用户权限数据库。真实 UI、权限和未来应用版本兼容性必须单独实测，不能从 CI 通过推断。

## 重要实现约束

- 保留官方签名，只连接规定路径下的 `file:` 页面。
- 不启用网络调试端口，不修改权限布尔值。
- 启动服务必须保持 Interactive。原来的 Background 配置在真实设备上导致掉帧。
- 注入后断开页面会话；默认不启用词库观察器，不重复全局刷新 React。
- 普通启动接管仅发生在启动早期；已有长期运行的实例保持不动。
- 用户正常退出后不能自行重新打开。
- 管道连接的父进程退出可能导致 Chromium 应用退出，因此安装与停用前必须要求用户完全退出。

## 原生应用生命周期

`LSUIElement=true`，不常驻 Dock。首次界面只提供一个按钮；成功后首次进程退出。单独的 `--menu-bar` 进程通过登录项启动，提供一个开关，开启/关闭状态保存在应用外。首次窗口不再重复显示。

补丁登录项与菜单栏登录项分开，关闭中文只停止补丁，菜单栏仍能用于重新开启。两者都保持 Interactive，不能改成 Background。GUI 自动退出仅针对首次设置进程，菜单栏组件继续工作。

macOS 27 的注意点：使用 Info.plist 的 LSUIElement，不要在主事件循环之前调用 setActivationPolicy(.accessory)，这会影响菜单栏项布局。菜单栏使用独立签名的内嵌 helper bundle，通过 LaunchServices 启动，避免首次窗口进程退出影响它。参考开发者实测记录：https://www.getthaw.app/docs/thaw/app-developers 。
