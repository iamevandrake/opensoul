import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { getTeamTemplate } from "@paperclipai/shared";
import { useCompany } from "../context/CompanyContext";
import { agentsApi } from "../api/agents";
import { queryKeys } from "../lib/queryKeys";
import { Button } from "@/components/ui/button";
import { TemplatePicker, TemplateDeploySummary } from "./TemplatePicker";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Rocket,
  Sparkles,
  Users,
} from "lucide-react";
import { cn } from "../lib/utils";

type Step = 1 | 2 | 3;

interface ConsumerOnboardingProps {
  userName: string | null;
  companyId: string;
  companyPrefix: string | null;
  onDismiss: () => void;
}

export function ConsumerOnboarding({
  userName,
  companyId,
  companyPrefix,
  onDismiss,
}: ConsumerOnboardingProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>(1);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deployedAgents, setDeployedAgents] = useState<
    Array<{ id: string; name: string; role: string }>
  >([]);

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
      setStep(3);
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

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="max-w-lg w-full space-y-6">
        {/* Progress */}
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Set up your team</span>
          <span className="text-sm text-muted-foreground/60">
            Step {step} of 3
          </span>
          <div className="flex items-center gap-1.5 ml-auto">
            {[1, 2, 3].map((s) => (
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

        {/* Step 2: Confirm deployment */}
        {step === 2 && selectedTemplate && (
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

            <div className="rounded-md border border-border bg-muted/30 px-4 py-3">
              <p className="text-xs text-muted-foreground">
                All agents will use the default adapter configuration. You can
                reconfigure individual agents from the Agents page after
                deployment.
              </p>
            </div>
          </div>
        )}

        {/* Step 3: Success */}
        {step === 3 && (
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
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <div>
            {step === 1 && (
              <Button variant="ghost" onClick={onDismiss} className="text-muted-foreground">
                Skip to dashboard
              </Button>
            )}
            {step === 2 && (
              <Button
                variant="ghost"
                onClick={() => setStep(1)}
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
            {step === 3 && (
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
