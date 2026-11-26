import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mock = vi.hoisted(() => ({
  register: vi.fn(),
  session: vi.fn(),
  cookie: vi.fn(),
}));
vi.mock("./auth-local", async importOriginal => ({
  ...await importOriginal<typeof import("./auth-local")>(),
  registerLocalUser: mock.register,
  issueSession: mock.session,
}));
import { appRouter } from "./routers";

const email = "pilot@example.test";
const password = "test-only-password";
const code = "A".repeat(43);
const tokenHash = createHash("sha256").update(code).digest("hex");
let sequence = 0;
function caller(user: TrpcContext["user"] = null, origin = "https://lingua.example.test") {
  return appRouter.createCaller({
    user,
    req: { headers: { origin, host: "lingua.example.test" }, ip: "academy-test-" + ++sequence },
    res: { cookie: mock.cookie },
  } as unknown as TrpcContext);
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("ACADEMY_ADMISSION_MODE","invite");
  vi.stubEnv("ACADEMY_INVITATIONS_JSON",JSON.stringify([{email,tokenHash,expiresAt:new Date(Date.now()+3600000).toISOString()}]));
  mock.register.mockResolvedValue({id:101,email,openId:"local:test"});
  mock.session.mockResolvedValue("test-session");
});
afterEach(()=>vi.unstubAllEnvs());
describe("Academy tRPC admission boundary (mocked persistence)", () => {
  it("reports only the registration mode, not invitation data",async()=>{
    await expect(caller().auth.registrationMode()).resolves.toBe("invite");
  });
  it("rejects missing, wrong and cross-account codes without creating users",async()=>{
    for(const input of [{email,password},{email,password,inviteCode:"B".repeat(43)},{email:"other@example.test",password,inviteCode:code}]){
      await expect(caller().auth.signUp(input)).rejects.toMatchObject({code:"FORBIDDEN"});
    }
    expect(mock.register).not.toHaveBeenCalled();
    expect(mock.cookie).not.toHaveBeenCalled();
  });
  it("rejects cross-origin and closed registration even with a valid code",async()=>{
    await expect(caller(null,"https://wrong.example.test").auth.signUp({email,password,inviteCode:code})).rejects.toMatchObject({code:"FORBIDDEN"});
    vi.stubEnv("ACADEMY_ADMISSION_MODE","closed");
    await expect(caller().auth.signUp({email,password,inviteCode:code})).rejects.toMatchObject({code:"FORBIDDEN"});
    expect(mock.register).not.toHaveBeenCalled();
  });
  it("allows a valid invitation through to persistence and issues a session",async()=>{
    await expect(caller().auth.signUp({email,password,inviteCode:code})).resolves.toEqual({success:true});
    expect(mock.register).toHaveBeenCalledTimes(1);
    expect(mock.register).toHaveBeenCalledWith(email,password);
    expect(mock.session).toHaveBeenCalledTimes(1);
    expect(mock.cookie).toHaveBeenCalledTimes(1);
  });
  it("blocks legacy speech before provider access during the pilot",async()=>{
    const fetchMock=vi.spyOn(globalThis,"fetch");
    try {
      await expect(caller({id:101,email} as TrpcContext["user"]).speech.transcribe({audioBase64:"YQ==",mimeType:"audio/wav",language:"en"})).rejects.toMatchObject({code:"PRECONDITION_FAILED"});
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {fetchMock.mockRestore();}
  });
});
