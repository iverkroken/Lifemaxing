using System.Buffers.Binary;

namespace Lifemaxing.Api.Features.Areas;

// Validate the complete container, not just magic bytes. Images are served as
// private raster files; this deliberately does not decode/re-encode pixel data.
public static class AreaImageValidation
{
    public static string? ContentType(ReadOnlySpan<byte> bytes)
    {
        if (bytes.StartsWith(new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 }))
            return Png(bytes) ? "image/png" : null;
        if (bytes.StartsWith(new byte[] { 255, 216, 255 }))
            return Jpeg(bytes) ? "image/jpeg" : null;
        if (bytes.Length >= 12 && bytes[..4].SequenceEqual("RIFF"u8) && bytes.Slice(8, 4).SequenceEqual("WEBP"u8))
            return Webp(bytes) ? "image/webp" : null;
        return null;
    }

    private static bool Png(ReadOnlySpan<byte> bytes)
    {
        var data = false;
        for (var offset = 8; offset <= bytes.Length - 12;)
        {
            var length = BinaryPrimitives.ReadUInt32BigEndian(bytes.Slice(offset, 4));
            if (length > bytes.Length - offset - 12) return false;
            var type = bytes.Slice(offset + 4, 4);
            if (offset == 8 && (!type.SequenceEqual("IHDR"u8) || length != 13 ||
                !Dimensions(BinaryPrimitives.ReadUInt32BigEndian(bytes.Slice(offset + 8, 4)),
                    BinaryPrimitives.ReadUInt32BigEndian(bytes.Slice(offset + 12, 4))))) return false;
            if (type.SequenceEqual("IDAT"u8) && length > 0) data = true;
            offset += (int)length + 12;
            if (type.SequenceEqual("IEND"u8)) return data && length == 0 && offset == bytes.Length;
        }
        return false;
    }

    private static bool Jpeg(ReadOnlySpan<byte> bytes)
    {
        var frame = false;
        var scan = false;
        var offset = 2;
        while (offset < bytes.Length)
        {
            if (bytes[offset++] != 255) return false;
            while (offset < bytes.Length && bytes[offset] == 255) offset++;
            if (offset >= bytes.Length) return false;
            var marker = bytes[offset++];
            if (marker == 217) return frame && scan && offset == bytes.Length;
            if (offset > bytes.Length - 2) return false;
            var length = BinaryPrimitives.ReadUInt16BigEndian(bytes.Slice(offset, 2));
            if (length < 2 || length > bytes.Length - offset) return false;
            if (marker is >= 192 and <= 207 && marker is not (196 or 200 or 204))
            {
                if (length < 8 || !Dimensions(BinaryPrimitives.ReadUInt16BigEndian(bytes.Slice(offset + 5, 2)),
                        BinaryPrimitives.ReadUInt16BigEndian(bytes.Slice(offset + 3, 2)))) return false;
                frame = true;
            }
            offset += length;
            if (marker != 218) continue;
            scan = true;
            // Skip entropy-coded bytes, including escaped FF and restart markers.
            while (offset < bytes.Length - 1)
            {
                if (bytes[offset] != 255) { offset++; continue; }
                if (bytes[offset + 1] == 0 || bytes[offset + 1] is >= 208 and <= 215) { offset += 2; continue; }
                break;
            }
        }
        return false;
    }

    private static bool Webp(ReadOnlySpan<byte> bytes)
    {
        if (BinaryPrimitives.ReadUInt32LittleEndian(bytes.Slice(4, 4)) != bytes.Length - 8) return false;
        var image = false;
        var offset = 12;
        while (offset <= bytes.Length - 8)
        {
            var type = bytes.Slice(offset, 4);
            var length = BinaryPrimitives.ReadUInt32LittleEndian(bytes.Slice(offset + 4, 4));
            if (length > bytes.Length - offset - 8) return false;
            var payload = bytes.Slice(offset + 8, (int)length);
            if (type.SequenceEqual("VP8 "u8))
            {
                if (length < 10 || !payload.Slice(3, 3).SequenceEqual(new byte[] { 157, 1, 42 }) ||
                    !Dimensions((uint)(BinaryPrimitives.ReadUInt16LittleEndian(payload.Slice(6, 2)) & 16383),
                        (uint)(BinaryPrimitives.ReadUInt16LittleEndian(payload.Slice(8, 2)) & 16383))) return false;
                image = true;
            }
            if (type.SequenceEqual("VP8L"u8))
            {
                if (length < 5 || payload[0] != 47) return false;
                image = true;
            }
            if (type.SequenceEqual("ANMF"u8) && length > 16) image = true;
            offset += 8 + (int)length + (int)(length % 2);
        }
        return image && offset == bytes.Length;
    }

    private static bool Dimensions(uint width, uint height) => width > 0 && height > 0;
}
