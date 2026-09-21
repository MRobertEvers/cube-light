import { chromium } from "playwright";
import { writeFile } from "node:fs/promises";
const b = await chromium.launch({
  headless: true,
  executablePath:
    process.env.CHROME_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
try {
  const p = await b.newPage();
  await p.goto("http://127.0.0.1:4173/edge-scan.html");
  const data = await p.evaluate(async () => {
    const { findTitleStrips, stripCanvas } = await import("/edge-titles.js");
    const im = await createImageBitmap(
      await (await fetch("/res/IMG_8535.jpeg")).blob(),
    );
    const lines = await findTitleStrips(im);
    const c = document.createElement("canvas");
    c.width = 1300;
    c.height = Math.ceil(lines.length / 3) * 100;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, c.width, c.height);
    for (let i = 0; i < lines.length; i++) {
      const { canvas } = stripCanvas(im, lines[i]);
      const x = (i % 3) * 430,
        y = Math.floor(i / 3) * 100;
      ctx.drawImage(canvas, x, y + 20, 420, 70);
      ctx.fillStyle = "black";
      ctx.font = "14px sans-serif";
      ctx.fillText(
        `${i} (${Math.round(lines[i].x1)},${Math.round(lines[i].y1)})`,
        x,
        y + 15,
      );
    }
    return c.toDataURL();
  });
  await writeFile(
    "/tmp/edge-contact.png",
    Buffer.from(data.split(",")[1], "base64"),
  );
} finally {
  await b.close();
}
