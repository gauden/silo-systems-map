import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { colors } from "../src/ui/dom";

const css = readFileSync("src/style.css", "utf8");
const canvas = readFileSync("src/graph/canvas.ts", "utf8");

const hex = (name: string) => {
  const value = css.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, "i"))?.[1];
  if (!value) throw new Error(`Missing --${name}`);
  return value.toUpperCase();
};
const rgb = (value: string) =>
  [1, 3, 5].map((offset) =>
    Number.parseInt(value.slice(offset, offset + 2), 16),
  );
const luminance = (value: string) => {
  const channels = rgb(value).map((channel) => {
    const normal = channel / 255;
    return normal <= 0.04045
      ? normal / 12.92
      : ((normal + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
};
const contrast = (a: string, b: string) => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
};

describe("poster-inspired theme", () => {
  it("uses the approved semantic palette and poster-derived domain colours", () => {
    expect({
      background: hex("background"),
      shell: hex("shell"),
      canvasGlow: hex("canvas-glow"),
      canvasEdge: hex("canvas-edge"),
      panel: hex("panel"),
      control: hex("control"),
      elevated: hex("elevated"),
      line: hex("line"),
      text: hex("text"),
      secondary: hex("secondary"),
      muted: hex("muted"),
      accent: hex("accent"),
      accentBright: hex("accent-bright"),
    }).toEqual({
      background: "#0B1518",
      shell: "#101A1A",
      canvasGlow: "#1C382C",
      canvasEdge: "#0D1C20",
      panel: "#14241F",
      control: "#1B3027",
      elevated: "#213A2D",
      line: "#3F5649",
      text: "#EEF1E6",
      secondary: "#B4C1B4",
      muted: "#9DAC9F",
      accent: "#D0A844",
      accentBright: "#E0D083",
    });
    expect(colors.map((value) => value.toUpperCase())).toEqual([
      "#C09E3A",
      "#42AD83",
      "#78B978",
      "#9EA969",
      "#E0D083",
    ]);
  });

  it("meets AA text contrast and non-text contrast for fixed causal links", () => {
    for (const [foreground, background] of [
      [hex("text"), hex("background")],
      [hex("text"), hex("panel")],
      [hex("secondary"), hex("panel")],
      [hex("muted"), hex("shell")],
      [hex("accent-bright"), hex("control")],
    ])
      expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5);

    for (const causal of ["#6DABE6", "#E5868C"])
      for (const background of [hex("canvas-glow"), hex("canvas-edge")])
        expect(contrast(causal, background)).toBeGreaterThanOrEqual(3);
  });

  it("keeps causal blue and red unchanged in both SVG markers and link styles", () => {
    expect(canvas).toMatch(/\["positive", "#6dabe6"\]/);
    expect(canvas).toMatch(/\["negative", "#e5868c"\]/);
    expect(css).toMatch(/\.positive\s*\{[^}]*#6dabe6/s);
    expect(css).toMatch(/\.negative\s*\{[^}]*#e5868c/s);
  });
});
