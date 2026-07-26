const encoder = new TextEncoder();

type OssConfig = {
  accessKeyId: string;
  accessKeySecret: string;
  bucket: string;
  endpoint: string;
  publicBaseUrl: string;
  prefix: string;
  maxUploadBytes: number;
};

function normalizedUrl(value: string) {
  return value.replace(/\/+$/u, "");
}

function getOssConfig(): OssConfig | null {
  const accessKeyId = process.env.OSS_ACCESS_KEY_ID;
  const accessKeySecret = process.env.OSS_ACCESS_KEY_SECRET;
  const bucket = process.env.OSS_BUCKET;
  const endpoint = process.env.OSS_ENDPOINT;
  if (!accessKeyId || !accessKeySecret || !bucket || !endpoint) return null;

  const endpointUrl = new URL(endpoint.includes("://") ? endpoint : `https://${endpoint}`);
  const uploadEndpoint = `${endpointUrl.protocol}//${bucket}.${endpointUrl.host}`;
  const publicBaseUrl = normalizedUrl(process.env.OSS_PUBLIC_BASE_URL ?? uploadEndpoint);
  const prefix = (process.env.OSS_PREFIX ?? "blog-media").replace(/^\/+|\/+$/gu, "");
  const configuredMegabytes = Number(process.env.OSS_MAX_UPLOAD_MB ?? "200");
  const maxUploadBytes = Number.isFinite(configuredMegabytes) && configuredMegabytes > 0
    ? Math.floor(configuredMegabytes * 1024 * 1024)
    : 200 * 1024 * 1024;
  return { accessKeyId, accessKeySecret, bucket, endpoint: uploadEndpoint, publicBaseUrl, prefix, maxUploadBytes };
}

export function isOssConfigured() {
  return Boolean(getOssConfig());
}

function base64(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes));
}

async function signPolicy(policy: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  return base64(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(policy))));
}

function assetKind(mime: string) {
  if (mime.startsWith("image/")) return "images";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("video/")) return "video";
  return null;
}

function extension(name: string, mime: string) {
  const candidate = name.split(".").at(-1)?.toLowerCase();
  if (candidate && /^[a-z0-9]{1,10}$/u.test(candidate)) return candidate;
  return mime.split("/")[1]?.replace(/[^a-z0-9]/giu, "").toLowerCase() || "bin";
}

export async function createOssUploadPolicy(input: { name: string; type: string; size: number }) {
  const config = getOssConfig();
  if (!config) throw new Error("尚未配置阿里云 OSS。请设置 OSS_ACCESS_KEY_ID、OSS_ACCESS_KEY_SECRET、OSS_BUCKET 和 OSS_ENDPOINT。");
  const kind = assetKind(input.type);
  if (!kind) throw new Error("仅支持图片、音频和视频文件。");
  if (!input.size || input.size > config.maxUploadBytes) {
    throw new Error(`单个附件需小于 ${(config.maxUploadBytes / 1024 / 1024).toFixed(0)} MB。`);
  }

  const fileExtension = extension(input.name, input.type);
  const key = `${config.prefix}/thoughts/${kind}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${fileExtension}`;
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const policy = base64(encoder.encode(JSON.stringify({
    expiration: expiresAt,
    conditions: [
      ["content-length-range", 1, config.maxUploadBytes],
      ["eq", "$key", key],
      ["eq", "$success_action_status", "201"],
    ],
  })));
  const signature = await signPolicy(policy, config.accessKeySecret);
  const encodedKey = key.split("/").map(encodeURIComponent).join("/");

  return {
    endpoint: config.endpoint,
    key,
    policy,
    signature,
    accessKeyId: config.accessKeyId,
    expiresAt,
    publicUrl: `${config.publicBaseUrl}/${encodedKey}`,
    maxUploadBytes: config.maxUploadBytes,
  };
}
