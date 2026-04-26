import AppKit
import Foundation

let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let outputURL = root.appendingPathComponent("screenshots/google-play/feature-graphic.png")
let assetsURL = root.appendingPathComponent("frontend/assets/images")
let roomScreenshotURL = root.appendingPathComponent("screenshots/android1080x2400/room-view.png")

let canvasSize = NSSize(width: 1024, height: 500)

func image(_ relativePath: String) -> NSImage {
  let url = root.appendingPathComponent(relativePath)
  guard let image = NSImage(contentsOf: url) else {
    fatalError("Missing image: \(url.path)")
  }
  return image
}

func asset(_ name: String) -> NSImage {
  let url = assetsURL.appendingPathComponent(name)
  guard let image = NSImage(contentsOf: url) else {
    fatalError("Missing asset: \(url.path)")
  }
  return image
}

func appColor(_ hex: UInt32, alpha: CGFloat = 1) -> NSColor {
  let r = CGFloat((hex >> 16) & 0xff) / 255
  let g = CGFloat((hex >> 8) & 0xff) / 255
  let b = CGFloat(hex & 0xff) / 255
  return NSColor(calibratedRed: r, green: g, blue: b, alpha: alpha)
}

func drawText(_ text: String, at point: NSPoint, font: NSFont, color textColor: NSColor, shadow: Bool = false) {
  let paragraph = NSMutableParagraphStyle()
  paragraph.alignment = .left

  let attributed = NSMutableAttributedString(string: text, attributes: [
    .font: font,
    .foregroundColor: textColor,
    .paragraphStyle: paragraph,
  ])

  if shadow {
    let textShadow = NSShadow()
    textShadow.shadowColor = appColor(0x241814, alpha: 0.45)
    textShadow.shadowBlurRadius = 5
    textShadow.shadowOffset = NSSize(width: 0, height: -2)
    attributed.addAttribute(.shadow, value: textShadow, range: NSRange(location: 0, length: attributed.length))
  }

  attributed.draw(at: point)
}

func roundedRect(_ rect: NSRect, radius: CGFloat, fill: NSColor, stroke: NSColor? = nil, lineWidth: CGFloat = 1) {
  let path = NSBezierPath(roundedRect: rect, xRadius: radius, yRadius: radius)
  fill.setFill()
  path.fill()
  if let stroke {
    stroke.setStroke()
    path.lineWidth = lineWidth
    path.stroke()
  }
}

func drawImage(_ image: NSImage, in rect: NSRect, alpha: CGFloat = 1) {
  image.draw(in: rect, from: .zero, operation: .sourceOver, fraction: alpha)
}

func drawCircleImage(_ image: NSImage, center: NSPoint, diameter: CGFloat, ring: NSColor) {
  let rect = NSRect(x: center.x - diameter / 2, y: center.y - diameter / 2, width: diameter, height: diameter)
  let ringPath = NSBezierPath(ovalIn: rect.insetBy(dx: -7, dy: -7))
  ring.setFill()
  ringPath.fill()

  NSGraphicsContext.current?.saveGraphicsState()
  NSBezierPath(ovalIn: rect).addClip()
  drawImage(image, in: rect)
  NSGraphicsContext.current?.restoreGraphicsState()
}

func drawPhoneMockup(roomScreenshot: NSImage) {
  let shadow = NSShadow()
  shadow.shadowColor = appColor(0x140b08, alpha: 0.42)
  shadow.shadowBlurRadius = 22
  shadow.shadowOffset = NSSize(width: 0, height: -8)

  let phoneRect = NSRect(x: 648, y: 35, width: 245, height: 435)
  NSGraphicsContext.current?.saveGraphicsState()
  shadow.set()
  roundedRect(phoneRect, radius: 35, fill: appColor(0x1d1717), stroke: appColor(0xefe2a0, alpha: 0.32), lineWidth: 2)
  NSGraphicsContext.current?.restoreGraphicsState()

  roundedRect(phoneRect, radius: 35, fill: appColor(0x191313), stroke: appColor(0xf6dd76, alpha: 0.42), lineWidth: 2)

  let screenRect = NSRect(x: phoneRect.minX + 13, y: phoneRect.minY + 15, width: phoneRect.width - 26, height: phoneRect.height - 30)
  NSGraphicsContext.current?.saveGraphicsState()
  NSBezierPath(roundedRect: screenRect, xRadius: 24, yRadius: 24).addClip()

  let source = NSRect(x: 0, y: 430, width: 1080, height: 1520)
  roomScreenshot.draw(in: screenRect, from: source, operation: .sourceOver, fraction: 1)

  NSGraphicsContext.current?.restoreGraphicsState()
}

func drawCharacterChip(name: String, avatar: NSImage, origin: NSPoint, accent: NSColor) {
  let rect = NSRect(x: origin.x, y: origin.y, width: 275, height: 72)
  roundedRect(rect, radius: 22, fill: appColor(0x6b4a3c, alpha: 0.94), stroke: appColor(0xf5e08a, alpha: 0.28), lineWidth: 1.5)
  drawCircleImage(avatar, center: NSPoint(x: origin.x + 42, y: origin.y + 36), diameter: 52, ring: accent)
  drawText(name, at: NSPoint(x: origin.x + 83, y: origin.y + 36), font: .boldSystemFont(ofSize: 24), color: appColor(0xf8ecb4), shadow: true)
  drawText("room character", at: NSPoint(x: origin.x + 84, y: origin.y + 16), font: .systemFont(ofSize: 13, weight: .medium), color: appColor(0xf3d96a, alpha: 0.86))
}

try FileManager.default.createDirectory(at: outputURL.deletingLastPathComponent(), withIntermediateDirectories: true)

let colorSpace = CGColorSpaceCreateDeviceRGB()
guard let cgContext = CGContext(
  data: nil,
  width: Int(canvasSize.width),
  height: Int(canvasSize.height),
  bitsPerComponent: 8,
  bytesPerRow: 0,
  space: colorSpace,
  bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue
) else {
  fatalError("Failed to create bitmap context")
}

NSGraphicsContext.saveGraphicsState()
let bitmapContext = NSGraphicsContext(cgContext: cgContext, flipped: false)
bitmapContext.shouldAntialias = true
NSGraphicsContext.current = bitmapContext

let background = NSGradient(colors: [
  appColor(0x2f2524),
  appColor(0x463433),
  appColor(0x8f604d),
])!
background.draw(in: NSRect(origin: .zero, size: canvasSize), angle: 0)

roundedRect(NSRect(x: -42, y: 335, width: 360, height: 205), radius: 52, fill: appColor(0x1d1715, alpha: 0.25))
roundedRect(NSRect(x: 732, y: -56, width: 360, height: 205), radius: 52, fill: appColor(0xf5d86f, alpha: 0.12))

drawCircleImage(asset("avatar-7.png"), center: NSPoint(x: 526, y: 402), diameter: 54, ring: appColor(0xf3dc70, alpha: 0.8))
drawCircleImage(asset("avatar-10.png"), center: NSPoint(x: 583, y: 62), diameter: 62, ring: appColor(0x7467df, alpha: 0.78))
drawCircleImage(asset("munchkin-cat.png"), center: NSPoint(x: 926, y: 88), diameter: 168, ring: appColor(0xf3dc70, alpha: 0.82))

drawText("Munch", at: NSPoint(x: 72, y: 312), font: .boldSystemFont(ofSize: 78), color: appColor(0xffffff), shadow: true)
drawText("Helper", at: NSPoint(x: 72, y: 236), font: .boldSystemFont(ofSize: 78), color: appColor(0xf3dc70), shadow: true)
drawText("Track your party. Share the room.", at: NSPoint(x: 78, y: 204), font: .systemFont(ofSize: 24, weight: .semibold), color: appColor(0xfff0c4))

roundedRect(NSRect(x: 75, y: 159, width: 382, height: 36), radius: 18, fill: appColor(0x7467df, alpha: 0.92))
drawText("Fast shared character tracking", at: NSPoint(x: 99, y: 167), font: .boldSystemFont(ofSize: 16), color: appColor(0xffffff))

drawCharacterChip(name: "Rune Rider", avatar: asset("avatar-1.png"), origin: NSPoint(x: 76, y: 72), accent: appColor(0xc95b4f))
drawCharacterChip(name: "Bardic Bryn", avatar: asset("avatar-4.png"), origin: NSPoint(x: 376, y: 72), accent: appColor(0x4d7bd8))

drawPhoneMockup(roomScreenshot: image("screenshots/android1080x2400/room-view.png"))

NSGraphicsContext.restoreGraphicsState()

guard let renderedImage = cgContext.makeImage() else {
  fatalError("Failed to render image")
}

let bitmap = NSBitmapImageRep(cgImage: renderedImage)
guard let png = bitmap.representation(using: .png, properties: [:]) else {
  fatalError("Failed to encode PNG")
}
try png.write(to: outputURL)
print(outputURL.path)
