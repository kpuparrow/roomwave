import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

export type StorageBucket = "tracks" | "covers" | "avatars" | "lyrics";

export type StoredObject = {
  publicUrl: string;
  storageKey: string;
};

export async function saveStorageObject(bucket: StorageBucket, filename: string, data: Buffer | Uint8Array): Promise<StoredObject> {
  const storageKey = `${bucket}/${filename}`;

  if (hasS3Config()) {
    const client = createS3Client();
    await client.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET!,
        Key: storageKey,
        Body: data
      })
    );

    return {
      publicUrl: buildS3PublicUrl(storageKey),
      storageKey
    };
  }

  const uploadRoot = getLocalUploadRoot();
  const directory = path.join(uploadRoot, bucket);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, filename), data);

  return {
    publicUrl: `/api/uploads/${bucket}/${filename}`,
    storageKey
  };
}

export async function deleteStorageObjectByPublicUrl(publicUrl: string | null | undefined) {
  if (!publicUrl) return;
  if (hasS3Config()) {
    const key = publicUrl.includes("/uploads/") ? publicUrl.replace(/^.*\/uploads\//, "") : publicUrl.split("/").slice(-2).join("/");
    await createS3Client().send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET!, Key: key })).catch(() => undefined);
    return;
  }
  if (!publicUrl.startsWith("/uploads/") && !publicUrl.startsWith("/api/uploads/")) return;

  const uploadRoot = getLocalUploadRoot();
  const relativeKey = publicUrl.replace(/^\/api\/uploads\//, "").replace(/^\/uploads\//, "");
  const target = path.resolve(uploadRoot, relativeKey);
  if (!target.startsWith(uploadRoot)) return;
  await rm(target, { force: true });
}

export function getLocalUploadRoot() {
  return path.resolve(process.env.UPLOADS_DIR || path.join(process.cwd(), "public", "uploads"));
}

function hasS3Config() {
  return Boolean(process.env.S3_BUCKET && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY);
}

function createS3Client() {
  return new S3Client({
    endpoint: process.env.S3_ENDPOINT || undefined,
    region: process.env.S3_REGION || "auto",
    forcePathStyle: Boolean(process.env.S3_FORCE_PATH_STYLE ?? process.env.S3_ENDPOINT),
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!
    }
  });
}

function buildS3PublicUrl(key: string) {
  if (process.env.S3_PUBLIC_URL) return `${process.env.S3_PUBLIC_URL.replace(/\/$/, "")}/${key}`;
  if (process.env.S3_ENDPOINT) return `${process.env.S3_ENDPOINT.replace(/\/$/, "")}/${process.env.S3_BUCKET}/${key}`;
  return `https://${process.env.S3_BUCKET}.s3.${process.env.S3_REGION || "us-east-1"}.amazonaws.com/${key}`;
}
