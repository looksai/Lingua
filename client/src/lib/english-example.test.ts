import {describe,it,expect} from "vitest";
import {englishExcerpt} from "./english-example";
describe("Safe English-only TTS excerpt selection",()=>{
  it("extracts practice phrase from bilingual tutoring",()=>{
    expect(englishExcerpt('Vamos treinar: **Exemplo:** "I have been welding for five years." Qual frase você tenta?'))
      .toBe("I have been welding for five years.");
  });
  it("never reads Portuguese prose as English",()=>{
    expect(englishExcerpt("Vamos começar por sua experiência profissional. Qual tarefa quer aprender?")).toBeNull();
    expect(englishExcerpt("Olá, posso ajudar você.")).toBeNull();
  });
  it("accepts English-only short answers and respects 200-char cap",()=>{
    expect(englishExcerpt("Hello, I work as a welder.")).toBe("Hello, I work as a welder.");
    expect(englishExcerpt("I "+("work ".repeat(50)))).toBeNull();
  });
});
