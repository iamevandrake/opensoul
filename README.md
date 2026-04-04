<p align="center">
  <h1 align="center">Opensoul</h1>
  <p align="center"><strong>Open-source agentic marketing stack</strong></p>
</p>

<p align="center">
  <a href="#quickstart"><strong>Quickstart</strong></a> &middot;
  <a href="https://github.com/iamevandrake/opensoul"><strong>GitHub</strong></a>
</p>

<p align="center">
  <a href="https://github.com/iamevandrake/opensoul/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT License" /></a>
  <a href="https://github.com/iamevandrake/opensoul/stargazers"><img src="https://img.shields.io/github/stars/iamevandrake/opensoul?style=flat" alt="Stars" /></a>
</p>

<br/>

## What is opensoul?

# An AI marketing agency that runs itself

**opensoul is a pre-configured [Paperclip](https://github.com/paperclipai/paperclip/) deployment built specifically for marketing agencies.**

It's a full agentic marketing stack. A team of AI agents organized as a real marketing agency. Director at the top. Strategy, creative, production, growth, and analytics below.

Bring your own AI agents. Claude Code, Codex, Cursor, OpenClaw. Assign marketing goals. Watch your agency execute campaigns, create content, optimize funnels, and grow your brand. All from one dashboard.

**Manage marketing outcomes, not individual prompts.**

|        | Step              | Example                                                                          |
| ------ | ----------------- | -------------------------------------------------------------------------------- |
| **01** | Set the objective | _"Launch product X to 10K signups in 90 days."_                                  |
| **02** | Staff the agency  | Director, Strategist, Producer, Creative, Growth Marketer, Analyst. All AI agents. |
| **03** | Let them execute  | Review strategy. Approve campaigns. Monitor performance from the dashboard.       |

<br/>

## The Marketing Team

opensoul comes pre-configured with six marketing roles:

| Role | Responsibilities |
| --- | --- |
| **Director** | Overall marketing strategy, budget allocation, team coordination, performance reporting |
| **Strategist** | Market research, competitive analysis, positioning, campaign planning, audience segmentation |
| **Producer** | Content production, asset creation, publishing workflows, editorial calendar |
| **Creative** | Brand voice, copy, visual direction, content strategy, messaging frameworks |
| **Growth Marketer** | SEO, paid acquisition, conversion optimization, analytics, A/B testing, funnel optimization |
| **Analyst** | Performance measurement, attribution, reporting, data-driven recommendations, ROI analysis |

Each agent runs autonomously on scheduled heartbeats. They check their work queue, execute tasks, and report progress. Just like a real marketing team.

<br/>

## opensoul is right for you if

- You want an **autonomous AI marketing agency** working 24/7
- You need to **coordinate marketing across channels** (content, paid, SEO, social) with AI agents
- You want **marketing strategy and execution**, not just content generation
- You want to **monitor marketing spend** and enforce budgets across your agency
- You want a **structured marketing org** with clear roles, not a pile of disconnected prompts
- You want to manage your marketing operations **from your phone**

<br/>

## Features

opensoul inherits all of Paperclip's orchestration capabilities, tuned for marketing:

<table>
<tr>
<td align="center" width="33%">
<h3>Marketing Org Chart</h3>
Director, Strategist, Creative, Producer, Growth, Analyst. A real agency structure with reporting lines and delegation.
</td>
<td align="center" width="33%">
<h3>Goal-Driven Campaigns</h3>
Every task traces back to marketing objectives. Agents know <em>what</em> to create and <em>why</em> it matters.
</td>
<td align="center" width="33%">
<h3>Autonomous Execution</h3>
Agents wake on schedule, check their queue, produce work, and hand off to the next team member.
</td>
</tr>
<tr>
<td align="center">
<h3>Budget Control</h3>
Monthly budgets per agent. Track spend across your marketing team. No runaway costs.
</td>
<td align="center">
<h3>Campaign Governance</h3>
You're the client. Approve strategies. Review creative. Pause or redirect any agent at any time.
</td>
<td align="center">
<h3>Full Audit Trail</h3>
Every decision, every draft, every revision. Traced and explained. Complete campaign accountability.
</td>
</tr>
</table>

<br/>

## Quickstart

```bash
git clone https://github.com/iamevandrake/opensoul.git
cd opensoul
pnpm install
pnpm dev
```

This starts the API server at `http://localhost:3200`. An embedded PostgreSQL database is created automatically. No setup required.

> **Requirements:** Node.js 20+, pnpm 9.15+

<br/>

## How It Works

opensoul is built on [Paperclip](https://github.com/paperclipai/paperclip/), the open-source orchestration platform for AI agent companies. Everything Paperclip can do, opensoul can do. It's just pre-configured for marketing.

- **Heartbeats**: Agents wake on a schedule, check their work, and act
- **Delegation**: The Director breaks strategy into tasks and assigns them down the org chart
- **Governance**: You approve strategies, review output, and set budgets
- **Cost tracking**: Monitor token spend across your marketing team
- **Multi-channel**: Agents can use any tools. Claude Code, Codex, Cursor, OpenClaw, HTTP APIs

<br/>

## Development

```bash
pnpm dev              # Full dev (API + UI, watch mode)
pnpm dev:once         # Full dev without file watching
pnpm build            # Build all
pnpm typecheck        # Type checking
pnpm test:run         # Run tests
```

<br/>

## License

MIT &copy; 2026 Simhasana LLC

<br/>

---

<p align="center">
  <sub>Open source under MIT &copy; Simhasana LLC. Built on <a href="https://github.com/paperclipai/paperclip/">Paperclip</a>. Made for marketers who want results, not busywork.</sub>
</p>
