"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { shareLinksService } from "@/lib/services/share-links";
import { filesService } from "@/lib/services/files";
import { ShareLink } from "@/types/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatRelative } from "@/lib/time";

export default function ShareLinkAccessPage() {
  const params = useParams<{ token: string }>();
  const [password, setPassword] = useState("");
  const [link, setLink] = useState<ShareLink | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadLink = async (pwd?: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await shareLinksService.access(params.token, {
        password: pwd,
      });
      setLink(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load shared content."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!link) throw new Error("Link not loaded");
      const path = file.name;
      const presigned = await filesService.requestUploadUrl({
        path,
        mimeType: file.type,
        size: file.size,
        isFolder: false,
        parentId: link.resourceId,
      });

      if (!presigned) {
        throw new Error("Unable to create presigned URL");
      }

      const uploadResponse = await fetch(presigned.url, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file to storage");
      }

      return filesService.registerFile({
        name: file.name,
        path,
        isFolder: false,
        size: file.size,
        mimeType: file.type,
        parentId: link.resourceId,
      });
    },
  });

  useEffect(() => {
    loadLink();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.token]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await loadLink(password);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !link) return;
    try {
      await uploadMutation.mutateAsync(file);
      alert("File uploaded successfully!");
      event.target.value = "";
    } catch (err) {
      alert(err instanceof Error ? err.message : "Upload failed");
    }
  };

  const downloadMutation = useMutation({
    mutationFn: async () => {
      if (!link) throw new Error("Link not loaded");
      const result = await filesService.downloadUrl(link.resourceId);
      return result;
    },
  });

  const handleDownload = async () => {
    try {
      const result = await downloadMutation.mutateAsync();
      window.open(result.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Download failed");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-12">
      <Card className="w-full max-w-lg p-8">
        <h1 className="text-xl font-semibold text-white">Shared Content</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Access files or folders shared with you via MetaStore.
        </p>
        {!link && (
          <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
            <Input
              type="password"
              placeholder="Password (if required)"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? "Validating..." : "Unlock"}
            </Button>
          </form>
        )}
        {error && (
          <p className="mt-4 text-sm text-red-400">{error}</p>
        )}
        {link && !isLoading && (
          <div className="mt-6 space-y-4 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Token</p>
                <p className="font-mono text-white">{link.token}</p>
              </div>
              <Badge variant={link.active ? "success" : "danger"}>
                {link.active ? "active" : "disabled"}
              </Badge>
            </div>
            <div className="space-y-2 text-sm text-zinc-400">
              <p>
                <span className="text-zinc-300">Resource:</span>{" "}
                {link.resourceId}
              </p>
              <p>
                <span className="text-zinc-300">Permission:</span>{" "}
                {link.permission === "full" ? "Full access" : "View only"}
              </p>
              <p>
                <span className="text-zinc-300">Expires:</span>{" "}
                {link.expiresAt ? formatRelative(link.expiresAt) : "No expiry"}
              </p>
            </div>
            <div className="space-y-2">
              <Button
                variant="outline"
                onClick={handleDownload}
                disabled={downloadMutation.isPending}
                className="w-full"
              >
                {downloadMutation.isPending ? "Loading..." : "Download"}
              </Button>
              {link.permission === "full" && link.active && (
                <div className="space-y-2">
                  <Input
                    type="file"
                    onChange={handleFileUpload}
                    disabled={uploadMutation.isPending}
                    className="w-full"
                  />
                  {uploadMutation.isPending && (
                    <p className="text-xs text-zinc-500">Uploading...</p>
                  )}
                  {uploadMutation.isSuccess && (
                    <p className="text-xs text-green-400">Upload successful!</p>
                  )}
                </div>
              )}
            </div>
            {link.permission === "full" && (
              <p className="text-xs text-zinc-500">
                Full-access links allow uploading additional content into the
                shared folder.
              </p>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
