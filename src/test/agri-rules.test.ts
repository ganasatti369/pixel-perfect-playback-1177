import { describe, it, expect } from "vitest";
import { chatSchema, languages, speechLocales, threadTitle } from "@/lib/agri-shared";
describe("Farmer language support", () => {
  it("supports Telugu questions and Telugu speech locale", () => {
    expect(languages).toContain("Telugu");
    expect(speechLocales.Telugu).toBe("te-IN");
  });
  it("supports Hindi questions and Hindi speech locale", () => {
    expect(languages).toContain("Hindi");
    expect(speechLocales.Hindi).toBe("hi-IN");
  });
  it("supports English questions and Indian English speech locale", () => {
    expect(languages).toContain("English");
    expect(speechLocales.English).toBe("en-IN");
  });
});
describe("Crop photo and question validation", () => {
  const question = {
    id: "farmer-1",
    role: "user",
    parts: [{ type: "text", text: "My tomato leaves are yellow." }],
  };
  const input = {
    threadId: "f297e5a1-e033-4a63-a6ec-2af83459af94",
    language: "Telugu",
    messages: [question],
  };
  it("accepts a real farmer question with preferred language", () => {
    expect(chatSchema.parse(input).language).toBe("Telugu");
  });
  it("rejects non-image attachments before analysis", () => {
    expect(
      chatSchema.safeParse({
        ...input,
        messages: [
          {
            ...question,
            parts: [
              {
                type: "file",
                mediaType: "application/pdf",
                url: "data:application/pdf;base64,AAAA",
              },
            ],
          },
        ],
      }).success,
    ).toBe(false);
  });
  it("rejects messages that end with an assistant turn", () => {
    expect(
      chatSchema.safeParse({ ...input, messages: [{ ...question, role: "assistant" }] }).success,
    ).toBe(false);
  });
  it("names image-only conversations without inventing a diagnosis", () => {
    expect(
      threadTitle({
        id: "photo",
        role: "user",
        parts: [{ type: "file", mediaType: "image/jpeg", url: "data:image/jpeg;base64,AAAA" }],
      }),
    ).toBe("Crop photo check");
  });
});
