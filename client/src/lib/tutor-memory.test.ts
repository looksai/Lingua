import {describe,it,expect} from "vitest";
import {conversationStorageKeys,loadChatMemory,saveChatMemory,enableChatMemory,clearChatMemory,CHAT_MEMORY_TTL_MS} from "./tutor-memory";
function fakeStorage(){
  const data=new Map<string,string>();
  return {
    data,
    getItem:(k:string)=>data.get(k)??null,
    setItem:(k:string,v:string)=>{data.set(k,v);},
    removeItem:(k:string)=>{data.delete(k);}
  };
}
describe("Opt-in tutor text memory",()=>{
  it("never saves without user opt-in, scopes by account/provider and restores after refresh",()=>{
    const store=fakeStorage(),keys=conversationStorageKeys("QA@EXAMPLE.com","groq");
    expect(loadChatMemory(store,keys,100).enabled).toBe(false);
    expect(enableChatMemory(store,keys)).toBe(true);
    expect(saveChatMemory(store,keys,[{id:1,role:"user",text:"I work as a welder."},
      {id:2,role:"assistant",text:"Let's practice.",source:"ai"}],100)).toBe(true);
    expect(loadChatMemory(store,keys,200).messages).toHaveLength(2);
    expect(loadChatMemory(store,conversationStorageKeys("other@example.com","groq"),200).enabled).toBe(false);
    expect(loadChatMemory(store,conversationStorageKeys("qa@example.com","openai"),200).enabled).toBe(false);
  });
  it("omits unapproved fields and audio, limits memory, and does not preserve initial greeting",()=>{
    const store=fakeStorage(),keys=conversationStorageKeys("a@b.com","groq");
    enableChatMemory(store,keys);
    const messages=Array.from({length:30},(_,i)=>({
      id:i,role:"assistant" as const,text:"Hello!",source:"ai" as const,
      audioBase64:"private-voice",neuralWave:"private-neural"
    }));
    saveChatMemory(store,keys,messages,100);
    const raw=store.getItem(keys.conversation)!;
    expect(raw).not.toContain("private");
    expect(loadChatMemory(store,keys,100).messages).toHaveLength(23);
  });
  it("expires history after 30 days and can revoke storage",()=>{
    const store=fakeStorage(),keys=conversationStorageKeys("a@b.com","groq");
    enableChatMemory(store,keys);
    saveChatMemory(store,keys,[{id:1,role:"user",text:"Hi"}],100);
    expect(loadChatMemory(store,keys,100+CHAT_MEMORY_TTL_MS+1).messages).toEqual([]);
    clearChatMemory(store,keys,true);
    expect(loadChatMemory(store,keys,100).enabled).toBe(false);
  });
  it("handles storage blocked and invalid JSON without throwing",()=>{
    const store=fakeStorage(),keys=conversationStorageKeys("a@b.com","groq");
    enableChatMemory(store,keys);store.setItem(keys.conversation,"bad-json");
    expect(loadChatMemory(store,keys).enabled).toBe(false);
    const denied={getItem:(_k:string):string|null=>{throw Error("disabled");},setItem:(_k:string,_v:string)=>{throw Error("disabled");},removeItem:(_k:string)=>{throw Error("disabled");}};
    expect(loadChatMemory(denied,keys).enabled).toBe(false);
    expect(enableChatMemory(denied,keys)).toBe(false);
    expect(saveChatMemory(denied,keys,[])).toBe(false);
    expect(()=>clearChatMemory(denied,keys,true)).not.toThrow();
  });
});
