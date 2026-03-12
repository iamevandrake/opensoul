import type { TeamTemplate } from "@paperclipai/shared";
import { TEAM_TEMPLATES } from "@paperclipai/shared";
import { cn } from "../lib/utils";
import { Users, Rocket, FileText, Building2, Check } from "lucide-react";

const TEMPLATE_ICONS: Record<string, typeof Users> = {
  "launch-campaign": Rocket,
  "content-engine": FileText,
  "full-agency": Building2,
};

interface TemplatePickerProps {
  selected: string | null;
  onSelect: (templateId: string) => void;
}

export function TemplatePicker({ selected, onSelect }: TemplatePickerProps) {
  return (
    <div className="grid gap-3">
      {TEAM_TEMPLATES.map((template) => {
        const Icon = TEMPLATE_ICONS[template.id] ?? Users;
        const isSelected = selected === template.id;

        return (
          <button
            key={template.id}
            type="button"
            onClick={() => onSelect(template.id)}
            className={cn(
              "relative flex items-start gap-4 rounded-md border p-4 text-left transition-colors",
              isSelected
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-border hover:border-muted-foreground/30 hover:bg-accent/50",
            )}
          >
            {isSelected && (
              <div className="absolute top-3 right-3">
                <Check className="h-4 w-4 text-primary" />
              </div>
            )}
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted">
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1 pr-6">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{template.name}</p>
                <span className="text-xs text-muted-foreground">
                  {template.agentCount} agent{template.agentCount !== 1 ? "s" : ""}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                {template.description}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {template.agents.map((agent) => (
                  <span
                    key={agent.name}
                    className="inline-flex items-center rounded-full border border-border bg-background px-2 py-0.5 text-[11px] text-muted-foreground"
                  >
                    {agent.name}
                  </span>
                ))}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function TemplateDeploySummary({
  template,
}: {
  template: TeamTemplate;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-medium">
          {template.name} — {template.agentCount} agents
        </p>
      </div>
      <div className="grid gap-2">
        {template.agents.map((agent, i) => (
          <div
            key={i}
            className="flex items-start gap-3 rounded-md border border-border px-3 py-2"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{agent.name}</p>
              <p className="text-xs text-muted-foreground">{agent.title}</p>
            </div>
            <span className="text-xs text-muted-foreground capitalize shrink-0">
              {agent.role.replace("_", " ")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
