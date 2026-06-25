import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RoomWave",
    short_name: "RoomWave",
    description: "Музыкальные комнаты для синхронного прослушивания.",
    start_url: "/app",
    display: "standalone",
    background_color: "#0f0f13",
    theme_color: "#f63d68",
    icons: [
      {
        src: "/roomwave.svg",
        sizes: "192x192",
        type: "image/svg+xml"
      }
    ]
  };
}
