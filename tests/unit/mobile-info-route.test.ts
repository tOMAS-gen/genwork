import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/reminders/link", () => ({ appBaseUrl: () => "https://work.test" }));

import { GET } from "@/app/api/auth/mobile/info/route";

describe("GET /api/auth/mobile/info", () => {
  it("mantiene el contrato y suma el nombre del sistema", async () => {
    const body = await (await GET()).json();
    expect(body.app).toBe("genwork");
    expect(body.mobileApi).toBe(1);
    expect(body.auth.callbackScheme).toBe("genwork");
    expect(body.name).toBe("work.test");
  });
});
