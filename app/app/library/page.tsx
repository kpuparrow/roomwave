import { LibraryClient } from "./library-client";
import { getCurrentUser } from "@/lib/auth/session";
import { toTrackDTO } from "@/lib/mappers";
import { prisma } from "@/lib/prisma";

export default async function LibraryPage() {
  const user = await getCurrentUser();
  const tracks = user
    ? await prisma.track.findMany({
        where: { uploadedById: user.id },
        orderBy: { createdAt: "desc" }
      })
    : [];
  const favoriteIds = user
    ? await prisma.favoriteTrack.findMany({
        where: { userId: user.id },
        select: { trackId: true }
      })
    : [];
  const playlists = user
    ? await prisma.playlist.findMany({
        where: { userId: user.id },
        include: { _count: { select: { tracks: true } } },
        orderBy: { updatedAt: "desc" }
      })
    : [];

  return (
    <LibraryClient
      tracks={tracks.map(toTrackDTO)}
      favoriteTrackIds={favoriteIds.map((favorite) => favorite.trackId)}
      playlists={playlists.map((playlist) => ({
        id: playlist.id,
        name: playlist.name,
        description: playlist.description,
        coverUrl: playlist.coverUrl,
        isPublic: playlist.isPublic,
        trackCount: playlist._count.tracks
      }))}
    />
  );
}
