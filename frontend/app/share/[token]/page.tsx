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

  useEffect(() => {
    loadLink();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.token]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await loadLink(password);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-12">
      <Card className="w-full max-w-lg p-8">
        <h1 className="text-xl font-semibold text-white">Shared Content</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Access files or folders shared with you via MetaStore.
        </p>
        <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
          <Input
            type="password"
            placeholder="Password (if required)"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Validating..." : "Unlock"}
          </Button>
        </form>
        {error && (
          <p className="mt-4 text-sm text-red-400">
            {error}
          </p>
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
            <Button
              variant="outline"
              disabled={link.permission !== "view"}
              className="w-full"
            >
              Request Download
            </Button>
            {link.permission === "full" && (
              <p className="text-xs text-zinc-500">
                Full-access links allow uploading additional content into the
                shared folder via the MetaStore dashboard.
              </p>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

