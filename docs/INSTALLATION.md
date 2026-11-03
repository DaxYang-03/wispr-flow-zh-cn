# 安装与移除

## 推荐：普通 Mac 应用安装

从 [Releases](https://github.com/DaxYang-03/wispr-flow-zh-cn/releases/latest) 下载名字以 `.dmg` 结尾的文件，打开后把“Wispr Flow 中文补丁”拖进 Applications，再从“应用程序”打开。点击“开启中文”即可。

也提供 ZIP：解压后得到同一个 `.app`，把它拖到“应用程序”再打开。不需要运行任何命令行脚本。不要下载 Source code，它只是开发源码。

## 开启与关闭

首次窗口只有“开启中文”一个按钮。成功后窗口关闭，首次操作进程退出；顶部菜单栏组件接替日常控制。后续登录会自动生效，不需要每次手动打开。

点击顶部“中”字图标，按钮会根据当前状态显示“开启中文”或“关闭中文”。切换时会先正常退出正在运行的 Wispr Flow，完成后重开。若应用拒绝退出，会提示重试，不使用强制结束。

## 从旧脚本版升级

直接安装并打开新版应用，点击“开启中文”。它会自动重启 Wispr Flow 并更新原来的助手。旧版词库位置继续使用，账号、听写记录和官方应用不变。

## 移除

先在菜单栏点击“关闭中文”，再将“应用程序”中的本补丁移到废纸篓。若要清理登录项，可在 Finder 的“前往 → 前往文件夹”中打开：

```text
~/Library/LaunchAgents/
```

移除 `local.wispr-flow.chinese-menubar.plist` 与 `local.wispr-flow.chinese-companion.plist`（后者在关闭中文时已删除）。注销后菜单栏组件不再启动。

译文文件保留在 `~/Library/Application Support/Wispr Flow 中文助手/`；确认不再使用后也可移到废纸篓。不要删除 Wispr Flow 自己的账号与听写历史目录。
