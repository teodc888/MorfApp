import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "morfapp.teodc.com";
const SUPERADMIN_SUBDOMAIN = "super";
const ADMIN_SUBDOMAIN = "admin";

export function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get("host") ?? "";
  const host = hostname.replace(`:${process.env.PORT ?? 3000}`, "");

  // En desarrollo local → menú de demo sin reescribir
  if (host === "localhost" || host === "127.0.0.1") {
    return NextResponse.next();
  }

  const subdomain = host.endsWith(`.${ROOT_DOMAIN}`)
    ? host.slice(0, -(ROOT_DOMAIN.length + 1))
    : host.split(".").length > 2
      ? host.split(".").slice(0, -2).join(".")
      : "";

  // super.morfapp.com → /superadmin/...
  if (subdomain === SUPERADMIN_SUBDOMAIN) {
    url.pathname = `/superadmin${url.pathname}`;
    return NextResponse.rewrite(url);
  }

  // admin.morfapp.com → /admin/...
  if (subdomain === ADMIN_SUBDOMAIN) {
    url.pathname = `/admin${url.pathname}`;
    return NextResponse.rewrite(url);
  }

  // empresa1.morfapp.com → /store/empresa1/...
  if (subdomain && subdomain !== ROOT_DOMAIN) {
    url.pathname = `/store/${subdomain}${url.pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
