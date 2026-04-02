import "express-serve-static-core";

interface BoardActor {
  type: "board";
  userId: string;
  companyIds?: string[];
  isInstanceAdmin: boolean;
  runId?: string;
  source: "session" | "local_implicit";
}

interface AgentActor {
  type: "agent";
  agentId: string;
  companyId: string;
  keyId?: string;
  runId?: string;
  userId?: string;
  companyIds?: string[];
  isInstanceAdmin?: boolean;
  source: "agent_jwt" | "agent_key";
}

interface NoneActor {
  type: "none";
  source: "none";
  userId?: undefined;
  agentId?: undefined;
  companyId?: undefined;
  companyIds?: undefined;
  keyId?: undefined;
  runId?: undefined;
  isInstanceAdmin?: undefined;
}

type Actor = BoardActor | AgentActor | NoneActor;

declare module "express-serve-static-core" {
  interface Request {
    actor: Actor;
  }
}

declare global {
  namespace Express {
    interface Request {
      actor: Actor;
    }
  }
}
