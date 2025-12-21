"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { shareLinksService } from "@/lib/services/share-links";
import { ShareLink } from "@/types/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatRelative } from "@/lib/time";
import { CustomVideoPlayer } from "@/components/custom-video-player";
import { CustomAudioPlayer } from "@/components/custom-audio-player";

export default function SharedLinkPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token;

  const [password, setPassword] = useState("");
  const [link, setLink] = useState<ShareLink | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUnlocking, setIsUnlocking] = useState(false);

  const unlock = async (pwd?: string) => {
    if (!token) return;
    try {
      setIsUnlocking(true);
      setError(null);
      const data = await shareLinksService.access(token, { password: pwd });
      setLink(data);
      const download = await shareLinksService.download(token, { password: pwd });
      setDownloadUrl(download.url);
    } catch (err) {
      setLink(null);
      setDownloadUrl(null);
      setError(err instanceof Error ? err.message : "Unable to load shared content.");
    } finally {
      setIsUnlocking(false);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    unlock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await unlock(password);
  };

  const triggerDownload = (url: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.click();
  };

  const handleDownload = async () => {
    try {
      let url = downloadUrl;
      if (!url && token) {
        const res = await shareLinksService.download(token, { password });
        url = res.url;
        setDownloadUrl(url);
      }
      if (url) {
        triggerDownload(url);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to download.");
    }
  };

  const mimeType = link?.resource?.mimeType || "";
  const isVideo = mimeType.startsWith("video/");
  const isAudio = mimeType.startsWith("audio/");
  const isImage = mimeType.startsWith("image/");

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-12">
      <Card className="w-full max-w-4xl p-8">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold text-white">Shared Content</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Access the file securely without signing in.
            </p>
          </div>
          {link && (
            <Badge variant={link.active ? "success" : "danger"}>
              {link.active ? "Active" : "Disabled"}
            </Badge>
          )}
        </div>

        {!link && (
          <form className="mt-6 space-y-3" onSubmit={handleSubmit}>
            <Input
              type="password"
              placeholder="Password (if required)"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <Button type="submit" disabled={isUnlocking} className="w-full">
              {isUnlocking ? "Validating..." : "Unlock"}
            </Button>
          </form>
        )}

        {error && (
          <p className="mt-4 text-sm text-red-400">{error}</p>
        )}

        {link && !isLoading && (
          <div className="mt-6 space-y-6">
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="font-mono text-sm text-white break-all">
                  {link.resource?.name ?? link.token}
                </div>
                <Badge variant="default" className="text-xs capitalize">
                  {link.permission} access
                </Badge>
                <Badge variant="default" className="text-xs">
                  {link.resource?.mimeType || "Unknown type"}
                </Badge>
                <Badge variant="default" className="text-xs">
                  {link.expiresAt ? `Expires ${formatRelative(link.expiresAt)}` : "No expiry"}
                </Badge>
              </div>
            </div>

            {downloadUrl && !link.resource?.isFolder && (
              <div
                className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 select-none"
                onContextMenu={(e) => e.preventDefault()}
              >
                {isVideo && (
                  <div className="w-full" style={{ maxWidth: "1280px", margin: "0 auto" }}>
                    <CustomVideoPlayer src={downloadUrl} className="w-full" />
                  </div>
                )}

                {isAudio && (
                  <div className="w-full max-w-3xl mx-auto">
                    <CustomAudioPlayer
                      src={downloadUrl}
                      filename={link.resource?.name || "audio"}
                      className="w-full"
                    />
                  </div>
                )}

                {!isVideo && !isAudio && isImage && (
                  <div className="flex justify-center">
                    <img
                      src={downloadUrl}
                      alt={link.resource?.name || "shared file"}
                      className="max-h-[480px] rounded-lg border border-zinc-800 select-none pointer-events-none"
                    />
                  </div>
                )}

                {!isVideo && !isAudio && !isImage && (
                  <p className="text-sm text-zinc-400">
                    Preview not available for this file type. You can still download it below.
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-zinc-400">
                Token: <span className="font-mono text-white">{link.token}</span>
              </div>
              <Button
                variant="outline"
                onClick={handleDownload}
                disabled={!downloadUrl}
                className="w-full sm:w-auto"
              >
                Download file
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}


