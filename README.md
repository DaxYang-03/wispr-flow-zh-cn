# Wispr Flow 中文补丁（Mac）

一个普通的 Mac 应用。首次打开后，点击“开启中文”，它会自动重启 Wispr Flow 并显示中文界面。

## 快速安装

1. **[下载安装文件](https://github.com/DaxYang-03/wispr-flow-zh-cn/releases/download/v0.2.0/Wispr-Flow-Chinese-v0.2.0.dmg)**，双击打开。
2. 把 **「Wispr Flow 中文补丁」** 拖进旁边的 **Applications（应用程序）** 文件夹，然后从“应用程序”打开它。
3. 点击窗口里唯一的按钮 **「开启中文」**，等它完成。

**不用打开终端，也不用运行脚本。** 你不需要手动关闭 Wispr Flow：按钮会自动退出它、开启中文，再重新打开。请先结束正在进行的录音。

首次开启成功后，窗口会自动关闭，首次操作进程退出。屏幕顶部菜单栏会留下一个“中”字图标；菜单栏组件和补丁会在后续登录时自动启动。

## 以后怎么用

平时继续点击原来的 Wispr Flow 图标，中文会自动加载，不需要每次打开补丁应用。

需要切换时，点击顶部菜单栏的“中”字图标。弹出的界面只有一个操作按钮：

- 当前开启：点击 **「关闭中文」**，恢复官方界面。
- 当前关闭：点击 **「开启中文」**，重新启用中文。

切换时会自动重启正在运行的 Wispr Flow。关闭中文不会移除菜单栏图标，方便以后再开启。

补丁应用**不在 Dock 中常驻**。后续打开它也不会重复显示首次设置窗口。

## 安装前需要什么

- 已从 [Wispr Flow 官网](https://wisprflow.ai/downloads) 安装官方原版，放在“应用程序”中，名称为 **Wispr Flow**。先正常登录一次，并完成官方要求的权限授权。
- macOS 13.5 或更新版本，同时满足官方应用自己的系统要求。
- 安装包同时包含 Apple Silicon 和 Intel 运行环境，无需额外安装开发工具。

如果直接从下载文件夹打开，第一次点击按钮时会尝试把补丁应用放进“应用程序”。建议按上面的拖入方式安装。

## 遇到问题

**系统阻止首次打开？** 当前应用尚未经过 Apple 开发者签名和公证，可能被 macOS 阻止。请查看 [首次打开说明](docs/TROUBLESHOOTING.md#首次打开被-macos-阻止)。不要关闭系统安全保护。

**原来的菜单怎么还有英文？** 本项目主要翻译应用内页面，顶部 macOS 原生菜单和部分系统提示仍可能是英文。

**Wispr Flow 更新后呢？** 译文保存在应用外，重开时会再次加载；新增内容可能是英文。官方大幅改变应用结构时可能需要更新补丁，不能保证所有未来版本永久兼容。

**应用退出不了怎么办？** 补丁不会强制结束进程。请结束录音并正常退出 Wispr Flow，再点按钮重试。

## 验证范围

已在 Apple Silicon / macOS 27.0 / Wispr Flow 1.6.1337 上验证核心汉化。原生应用的首次启用、菜单栏切换和自动启动测试见 [测试记录](docs/TESTING.md)。Intel 构建尚未在真实设备上验证界面。不支持 Windows、手机或 Linux。

[其他安装与移除说明](docs/INSTALLATION.md) · [故障排查](docs/TROUBLESHOOTING.md) · [实现原理](docs/HOW_IT_WORKS.md) · [开发与构建](docs/DEVELOPMENT.md) · [English](README.en.md)

原创代码和文档采用 [MIT](LICENSE)，第三方说明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。这是非官方项目，与 Wispr Flow 官方无隶属关系。
