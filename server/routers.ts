import {createPartnerInviteRouter} from "./partner-invite-router";
import {createPartnerInviteLimiter} from "./partner-invite-rate-limit";
import {getDb} from "./db";
import { COOKIE_NAME } from "@shared/const";
import { onboardingRouter } from "./onboarding-router";
import { tutorRouter } from "./tutor-router";
import { placementRouter } from "./placement-router";
import { issueSession, registerLocalUser, loginLocalUser, rateLimit, checkRequestOrigin, normalizeEmail } from "./auth-local";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  ensureUserKnowledgeState,
  listUserKnowledgeItems,
  listReviewQueue,
  listReviewHistory,
  removeUserKnowledgeItem,
  recordKnowledgeReview,
  upsertKnowledgeItem,
} from "./db";

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  partnerInvites: createPartnerInviteRouter({
    enabled:()=>process.env.NODE_ENV!=="production" && process.env.PARTNER_INVITES_ENABLED==="true",
    database:getDb,
    allowRequest:createPartnerInviteLimiter(),
  }),
  onboarding: onboardingRouter,
  tutor: tutorRouter,
  placement: placementRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    signUp: publicProcedure.input(z.object({
      email: z.email().max(320),
      password: z.string().min(12).max(128),
    })).mutation(async ({ ctx, input }) => {
      checkRequestOrigin(ctx.req);
      rateLimit("signup:" + (ctx.req.ip ?? "unknown") + ":" + normalizeEmail(input.email));
      let user;
      try {
        user = await registerLocalUser(input.email, input.password);
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        // Drizzle error messages can include SQL parameters and password hashes.
        // Log only safe driver codes, never the raw error, query, or parameters.
        const cause = typeof error === "object" && error !== null && "cause" in error ? error.cause : error;
        const code = typeof cause === "object" && cause !== null && "code" in cause ? String(cause.code) : "";
        const safeCodes = new Set(["ER_NO_REFERENCED_ROW_2", "ER_DUP_ENTRY", "ER_DATA_TOO_LONG", "ER_BAD_FIELD_ERROR", "ER_NO_SUCH_TABLE", "ER_ACCESS_DENIED_ERROR", "ER_TRUNCATED_WRONG_VALUE", "ER_FK_INCOMPATIBLE_COLUMNS", "ER_PARSE_ERROR"]);
        console.error("[Auth] Signup database write failed; mysql_code=" + (safeCodes.has(code) ? code : "withheld"));
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Não foi possível concluir o cadastro. Tente novamente mais tarde." });
      }
      ctx.res.cookie(COOKIE_NAME, await issueSession(user), { ...getSessionCookieOptions(ctx.req), maxAge: 12 * 60 * 60 * 1000 });
      return { success: true as const };
    }),
    signIn: publicProcedure.input(z.object({
      email: z.email().max(320),
      password: z.string().min(1).max(128),
    })).mutation(async ({ ctx, input }) => {
      checkRequestOrigin(ctx.req);
      rateLimit("signin:" + (ctx.req.ip ?? "unknown") + ":" + normalizeEmail(input.email));
      const user = await loginLocalUser(input.email, input.password);
      ctx.res.cookie(COOKIE_NAME, await issueSession(user), { ...getSessionCookieOptions(ctx.req), maxAge: 12 * 60 * 60 * 1000 });
      return { success: true as const };
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  speech: router({
    transcribe: protectedProcedure
      .input(
        z.object({
          audioBase64: z.string().min(1).max(22_000_000),
          mimeType: z.enum([
            "audio/webm",
            "audio/ogg",
            "audio/wav",
            "audio/mp4",
            "audio/mpeg",
          ]),
          language: z.string().default("en"),
        })
      )
      .mutation(async ({ input }) => {
        const apiUrl = process.env.MANUS_API_URL;
        const apiKey = process.env.MANUS_API_KEY;
        if (!apiUrl || !apiKey) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "O serviço de Speech não está configurado.",
          });
        }

        const form = new FormData();
        form.append(
          "file",
          new Blob([Buffer.from(input.audioBase64, "base64")], {
            type: input.mimeType,
          }),
          "lingua-response.webm"
        );
        form.append("model", "whisper-1");
        form.append("response_format", "verbose_json");
        form.append(
          "prompt",
          `Transcreva a fala do estudante em inglês. Contexto: inglês profissional, verbo to be, ferramentas e estação. Idioma esperado: ${input.language}.`
        );

        const response = await fetch(`${apiUrl}/v1/audio/transcriptions`, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}` },
          body: form,
        });
        const body = (await response.json().catch(() => null)) as {
          text?: string;
          language?: string;
          segments?: Array<{ start?: number; end?: number; text?: string }>;
          error?: { message?: string };
        } | null;
        if (!response.ok || !body) {
          throw new TRPCError({
            code: response.status === 413 ? "PAYLOAD_TOO_LARGE" : "BAD_REQUEST",
            message:
              body?.error?.message ??
              "Não foi possível transcrever a gravação.",
          });
        }

        return {
          status: "complete" as const,
          provider: "whisper" as const,
          language: body.language ?? input.language,
          segments: (body.segments ?? [])
            .map((segment, index) => ({
              startMs: Math.round((segment.start ?? index * 2) * 1000),
              endMs: Math.round((segment.end ?? (index + 1) * 2) * 1000),
              text: segment.text?.trim() ?? "",
            }))
            .filter(segment => segment.text.length > 0),
          uncertainty: "medium" as const,
        };
      }),
  }),

  learning: router({
    saveItem: protectedProcedure
      .input(
        z.object({
          itemKey: z.string().min(1).max(180),
          kind: z.enum(["word", "phrase"]),
          text: z.string().min(1),
          normalizedText: z.string().min(1).max(255),
          language: z.string().min(2).max(16),
          translation: z.string().optional(),
          example: z.string().optional(),
          pronunciation: z.string().optional(),
          audioUrl: z.string().url().optional(),
          sourceId: z.string().max(120).optional(),
          sourceRecordId: z.string().max(180).optional(),
          license: z.string().max(255).optional(),
          curriculumAnchors: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        try {
          const item = await upsertKnowledgeItem(ctx.user.id, input);
          if (!item) throw new Error("Knowledge item was not returned");
          const state = await ensureUserKnowledgeState(ctx.user.id, item.id);
          return { item, state };
        } catch (error) {
          console.error("[Learning] Failed to save item:", error);
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Não foi possível salvar este item no banco agora.",
          });
        }
      }),
    reviewQueue: protectedProcedure
      .input(z.object({ limit: z.number().int().min(1).max(50).default(20) }))
      .query(async ({ ctx, input }) => {
        try {
          return await listReviewQueue(ctx.user.id, input.limit);
        } catch (error) {
          console.error("[Learning] Failed to load review queue:", error);
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "A fila de revisão ainda não está disponível.",
          });
        }
      }),
    listItems: protectedProcedure
      .input(z.object({ limit: z.number().int().min(1).max(1000).optional() }))
      .query(async ({ ctx, input }) => {
        try {
          return await listUserKnowledgeItems(ctx.user.id, input.limit);
        } catch (error) {
          console.error("[Learning] Failed to load saved items:", error);
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Os itens salvos ainda não estão disponíveis.",
          });
        }
      }),
    removeItem: protectedProcedure
      .input(z.object({ knowledgeItemId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        try {
          await removeUserKnowledgeItem(ctx.user.id, input.knowledgeItemId);
          return { success: true as const };
        } catch (error) {
          console.error("[Learning] Failed to remove saved item:", error);
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Não foi possível remover este item agora.",
          });
        }
      }),
    history: protectedProcedure
      .input(
        z.object({ limit: z.number().int().min(1).max(1000).default(200) })
      )
      .query(async ({ ctx, input }) => {
        try {
          return await listReviewHistory(ctx.user.id, input.limit);
        } catch (error) {
          console.error("[Learning] Failed to load review history:", error);
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "O histórico de revisões ainda não está disponível.",
          });
        }
      }),
    review: protectedProcedure
      .input(
        z.object({
          knowledgeItemId: z.number().int().positive(),
          rating: z.enum(["again", "hard", "good", "easy"]),
          operationId: z.string().regex(/^[A-Za-z0-9_-]{8,180}$/),
        })
      )
      .mutation(async ({ ctx, input }) => {
        try {
          return await recordKnowledgeReview(
            ctx.user.id,
            input.knowledgeItemId,
            input.rating,
            input.operationId
          );
        } catch (error) {
          console.error("[Learning] Failed to record review:", error);
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Não foi possível registrar esta revisão agora.",
          });
        }
      }),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
