# 其他安装方式和工具

普通安装只需要 [首页的下载和双击步骤](../README.md#快速安装)。安装完成会自动打开中文版，无需再运行启动工具。

## 使用终端安装

先完全退出 Wispr Flow，将下面四行一起粘贴进系统自带的“终端”，再按回车：

```bash
wispr_installer="$(mktemp -t wispr-flow-zh-cn)"
curl -fLSs https://github.com/DaxYang-03/wispr-flow-zh-cn/releases/download/v0.1.1/install.sh -o "$wispr_installer"
bash "$wispr_installer"
rm -f "$wispr_installer"
```

脚本会下载固定的 v0.1.1 安装包、校验 ZIP、安装并自动打开中文版。不会要求第二次运行启动文件。无需 Node、Homebrew 或开发工具，不要使用 sudo。

## 安装包里的文件

| 文件 | 用途 |
| --- | --- |
| 安装中文补丁.command | 安装补丁，并自动打开中文版 |
| 打开中文版.command | 以后手动打开时可用；安装过程不需要再点击 |
| 检查安装状态.command | 显示安装与最近一次启动记录 |
| 恢复英文原版.command | 退出应用后运行，关闭汉化和登录启动项 |

不要把单个文件移出安装包文件夹后运行，它需要旁边的运行环境和补丁文件。

## 完全卸载

完全退出应用，运行“恢复英文原版.command”后，可以把下面的文件夹移到废纸篓：

```text
~/Library/Application Support/Wispr Flow 中文助手/
```

如果下载的安装包已经删除，也可以在终端停用助手：

```bash
"$HOME/Library/Application Support/Wispr Flow 中文助手/node" \
  "$HOME/Library/Application Support/Wispr Flow 中文助手/manager.mjs" disable
```

## 更新补丁本身

先退出应用，再下载安装新版并运行安装文件。新安装包会更新配套词库，自定义修改请先备份。Wispr Flow 官方应用自己的更新不会覆盖助手词库。
