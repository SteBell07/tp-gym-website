// Small image helper used by process-gallery.sh. Uses macOS's built-in ImageIO,
// so nothing needs installing.
//
//   imagetool resize <input> <output.jpg> <longest-side> <quality 0-1>
//       Reads JPG/HEIC/PNG, applies the camera rotation, shrinks so the longest
//       side is at most <longest-side>, and saves a JPG with NO metadata
//       (no GPS/location, no camera info). Prints "<width> <height>".
//
//   imagetool similar <threshold> <file> <file> ...
//       Prints pairs of files that look like the same picture (even if saved
//       at different sizes/quality), one pair per line separated by a tab.

import Foundation
import ImageIO
import CoreGraphics
import UniformTypeIdentifiers

func fail(_ msg: String) -> Never {
    FileHandle.standardError.write((msg + "\n").data(using: .utf8)!)
    exit(1)
}

func loadImage(_ path: String, maxSide: Int) -> CGImage {
    let url = URL(fileURLWithPath: path)
    guard let src = CGImageSourceCreateWithURL(url as CFURL, nil) else { fail("Can't read \(path)") }

    // Never upscale: cap the target size at the image's own longest side
    var limit = maxSide
    if let props = CGImageSourceCopyPropertiesAtIndex(src, 0, nil) as? [CFString: Any],
       let w = props[kCGImagePropertyPixelWidth] as? Int,
       let h = props[kCGImagePropertyPixelHeight] as? Int {
        limit = min(maxSide, max(w, h))
    }

    let opts: [CFString: Any] = [
        kCGImageSourceCreateThumbnailFromImageAlways: true,
        kCGImageSourceCreateThumbnailWithTransform: true,   // apply EXIF rotation
        kCGImageSourceThumbnailMaxPixelSize: limit,
        kCGImageSourceShouldCacheImmediately: true,
    ]
    guard let img = CGImageSourceCreateThumbnailAtIndex(src, 0, opts as CFDictionary) else {
        fail("Can't decode \(path)")
    }
    return img
}

func resize(_ input: String, _ output: String, _ maxSide: Int, _ quality: Double) {
    let img = loadImage(input, maxSide: maxSide)
    let url = URL(fileURLWithPath: output)
    guard let dest = CGImageDestinationCreateWithURL(url as CFURL, UTType.jpeg.identifier as CFString, 1, nil) else {
        fail("Can't write \(output)")
    }
    // Only compression settings are passed in, so no EXIF/GPS is written out
    let props: [CFString: Any] = [kCGImageDestinationLossyCompressionQuality: quality]
    CGImageDestinationAddImage(dest, img, props as CFDictionary)
    guard CGImageDestinationFinalize(dest) else { fail("Can't save \(output)") }
    print("\(img.width) \(img.height)")
}

// 64-bit "difference hash": a tiny fingerprint of what the picture looks like
func dhash(_ path: String) -> UInt64 {
    let img = loadImage(path, maxSide: 256)
    let w = 9, h = 8
    var pixels = [UInt8](repeating: 0, count: w * h)
    let ctx = CGContext(data: &pixels, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w,
                        space: CGColorSpaceCreateDeviceGray(), bitmapInfo: CGImageAlphaInfo.none.rawValue)!
    ctx.interpolationQuality = .high
    ctx.draw(img, in: CGRect(x: 0, y: 0, width: w, height: h))
    var hash: UInt64 = 0
    for y in 0..<h {
        for x in 0..<(w - 1) {
            hash <<= 1
            if pixels[y * w + x] > pixels[y * w + x + 1] { hash |= 1 }
        }
    }
    return hash
}

let args = CommandLine.arguments
guard args.count >= 2 else { fail("usage: imagetool resize|similar ...") }

switch args[1] {
case "resize":
    guard args.count == 6, let side = Int(args[4]), let q = Double(args[5]) else {
        fail("usage: imagetool resize <in> <out.jpg> <longest-side> <quality>")
    }
    resize(args[2], args[3], side, q)

case "similar":
    guard args.count >= 4, let threshold = Int(args[2]) else {
        fail("usage: imagetool similar <threshold> <files...>")
    }
    let files = Array(args[3...])
    let hashes = files.map(dhash)
    for i in 0..<files.count {
        for j in (i + 1)..<files.count where (hashes[i] ^ hashes[j]).nonzeroBitCount <= threshold {
            print("\(files[i])\t\(files[j])")
        }
    }

default:
    fail("unknown command \(args[1])")
}
