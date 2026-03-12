import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCompany } from "../context/CompanyContext";
import { secretsApi } from "../api/secrets";
import { queryKeys } from "../lib/queryKeys";
import { Button } from "@/components/ui/button";
import {
  Key,
  Check,
  Loader2,
  Eye,
  EyeOff,
  RotateCw,
  Trash2,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { cn } from "../lib/utils";
import type { CompanySecret } from "@paperclipai/shared";

const ANTHROPIC_KEY_NAME = "ANTHROPIC_API_KEY";
const ANTHROPIC_KEY_PREFIX = "sk-ant-";

interface ApiKeyManagerProps {
  companyId: string;
  compact?: boolean;
  onKeyConfigured?: (secretId: string) => void;
}

export function ApiKeyManager({
  companyId,
  compact = false,
  onKeyConfigured,
}: ApiKeyManagerProps) {
  const queryClient = useQueryClient();
  const [keyValue, setKeyValue] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);

  const { data: secrets, isLoading } = useQuery({
    queryKey: queryKeys.secrets.list(companyId),
    queryFn: () => secretsApi.list(companyId),
    enabled: !!companyId,
  });

  const anthropicSecret = secrets?.find(
    (s: CompanySecret) => s.name === ANTHROPIC_KEY_NAME,
  );

  const createMutation = useMutation({
    mutationFn: (value: string) =>
      secretsApi.create(companyId, {
        name: ANTHROPIC_KEY_NAME,
        value,
        description: "Anthropic API key for agent execution (BYOK)",
      }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.secrets.list(companyId),
      });
      setKeyValue("");
      setError(null);
      onKeyConfigured?.(created.id);
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Failed to save API key");
    },
  });

  const rotateMutation = useMutation({
    mutationFn: (value: string) =>
      secretsApi.rotate(anthropicSecret!.id, { value }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.secrets.list(companyId),
      });
      setKeyValue("");
      setError(null);
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Failed to rotate API key");
    },
  });

  const removeMutation = useMutation({
    mutationFn: () => secretsApi.remove(anthropicSecret!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.secrets.list(companyId),
      });
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Failed to remove API key");
    },
  });

  function validateKeyFormat(key: string): string | null {
    const trimmed = key.trim();
    if (!trimmed) return "API key is required";
    if (!trimmed.startsWith(ANTHROPIC_KEY_PREFIX)) {
      return `Key should start with "${ANTHROPIC_KEY_PREFIX}"`;
    }
    if (trimmed.length < 20) return "Key is too short";
    return null;
  }

  async function handleSave() {
    const trimmed = keyValue.trim();
    const validationError = validateKeyFormat(trimmed);
    if (validationError) {
      setError(validationError);
      return;
    }

    setValidating(true);
    setError(null);

    try {
      if (anthropicSecret) {
        await rotateMutation.mutateAsync(trimmed);
      } else {
        await createMutation.mutateAsync(trimmed);
      }
    } finally {
      setValidating(false);
    }
  }

  const isSaving =
    createMutation.isPending || rotateMutation.isPending || validating;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading...
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", compact && "space-y-3")}>
      {!compact && (
        <div className="flex items-center gap-3">
          <div className="bg-muted/50 p-2 rounded-md">
            <Key className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-medium">Anthropic API Key</h3>
            <p className="text-xs text-muted-foreground">
              Your agents use this key to call the Anthropic API. You pay
              directly for usage.
            </p>
          </div>
        </div>
      )}

      {anthropicSecret ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-md border border-green-300 bg-green-50 px-3 py-2 dark:border-green-500/25 dark:bg-green-950/40">
            <ShieldCheck className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
            <p className="text-sm text-green-800 dark:text-green-200 flex-1">
              API key configured (version {anthropicSecret.latestVersion})
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground"
              onClick={() => removeMutation.mutate()}
              disabled={removeMutation.isPending}
            >
              {removeMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Trash2 className="h-3 w-3" />
              )}
            </Button>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Rotate key
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showKey ? "text" : "password"}
                  className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm font-mono outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/50 pr-9"
                  placeholder="sk-ant-..."
                  value={keyValue}
                  onChange={(e) => {
                    setKeyValue(e.target.value);
                    setError(null);
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground"
                >
                  {showKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <Button
                onClick={handleSave}
                disabled={!keyValue.trim() || isSaving}
                size="sm"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RotateCw className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Anthropic API key
            </label>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm font-mono outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/50 pr-9"
                placeholder="sk-ant-api03-..."
                value={keyValue}
                onChange={(e) => {
                  setKeyValue(e.target.value);
                  setError(null);
                }}
                autoFocus={compact}
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground"
              >
                {showKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              Stored encrypted. Your key is never exposed to other users or
              agents — it is injected at runtime only.
            </p>
          </div>

          <Button
            onClick={handleSave}
            disabled={!keyValue.trim() || isSaving}
            className="w-full"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-1.5" />
                Save API Key
              </>
            )}
          </Button>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
