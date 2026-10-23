export type CropRectangle = { x: number; y: number; width: number; height: number };

export function cropRectangle(width: number, height: number, ratio: number, zoom: number, x: number, y: number): CropRectangle {
    const cropWidth = Math.min(width, height * ratio) / Math.max(1, zoom);
    const cropHeight = Math.min(height, cropWidth / ratio);
    const clamp = (value: number) => Math.max(0, Math.min(1, value));
    return {
        x: (width - cropWidth) * clamp(x),
        y: (height - cropHeight) * clamp(y),
        width: cropWidth,
        height: cropHeight,
    };
}
