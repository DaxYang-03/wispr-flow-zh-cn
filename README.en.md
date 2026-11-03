# Wispr Flow Chinese UI Companion for macOS

Unofficial Simplified Chinese interface overlay for the original Wispr Flow app. The release ZIP includes its own Node.js runtime for Apple Silicon and Intel, so end users do not need developer tools.

**[中文完整说明](README.md) · [Download](https://github.com/DaxYang-03/wispr-flow-zh-cn/releases/latest)**

## Install

1. Use macOS 13.5 or newer. Install the official app at `/Applications/Wispr Flow.app`, sign in, and grant the permissions required by the official app. Quit it fully.
2. Download `Wispr-Flow-Chinese-v0.1.0-macOS.zip` from Releases (not the automatic source-code archive), then extract it.
3. Run `安装中文补丁.command` to install, then `打开中文版.command` to launch. Afterwards the original application icon works normally.

Alternatively, download the pinned [install script](https://github.com/DaxYang-03/wispr-flow-zh-cn/releases/download/v0.1.0/install.sh) and run it in Terminal. It downloads the ZIP, verifies its SHA-256 checksum, installs for the current user and launches the app. Never use sudo.

The custom launch shim is not Developer ID signed or notarized. Browser-downloaded bundles may be blocked by Gatekeeper; do not disable system security. The Chinese README documents the Terminal installation path and links to Apple's official guidance.

## What it does

- Keeps the official application and its signature intact; modifies only in-memory i18next display resources.
- Stores 7,264 translation records outside the app and reuses them after a new application start. Known keys and unambiguous matching English source strings are supported; new strings remain English.
- Uses a private debugging pipe rather than an exposed network debugging port.
- Detaches renderer debugging sessions after loading; no permanent resource-store observer.
- Uses an Interactive launch service to avoid background scheduling throttling and preserves the official app's privacy attribution.

## Limits and verification

Native macOS menus and main-process system messages may remain English. Tested with Wispr Flow 1.6.1337 on Apple Silicon / macOS 27.0. Intel binaries are included but have not been tested with the real UI. Replacing the application bundle with the same official version was tested; arbitrary future versions are not guaranteed compatible. A full renderer reload may need a full application restart to reapply translations. Starting via the original icon can cause one brief relaunch; wait a few seconds before recording.

## Disable

Quit Wispr Flow, then run `恢复英文原版.command`. It removes the login service and preserves the translation files. Restarting the official app restores its original UI. To fully remove the helper, move `~/Library/Application Support/Wispr Flow 中文助手/` to Trash after disabling it.

See [development](docs/DEVELOPMENT.md), [testing](docs/TESTING.md), [MIT license](LICENSE), and [third-party notices](THIRD_PARTY_NOTICES.md).
