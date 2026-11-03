import AppKit

private let appName = "Wispr Flow 中文补丁"
private let appIdentifier = "local.wispr-flow.chinese-patch"
private let menuIdentifier = "local.wispr-flow.chinese-patch.menu"
private let currentVersion = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "0.2.0"

private struct PatchPreferences: Decodable {
    var onboardingCompleted: Bool = false
    var enabled: Bool = false
    var version: String? = nil
}

#if !MENU_SWIFTUI
@main
#endif
final class AppDelegate: NSObject, NSApplicationDelegate, NSWindowDelegate {
    private var window: NSWindow?
    private var heading: NSTextField?
    private var detail: NSTextField?
    private var actionButton: NSButton?
    private var spinner: NSProgressIndicator?
    private var operation: Process?
    private var onboarding = false
    private var busy = false
    private var enabled = false

    static func main() {
        let application = NSApplication.shared
        let delegate = AppDelegate()
        application.delegate = delegate
        // LSUIElement handles the Dock policy; changing it before run() can hide status items on macOS 27.
        application.run()
        withExtendedLifetime(delegate) {}
    }

    private var preferencesURL: URL {
        FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent("Library/Application Support/Wispr Flow 中文助手/gui-state.json")
    }
    private func preferences() -> PatchPreferences {
        guard let data = try? Data(contentsOf: preferencesURL), let value = try? JSONDecoder().decode(PatchPreferences.self, from: data) else { return PatchPreferences() }
        return value
    }
    func applicationDidFinishLaunching(_ notification: Notification) {
        let value = preferences()
        enabled = value.enabled
        #if MENU_SWIFTUI
        return
        #else
        if value.onboardingCompleted && value.version == currentVersion {
            let others = NSRunningApplication.runningApplications(withBundleIdentifier: menuIdentifier).filter { $0.processIdentifier != ProcessInfo.processInfo.processIdentifier }
            if !others.isEmpty {
                NSApp.terminate(nil)
            } else {
                let helper = Bundle.main.bundleURL.appendingPathComponent("Contents/Library/LoginItems/Wispr Flow 中文补丁菜单栏.app")
                let configuration = NSWorkspace.OpenConfiguration()
                configuration.activates = false
                NSWorkspace.shared.openApplication(at: helper, configuration: configuration) { _, _ in DispatchQueue.main.async { NSApp.terminate(nil) } }
            }
            return
        }
        onboarding = true
        makeFirstWindow()
        #endif
    }
    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
        if onboarding { window?.makeKeyAndOrderFront(nil); NSApp.activate(ignoringOtherApps: true) }
        return false
    }
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { onboarding && !busy }
    func applicationShouldTerminate(_ sender: NSApplication) -> NSApplication.TerminateReply { busy ? .terminateCancel : .terminateNow }
    func windowShouldClose(_ sender: NSWindow) -> Bool { !busy }

    private func label(_ text: String, size: CGFloat, weight: NSFont.Weight, color: NSColor = .labelColor) -> NSTextField {
        let field = NSTextField(wrappingLabelWithString: text)
        field.font = .systemFont(ofSize: size, weight: weight)
        field.textColor = color
        field.alignment = .center
        field.maximumNumberOfLines = 5
        field.translatesAutoresizingMaskIntoConstraints = false
        return field
    }
    private func panel(first: Bool) -> NSView {
        let view = NSView()
        let title = label(first ? "让 Flow 用中文显示" : "中文模式", size: first ? 22 : 17, weight: .semibold)
        let subtitle = label(first ? "开启时会自动重启 Wispr Flow。" : (enabled ? "已开启 · 以后自动生效" : "已关闭 · 使用官方界面"), size: 13, weight: .regular, color: .secondaryLabelColor)
        let button = NSButton(title: first ? "开启中文" : (enabled ? "关闭中文" : "开启中文"), target: self, action: #selector(toggleChinese))
        button.bezelStyle = .rounded
        button.controlSize = .large
        button.font = .systemFont(ofSize: 14, weight: .semibold)
        button.keyEquivalent = "\r"
        button.translatesAutoresizingMaskIntoConstraints = false
        button.setAccessibilityLabel(button.title)
        let indicator = NSProgressIndicator()
        indicator.style = .spinning
        indicator.controlSize = .small
        indicator.isDisplayedWhenStopped = false
        indicator.translatesAutoresizingMaskIntoConstraints = false
        for item in [title, subtitle, button, indicator] { view.addSubview(item) }
        let top: CGFloat = first ? 46 : 24
        NSLayoutConstraint.activate([
            title.topAnchor.constraint(equalTo: view.topAnchor, constant: top),
            title.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 26),
            title.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -26),
            subtitle.topAnchor.constraint(equalTo: title.bottomAnchor, constant: 12),
            subtitle.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 26),
            subtitle.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -26),
            button.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: first ? 72 : 24),
            button.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: first ? -72 : -24),
            button.bottomAnchor.constraint(equalTo: view.bottomAnchor, constant: first ? -37 : -24),
            button.heightAnchor.constraint(equalToConstant: 36),
            subtitle.bottomAnchor.constraint(lessThanOrEqualTo: button.topAnchor, constant: -18),
            indicator.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            indicator.bottomAnchor.constraint(equalTo: button.topAnchor, constant: -7)
        ])
        heading = title; detail = subtitle; actionButton = button; spinner = indicator
        return view
    }
    private func makeFirstWindow() {
        let first = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 400, height: 250), styleMask: [.titled, .closable], backing: .buffered, defer: false)
        first.title = appName
        first.titlebarAppearsTransparent = true
        first.isReleasedWhenClosed = false
        first.delegate = self
        first.contentView = panel(first: true)
        first.center()
        first.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
        window = first
    }
    func configurationView() -> NSView {
        enabled = preferences().enabled
        let content = panel(first: false)
        content.frame = NSRect(x: 0, y: 0, width: 290, height: 210)
        setBusy(busy)
        if busy { detail?.stringValue = "正在切换，请稍等……" }
        return content
    }
    private func refreshState() {
        enabled = preferences().enabled
        guard !busy else { return }
        if !onboarding {
            detail?.stringValue = enabled ? "已开启 · 以后自动生效" : "已关闭 · 使用官方界面"
            actionButton?.title = enabled ? "关闭中文" : "开启中文"
            actionButton?.setAccessibilityLabel(actionButton?.title)
        }
    }
    private func setBusy(_ value: Bool) {
        busy = value
        actionButton?.isEnabled = !value
        window?.standardWindowButton(.closeButton)?.isEnabled = !value
        if value { spinner?.startAnimation(nil) } else { spinner?.stopAnimation(nil) }
    }
    private func installLocation() throws -> URL {
        var current = Bundle.main.bundleURL.resolvingSymlinksInPath()
        if Bundle.main.bundleIdentifier == menuIdentifier {
            for _ in 0..<4 { current.deleteLastPathComponent() }
        }
        let userApps = FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent("Applications")
        let candidates = [URL(fileURLWithPath: "/Applications"), userApps]
        if candidates.contains(where: { current.deletingLastPathComponent().path == $0.path }) { return current }
        let directory = FileManager.default.isWritableFile(atPath: "/Applications") ? URL(fileURLWithPath: "/Applications") : userApps
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        let destination = directory.appendingPathComponent(appName + ".app")
        if FileManager.default.fileExists(atPath: destination.path) {
            let installedVersion = Bundle(url: destination)?.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String
            if installedVersion == currentVersion { return destination }
            throw NSError(domain: appIdentifier, code: 1, userInfo: [NSLocalizedDescriptionKey: "请将新版应用拖入“应用程序”并替换旧版，再重新打开。"])
        }
        let staging = directory.appendingPathComponent("." + appName + "-install.app")
        if FileManager.default.fileExists(atPath: staging.path) { try FileManager.default.removeItem(at: staging) }
        try FileManager.default.copyItem(at: current, to: staging)
        try FileManager.default.moveItem(at: staging, to: destination)
        return destination
    }
    @objc private func toggleChinese() {
        guard !busy else { return }
        let turnOn = onboarding || !enabled
        setBusy(true)
        detail?.stringValue = turnOn ? "正在开启中文，请稍等……" : "正在关闭中文，请稍等……"
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            guard let self else { return }
            do {
                let installed = try self.installLocation()
                DispatchQueue.main.async { self.startOperation(turnOn: turnOn, application: installed) }
            } catch {
                DispatchQueue.main.async { self.finish(error: error.localizedDescription) }
            }
        }
    }
    private func startOperation(turnOn: Bool, application: URL) {
        let resources = application.appendingPathComponent("Contents/Resources")
        #if arch(arm64)
        let architecture = "darwin-arm64"
        #else
        let architecture = "darwin-x64"
        #endif
        let process = Process()
        process.executableURL = resources.appendingPathComponent("runtime/" + architecture + "/node")
        process.arguments = [resources.appendingPathComponent("backend/manager.mjs").path, turnOn ? "gui-enable" : "gui-disable", "--ui-app", application.path, "--ui-version", currentVersion]
        let output = Pipe(), errors = Pipe()
        process.standardOutput = output
        process.standardError = errors
        process.terminationHandler = { [weak self] completed in
            let errorData = errors.fileHandleForReading.readDataToEndOfFile()
            _ = output.fileHandleForReading.readDataToEndOfFile()
            let message = String(data: errorData, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
            DispatchQueue.main.async {
                guard let self else { return }
                self.operation = nil
                if completed.terminationStatus != 0 { self.finish(error: message.isEmpty ? "未能完成切换，请稍后重试。" : message.replacingOccurrences(of: "操作未完成：", with: "")); return }
                self.enabled = turnOn
                self.setBusy(false)
                if self.onboarding {
                    self.detail?.stringValue = "中文已开启，以后自动生效。"
                    self.window?.orderOut(nil)
                    NSApp.terminate(nil)
                } else { self.refreshState() }
            }
        }
        operation = process
        do { try process.run() } catch { operation = nil; finish(error: error.localizedDescription) }
    }
    private func finish(error: String) {
        setBusy(false)
        detail?.stringValue = error
        if onboarding { actionButton?.title = "重试" } else { actionButton?.title = enabled ? "关闭中文" : "开启中文" }
        actionButton?.setAccessibilityLabel(actionButton?.title)
    }
}
