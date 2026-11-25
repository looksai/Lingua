import { describe, expect, it } from "vitest";
import { findPortalSection, portalSections } from "../client/src/pages/PublicPortal";

describe("public Lingua portal catalogue",()=>{
  it("has unique stable slugs and no fabricated activity metrics",()=>{
    expect(new Set(portalSections.map(x=>x.slug)).size).toBe(portalSections.length);
    expect(portalSections.every(x=>x.title.trim()&&x.description.trim())).toBe(true);
    expect(portalSections.map(x=>x.slug)).toEqual(["canada","eua","australia","europa","carreiras","idiomas"]);
  });
  it("resolves only known topic routes without dynamic user-controlled paths",()=>{
    expect(findPortalSection("canada")?.title).toBe("Canadá");
    expect(findPortalSection("parceiros")).toBeUndefined();
    expect(findPortalSection("../admin")).toBeUndefined();
    expect(findPortalSection("<script>")).toBeUndefined();
  });
});
