export interface WallpaperPreset {
  id: string;
  name: string;
  category: string;
  url: string;
  thumbnail: string;
}

export interface SolidColorPreset {
  id: string;
  name: string;
  hex: string;
}

export const WALLPAPER_PRESETS: WallpaperPreset[] = [
  {
    id: "aurora",
    name: "Aurora Night",
    category: "Atmospheric",
    url: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=2560&auto=format&fit=crop&q=85",
    thumbnail: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=400&auto=format&fit=crop&q=65",
  },
  {
    id: "deep-space",
    name: "Deep Space",
    category: "Cosmic",
    url: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=2560&auto=format&fit=crop&q=85",
    thumbnail: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=400&auto=format&fit=crop&q=65",
  },
  {
    id: "cyberpunk",
    name: "Neon Horizon",
    category: "Cyberpunk",
    url: "https://images.unsplash.com/photo-1514565131-fce0801e5785?w=2560&auto=format&fit=crop&q=85",
    thumbnail: "https://images.unsplash.com/photo-1514565131-fce0801e5785?w=400&auto=format&fit=crop&q=65",
  },
  {
    id: "forest",
    name: "Misty Pines",
    category: "Nature",
    url: "https://images.unsplash.com/photo-1511497584788-87676104235f?w=2560&auto=format&fit=crop&q=85",
    thumbnail: "https://images.unsplash.com/photo-1511497584788-87676104235f?w=400&auto=format&fit=crop&q=65",
  },
  {
    id: "studio-mesh",
    name: "Studio Waves",
    category: "Minimal",
    url: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=2560&auto=format&fit=crop&q=85",
    thumbnail: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=400&auto=format&fit=crop&q=65",
  },
  {
    id: "obsidian",
    name: "Dark Geometry",
    category: "Abstract",
    url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=2560&auto=format&fit=crop&q=85",
    thumbnail: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=65",
  },
];

export const SOLID_COLOR_PRESETS: SolidColorPreset[] = [
  { id: "#000000", name: "Pure OLED Black", hex: "#000000" },
  { id: "#070709", name: "Obsidian Void", hex: "#070709" },
  { id: "#0a0e17", name: "Midnight Navy", hex: "#0a0e17" },
  { id: "#111113", name: "Studio Charcoal", hex: "#111113" },
  { id: "#130a17", name: "Deep Amethyst", hex: "#130a17" },
  { id: "#071411", name: "Dark Emerald", hex: "#071411" },
];

export function getPresetUrl(presetId?: string): string {
  const match = WALLPAPER_PRESETS.find((p) => p.id === presetId);
  return match?.url || WALLPAPER_PRESETS[0].url;
}

export function getActiveWallpaperUrl(settings: {
  bgType?: string;
  bgCustomUrl?: string;
  bgPreset?: string;
}): string | null {
  if (settings.bgType === "custom" && settings.bgCustomUrl) {
    return settings.bgCustomUrl;
  }
  if (settings.bgType === "preset") {
    return getPresetUrl(settings.bgPreset);
  }
  return null;
}

/**
 * Optimizes an uploaded wallpaper image by resizing to max 2560x1440
 * and compressing to JPEG/WebP so it stays lightweight in localStorage.
 */
export async function optimizeWallpaperFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.onload = (e) => {
      const raw = e.target?.result;
      if (typeof raw !== "string") {
        return reject(new Error("Invalid image data"));
      }
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to decode image"));
      img.onload = () => {
        const maxW = 2560;
        const maxH = 1440;
        let w = img.width;
        let h = img.height;
        if (w > maxW || h > maxH) {
          const ratio = Math.min(maxW / w, maxH / h);
          w = Math.max(1, Math.round(w * ratio));
          h = Math.max(1, Math.round(h * ratio));
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return resolve(raw);
        }
        ctx.drawImage(img, 0, 0, w, h);
        try {
          const dataUrl = canvas.toDataURL("image/webp", 0.88);
          // If WebP is smaller than 2MB or supported, use it; else JPEG
          if (dataUrl.startsWith("data:image/webp")) {
            return resolve(dataUrl);
          }
          resolve(canvas.toDataURL("image/jpeg", 0.88));
        } catch {
          resolve(raw);
        }
      };
      img.src = raw;
    };
    reader.readAsDataURL(file);
  });
}
