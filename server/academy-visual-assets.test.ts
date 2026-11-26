import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const approved = {
  "edificio-ilustrativo.png": "b9aec0c5e128fd801a2f3af5899077618d62f020119f2bd552e227a62e3ca4bf",
  "hero-sem-interface.webp": "ce31edc0111ddf9750d6aa7831cef8a57854e27041a76f04b51c778e21ff6eac",
  "icone-aprenda.png": "e3404999b27bb253d4532d63a5446b1d1918db67b17c9f876d3f4777525b3744",
  "icone-conecte-se.png": "bf8461916a177f89fef9b4f141dc5a954513beb7c082696aab0b4da6abbd7524",
  "icone-expanda.png": "30407594c1a8c85ae7cd31c94715dce4fdf7d0bb1b5f104d49737b1e27b824f8",
  "icone-prepare-se.png": "3741c11393f60b365c68ac8b9c9e47d2704d7a45d9a715fd70699eba9d7a9626",
  "logo-lingua-transparente.png": "f5e83d8bc1c60f2283f00b0054db19e43f813bd15718686f22edcdb1b41a3edb",
  "mapa-textura-parcial.png": "e6811f10db3768a92a436d2a2a080409feca961e1447b7349bde97553f8ddb92",
};
const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
describe("Academy approved visual kit", () => {
  for (const [name, digest] of Object.entries(approved)) {
    it(`preserves original bytes: ${name}`, () => {
      const bytes = readFileSync(resolve(process.cwd(), "client/public/academy", name));
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(digest);
    });
  }
  it("references every approved asset in the landing implementation", () => {
    const sources = read("client/src/pages/Landing.tsx") + read("client/src/pages/academy-landing.css");
    for (const name of Object.keys(approved)) expect(sources).toContain(name);
  });
  it("retires fictional demo and advertises the planned trial honestly", () => {
    const landing = read("client/src/pages/Landing.tsx");
    expect(landing).toContain('href="/login"');
    expect(landing).not.toContain('href="/demo"');
    expect(landing).toContain('href="/login?mode=signup"');
    expect(landing).toContain("15 dias gratuitos previstos");
    expect(landing).not.toContain("78%");
    expect(landing).toContain("Programa em preparação");
  });
});
