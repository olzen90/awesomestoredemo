import type { APIRoute } from "astro";
import { customers } from "../../lib/customers";
import { jsonResponse } from "../../lib/feed";

export const GET = (() => jsonResponse(customers)) satisfies APIRoute;
