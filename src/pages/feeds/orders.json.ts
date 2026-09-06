import type { APIRoute } from "astro";
import { orders } from "../../lib/orders";
import { jsonResponse } from "../../lib/feed";

export const GET = (() => jsonResponse(orders)) satisfies APIRoute;

