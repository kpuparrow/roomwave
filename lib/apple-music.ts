import type { AppleMusicTrack } from "@/lib/types";

type AppleMusicApiSong = {
  id: string;
  attributes: {
    name: string;
    artistName: string;
    albumName?: string;
    durationInMillis?: number;
    artwork?: { url: string };
    previews?: { url: string }[];
  };
};

type ITunesSearchSong = {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName?: string;
  trackTimeMillis?: number;
  artworkUrl100?: string;
  previewUrl?: string;
};

export class AppleMusicService {
  private readonly token = process.env.APPLE_MUSIC_DEVELOPER_TOKEN;
  private readonly storefront = process.env.APPLE_MUSIC_STOREFRONT ?? "us";

  async searchTracks(query: string): Promise<AppleMusicTrack[]> {
    if (!query.trim()) return [];
    if (!this.token) return this.searchITunesPreviews(query);

    const url = new URL(`https://api.music.apple.com/v1/catalog/${this.storefront}/search`);
    url.searchParams.set("term", query);
    url.searchParams.set("types", "songs");
    url.searchParams.set("limit", "12");

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${this.token}` },
      next: { revalidate: 60 * 15 }
    });

    if (!response.ok) {
      throw new Error(`Apple Music search failed: ${response.status}`);
    }

    const payload = (await response.json()) as { results?: { songs?: { data?: AppleMusicApiSong[] } } };
    return (payload.results?.songs?.data ?? []).map((song) => this.toTrack(song));
  }

  private toTrack(song: AppleMusicApiSong): AppleMusicTrack {
    const artworkUrl = song.attributes.artwork?.url.replace("{w}", "600").replace("{h}", "600");
    return {
      appleMusicId: song.id,
      title: song.attributes.name,
      artist: song.attributes.artistName,
      album: song.attributes.albumName,
      durationMs: song.attributes.durationInMillis,
      coverUrl: artworkUrl,
      previewUrl: song.attributes.previews?.[0]?.url
    };
  }

  private async searchITunesPreviews(query: string): Promise<AppleMusicTrack[]> {
    const url = new URL("https://itunes.apple.com/search");
    url.searchParams.set("term", query);
    url.searchParams.set("media", "music");
    url.searchParams.set("entity", "song");
    url.searchParams.set("limit", "12");
    url.searchParams.set("country", this.storefront.toUpperCase());

    try {
      const response = await fetch(url, { next: { revalidate: 60 * 15 } });
      if (!response.ok) return this.mockSearch(query);
      const payload = (await response.json()) as { results?: ITunesSearchSong[] };
      const results = payload.results ?? [];
      if (!results.length) return this.mockSearch(query);

      return results.map((song) => ({
        appleMusicId: `itunes-${song.trackId}`,
        title: song.trackName,
        artist: song.artistName,
        album: song.collectionName,
        durationMs: song.trackTimeMillis,
        coverUrl: song.artworkUrl100?.replace("100x100bb", "600x600bb"),
        previewUrl: song.previewUrl
      }));
    } catch {
      return this.mockSearch(query);
    }
  }

  private mockSearch(query: string): AppleMusicTrack[] {
    // Fallback mode keeps local development useful without Apple Music credentials or network.
    return [
      {
        appleMusicId: `mock-${encodeURIComponent(query)}-1`,
        title: query,
        artist: "Apple Music preview",
        album: "Metadata fallback",
        durationMs: 30000,
        coverUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/78/da/66/78da662f-6b58-4d87-2a11-39f6608b758d/23UMGIM49755.rgb.jpg/600x600bb.jpg"
      }
    ];
  }
}
