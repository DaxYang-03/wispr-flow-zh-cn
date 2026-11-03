# Wispr Flow 中文补丁 · macOS

**给官方 Wispr Flow 加上简体中文界面的非官方助手。安装包自带运行环境，无需 Node、Homebrew、Python 或开发工具。**

[下载安装包](https://github.com/DaxYang-03/wispr-flow-zh-cn/releases/latest) · [常见问题](docs/TROUBLESHOOTING.md) · [开发与构建](docs/DEVELOPMENT.md) · [测试范围](docs/TESTING.md) · [English](README.en.md)

> 目前仅支持 macOS。应用内页面可汉化，顶部 macOS 原生菜单及部分系统提示可能仍为英文。已实测 Wispr Flow **1.6.1337 / Apple Silicon / macOS 27.0**；Intel 安装包已构建但尚未做真实应用界面实测。官方未来大幅改版可能需要适配。

## 快速安装

### 先准备好官方应用

1. 从 [Wispr Flow 官网](https://wisprflow.ai/downloads) 安装与你的 Mac 匹配的官方版本，应用名称和位置保持为 `/Applications/Wispr Flow.app`。先打开、登录，并按官方提示完成麦克风和辅助功能授权。
2. 从菜单选择 **Wispr Flow → Quit Wispr Flow**，完全退出应用。只关闭窗口不算退出。
3. 确认系统满足官方应用的要求，且至少为 **macOS 13.5 或更新版本**。安装包同时包含 Apple Silicon 和 Intel 运行环境，会自动选择；不要使用 `sudo`。

### 方式一：复制到终端安装

打开系统自带的“终端”，一次粘贴下面四行并按回车：

```bash
wispr_installer="$(mktemp -t wispr-flow-zh-cn)"
curl -fLSs https://github.com/DaxYang-03/wispr-flow-zh-cn/releases/download/v0.1.0/install.sh -o "$wispr_installer"
bash "$wispr_installer"
rm -f "$wispr_installer"
```

它会下载固定的 **v0.1.0** 安装包、验证 ZIP 的 SHA-256、安装到当前用户目录，并打开中文版。脚本公开在 [scripts/install-release.sh](scripts/install-release.sh)，可在运行前查看。大约等待数秒，首页和设置页应显示中文。

**安装成功的判断：** 能看到中文导航和设置；辅助功能仍正常。以后继续点原来的 Wispr Flow 图标即可。

### 方式二：下载安装包，双击安装

1. 打开 [Releases](https://github.com/DaxYang-03/wispr-flow-zh-cn/releases/latest)。在 **Assets** 中下载 **`Wispr-Flow-Chinese-v0.1.0-macOS.zip`**。**不要下载 GitHub 自动生成的 Source code ZIP**，源码包没有运行环境。
2. 解压后打开文件夹，双击 **`安装中文补丁.command`**，等待终端显示“安装完成”。
3. 双击 **`打开中文版.command`**。以后用原来的应用图标即可。

安装包的自制启动小程序尚未经过 Apple Developer ID 签名和公证。从浏览器下载时，macOS 可能阻止首次运行。不要关闭 Gatekeeper、SIP 或全局安全保护；可以改用上面的终端安装方式，或查看 [Apple 官方安全打开说明](https://support.apple.com/zh-cn/102445) 后自行决定是否信任此项目。遇到“已损坏”提示时请先看 [排查文档](docs/TROUBLESHOOTING.md)。

## 安装后怎么用

| 需要做什么 | 操作 |
| --- | --- |
| 平时打开 | 点击原来的 Wispr Flow 图标 |
| 直接打开中文版 | 双击安装包里的 `打开中文版.command` |
| 检查安装和最近授权记录 | 双击 `检查安装状态.command` |
| 暂停汉化、恢复官方界面 | 完全退出 Wispr Flow，再双击 `恢复英文原版.command` |
| 更新本项目的助手或词库 | 完全退出应用，下载新的完整安装包，再运行安装工具 |

助手会在登录后运行，等待应用启动。点击原图标时，可能先短暂出现英文，然后窗口重开一次，这是启动接管过程；**启动后稍等数秒再开始录音**。已经运行较久的应用会保持原状，助手不会强行重启它。

## 应用更新后，中文还在吗？

译文保存在官方应用之外。**官方应用更新不会覆盖词库；更新后再次启动时，助手会重新加载已有译文。** 新词条可以保留英文。

- 首先按原来的词条编号匹配。
- 如果新版改了编号，同一词库内相同、无歧义的英文原文也能复用译文。
- 模块编号变化不影响动态查找。
- 已测试同版本官方应用整包替换后的恢复，以及模拟模块编号变化、词条改名和新增英文词条。

**这不等于保证所有未来版本永久兼容。** 官方更换界面技术、签名团队、调试能力或词库结构时可能需要适配；词条编号和原文同时改变、或从页面移动到原生菜单时，也可能暂时显示英文。手动完整刷新页面后译文可能消失，退出后重开即可重新加载。没有安装持续监听页面刷新或远端词库变化的观察器。

## 会影响权限、性能或隐私吗？

- **保留官方应用和签名。** 不修改 `app.asar`、官方可执行文件、应用偏好或权限数据库；不重新签名 Wispr Flow。
- **权限属于官方应用。** 小型启动程序使 macOS 继续按 Wispr Flow 官方身份检查授权，不需要给中文助手增加辅助功能、麦克风或完整磁盘访问权限。
- **不做持续页面刷新。** 每个页面只加载一次译文，成功后关闭该页面的调试会话；没有常驻词库观察器。应用运行时不重复扫描所有进程。
- **避免后台限速。** 登录服务使用 `ProcessType=Interactive`，防止 GUI 应用继承后台资源限制。已在原始设备上通过用户对照确认修复掉帧，其他设备仍需实际验证。
- **不开放网络调试端口。** 使用仅父子进程持有的本机管道。助手代码不上传页面正文、听写内容、账号资料或日志；官方 Wispr Flow 自己的联网行为仍由官方应用决定。

## 恢复英文与卸载

先从 Wispr Flow 菜单完全退出，再双击 **`恢复英文原版.command`**。它会停止助手并删除登录启动项；下次打开就是官方界面。保留译文文件，方便重新启用。

如果已经删掉下载安装包，可以在终端运行：

```bash
"$HOME/Library/Application Support/Wispr Flow 中文助手/node" \
  "$HOME/Library/Application Support/Wispr Flow 中文助手/manager.mjs" disable
```

需要完全移除文件时，在上述停用完成后，将下面的助手文件夹移到废纸篓即可：

```text
~/Library/Application Support/Wispr Flow 中文助手/
```

助手没有改过官方应用，因此无需恢复旧版应用，也不应覆盖你的听写历史或账号数据。

## 已知限制

- 这是非官方项目，不是 Wispr Flow 官方中文版。
- **不覆盖顶部 macOS 原生菜单和主进程直接生成的系统提示。** 词库保存了 7,264 条记录，不代表 7,264 条在所有界面上都已生效。
- 不支持 Windows、iPhone、Android、Linux 或其他应用的“Flow”。
- 需要官方应用在 `/Applications/Wispr Flow.app`；曾被修改或重新签名的版本会被拒绝。
- Intel 构建尚未进行真实应用 UI 测试；未来发行版和所有系统组合未逐一验证。
- 新版助手安装会更新配套词库，自定义修改请先备份；官方应用更新不会修改助手词库。

## 项目文件与贡献

`src/` 是助手、安装器和启动程序源码，`catalogs/zh-CN/` 是中文词库，`catalogs/en/` 是对应英文匹配基线。没有包含官方应用本体、反编译代码、用户数据或本机排查日志。

欢迎提交翻译修正和兼容性问题。[新建 Issue](https://github.com/DaxYang-03/wispr-flow-zh-cn/issues/new) 时提供 macOS 版本、芯片类型、Wispr Flow 版本和复现步骤即可；请勿附上听写正文、令牌或账号资料。

原创助手代码与文档采用 [MIT](LICENSE)；上游产品名称、界面原文和发行包内 Node.js 的权利说明见 [第三方说明](THIRD_PARTY_NOTICES.md)。
