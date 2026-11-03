# Wispr Flow 中文补丁（Mac）

让 Wispr Flow 的应用内界面显示简体中文。

**下载安装包、解压，然后双击一次「安装中文补丁.command」。安装结束会自动打开中文版，不需要再点其他文件。**

## 快速安装

1. **先退出 Wispr Flow。** 点击屏幕顶部的 **Wispr Flow → Quit Wispr Flow**。只关闭窗口不算退出。
2. **[点击这里下载安装包](https://github.com/DaxYang-03/wispr-flow-zh-cn/releases/download/v0.1.1/Wispr-Flow-Chinese-v0.1.1-macOS.zip)**，下载后双击 ZIP 解压，再打开解压出来的文件夹。
3. **双击「安装中文补丁.command」。** 会出现一个终端窗口，这是安装程序在运行，不用输入任何命令。
4. **等它自动打开中文界面。** 安装程序会确认中文加载完成，再显示“安装完成”。通常需要数秒，最多等待约半分钟。

**以后直接点击原来的 Wispr Flow 图标即可，不必再运行安装文件。**

第一次使用 Wispr Flow 的人，需要先从 [官网](https://wisprflow.ai/downloads) 安装原版、登录，并完成原版要求的权限授权。应用要放在 Mac 的“应用程序”文件夹中，名称保持为 **Wispr Flow**。

这个补丁适用于 macOS 13.5 或更新版本，并且系统也要满足官方应用的要求。安装包会自动选择 Apple Silicon 或 Intel 的运行环境。

## 装好后常见的几个问题

**还需要双击「打开中文版.command」吗？**

不需要。v0.1.1 开始，安装完成后会自动打开中文版。这个额外工具只供以后手动重新打开时使用。

**为什么会出现终端窗口？**

安装程序通过这个窗口显示进度。看到“安装完成，中文界面已打开”后就可以关闭窗口。

**系统提示无法打开、无法验证或文件已损坏？**

当前安装程序尚未经过 Apple 开发者签名和公证，首次运行可能被系统阻止。先查看 [安装受阻的处理说明](docs/TROUBLESHOOTING.md#被-macos-阻止提示无法验证开发者或已损坏)，不要关闭系统的安全保护。

**以后更新 Wispr Flow，是否还要重装补丁？**

通常不用。译文独立保存，应用重新启动时会再次加载。新增内容可能仍是英文；如果官方大幅改变应用结构，需要更新补丁，不能保证任意未来版本永久兼容。

**怎么恢复英文？**

先完全退出 Wispr Flow，再双击安装包中的 **「恢复英文原版.command」**。下次打开即为官方界面；中文词库会保留。

## 目前的范围

这是非官方补丁。主要翻译应用内页面；屏幕顶部的 macOS 原生菜单、部分系统提示仍可能为英文。

已在 **Apple Silicon / macOS 27.0 / Wispr Flow 1.6.1337** 上验证。安装包包含 Intel 运行环境，但尚未做 Intel 真实界面测试。不支持 Windows、手机或 Linux。

## 其他说明

- [安装失败、权限或卡顿问题](docs/TROUBLESHOOTING.md)
- [其他安装方式和使用工具](docs/INSTALLATION.md)
- [实现原理与限制](docs/HOW_IT_WORKS.md)
- [开发与构建](docs/DEVELOPMENT.md) · [测试范围](docs/TESTING.md)
- [English](README.en.md) · [更新记录](CHANGELOG.md)

原创助手代码和文档采用 [MIT](LICENSE)，第三方权利说明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
