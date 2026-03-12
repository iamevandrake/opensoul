import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getTeamTemplate } from "@paperclipai/shared";
import { agentsApi } from "../api/agents";
import { secretsApi } from "../api/secrets";
import { queryKeys } from "../lib/queryKeys";
import { Button } from "@/components/ui/button";
import { TemplatePicker, TemplateDeploySummary } from "./TemplatePicker";
import { ApiKeyManager } from "./ApiKeyManager";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Key,
  Loader2,
  Rocket,
  Sparkles,
  Users,
} from "lucide-react";
import { cn } from "../lib/utils";
import type { CompanySecret } from "@paperclipai/shared";

type Step = 1 | 2 | 3 | 4;

interface ConsumerOnboardingProps {
  userName: string | null;
  companyId: string;
  companyPrefix: string | null;
  onDismiss: () => void;
}

const ANTHROPIC_KEY_NAME = "ANTHROPIC_API_KEY";

export function ConsumerOnboarding({
  userName,
  companyId,
  companyPrefix,
  onDismiss,
}: ConsumerOnboardingProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>(1);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deployedAgents, setDeployedAgents] = useState<
    Array<{ id: string; name: string; role: string }>
  >([]);

  const { data: secrets } = useQuery({
    queryKey: queryKeys.secrets.list(companyId),
    queryFn: () => secretsApi.list(companyId),
    enabled: !!companyId,
  });

  const hasApiKey = secrets?.some(
    (s: CompanySecret) => s.name === ANTHROPIC_KEY_NAME,
  );

  const selectedTemplate = selectedTemplateId
    ? getTeamTemplate(selectedTemplateId)
    : null;

  async function handleDeploy() {
    if (!selectedTemplateId || !selectedTemplate) return;
    setLoading(true);
    setError(null);
    try {
      const result = await agentsApi.deployTemplate(companyId, {
        templateId: selectedTemplateId,
        adapterType: "claude_local",
        adapterConfig: {
          dangerouslySkipPermissions: true,
        },
      });
      setDeployedAgents(result.agents);
      queryClient.invalidateQueries({
        queryKey: queryKeys.agents.list(companyId),
      });
      setStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to deploy team");
    } finally {
      setLoading(false);
    }
  }

  function handleFinish() {
    if (companyPrefix) {
      navigate(`/${companyPrefix}/agents/all`);
    } else {
      navigate("/dashboard");
    }
  }

  const totalSteps = 4;

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="max-w-lg w-full space-y-6">
        {/* Progress */}
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Set up your team</span>
          <span className="text-sm text-muted-foreground/60">
            Step {step} of {totalSteps}
          </span>
          <div className="flex items-center gap-1.5 ml-auto">
            {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
              <div
                key={s}
                className={cn(
                  "h-1.5 w-6 rounded-full transition-colors",
                  s < step
                    ? "bg-green-500"
                    : s === step
                      ? "bg-foreground"
                      : "bg-muted",
                )}
              />
            ))}
          </div>
        </div>

        {/* Step 1: Pick a template */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                {userName ? `Welcome, ${userName}` : "Welcome"}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Choose a team template to get started. You can customize your
                agents later.
              </p>
            </div>

            <TemplatePicker
              selected={selectedTemplateId}
              onSelect={setSelectedTemplateId}
            />
          </div>
        )}

        {/* Step 2: API Key (BYOK) */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="bg-muted/50 p-2 rounded-md">
                <Key className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <h2 className="font-medium">Connect your API key</h2>
                <p className="text-xs text-muted-foreground">
                  Your agents need an Anthropic API key to run. You pay for usage
                  directly.
                </p>
              </div>
            </div>

            <ApiKeyManager
              companyId={companyId}
              compact
              onKeyConfigured={() => {
                queryClient.invalidateQueries({
                  queryKey: queryKeys.secrets.list(companyId),
                });
              }}
            />
          </div>
        )}

        {/* Step 3: Review & deploy */}
        {step === 3 && selectedTemplate && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="bg-muted/50 p-2 rounded-md">
                <Rocket className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <h2 className="font-medium">Review your team</h2>
                <p className="text-xs text-muted-foreground">
                  These agents will be created in your workspace.
                </p>
              </div>
            </div>

            <TemplateDeploySummary template={selectedTemplate} />

            {hasApiKey && (
              <div className="flex items-center gap-2 rounded-md border border-green-300 bg-green-50 px-3 py-2 dark:border-green-500/25 dark:bg-green-950/40">
                <Check className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
                <p className="text-xs text-green-800 dark:text-green-200">
                  API key will be injected into all agents automatically.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Success */}
        {step === 4 && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="bg-green-500/10 p-2 rounded-md">
                <Check className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h2 className="font-medium">Team deployed</h2>
                <p className="text-xs text-muted-foreground">
                  {deployedAgents.length} agents have been created and are ready
                  to work.
                </p>
              </div>
            </div>

            <div className="grid gap-2">
              {deployedAgents.map((agent) => (
                <div
                  key={agent.id}
                  className="flex items-center gap-3 rounded-md border border-border px-3 py-2"
                >
                  <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                  <p className="text-sm font-medium flex-1">{agent.name}</p>
                  <span className="text-xs text-muted-foreground capitalize">
                    {agent.role.replace("_", " ")}
                  </span>
                </div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground">
              Head to the Agents page to configure adapters, assign tasks, and
              start your first campaign.
            </p>
          </div>
        )}

        {/* Error */}
        {error && <p className="text-sm text-destructive">{error}</p>}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <div>
            {step === 1 && (
              <Button
                variant="ghost"
                onClick={onDismiss}
                className="text-muted-foreground"
              >
                Skip to dashboard
              </Button>
            )}
            {step === 2 && (
              <Button variant="ghost" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Back
              </Button>
            )}
            {step === 3 && (
              <Button
                variant="ghost"
                onClick={() => setStep(2)}
                disabled={loading}
              >
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Back
              </Button>
            )}
          </div>

          <div>
            {step === 1 && (
              <Button
                onClick={() => setStep(2)}
                disabled={!selectedTemplateId}
              >
                Continue
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            )}
            {step === 2 && (
              <Button onClick={() => setStep(3)}>
                {hasApiKey ? "Continue" : "Skip for now"}
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            )}
            {step === 3 && (
              <Button onClick={handleDeploy} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    Deploying...
                  </>
                ) : (
                  <>
                    <Rocket className="h-4 w-4 mr-1.5" />
                    Deploy Team
                  </>
                )}
              </Button>
            )}
            {step === 4 && (
              <Button onClick={handleFinish}>
                Go to Agents
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
