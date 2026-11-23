import { describe, expect, it, vi } from "vitest";
import { createGroqTutor } from "./tutor-free-provider";
import { guardTutorLearnerClaims } from "./tutor-fact-guard";
import { memoryFeatureEnabled, parseTutorMemoryEnvelope, safeLearnerFact } from "./learner-memory";
import { systemInstructions, type TutorProfile } from "../shared/tutor";

const profile: TutorProfile = { tutorName: "Naruto", tutorPersona: "welcoming", interest: "work" };

describe("P0 consented learner memory", () => {
  it("starts disabled until the staging migration is approved", () => {
    expect(memoryFeatureEnabled({})).toBe(false);
    expect(memoryFeatureEnabled({ LINGUA_TUTOR_MEMORY_ENABLED: "true" })).toBe(true);
  });
  it("accepts only literal self-declared current-turn quotes, never LLM inventions", () => {
    const source = "Sou soldador e quero trabalhar no Canadá.";
    const correct = parseTutorMemoryEnvelope(JSON.stringify({
      resposta: "Vamos praticar uma entrevista.",
      memoria: { fato: "Sou soldador", categoria: "profissao" },
    }), source);
    expect(correct.memoryCandidate).toEqual({ fato: "Sou soldador", categoria: "profissao" });
    expect(parseTutorMemoryEnvelope(JSON.stringify({
      resposta: "Oi!", memoria: { fato: "Sou soldador certificado", categoria: "profissao" },
    }), source).memoryCandidate).toBeNull();
    expect(parseTutorMemoryEnvelope(JSON.stringify({
      resposta: "Oi!", memoria: { fato: "Meu colega trabalha com solda", categoria: "profissao" },
    }), "Meu colega trabalha com solda.").memoryCandidate).toBeNull();
  });
  it("excludes sensitive information, contacts and secrets even if written by the student", () => {
    for (const s of [
      "Tenho diagnóstico de depressão",
      "Meu telefone é 9999999999",
      "Minha senha é 123456abcdef",
      "Eu apoio um partido político",
      "Meu email é nome@example.com",
    ]) expect(safeLearnerFact(s,s)).toBe(false);
  });
  it("does not claim saved facts are verified academic evidence", () => {
    const prompt = systemInstructions(profile, ["Sou soldador"], true);
    expect(prompt).toContain("autodeclarações");
    expect(prompt).toContain("memoria:null");
    expect(prompt).toContain("JSON");
    expect(prompt).toContain("Não diga que salvou");
    const reply = "I am a certified welder with 5 years of experience.";
    expect(guardTutorLearnerClaims(reply, [], "Quero praticar uma entrevista", ["Sou soldador"]).blocked).toBe(true);
    expect(guardTutorLearnerClaims(reply, [], "Quero praticar uma entrevista", ["Sou soldador certificado e tenho 5 anos de experiência."]).blocked).toBe(false);
  });
  it("proposes a memory in the tutor's existing Groq call, without extra LLM calls", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({
        resposta: "How do you say welder?",
        memoria: { fato: "Sou soldador", categoria: "profissao" }
      }) } }] }))
    );
    const provider = createGroqTutor({ GROQ_API_KEY: "fake-test-key" },request);
    const result = await provider.replyWithProposal(profile,[],"Sou soldador e quero aprender inglês.",[]);
    expect(result.memoryCandidate?.fato).toBe("Sou soldador");
    expect(result.text).toBe("How do you say welder?");
    expect(request).toHaveBeenCalledTimes(1);
    const outbound = JSON.parse(String(request.mock.calls[0][1]?.body));
    expect(outbound.response_format).toEqual({ type: "json_object" });
    expect(outbound.messages.at(-1)).toEqual({ role: "user", content: "Sou soldador e quero aprender inglês." });
  });
  it("keeps existing plain tutor responses compatible", () => {
    expect(parseTutorMemoryEnvelope("Hello! Let's practice.", "Sou soldador")).toEqual({
      text:"Hello! Let's practice.",memoryCandidate:null
    });
  });
});
