import Link from "next/link";
import { Library, UploadCloud } from "lucide-react";
import { UploadTrackModal } from "@/components/UploadTrackModal";
import { Button } from "@/components/ui/button";

export default function UploadPage() {
  return (
    <main className="flex-1 overflow-y-auto px-4 py-5 md:px-7">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 pr-14">
          <p className="text-sm text-muted-foreground">Локальные аудиофайлы</p>
          <h1 className="text-4xl font-bold tracking-normal md:text-5xl">Загрузка</h1>
        </div>

        <div className="glass rounded-[2rem] p-6 md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <UploadCloud className="h-7 w-7" />
              </div>
              <h2 className="text-2xl font-semibold">Добавьте треки в медиатеку</h2>
              <p className="mt-2 text-muted-foreground">
                Поддерживаются mp3, m4a, wav и flac. После загрузки трек можно включить в медиатеке или добавить в очередь комнаты.
              </p>
            </div>
            <UploadTrackModal />
          </div>

          <div className="mt-8 grid gap-3 rounded-3xl border border-border/70 bg-foreground/[.03] p-4 sm:grid-cols-3">
            <div>
              <p className="font-semibold">Метаданные</p>
              <p className="mt-1 text-sm text-muted-foreground">Название, артист, альбом и длительность извлекаются автоматически.</p>
            </div>
            <div>
              <p className="font-semibold">Обложка</p>
              <p className="mt-1 text-sm text-muted-foreground">Если в файле есть cover art, он появится в плеере и медиатеке.</p>
            </div>
            <div>
              <p className="font-semibold">Очередь</p>
              <p className="mt-1 text-sm text-muted-foreground">Загруженный трек сразу доступен для комнат и синхронного плеера.</p>
            </div>
          </div>

          <Button asChild variant="glass" className="mt-6">
            <Link href="/app/library">
              <Library className="h-4 w-4" />
              Открыть медиатеку
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
