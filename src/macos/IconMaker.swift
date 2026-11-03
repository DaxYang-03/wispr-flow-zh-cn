import AppKit
let output = URL(fileURLWithPath: CommandLine.arguments[1])
try FileManager.default.createDirectory(at: output, withIntermediateDirectories: true)
for points in [16, 32, 128, 256, 512] {
    for scale in [1, 2] {
        let side = points * scale
        let image = NSImage(size: NSSize(width: side, height: side))
        image.lockFocus()
        let inset = CGFloat(side) * 0.06
        let square = NSRect(x: inset, y: inset, width: CGFloat(side) - inset * 2, height: CGFloat(side) - inset * 2)
        NSColor(srgbRed: 0.12, green: 0.38, blue: 0.91, alpha: 1).setFill()
        NSBezierPath(roundedRect: square, xRadius: CGFloat(side) * 0.205, yRadius: CGFloat(side) * 0.205).fill()
        let font = NSFont.systemFont(ofSize: CGFloat(side) * 0.58, weight: .medium)
        let text = NSString(string: "中")
        let attributes: [NSAttributedString.Key: Any] = [.font: font, .foregroundColor: NSColor.white]
        let size = text.size(withAttributes: attributes)
        text.draw(at: NSPoint(x: (CGFloat(side) - size.width) / 2, y: (CGFloat(side) - size.height) / 2 + CGFloat(side) * 0.015), withAttributes: attributes)
        image.unlockFocus()
        guard let data = image.tiffRepresentation, let bitmap = NSBitmapImageRep(data: data), let png = bitmap.representation(using: .png, properties: [:]) else { fatalError("Unable to render icon") }
        let name = "icon_\(points)x\(points)" + (scale == 2 ? "@2x" : "") + ".png"
        try png.write(to: output.appendingPathComponent(name))
    }
}
