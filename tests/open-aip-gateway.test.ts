import { describe, expect, it, vi } from "vitest";
import { handleApiRequest } from "../worker";
import { openAipAirportFixture } from "./fixtures/openAipAirport";

const context = { waitUntil: () => undefined };
const assets = { fetch: async () => new Response("asset") };

describe("OpenAIP gateway", () => {
  it("reports a missing server-side API key clearly", async () => {
    const response = await handleApiRequest(new Request("https://example.test/api/airports?search=EDFE"), { ASSETS: assets }, context);

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ error: "OpenAIP ist noch nicht konfiguriert. Das Worker-Secret OPENAIP_API_KEY fehlt." });
  });

  it("normalizes OpenAIP search responses without exposing the API key", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({ totalCount: 1, items: [openAipAirportFixture] }));
    const response = await handleApiRequest(
      new Request("https://example.test/api/airports?search=EDFE"),
      { ASSETS: assets, OPENAIP_API_KEY: "secret-key" },
      context,
    );
    const payload = await response.json() as { items: Array<{ icaoCode: string }> };

    expect(response.status).toBe(200);
    expect(payload.items[0].icaoCode).toBe("EDFE");
    expect(fetchMock.mock.calls[0][1]?.headers).toEqual(expect.objectContaining({ "x-openaip-api-key": "secret-key" }));
    expect(JSON.stringify(payload)).not.toContain("secret-key");
    fetchMock.mockRestore();
  });
});
