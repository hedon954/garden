
test("the theme button is hidden when scripting is off", () => {
  const css = fs.readFileSync(new URL("../app/styles/shell.css", import.meta.url), "utf8");
  assert.match(css, /@media \(scripting:none\)\{\.sh-theme\{display:none\}\}/);
});
