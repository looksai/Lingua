import {describe, expect, it} from "vitest";
import {calEnabled, CALTutorSessions} from "./cal-integration";
import {newCatalogCALSession,chooseCatalogObjective,issueCatalogTask,attestCatalogTaskDelivery,respondToCatalogTask} from "../shared/pedagogy/cal-catalog-adapter";
import {MICROCOMPETENCIES,MICRO_TASKS,validateMicrocatalogue} from "../shared/pedagogy/microcompetency-catalog";
import {CAL_STATES} from "../shared/pedagogy/cal-machine";

/**
 * Post-merge combination smoke. It explicitly does NOT claim that the
 * catalogue adapter is connected to tRPC; CAL runtime still uses Hello pilot.
 */
describe("CAL code after PR #40 + #41 + #42 integration",()=>{
  it("imports all combined modules without coupling SRS or DB",()=>{
    expect(CAL_STATES).toHaveLength(6);
    expect(MICROCOMPETENCIES).toHaveLength(8);
    expect(MICRO_TASKS).toHaveLength(24);
    expect(validateMicrocatalogue()).toEqual([]);
  });
  it("keeps feature flag opt-in and has no sessions by default",()=>{
    expect(calEnabled({} as NodeJS.ProcessEnv)).toBe(false);
    expect(calEnabled({CAL_ENABLED:"false"} as NodeJS.ProcessEnv)).toBe(false);
    expect(calEnabled({CAL_ENABLED:"true"} as NodeJS.ProcessEnv)).toBe(true);
    expect(new CALTutorSessions().inspectForTest(12345)).toBeNull();
  });
  it("catalogue can choose work, not forced greeting, then produce a typed template",()=>{
    const start=newCatalogCALSession(12345,"synthetic-post-merge");
    const chosen=chooseCatalogObjective(start,12345,"work.welder-example");
    expect(chosen.outcome).toBe("accepted");
    expect(chosen.missingPrerequisites).toContain("identity.my-name");
    const issued=issueCatalogTask(chosen.session,12345,true);
    expect(issued.outcome).toBe("accepted");
    expect(issued.session.task?.promptText).toContain("I am a welder");
    expect(issued.session.task?.delivered).toBe(false);
  });
  it("planned task not delivered cannot produce an assessed attempt",()=>{
    const start=newCatalogCALSession(12345,"synthetic-delivery-gate");
    const selected=chooseCatalogObjective(start,12345,"greeting.hello");
    const issued=issueCatalogTask(selected.session,12345,true);
    const denied=respondToCatalogTask(issued.session,12345,{
      kind:"explicit_answer",text:"Olá",attemptedAtMs:1000,
    });
    expect(denied.outcome).toBe("rejected");
    expect(denied.reason).toBe("no_attested_task");
    const ticket=issued.session.task!;
    const shown=attestCatalogTaskDelivery(issued.session,12345,ticket.deliveryId,ticket.promptText,1000);
    expect(shown.outcome).toBe("accepted");
    const answered=respondToCatalogTask(shown.session,12345,{
      kind:"explicit_answer",text:"Olá",attemptedAtMs:2000,
    });
    expect(answered.outcome).toBe("accepted");
    expect(answered.session.cal.phase).toBe("PRATICAR");
    expect(answered.session.cal.observations).toHaveLength(0);
  });
  it("catalogue session and current Hello runtime are separate by design",()=>{
    const catalog=newCatalogCALSession(12345,"catalogue-only");
    const runtime=new CALTutorSessions(()=>1000);
    const pilot=runtime.prepare(12345,"Não sei nada de inglês, quero começar do zero.",true);
    expect(pilot?.phase).toBe("ENSINAR");
    expect(pilot?.directive).toContain("Hello = Olá");
    expect(catalog.selectedCompetencyId).toBeNull();
    expect(runtime.inspectForTest(12345)).toBeNull(); // plan not committed yet
  });
});
