import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";
test("loads the entire map automatically and safely selects entities", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.locator('svg[data-ready="true"]')).toBeVisible();
  await expect(page.locator(".graph-node")).toHaveCount(47);
  await expect(page.locator(".graph-edge")).toHaveCount(81);
  await page.getByRole("button", { name: "Surveillance", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Surveillance", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("keeps valid DOT visible and shows malformed metadata in the right panel", async ({
  page,
}) => {
  await page.route("**/inputs/MAP.dot?*", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body:
        "export default " +
        JSON.stringify("/* @systems-map {broken} */ digraph {A->B;}"),
    }),
  );
  await page.goto("/");
  await expect(page.locator('svg[data-ready="true"]')).toBeVisible();
  await expect(page.locator(".graph-node")).toHaveCount(2);
  await expect(page.getByLabel("Map details")).toContainText("invalid JSON");
});
test("all twelve loops and six pathways hide excluded entities and reset restores Model", async ({
  page,
}) => {
  await page.route("**/inputs/MAP.dot?*", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body:
        "export default " +
        JSON.stringify(readFileSync("tests/fixtures/mvp.dot", "utf8")),
    }),
  );
  await page.goto("/");
  await page.getByRole("tab", { name: "Loops" }).click();
  const loops = page.getByLabel("Choose loop");
  const options = await loops
    .locator("option")
    .evaluateAll((els) => els.map((e) => (e as HTMLOptionElement).value));
  expect(options).toHaveLength(12);
  for (const id of options) {
    await loops.selectOption(id);
    await expect(page.locator('svg[data-ready="true"]')).toBeVisible();
    const n = await page.locator(".graph-node").count();
    expect(n).toBeLessThan(36);
    await expect(page.locator(".graph-edge")).toHaveCount(n);
  }
  await loops.selectOption("R1");
  await expect(page.locator(".graph-node")).toHaveCount(3);
  await expect(
    page.getByRole("heading", { name: "Control lock-in", exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Pathways" }).click();
  const pathways = page.getByLabel("Choose pathway");
  const paths = await pathways
    .locator("option")
    .evaluateAll((els) => els.map((e) => (e as HTMLOptionElement).value));
  expect(paths).toHaveLength(6);
  for (const id of paths) {
    await pathways.selectOption(id);
    await expect(page.locator('svg[data-ready="true"]')).toBeVisible();
    expect(await page.locator(".graph-edge").count()).toBe(
      (await page.locator(".graph-node").count()) - 1,
    );
  }
  await page.getByRole("button", { name: "Reset map", exact: true }).click();
  await expect(page.locator(".graph-node")).toHaveCount(36);
});
test("cluster filtering and scoped search work with the keyboard", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Governance and control", exact: true })
    .click();
  await expect(page.locator(".graph-node")).toHaveCount(12);
  await page
    .getByRole("searchbox", { name: "Search visible variables" })
    .fill("surveillance");
  const result = page.getByRole("button", {
    name: "Select Surveillance",
    exact: true,
  });
  await result.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Surveillance", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Map details")).toContainText("Influenced by");
  await page.getByRole("searchbox").fill("does not exist");
  await expect(
    page.getByText("No matching variables in this view."),
  ).toBeVisible();
});
test("dragging moves a node and surrounding nodes react without changing topology", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "Loops" }).click();
  await page.getByLabel("Choose loop").selectOption("R1");
  await expect(page.locator('svg[data-ready="true"]')).toBeVisible();
  const node = page.locator(".graph-node").first();
  const neighbor = page.locator(".graph-node").nth(1);
  const before = await neighbor.getAttribute("transform");
  const box = (await node.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width / 2 + 90,
    box.y + box.height / 2 + 30,
    { steps: 10 },
  );
  await expect.poll(() => neighbor.getAttribute("transform")).not.toBe(before);
  await page.mouse.up();
  await expect(page.locator(".graph-node")).toHaveCount(3);
  await expect(page.locator(".graph-edge")).toHaveCount(3);
});
test("node click focuses first-degree peers and fit, while curved links preserve polarity colours", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator('svg[data-ready="true"]')).toBeVisible();
  await page.getByRole("button", { name: "Innovation", exact: true }).click();
  await expect(page.locator(".graph-node")).toHaveCount(5);
  await expect(page.locator(".graph-edge")).toHaveCount(4);
  await expect(
    page.getByRole("heading", { name: "Innovation", exact: true }),
  ).toBeVisible();
  const positive = page.locator(".graph-edge.positive .edge-line").first(),
    negative = page.locator(".graph-edge.negative .edge-line").first();
  await expect(positive).toHaveAttribute("d", /Q/);
  expect(await positive.evaluate((el) => getComputedStyle(el).stroke)).toBe(
    "rgb(109, 171, 230)",
  );
  expect(await negative.evaluate((el) => getComputedStyle(el).stroke)).toBe(
    "rgb(229, 134, 140)",
  );
  await page.getByRole("button", { name: "Reset map", exact: true }).click();
  await expect(page.locator(".graph-node")).toHaveCount(47);
});
for (const viewport of [
  { width: 390, height: 844 },
  { width: 844, height: 390 },
  { width: 1440, height: 900 },
])
  test(`responsive fit and keyboard focus at ${viewport.width}×${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.getByRole("tab", { name: "Loops" }).click();
    await expect(page.locator('svg[data-ready="true"]')).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const viewportBox = (await page.locator(".canvas").boundingBox())!;
    for (const node of await page.locator(".graph-node").all()) {
      const b = (await node.boundingBox())!;
      expect(b.x).toBeGreaterThanOrEqual(viewportBox.x);
      expect(b.x + b.width).toBeLessThanOrEqual(
        viewportBox.x + viewportBox.width + 1,
      );
      expect(b.y).toBeGreaterThanOrEqual(viewportBox.y);
      expect(b.y + b.height).toBeLessThanOrEqual(
        viewportBox.y + viewportBox.height + 1,
      );
    }
    await page.locator(".graph-node").first().focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("svg")).toBeFocused();
    await page.getByRole("tab", { name: "Model" }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("tab", { name: "Loops" })).toBeFocused();
  });
test("touch dragging reacts and does not trigger node focus", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("tab", { name: "Loops" }).click();
  await expect(page.locator('svg[data-ready="true"]')).toBeVisible();
  const node = page.locator(".graph-node").first();
  const box = (await node.boundingBox())!;
  const peer = page.locator(".graph-node").nth(1);
  const before = await peer.getAttribute("transform");
  const session = await context.newCDPSession(page);
  const x = box.x + box.width / 2,
    y = box.y + box.height / 2;
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y }],
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: x + 40, y: y + 45 }],
  });
  await expect.poll(() => peer.getAttribute("transform")).not.toBe(before);
  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect(page.getByRole("tab", { name: "Loops" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});
test("source text is inert, initial failures are actionable, and requests stay local", async ({
  page,
}) => {
  const external: string[] = [];
  page.on("request", (r) => {
    if (!r.url().startsWith("http://127.0.0.1:5173/")) external.push(r.url());
  });
  await page.route("**/inputs/MAP.dot?*", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body:
        "export default " +
        JSON.stringify(
          'digraph {A [label="<img src=x onerror=alert(1)>",URL="javascript:alert(1)"]; }',
        ),
    }),
  );
  await page.goto("/");
  await expect(page.locator('svg[data-ready="true"]')).toBeVisible();
  await expect(page.locator(".graph-node")).toHaveCount(1);
  await expect(
    page.locator("svg image, svg script, svg a, svg foreignObject"),
  ).toHaveCount(0);
  expect(external).toEqual([]);
  await page.route("**/inputs/MAP.dot?*", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: 'export default "digraph { A -> }"',
    }),
  );
  await page.reload();
  await expect(page.getByLabel("Map details")).toContainText(
    "DOT syntax error",
  );
  await expect(
    page.getByRole("button", { name: "Reset map", exact: true }),
  ).toBeEnabled();
});
test("a failed replacement layout preserves the previous drawing and Reset recovers", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const send = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function (
      message: unknown,
      ...rest: unknown[]
    ) {
      const m = message as { type?: string; revision?: number };
      if (m.type === "layout" && m.revision === 2) {
        queueMicrotask(() =>
          this.dispatchEvent(
            new MessageEvent("message", {
              data: {
                type: "error",
                revision: 2,
                message: "Simulated layout failure",
              },
            }),
          ),
        );
        return;
      }
      Reflect.apply(send, this, [message, ...rest]);
    };
  });
  await page.goto("/");
  await expect(page.locator('svg[data-ready="true"]')).toBeVisible();
  await page.getByRole("tab", { name: "Loops" }).click();
  await expect(page.getByLabel("Map details")).toContainText(
    "Simulated layout failure",
  );
  await expect(page.locator(".graph-node")).toHaveCount(47);
  await page.getByRole("button", { name: "Reset map", exact: true }).click();
  await expect(page.locator('svg[data-ready="true"]')).toBeVisible();
  await expect(page.locator(".graph-node")).toHaveCount(47);
  await expect(page.getByLabel("Map details")).not.toContainText(
    "Simulated layout failure",
  );
});
test("contradictions isolate declared branches and explain both the tension and its caveat", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator('svg[data-ready="true"]')).toBeVisible();
  await page.getByRole("tab", { name: "Contradictions" }).click();
  const chooser = page.getByLabel("Choose contradiction");
  const ids = await chooser
    .locator("option")
    .evaluateAll((els) => els.map((e) => (e as HTMLOptionElement).value));
  expect(ids).toHaveLength(8);
  for (const id of ids) {
    await chooser.selectOption(id);
    await expect(page.locator('svg[data-ready="true"]')).toBeVisible();
    await expect(page.getByLabel("Map details")).toContainText(
      "Interpretation",
    );
    expect(await page.locator(".graph-node").count()).toBeLessThan(47);
  }
  await chooser.selectOption("surveillance-maintenance");
  await expect(
    page.getByRole("heading", {
      name: "Who maintains the watchers?",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByLabel("Map details")).toContainText(
    "fabricating replacement chips",
  );
  await expect(
    page.getByRole("button", {
      name: "Replacement electronics supply",
      exact: true,
    }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('svg[data-ready="true"]')).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("New layout reshuffles the selected contradiction and preserves its contents", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator('svg[data-ready="true"]')).toBeVisible();
  await page.getByRole("tab", { name: "Contradictions" }).click();
  await expect(page.locator('svg[data-ready="true"]')).toBeVisible();
  const snapshot = () =>
    page.locator(".graph-node").evaluateAll((nodes) =>
      nodes.map((n) => ({
        id: n.getAttribute("data-id"),
        position: n.getAttribute("transform"),
      })),
    );
  const before = await snapshot();
  await page.getByRole("button", { name: "New layout", exact: true }).click();
  await expect(page.locator('svg[data-ready="true"]')).toBeVisible();
  const after = await snapshot();
  expect(after.map((n) => n.id)).toEqual(before.map((n) => n.id));
  expect(after).not.toEqual(before);
  await expect(
    page.getByRole("tab", { name: "Contradictions" }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".graph-edge")).toHaveCount(9);
});

test("New layout works for every subset mode", async ({ page }) => {
  await page.goto("/");
  for (const mode of ["Model", "Loops", "Pathways", "Contradictions"]) {
    await page.getByRole("tab", { name: mode, exact: true }).click();
    if (mode === "Model")
      await page
        .getByRole("button", { name: "Governance and control", exact: true })
        .click();
    await expect(page.locator('svg[data-ready="true"]')).toBeVisible();
    const nodes = page.locator(".graph-node");
    const before = await nodes.evaluateAll((ns) =>
      ns.map((n) => [
        n.getAttribute("aria-label"),
        n.getAttribute("transform"),
      ]),
    );
    const edges = await page.locator(".graph-edge").count();
    await page.getByRole("button", { name: "New layout", exact: true }).click();
    await expect(page.locator('svg[data-ready="true"]')).toBeVisible();
    const after = await nodes.evaluateAll((ns) =>
      ns.map((n) => [
        n.getAttribute("aria-label"),
        n.getAttribute("transform"),
      ]),
    );
    expect(after.map((n) => n[0])).toEqual(before.map((n) => n[0]));
    expect(after).not.toEqual(before);
    await expect(page.locator(".graph-edge")).toHaveCount(edges);
  }
});

test("credits the author and links prominently to the accompanying blog post", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText(/Content by Gauden Galea/)).toBeVisible();
  const credit = page.getByRole("link", { name: /Read the blog post/ });
  await expect(credit).toBeVisible();
  await expect(credit).toHaveAttribute(
    "href",
    "https://www.gaudengalea.com/lab/silo-systems-map/",
  );
  await expect(
    page.getByRole("link", {
      name: "Read Gauden Galea’s Silo systems map blog post",
    }),
  ).toHaveAttribute(
    "href",
    "https://www.gaudengalea.com/lab/silo-systems-map/",
  );
  await expect(
    page.getByText("Polarity describes causal direction"),
  ).toHaveCount(0);
});
