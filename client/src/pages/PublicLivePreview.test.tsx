import {describe,it,expect} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {Router} from "wouter";
import {memoryLocation} from "wouter/memory-location";
import PublicLivePreview,{type PublicLivePreviewState} from "./PublicLivePreview";
const render=(state:PublicLivePreviewState)=>renderToStaticMarkup(<Router hook={memoryLocation({path:"/preview"}).hook}><PublicLivePreview state={state} onRetry={()=>{}}/></Router>);
describe("public live landing",()=>{
 it("renders loading and unavailable states",()=>{expect(render({kind:"loading"})).toContain("Consultando convite");expect(render({kind:"unavailable"})).toContain("Convite indisponível");});
 it("offers retry on failure",()=>expect(render({kind:"error"})).toContain("Tentar novamente"));
 it("shows event details without claiming video playback",()=>{const html=render({kind:"event",title:"English for work",partnerName:"Partner",scheduledAt:"2026-11-25T12:00:00Z",canWatch:true});expect(html).toContain("English for work");expect(html).toContain("Partner");expect(html).toContain("ainda não está disponível");expect(html).not.toContain("<iframe");});
 it("shows upcoming state and acquisition CTA",()=>{const html=render({kind:"event",title:"Event",partnerName:"Partner",scheduledAt:"2026-11-25T12:00:00Z",canWatch:false});expect(html).toContain("ainda não começou");expect(html).toContain("Conhecer o Lingua");});
});
