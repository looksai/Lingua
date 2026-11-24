import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getDb: vi.fn() }));
vi.mock("./db", () => ({ getDb: mocks.getDb }));

import { autoSaveLearnerMemory, saveLearnerMemory } from "./learner-memory";

function fakeDatabase(choice: null | { policyVersion: number; personalMemoryEnabled: number }) {
  const inserted = vi.fn();
  const onDuplicateKeyUpdate = vi.fn().mockResolvedValue(undefined);
  const tx = {
    select: () => ({
      from: () => ({
        where: () => ({
          for: () => ({
            limit: async () => choice ? [choice] : [],
          }),
        }),
      }),
    }),
    insert: () => ({
      values: (data: unknown) => {
        inserted(data);
        return { onDuplicateKeyUpdate };
      },
    }),
  };
  return {
    inserted,
    db: {
      transaction: async (fn: (connection: typeof tx) => Promise<unknown>) => fn(tx),
    },
  };
}

const fact = { fato: "Sou soldador", categoria: "profissao" as const };
const input = { ...fact, sourceMessage: "Sou soldador e quero melhorar meu inglês.", consent: true as const };

beforeEach(() => mocks.getDb.mockReset());

describe("server-side privacy preference gate for learner memory", () => {
  it("never writes automatic memory for a legacy account without a preference row", async () => {
    const { db, inserted } = fakeDatabase(null);
    mocks.getDb.mockResolvedValue(db);
    expect(await autoSaveLearnerMemory(7, fact, input.sourceMessage)).toEqual({ saved: false });
    expect(inserted).not.toHaveBeenCalled();
  });

  it("never writes automatic memory after explicit account opt-out", async () => {
    const { db, inserted } = fakeDatabase({ policyVersion: 1, personalMemoryEnabled: 0 });
    mocks.getDb.mockResolvedValue(db);
    expect(await autoSaveLearnerMemory(7, fact, input.sourceMessage)).toEqual({ saved: false });
    expect(inserted).not.toHaveBeenCalled();
  });

  it("only writes eligible automatic memory for an account with active opt-in", async () => {
    const { db, inserted } = fakeDatabase({ policyVersion: 1, personalMemoryEnabled: 1 });
    mocks.getDb.mockResolvedValue(db);
    expect(await autoSaveLearnerMemory(7, fact, input.sourceMessage)).toEqual({ saved: true });
    expect(inserted).toHaveBeenCalledWith(expect.objectContaining({
      userId: 7, fato: fact.fato, origem: "preferencia_inicial_memoria_v1",
    }));
  });

  it("blocks the legacy direct save endpoint from bypassing the account opt-out", async () => {
    const { db, inserted } = fakeDatabase({ policyVersion: 1, personalMemoryEnabled: 0 });
    mocks.getDb.mockResolvedValue(db);
    await expect(saveLearnerMemory(7, input)).rejects.toThrow(/memory disabled/);
    expect(inserted).not.toHaveBeenCalled();
  });

  it("preserves per-fact save for a legacy account that has no preference record", async () => {
    const { db, inserted } = fakeDatabase(null);
    mocks.getDb.mockResolvedValue(db);
    expect(await saveLearnerMemory(7, input)).toEqual({ saved: true });
    expect(inserted).toHaveBeenCalledWith(expect.objectContaining({
      userId: 7, origem: "aluno_confirmou_no_chat",
    }));
  });

  it("rejects sensitive candidate memory before touching storage", async () => {
    expect(await autoSaveLearnerMemory(7, {
      fato: "Minha senha é 123456789", categoria: "preferencia_estudo",
    }, "Minha senha é 123456789")).toEqual({ saved: false });
    expect(mocks.getDb).not.toHaveBeenCalled();
  });
});
