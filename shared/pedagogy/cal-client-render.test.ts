import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {describe,expect,it} from "vitest";
import {TutorCatalogTaskView} from "../../client/src/components/TutorCatalogTaskView";
import type {CatalogClientTask} from "./cal-client-delivery";

const task:CatalogClientTask={
  sessionId:"fictional-session",deliveryId:"fictional-ticket",
  taskId:"greeting.hello.meaning",taskVersion:1,
  promptText:"Na frase Hello, qual é o significado?",
};
const render=(text:string,delivery:CatalogClientTask|null=task)=>
  renderToStaticMarkup(createElement(TutorCatalogTaskView,{
    text,task:delivery,active:true,onRendered:async()=>true,
  }));
describe("catalogue UI is structured around a real DOM element",()=>{
  it("renders a single copy of an exact server-provided exercise",()=>{
    const html=render("Vamos praticar.\n\n"+task.promptText);
    expect(html).toContain("Atividade do catálogo do Lingua");
    expect(html).toContain("Vamos praticar.");
    expect(html.match(/Na frase Hello/g)).toHaveLength(1);
    expect(html).toContain("Confirmar que a atividade apareceu");
  });
  it("does not create a receipt control for a plain model answer",()=>{
    const html=render("Mensagem sem tarefa",null);
    expect(html).not.toContain("Confirmar que a atividade apareceu");
    expect(html).not.toContain("<section");
  });
  it("fails closed on mismatch between model text and ticket",()=>{
    const html=render("Resposta não corresponde ao ticket",task);
    expect(html).not.toContain("Atividade do catálogo");
    expect(html).not.toContain("Confirmar que a atividade apareceu");
  });
  it("renders the exercise text even if render receipt is not allowed",()=>{
    const html=renderToStaticMarkup(createElement(TutorCatalogTaskView,{
      text:task.promptText,task,active:false,onRendered:async()=>false,
    }));
    expect(html).toContain(task.promptText);
    expect(html).toContain("disabled");
  });
});
