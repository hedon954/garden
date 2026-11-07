/** Deterministic SSR/browser color subset. Never accepts declarations, URLs, variables or arbitrary CSS. */
const NAMES = new Set("aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen transparent currentcolor".split(" "));
const number = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)%?$/u;
export function isColor(value) {
  if (typeof value !== "string" || value.length > 160) return false;
  const text = value.trim().toLowerCase();
  if (NAMES.has(text) || /^#(?:[a-f\d]{3}|[a-f\d]{4}|[a-f\d]{6}|[a-f\d]{8})$/u.test(text)) return true;
  const match = /^(rgb|rgba|hsl|hsla)\(([^()]*)\)$/u.exec(text);
  if (!match) return false;
  const body = match[2].trim();
  let channels, alpha;
  if (body.includes(",")) {
    if (body.includes("/")) return false;
    const parts = body.split(",").map(s => s.trim());
    if (parts.length !== 3 && parts.length !== 4) return false;
    channels = parts.slice(0, 3); alpha = parts[3];
  } else {
    const parts = body.split("/");
    if (parts.length > 2) return false;
    channels = parts[0].trim().split(/\s+/u); alpha = parts[1]?.trim();
  }
  if (channels.length !== 3) return false;
  const inRange = (s, max) => number.test(s) && Number.parseFloat(s) >= 0 && Number.parseFloat(s) <= (s.endsWith("%") ? 100 : max);
  if (alpha !== undefined && !inRange(alpha, 1)) return false;
  if (match[1].startsWith("rgb")) return channels.every(s => inRange(s, 255)) && (channels.every(s=>s.endsWith("%")) || channels.every(s=>!s.endsWith("%")));
  return /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:deg)?$/u.test(channels[0]) && channels.slice(1).every(s=>s.endsWith("%") && inRange(s,100));
}

export function colorStyles(color, backgroundColor) {
  return {
    ...(isColor(color) ? { "--compose-color": color.trim(), color: color.trim() } : {}),
    ...(isColor(backgroundColor) ? { "--compose-background": backgroundColor.trim(), backgroundColor: backgroundColor.trim() } : {}),
  };
}
