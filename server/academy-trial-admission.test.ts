import {describe,it,expect} from "vitest";
import {academyAdmissionMode,assertAcademyAdmission} from "./academy-admission";
describe("trial enrollment rollout",()=>{
  it.each([undefined,"open","closed","bad"])("blocks trial signups in mode %s",mode=>{
    const env={ACADEMY_TRIAL_ENABLED:"true",ACADEMY_ADMISSION_MODE:mode};
    expect(academyAdmissionMode(env)).toBe("closed");
    expect(()=>assertAcademyAdmission("trial@example.test",undefined,env)).toThrow();
  });
  it("retains bounded invitation admission only",()=>{
    const env={ACADEMY_TRIAL_ENABLED:"true",ACADEMY_ADMISSION_MODE:"invite"};
    expect(academyAdmissionMode(env)).toBe("invite");
    expect(()=>assertAcademyAdmission("trial@example.test",undefined,env)).toThrow();
  });
  it("fails closed on malformed trial flag even in invite mode",()=>{
    expect(academyAdmissionMode({ACADEMY_TRIAL_ENABLED:"yes",ACADEMY_ADMISSION_MODE:"invite"})).toBe("closed");
  });
  it("preserves legacy settings when trial disabled",()=>{
    expect(academyAdmissionMode({})).toBe("open");
    expect(academyAdmissionMode({ACADEMY_TRIAL_ENABLED:"false",ACADEMY_ADMISSION_MODE:"open"})).toBe("open");
  });
});
