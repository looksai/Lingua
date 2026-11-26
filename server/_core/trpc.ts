import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { academyTrialStatus, trialGatedPath } from "../academy-trial";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    // Never serialize raw database/ORM errors to the browser, including SQL parameters.
    if (error.code !== "INTERNAL_SERVER_ERROR") return shape;
    return { ...shape, message: "Erro interno. Tente novamente mais tarde." };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  if (trialGatedPath(opts.path)) {
    const trial = academyTrialStatus(ctx.user.createdAt);
    if (trial.kind === "expired" || trial.kind === "unavailable") throw new TRPCError({ code: "FORBIDDEN", message: trial.kind === "expired" ? "Seu período gratuito terminou." : "Não foi possível confirmar seu acesso." });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);
