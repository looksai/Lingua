import {describe,expect,it} from "vitest";
import {
  STUDY_TOPIC_BOOKMARK_TTL_MS,clearStudyTopicBookmark,loadStudyTopicBookmark,
  saveStudyTopicBookmark,setStudyTopicBookmarkEnabled,studyTopicBookmarkKeys,
} from "./tutor-study-topic-bookmark";
function fakeStore(){
  const data=new Map<string,string>();
  return {
    data,
    getItem:(key:string)=>data.get(key)??null,
    setItem:(key:string,value:string)=>{data.set(key,value);},
    removeItem:(key:string)=>{data.delete(key);},
  };
}
describe("explicit opt-in local topic continuity — not evidence of learning",()=>{
  const id="greeting.hello",now=1_900_000_000_000;
  it("never saves or restores a topic without independent consent",()=>{
    const store=fakeStore(),keys=studyTopicBookmarkKeys("qa@example.test","groq");
    expect(loadStudyTopicBookmark(store,keys,now)).toEqual({enabled:false,bookmark:null});
    expect(saveStudyTopicBookmark(store,keys,id,now)).toBe(false);
    expect(store.data.has(keys.bookmark)).toBe(false);
  });
  it("stores only curriculum ID and timestamp, never learner text or audio",()=>{
    const store=fakeStore(),keys=studyTopicBookmarkKeys("QA@example.test","groq");
    expect(setStudyTopicBookmarkEnabled(store,keys,true)).toBe(true);
    expect(saveStudyTopicBookmark(store,keys,id,now)).toBe(true);
    expect(loadStudyTopicBookmark(store,keys,now)).toEqual({
      enabled:true,bookmark:{competencyId:id,savedAt:now},
    });
    const raw=store.getItem(keys.bookmark)!;
    expect(JSON.parse(raw)).toEqual({version:1,competencyId:id,savedAt:now});
    expect(raw).not.toContain("answer");
    expect(raw).not.toContain("pronunciation");
    expect(raw).not.toContain("score");
  });
  it("separates two accounts and two external providers",()=>{
    const store=fakeStore();
    const a=studyTopicBookmarkKeys("a@example.test","groq");
    const b=studyTopicBookmarkKeys("b@example.test","groq");
    const c=studyTopicBookmarkKeys("A@example.test","openai");
    setStudyTopicBookmarkEnabled(store,a,true);
    saveStudyTopicBookmark(store,a,id,now);
    expect(loadStudyTopicBookmark(store,b,now).bookmark).toBeNull();
    expect(loadStudyTopicBookmark(store,c,now).bookmark).toBeNull();
    expect(loadStudyTopicBookmark(store,a,now).bookmark?.competencyId).toBe(id);
  });
  it("expires after seven days and does not reconstruct a score",()=>{
    const store=fakeStore(),keys=studyTopicBookmarkKeys("a@example.test","groq");
    setStudyTopicBookmarkEnabled(store,keys,true);
    saveStudyTopicBookmark(store,keys,id,now);
    expect(loadStudyTopicBookmark(store,keys,now+STUDY_TOPIC_BOOKMARK_TTL_MS).bookmark).not.toBeNull();
    expect(loadStudyTopicBookmark(store,keys,now+STUDY_TOPIC_BOOKMARK_TTL_MS+1)).toEqual({
      enabled:true,bookmark:null,
    });
    expect(store.data.has(keys.bookmark)).toBe(false);
  });
  it("rejects out-of-catalog injection and malformed storage",()=>{
    const store=fakeStore(),keys=studyTopicBookmarkKeys("a@example.test","groq");
    setStudyTopicBookmarkEnabled(store,keys,true);
    expect(saveStudyTopicBookmark(store,keys,"<script>hello</script>",now)).toBe(false);
    store.setItem(keys.bookmark,JSON.stringify({version:1,competencyId:"unknown.skill",savedAt:now}));
    expect(loadStudyTopicBookmark(store,keys,now).bookmark).toBeNull();
    store.setItem(keys.bookmark,"{bad");
    expect(loadStudyTopicBookmark(store,keys,now).bookmark).toBeNull();
  });
  it("rejects future timestamps and version drift",()=>{
    const store=fakeStore(),keys=studyTopicBookmarkKeys("a@example.test","groq");
    setStudyTopicBookmarkEnabled(store,keys,true);
    store.setItem(keys.bookmark,JSON.stringify({version:2,competencyId:id,savedAt:now}));
    expect(loadStudyTopicBookmark(store,keys,now).bookmark).toBeNull();
    store.setItem(keys.bookmark,JSON.stringify({version:1,competencyId:id,savedAt:now+61_000}));
    expect(loadStudyTopicBookmark(store,keys,now).bookmark).toBeNull();
  });
  it("turning off consent deletes both preference and saved topic",()=>{
    const store=fakeStore(),keys=studyTopicBookmarkKeys("a@example.test","groq");
    setStudyTopicBookmarkEnabled(store,keys,true);
    saveStudyTopicBookmark(store,keys,id,now);
    expect(setStudyTopicBookmarkEnabled(store,keys,false)).toBe(true);
    expect(loadStudyTopicBookmark(store,keys,now)).toEqual({enabled:false,bookmark:null});
    expect(store.data.has(keys.preference)).toBe(false);
    expect(store.data.has(keys.bookmark)).toBe(false);
  });
  it("clearing a conversation can clear the topic without erasing independent opt-in",()=>{
    const store=fakeStore(),keys=studyTopicBookmarkKeys("a@example.test","groq");
    setStudyTopicBookmarkEnabled(store,keys,true);
    saveStudyTopicBookmark(store,keys,id,now);
    expect(clearStudyTopicBookmark(store,keys)).toBe(true);
    expect(loadStudyTopicBookmark(store,keys,now)).toEqual({enabled:true,bookmark:null});
  });
  it("handles blocked storage without exposing data",()=>{
    const keys=studyTopicBookmarkKeys("a@example.test","groq");
    const denied={
      getItem:(_key:string):string|null=>{throw Error("blocked");},
      setItem:(_key:string,_value:string)=>{throw Error("blocked");},
      removeItem:(_key:string)=>{throw Error("blocked");},
    };
    expect(setStudyTopicBookmarkEnabled(denied,keys,true)).toBe(false);
    expect(saveStudyTopicBookmark(denied,keys,id,now)).toBe(false);
    expect(loadStudyTopicBookmark(denied,keys,now)).toEqual({enabled:false,bookmark:null});
    expect(clearStudyTopicBookmark(denied,keys)).toBe(false);
  });
});
