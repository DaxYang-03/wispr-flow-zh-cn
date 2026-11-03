import AppKit
import SwiftUI

@main
struct MenuApplication: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) private var delegate
    var body: some Scene {
        MenuBarExtra("中") {
            PatchControl(delegate: delegate)
                .frame(width: 290, height: 210)
        }
        .menuBarExtraStyle(.window)
    }
}

private struct PatchControl: NSViewRepresentable {
    let delegate: AppDelegate
    func makeNSView(context: Context) -> NSView { delegate.configurationView() }
    func updateNSView(_ nsView: NSView, context: Context) {}
}
