/**
 * Read-only preflight for a controlled staging Academy Beta cohort.
 * Does not show or record credentials, email addresses or connection URLs.
 * Run after securely loading the staging configuration into the environment.
 * It neither deploys nor changes any environment variable.
 */
import {inspectAcademyBetaReadiness} from "../server/academy-beta-readiness";

const result=inspectAcademyBetaReadiness(process.env);
process.stdout.write(JSON.stringify(result,null,2)+"\n");
if(!result.ready)process.exitCode=1;
