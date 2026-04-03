import type {
  AgentLogEntry,
  ConsensusMode,
  ConsensusProgressEvent,
  ConsensusResponse,
  CrossmintExecutionRequest,
  CrossmintExecutionResponse,
} from "@/lib/consensusTypes";

const API_BASE_URL = import.meta.env.VITE_CONSENSUS_API_URL?.replace(/\/$/, "") ?? "";

export async function requestConsensusRecommendation(
  item: string,
  budget: number,
  justification: string,
  mode: ConsensusMode,
): Promise<ConsensusResponse> {
  const response = await fetch(`${API_BASE_URL}/api/procurement/consensus`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      item,
      budget,
      justification,
      mode,
    }),
  });

  if (!response.ok) {
    let errorMessage = "Consensus API request failed";

    try {
      const payload = await response.json();
      if (payload?.error) {
        errorMessage = payload.error;
      } else if (payload?.detail) {
        errorMessage = payload.detail;
      }
    } catch {
      // Ignore JSON parse failures and keep the generic message.
    }

    throw new Error(errorMessage);
  }

  return response.json();
}

export async function streamConsensusRecommendation(
  item: string,
  budget: number,
  justification: string,
  mode: ConsensusMode,
  handlers: {
    onProgress?: (event: ConsensusProgressEvent) => void;
    onLog?: (entry: AgentLogEntry) => void;
  },
): Promise<ConsensusResponse> {
  const url = new URL(`${API_BASE_URL || window.location.origin}/api/procurement/consensus/stream`);
  url.searchParams.set("item", item);
  url.searchParams.set("budget", String(budget));
  url.searchParams.set("justification", justification);
  url.searchParams.set("mode", mode);

  return await new Promise<ConsensusResponse>((resolve, reject) => {
    const source = new EventSource(url.toString());

    source.addEventListener("progress", (event) => {
      handlers.onProgress?.(JSON.parse((event as MessageEvent).data));
    });

    source.addEventListener("log", (event) => {
      handlers.onLog?.(JSON.parse((event as MessageEvent).data));
    });

    source.addEventListener("final", (event) => {
      source.close();
      resolve(JSON.parse((event as MessageEvent).data));
    });

    source.addEventListener("error", (event) => {
      const message = (() => {
        try {
          return JSON.parse((event as MessageEvent).data).message;
        } catch {
          return "Consensus stream failed";
        }
      })();
      source.close();
      reject(new Error(message));
    });

    source.onerror = () => {
      source.close();
      reject(new Error("Consensus stream disconnected"));
    };
  });
}

export async function executeApprovedPurchase(
  payload: CrossmintExecutionRequest,
): Promise<CrossmintExecutionResponse> {
  const response = await fetch(`${API_BASE_URL}/api/procurement/execute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorMessage = "Crossmint execution failed";

    try {
      const errorPayload = await response.json();
      if (errorPayload?.error) {
        errorMessage = errorPayload.error;
      } else if (errorPayload?.detail) {
        errorMessage = errorPayload.detail;
      }
    } catch {
      // Ignore JSON parse failures and keep the generic message.
    }

    throw new Error(errorMessage);
  }

  return response.json();
}
