import { describe, expect, it } from "vitest";
import { parseCsv } from "../supabase/functions/_shared/csv.ts";

describe("parseCsv", () => {
  it("parses header + rows", () => {
    const rows = parseCsv("full_name,email,temp_password\nAlice,alice@example.com,Secret123");
    expect(rows).toHaveLength(1);
    expect(rows[0].full_name).toBe("Alice");
    expect(rows[0].email).toBe("alice@example.com");
  });

  it("handles quoted commas", () => {
    const rows = parseCsv('full_name,email,temp_password\n"Alice, A.",alice@example.com,Secret123');
    expect(rows[0].full_name).toBe("Alice, A.");
  });

  it("returns empty for no data rows", () => {
    const rows = parseCsv("full_name,email,temp_password");
    expect(rows).toHaveLength(0);
  });
});

