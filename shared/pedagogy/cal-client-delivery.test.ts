import {describe,expect,it} from "vitest";
import {splitCatalogTaskText,type CatalogClientTask} from "./cal-client-delivery";

const task:CatalogClientTask={
  sessionId:"fictional-session",deliveryId:"ticket-1",
  taskId:"greeting.hello.meaning",taskVersion:1,
  promptText:"Na frase Hello, qual é o significado?",
};
describe("browser task render metadata",()=>{
  it("splits the exact server-owned suffix from the explanation",()=>{
    expect(splitCatalogTaskText("Vamos praticar.\n\n"+task.promptText,task)).toEqual({
      explanation:"Vamos praticar.",taskText:task.promptText,
    });
  });
  it("supports no model explanation without faking a duplicate task",()=>{
    expect(splitCatalogTaskText(task.promptText,task)).toEqual({
      explanation:"",taskText:task.promptText,
    });
  });
  it("never acknowledges truncated or changed task text",()=>{
    expect(splitCatalogTaskText("Vamos praticar.\n\n"+task.promptText.slice(0,-1),task)).toBeNull();
    expect(splitCatalogTaskText("Outro exercício?",task)).toBeNull();
  });
  it("rejects missing session, ticket or prompt",()=>{
    expect(splitCatalogTaskText(task.promptText,{...task,sessionId:""})).toBeNull();
    expect(splitCatalogTaskText(task.promptText,{...task,deliveryId:""})).toBeNull();
    expect(splitCatalogTaskText(task.promptText,{...task,promptText:""})).toBeNull();
  });
});
