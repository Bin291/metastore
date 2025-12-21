"use client";

import { useState } from "react";
import { shareLinksService } from "@/lib/services/share-links";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

interface ShareDialogProps {
  fileId: string;
  fileName: string;
  onClose: () => void;
}

export function ShareDialog({ fileId, fileName, onClose }: ShareDialogProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const frontendUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_FRONTEND_URL || "";

  const handleCreate = async () => {
    setIsCreating(true);
    setError(null);
    try {
      const result = await shareLinksService.create({
        resourceId: fileId,
        permission: "view",
      });
      const url = `${frontendUrl}/${result.token}`;
      setLink(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create share link");
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopy = () => {
    if (link) navigator.clipboard.writeText(link).catch(() => {});
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Share file</h3>
            <p className="text-sm text-zinc-400 truncate">{fileName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3">
          <p className="text-sm text-zinc-300">
            Create a public link. Anyone with the link can view and download.
          </p>

          <div className="flex gap-2">
            <Button
              className="flex-1"
              onClick={handleCreate}
              disabled={isCreating}
            >
              {isCreating ? "Creating..." : "Generate link"}
            </Button>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>

          {link && (
            <div className="space-y-2">
              <label className="text-xs text-zinc-400">Share link</label>
              <div className="flex gap-2">
                <Input value={link} readOnly className="text-xs" />
                <Button variant="outline" onClick={handleCopy}>
                  Copy
                </Button>
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}


