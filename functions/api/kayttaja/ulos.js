import { clearUserCookie, json } from "../../../lib/users.js";
export const onRequestPost = () => json({ ok: true }, 200, { "Set-Cookie": clearUserCookie() });
