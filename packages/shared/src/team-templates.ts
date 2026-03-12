import type { AgentRole, AgentIconName } from "./constants.js";

export interface TeamTemplateAgent {
  name: string;
  role: AgentRole;
  title: string;
  icon: AgentIconName;
  capabilities: string;
  reportsToIndex?: number; // index in the agents array this agent reports to
}

export interface TeamTemplate {
  id: string;
  name: string;
  description: string;
  agentCount: number;
  agents: TeamTemplateAgent[];
}

export const TEAM_TEMPLATES: TeamTemplate[] = [
  {
    id: "launch-campaign",
    name: "Launch Campaign",
    description:
      "A focused 4-agent team for planning and executing product launches, campaigns, and go-to-market strategies.",
    agentCount: 4,
    agents: [
      {
        name: "Campaign Director",
        role: "director",
        title: "Campaign Director",
        icon: "rocket",
        capabilities:
          "Campaign planning, team coordination, timeline management, launch strategy",
      },
      {
        name: "Strategist",
        role: "strategist",
        title: "Campaign Strategist",
        icon: "brain",
        capabilities:
          "Market research, audience targeting, positioning, competitive analysis",
        reportsToIndex: 0,
      },
      {
        name: "Creative",
        role: "creative",
        title: "Creative Lead",
        icon: "zap",
        capabilities:
          "Copy writing, ad creative, landing pages, email sequences, brand voice",
        reportsToIndex: 0,
      },
      {
        name: "Growth Marketer",
        role: "growth_marketer",
        title: "Growth Marketer",
        icon: "rocket",
        capabilities:
          "Paid ads, SEO, social media, analytics, conversion optimization",
        reportsToIndex: 0,
      },
    ],
  },
  {
    id: "content-engine",
    name: "Content Engine",
    description:
      "A 3-agent team focused on producing high-quality content across channels — blogs, social, email, and more.",
    agentCount: 3,
    agents: [
      {
        name: "Content Director",
        role: "director",
        title: "Content Director",
        icon: "brain",
        capabilities:
          "Content strategy, editorial calendar, team coordination, content audits",
      },
      {
        name: "Writer",
        role: "creative",
        title: "Content Writer",
        icon: "code",
        capabilities:
          "Blog posts, articles, newsletters, social media copy, SEO writing",
        reportsToIndex: 0,
      },
      {
        name: "Analyst",
        role: "analyst",
        title: "Content Analyst",
        icon: "cpu",
        capabilities:
          "Content performance tracking, audience insights, A/B test analysis, reporting",
        reportsToIndex: 0,
      },
    ],
  },
  {
    id: "full-agency",
    name: "Full Agency",
    description:
      "A complete 6-agent marketing agency with strategy, content, growth, creative, and analytics coverage.",
    agentCount: 6,
    agents: [
      {
        name: "Agency Director",
        role: "director",
        title: "Agency Director",
        icon: "shield",
        capabilities:
          "Agency operations, team management, client strategy, resource allocation",
      },
      {
        name: "Strategist",
        role: "strategist",
        title: "Head of Strategy",
        icon: "brain",
        capabilities:
          "Market research, brand strategy, campaign planning, competitive intelligence",
        reportsToIndex: 0,
      },
      {
        name: "Producer",
        role: "producer",
        title: "Production Manager",
        icon: "terminal",
        capabilities:
          "Project management, workflow automation, asset coordination, deadline tracking",
        reportsToIndex: 0,
      },
      {
        name: "Creative",
        role: "creative",
        title: "Creative Director",
        icon: "zap",
        capabilities:
          "Copy writing, visual direction, brand voice, creative concepts, ad creative",
        reportsToIndex: 0,
      },
      {
        name: "Growth Marketer",
        role: "growth_marketer",
        title: "Growth Lead",
        icon: "rocket",
        capabilities:
          "Paid acquisition, SEO, email marketing, funnel optimization, social media",
        reportsToIndex: 0,
      },
      {
        name: "Analyst",
        role: "analyst",
        title: "Marketing Analyst",
        icon: "cpu",
        capabilities:
          "Performance reporting, data analysis, attribution modeling, forecasting",
        reportsToIndex: 0,
      },
    ],
  },
];

export function getTeamTemplate(id: string): TeamTemplate | undefined {
  return TEAM_TEMPLATES.find((t) => t.id === id);
}
