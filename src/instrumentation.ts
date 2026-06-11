/** Hook Next.js (compilé pour node ET edge). On NE démarre PAS le worker ici
 *  pour éviter d'embarquer des modules node-only (nodemailer…) dans le bundle
 *  edge. Le worker est démarré depuis le layout serveur (runtime node) —
 *  voir src/app/(app)/layout.tsx → startWorker(). */
export async function register() {
  // no-op
}
