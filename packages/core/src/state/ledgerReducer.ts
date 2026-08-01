import type { LedgerRow, Insight, Flag } from "../schemas";
import { recomputeLedger } from "../rules/recompute";

// 2.1 State — useReducer in core, one Context in web. DOM-free and portable.
// Every value-changing mutation runs the batch back through recomputeLedger() so the
// ledger stays live: the H -> E loop (the human in the loop).

export interface EditLogEntry {
  source_id: string;
  field: string;
  from: string | number | null;
  to: string | number | null;
}

export interface LedgerState {
  rows: LedgerRow[];
  insights: Insight[];
  batchSummary: string;
  unread: string[]; // source_ids that failed extraction — entered by hand (partial results)
  modelId: string | null;
  editLog: EditLogEntry[];
  loadedAt: string | null;
}

export type LedgerAction =
  | { type: "LOAD"; rows: LedgerRow[]; insights: Insight[]; batchSummary: string; unread?: string[]; modelId?: string | null; loadedAt?: string }
  | { type: "HYDRATE"; state: LedgerState }
  | { type: "EDIT_FIELD"; sourceId: string; field: keyof LedgerRow; value: string | number | null }
  | { type: "RESOLVE_FLAG"; sourceId: string; code: Flag["code"]; resolution: string }
  | { type: "REMOVE_ROW"; sourceId: string }
  | { type: "APPROVE_ALL" }
  | { type: "RESET" };

export const initialLedgerState: LedgerState = {
  rows: [],
  insights: [],
  batchSummary: "",
  unread: [],
  modelId: null,
  editLog: [],
  loadedAt: null,
};

export function ledgerReducer(state: LedgerState, action: LedgerAction): LedgerState {
  switch (action.type) {
    case "LOAD":
      return {
        ...initialLedgerState,
        rows: action.rows,
        insights: action.insights,
        batchSummary: action.batchSummary,
        unread: action.unread ?? [],
        modelId: action.modelId ?? state.modelId,
        loadedAt: action.loadedAt ?? null,
      };

    case "HYDRATE":
      return action.state;

    case "EDIT_FIELD": {
      let entry: EditLogEntry | null = null;
      const rows = state.rows.map((r) => {
        if (r.source_id !== action.sourceId) return r;
        const from = r[action.field] as string | number | null;
        entry = { source_id: r.source_id, field: String(action.field), from, to: action.value };
        const edited_fields = r.edited_fields.includes(String(action.field))
          ? r.edited_fields
          : [...r.edited_fields, String(action.field)];
        return { ...r, [action.field]: action.value, edited_fields } as LedgerRow;
      });
      return {
        ...state,
        rows: recomputeLedger(rows),
        editLog: entry ? [...state.editLog, entry] : state.editLog,
      };
    }

    case "RESOLVE_FLAG": {
      const rows = state.rows.map((r) => {
        if (r.source_id !== action.sourceId) return r;
        const flags = r.flags.map((f) =>
          f.code === action.code ? { ...f, resolved: true, resolution: action.resolution } : f,
        );
        return { ...r, flags };
      });
      return { ...state, rows: recomputeLedger(rows) };
    }

    case "REMOVE_ROW": {
      const removed = state.rows.find((r) => r.source_id === action.sourceId);
      const rows = state.rows.filter((r) => r.source_id !== action.sourceId);
      const entry: EditLogEntry | null = removed
        ? { source_id: action.sourceId, field: "__removed__", from: removed.stated_total, to: null }
        : null;
      return {
        ...state,
        rows: recomputeLedger(rows),
        editLog: entry ? [...state.editLog, entry] : state.editLog,
      };
    }

    case "APPROVE_ALL": {
      const rows = state.rows.map((r) => ({ ...r, approved: true }));
      return { ...state, rows };
    }

    case "RESET":
      return { ...initialLedgerState, modelId: state.modelId };

    default:
      return state;
  }
}
