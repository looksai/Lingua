import { describe, expect, it } from "vitest";
import { saveItineraryInput } from "../shared/exam-itinerary";
import { INTEGRATED_VERSION } from "../shared/exam-integrated-contract";

const bookmark={variant:"ielts-general",version:INTEGRATED_VERSION,statuses:["skipped","completed"]};
const request={accountId:4,expectedRevision:null,consent:true,bookmark};

describe("personal exam itinerary bookmark",()=>{
  it("accepts a bounded ordered prefix and requires affirmative consent",()=>{
    expect(saveItineraryInput.safeParse(request).success).toBe(true);
    expect(saveItineraryInput.safeParse({...request,consent:false}).success).toBe(false);
  });
  it.each([{scores:[4,5]},{draft:"text"},{audio:"clip"},{statuses:[]},{statuses:Array(5).fill("completed")},{version:"unknown"}])("rejects unsupported content %j",extra=>{
    expect(saveItineraryInput.safeParse({...request,bookmark:{...bookmark,...extra}}).success).toBe(false);
  });
});
