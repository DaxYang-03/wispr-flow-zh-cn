# Wispr Flow Chinese Patch for macOS

A native Mac menu-bar app with a single control. No Terminal commands or user-facing scripts.

[Download DMG](https://github.com/DaxYang-03/wispr-flow-zh-cn/releases/download/v0.2.0/Wispr-Flow-Chinese-v0.2.0.dmg) · [中文说明](README.md)

1. Open the DMG and drag **Wispr Flow 中文补丁** into Applications.
2. Open the app and click **开启中文** (Enable Chinese).
3. It gracefully quits the official Wispr Flow, enables the patch, reopens it in Chinese, then closes the initial setup process.

A menu-bar agent remains available and starts automatically at subsequent logins. Click its “中” icon to open a panel containing one enable/disable button. Switching automatically restarts an active Wispr Flow. The patch does not occupy the Dock, and the initial setup window does not reappear.

Requires the original signed Wispr Flow at `/Applications/Wispr Flow.app`, already signed in, and macOS 13.5+ plus the vendor app's own requirements. Both Apple Silicon and Intel runtimes are included; real Intel UI is not tested. The app is ad-hoc signed, not Developer ID signed or notarized, so macOS may block first launch.

The official app and its signature remain intact. Translations are kept outside it and reapplied at startup. Native macOS menus and some system prompts remain English, and major future vendor changes may require adaptation. The Node.js backend is internal to the app; users do not install or operate it.

[Installation/removal](docs/INSTALLATION.md) · [Troubleshooting](docs/TROUBLESHOOTING.md) · [Development](docs/DEVELOPMENT.md) · [Test boundaries](docs/TESTING.md) · [License](LICENSE)
