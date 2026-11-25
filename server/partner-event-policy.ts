export type EventStatus="draft"|"published"|"live"|"ended"|"cancelled";
export type EventVisibility="public"|"private"|"subscriber";
const transitions:Record<EventStatus,readonly EventStatus[]>={draft:["published","cancelled"],published:["live","cancelled"],live:["ended","cancelled"],ended:[],cancelled:[]};
export function canTransitionEvent(from:EventStatus,to:EventStatus):boolean{return transitions[from]?.includes(to)??false;}
export function validEventSchedule(ms:number):boolean{return Number.isSafeInteger(ms)&&ms>=1000&&ms<=2147483647000;}
export function validEventTitle(title:string):boolean{return title.trim().length>0&&title.trim().length<=200;}
